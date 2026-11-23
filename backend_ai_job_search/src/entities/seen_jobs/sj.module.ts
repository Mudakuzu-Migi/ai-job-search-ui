import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeenJobEntity } from './sj.entity.js';
import { UserDataEntity } from '../user_data/ud.entity.js';
import { SeenJobsService } from './sj.service.js';
import { SeenJobsPoolService } from './sj.pool.service.js';
import { SeenJobsController } from './sj.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([SeenJobEntity, UserDataEntity])],
  controllers: [SeenJobsController],
  providers: [SeenJobsService, SeenJobsPoolService],
  exports: [SeenJobsService, SeenJobsPoolService],
})
export class SeenJobsModule {}
