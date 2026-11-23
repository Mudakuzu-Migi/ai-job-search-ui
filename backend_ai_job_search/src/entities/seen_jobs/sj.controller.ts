import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Patch,
  Post,
} from '@nestjs/common';
import { SeenJobsService } from './sj.service.js';
import { CreateSeenJobDto } from './dto/create-seen-job.dto.js';
import { SeenJobIdDto } from './dto/seen-job-id.dto.js';
import { UpdateSeenJobDto } from './dto/update-seen-job.dto.js';
import {
  UpdateSeenJobCompanyDto,
  UpdateSeenJobDeadlineDto,
  UpdateSeenJobFirstSeenDto,
  UpdateSeenJobFitDto,
  UpdateSeenJobLocationDto,
  UpdateSeenJobPortalDto,
  UpdateSeenJobPostedDateDto,
  UpdateSeenJobRankScoreDto,
  UpdateSeenJobSourceDto,
  UpdateSeenJobStatusDto,
  UpdateSeenJobTitleDto,
  UpdateSeenJobUrlDto,
} from './dto/update-seen-job-field.dto.js';

/**
 * All identifiers and field values are sent in the request body, never in the
 * URL, so no route below declares a `:param` segment.
 */
@Controller('seen-jobs')
export class SeenJobsController {
  constructor(private readonly seenJobsService: SeenJobsService) {}

  // ------------------------------------------------------------------ read

  @Get()
  async getAll() {
    return await this.seenJobsService.findAll();
  }

  @Post('find')
  async getOne(@Body() dto: SeenJobIdDto) {
    Logger.log('POST', '/seen-jobs/find');
    return await this.seenJobsService.findOneById(dto.job_key);
  }

  // ---------------------------------------------------------------- create

  @Post()
  async create(@Body() createSeenJobDto: CreateSeenJobDto) {
    Logger.log('POST', '/seen-jobs');
    return await this.seenJobsService.createSeenJob(createSeenJobDto);
  }

  // ---------------------------------------------------------------- update

  /** Partial update: `job_key` + `u_id` select the row, only the columns sent change. */
  @Patch('update')
  async update(@Body() updateSeenJobDto: UpdateSeenJobDto) {
    Logger.log('PATCH', '/seen-jobs/update');
    return await this.seenJobsService.updateSeenJob(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto,
    );
  }

  @Patch('title')
  async updateTitle(@Body() updateSeenJobDto: UpdateSeenJobTitleDto) {
    Logger.log('PATCH', '/seen-jobs/title');
    return await this.seenJobsService.updateSeenJobTitle(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.title,
    );
  }

  @Patch('company')
  async updateCompany(@Body() updateSeenJobDto: UpdateSeenJobCompanyDto) {
    Logger.log('PATCH', '/seen-jobs/company');
    return await this.seenJobsService.updateSeenJobCompany(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.company,
    );
  }

  @Patch('url')
  async updateUrl(@Body() updateSeenJobDto: UpdateSeenJobUrlDto) {
    Logger.log('PATCH', '/seen-jobs/url');
    return await this.seenJobsService.updateSeenJobUrl(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.url,
    );
  }

  @Patch('location')
  async updateLocation(@Body() updateSeenJobDto: UpdateSeenJobLocationDto) {
    Logger.log('PATCH', '/seen-jobs/location');
    return await this.seenJobsService.updateSeenJobLocation(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.location,
    );
  }

  @Patch('first-seen')
  async updateFirstSeen(@Body() updateSeenJobDto: UpdateSeenJobFirstSeenDto) {
    Logger.log('PATCH', '/seen-jobs/first-seen');
    return await this.seenJobsService.updateSeenJobFirstSeen(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.first_seen,
    );
  }

  @Patch('posted-date')
  async updatePostedDate(@Body() updateSeenJobDto: UpdateSeenJobPostedDateDto) {
    Logger.log('PATCH', '/seen-jobs/posted-date');
    return await this.seenJobsService.updateSeenJobPostedDate(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.posted_date,
    );
  }

  @Patch('deadline')
  async updateDeadline(@Body() updateSeenJobDto: UpdateSeenJobDeadlineDto) {
    Logger.log('PATCH', '/seen-jobs/deadline');
    return await this.seenJobsService.updateSeenJobDeadline(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.deadline,
    );
  }

  @Patch('fit')
  async updateFit(@Body() updateSeenJobDto: UpdateSeenJobFitDto) {
    Logger.log('PATCH', '/seen-jobs/fit');
    return await this.seenJobsService.updateSeenJobFit(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.fit,
    );
  }

  @Patch('status')
  async updateStatus(@Body() updateSeenJobDto: UpdateSeenJobStatusDto) {
    Logger.log('PATCH', '/seen-jobs/status');
    return await this.seenJobsService.updateSeenJobStatus(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.status,
    );
  }

  @Patch('portal')
  async updatePortal(@Body() updateSeenJobDto: UpdateSeenJobPortalDto) {
    Logger.log('PATCH', '/seen-jobs/portal');
    return await this.seenJobsService.updateSeenJobPortal(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.portal,
    );
  }

  @Patch('source')
  async updateSource(@Body() updateSeenJobDto: UpdateSeenJobSourceDto) {
    Logger.log('PATCH', '/seen-jobs/source');
    return await this.seenJobsService.updateSeenJobSource(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.source,
    );
  }

  @Patch('rank-score')
  async updateRankScore(@Body() updateSeenJobDto: UpdateSeenJobRankScoreDto) {
    Logger.log('PATCH', '/seen-jobs/rank-score');
    return await this.seenJobsService.updateSeenJobRankScore(
      updateSeenJobDto.job_key,
      updateSeenJobDto.u_id,
      updateSeenJobDto.rank_score,
    );
  }

  // ---------------------------------------------------------------- delete

  /** Deletes a seen job selected by the `job_key` sent in the body. */
  @Delete('delete')
  async remove(@Body() dto: SeenJobIdDto) {
    Logger.log('DELETE', '/seen-jobs/delete');
    return await this.seenJobsService.deleteSeenJobById(dto.job_key);
  }
}
