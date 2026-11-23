import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workers } from './test_worker/test.worker.js';
import { TexTemplateProcessingWorker } from './tex_template_processings/tex_template_processing.worker.js';
import { JobPostingWorker } from './job_postings/job_posting.worker.js';
import { VacModule } from '@/entities/vacances/vac.module.js';
import { SeenJobEntity } from '@/entities/seen_jobs/sj.entity.js';
import {OpenCodeModule} from '../services/opencode/opencode.module.js'
import { QueueModule, StorageFilesModule } from '@/entities/index.js';

@Module({
  imports: [
    forwardRef(() => VacModule),
    forwardRef(() => OpenCodeModule),
    forwardRef(() => StorageFilesModule),
    forwardRef(() => QueueModule),
    TypeOrmModule.forFeature([SeenJobEntity]),
  ],
  providers: [Workers, TexTemplateProcessingWorker, JobPostingWorker],
  exports: [Workers, TexTemplateProcessingWorker, JobPostingWorker],
})
export class WorkersModule {}