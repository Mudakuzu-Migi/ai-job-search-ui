import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueService } from '@/entities/queue/queue.service.js';
import { SeenJobEntity } from '@/entities/seen_jobs/sj.entity.js';
import {
  normalizeErrorMessage,
  parseJobPostingPayload,
  type JobPostingItemPayload,
} from './utils/job-posting-payload.util.js';
import {
  createJobPostingResult,
  type JobPostingProcessingResult,
} from './utils/job-posting-result.util.js';

/**
 * Processes `job_posting_processing` tasks.
 *
 * The task payload is read from the persisted queue row, so the orchestrator
 * only passes the task id. The payload carries a pool of recent postings; each
 * posting is checked against `seen_jobs` on `title`, owner id (`u_id`/`ID`),
 * `job_key`, `url` and `company` before being stored. Seen keys are reported
 * back in `dub_vacs_job_keys`, newly stored keys in `new_vacs_job_keys`.
 */
@Injectable()
export class JobPostingWorker {
  private readonly logger = new Logger(JobPostingWorker.name);

  constructor(
    private readonly queueService: QueueService,
    @InjectRepository(SeenJobEntity)
    private readonly seenJobRepository: Repository<SeenJobEntity>,
  ) {}

  async process(taskId: string): Promise<JobPostingProcessingResult> {
    try {
      const job = await this.queueService.findOneById(taskId);
      const payload = parseJobPostingPayload(taskId, job.payload);

      this.logger.log(
        `Processing job posting task ${taskId} (${payload.items.length} posting(s))`,
      );

      const result = await this.syncSeenJobs(payload.items);

      this.logger.log(
        `Job posting task ${taskId}: new=${result.new_vacs_job_keys.length} duplicate=${result.dub_vacs_job_keys.length}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed job posting task ${taskId}: ${normalizeErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Stores postings that are not in `seen_jobs` yet. Keys already handled in
   * this batch are treated as duplicates so one pool never inserts the same
   * posting twice.
   */
  private async syncSeenJobs(
    items: JobPostingItemPayload[],
  ): Promise<JobPostingProcessingResult> {
    const result = createJobPostingResult();
    const batchKeys = new Set<string>();

    for (const item of items) {
      const existing =
        batchKeys.has(item.job_key) ||
        (await this.seenJobRepository.findOneBy({
          job_key: item.job_key,
          u_id: item.u_id,
          title: item.title,
          company: item.company,
          url: item.url,
        }));

      if (existing) {
        result.dub_vacs_job_keys.push(item.job_key);
        continue;
      }

      await this.seenJobRepository.save(this.seenJobRepository.create(item));

      batchKeys.add(item.job_key);
      result.new_vacs_job_keys.push(item.job_key);
    }

    return result;
  }
}
