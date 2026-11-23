import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SeenJobEntity } from './sj.entity.js';
import { UserDataEntity } from '../user_data/ud.entity.js';
import { Measure } from '@/common/services/index.js';
import { assertValidUuid } from './utils/seen-job-validation.util.js';
import {
  normalizeOptionalStringArray,
  normalizeOptionalText,
} from './utils/seen-job-normalizer.util.js';
import { buildSeenJobChanges } from './utils/seen-job-update.util.js';
import {
  collectMissingSeenJobCreateFields,
  resolveSeenJobPoolLimit,
} from './utils/seen-job-pool.util.js';
import type {
  PoolSeenJobItemDto,
  PoolSeenJobsDto,
} from './dto/pool-seen-jobs.dto.js';

/** Result of a `pull` call: the batch of seen jobs retrieved from the pool. */
export type SeenJobPoolPullResult = {
  success: true;
  action: 'pull';
  message: string;
  u_id: string;
  limit: number;
  count: number;
  items: SeenJobEntity[];
};

/** Result of a `push` call: which seen jobs were created and which updated. */
export type SeenJobPoolPushResult = {
  success: true;
  action: 'push';
  message: string;
  u_id: string;
  limit: number;
  count: number;
  created_keys: string[];
  updated_keys: string[];
};

export type SeenJobPoolResult =
  | SeenJobPoolPullResult
  | SeenJobPoolPushResult;

/**
 * Single entry point for moving seen jobs in batches.
 *
 * The pool groups records in fixed-size batches so a client never has to call
 * the single-record endpoints in a loop:
 * - `pull` returns up to `limit` seen jobs that belong to the user;
 * - `push` uploads up to `limit` seen jobs in one transaction, creating the
 *   ones whose `job_key` is unknown and updating the ones that already exist.
 */
@Injectable()
export class SeenJobsPoolService {
  constructor(private readonly dataSource: DataSource) {}

  @Measure('SeenJobsPoolService')
  async runPoolBatch(dto: PoolSeenJobsDto): Promise<SeenJobPoolResult> {
    assertValidUuid(dto.u_id, 'u_id');

    const userId = dto.u_id.trim();
    const limit = resolveSeenJobPoolLimit(dto.limit);

    if (dto.action === 'pull') {
      if (dto.items !== undefined) {
        throw new BadRequestException(
          'items is only allowed when action is push',
        );
      }

      return this.pull(userId, limit);
    }

    return this.push(userId, limit, dto.items ?? []);
  }

  // ------------------------------------------------------------------ pull

  /** Retrieves the next batch of seen jobs owned by the user. */
  private async pull(
    userId: string,
    limit: number,
  ): Promise<SeenJobPoolPullResult> {
    const items = await this.dataSource.getRepository(SeenJobEntity).find({
      where: { u_id: userId },
      order: { first_seen: 'DESC' },
      take: limit,
    });

    Logger.log(
      `pull u_id=${userId} limit=${limit} count=${items.length}`,
      'SeenJobsPoolService',
    );

    return {
      success: true,
      action: 'pull',
      message:
        items.length === 0
          ? 'No seen jobs found in the pool'
          : 'Seen jobs successfully retrieved from the pool',
      u_id: userId,
      limit,
      count: items.length,
      items,
    };
  }

  // ------------------------------------------------------------------ push

  /**
   * Uploads a batch inside one transaction: unknown `job_key` values are
   * created, known ones are updated in place. Any invalid item rolls the whole
   * batch back, so a pool request never leaves partial results behind.
   */
  private async push(
    userId: string,
    limit: number,
    items: PoolSeenJobItemDto[],
  ): Promise<SeenJobPoolPushResult> {
    if (items.length === 0) {
      throw new BadRequestException(
        'items must contain at least one seen job when action is push',
      );
    }

    if (items.length > limit) {
      throw new BadRequestException(
        `items must contain at most ${limit} seen jobs for this request`,
      );
    }

    this.assertNoDuplicateKeys(items);

    const { createdKeys, updatedKeys } = await this.dataSource.transaction(
      async (manager: EntityManager) => {
        const repo = manager.getRepository(SeenJobEntity);
        const created: string[] = [];
        const updated: string[] = [];

        await this.assertUserExists(manager, userId);

        for (const [index, item] of items.entries()) {
          const jobKey = item.job_key.trim();
          const existing = await repo.findOneBy({ job_key: jobKey });

          if (!existing) {
            await this.createFromPoolItem(repo, userId, index, jobKey, item);
            created.push(jobKey);
            continue;
          }

          if (existing.u_id !== userId) {
            throw new ConflictException(
              `items[${index}]: job_key ${jobKey} belongs to another user`,
            );
          }

          const changes = buildSeenJobChanges(item);

          // Re-uploading an unchanged posting is a valid no-op.
          if (Object.keys(changes).length > 0) {
            await repo.save(repo.merge(existing, changes));
          }

          updated.push(jobKey);
        }

        return { createdKeys: created, updatedKeys: updated };
      },
    );

    Logger.log(
      `push u_id=${userId} limit=${limit} created=${createdKeys.length} updated=${updatedKeys.length}`,
      'SeenJobsPoolService',
    );

    return {
      success: true,
      action: 'push',
      message: 'Seen jobs successfully submitted to the pool',
      u_id: userId,
      limit,
      count: createdKeys.length + updatedKeys.length,
      created_keys: createdKeys,
      updated_keys: updatedKeys,
    };
  }

  /** Persists a new seen job that arrives through push. */
  private async createFromPoolItem(
    repo: Repository<SeenJobEntity>,
    userId: string,
    index: number,
    jobKey: string,
    item: PoolSeenJobItemDto,
  ): Promise<void> {
    const missing = collectMissingSeenJobCreateFields(item);

    if (missing.length > 0) {
      throw new BadRequestException(
        `items[${index}] is missing required fields: ${missing.join(', ')}`,
      );
    }

    const entity = repo.create({
      job_key: jobKey,
      u_id: userId,
      title: item.title!.trim(),
      company: item.company!.trim(),
      url: item.url!.trim(),
      location: normalizeOptionalText(item.location),
      first_seen: item.first_seen!,
      posted_date: item.posted_date ?? null,
      deadline: item.deadline ?? null,
      fit: normalizeOptionalText(item.fit),
      status: item.status!.trim(),
      portal: item.portal!.trim(),
      source: item.source!.trim(),
      rank_score: item.rank_score ?? null,
      rank_verdict: normalizeOptionalText(item.rank_verdict),
      rank_date: item.rank_date ?? null,
      location_verdict: normalizeOptionalText(item.location_verdict),
      language_gate: normalizeOptionalText(item.language_gate),
      language_note: normalizeOptionalText(item.language_note),
      strengths: normalizeOptionalStringArray(item.strengths),
      gaps: normalizeOptionalStringArray(item.gaps),
    });

    await repo.save(entity);

    Logger.log(
      `push create job_key=${jobKey} u_id=${userId}`,
      'SeenJobsPoolService',
    );
  }

  // --------------------------------------------------------------- helpers

  /** A batch can only address each seen job once, otherwise upserts collide. */
  private assertNoDuplicateKeys(items: PoolSeenJobItemDto[]): void {
    const keys = items.map((item) => item.job_key);

    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('items must not contain duplicate job_keys');
    }
  }

  /** Mirrors the owner check of the single-record create endpoint. */
  private async assertUserExists(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    const user = await manager
      .getRepository(UserDataEntity)
      .findOneBy({ id: userId });

    if (!user) {
      throw new BadRequestException(
        `u_id ${userId} does not reference an existing user`,
      );
    }
  }
}
