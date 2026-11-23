import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  SEEN_JOB_POOL_ACTIONS,
  SEEN_JOB_POOL_MAX_BATCH_SIZE,
  type SeenJobPoolAction,
} from '../utils/seen-job-pool.util.js';

/**
 * One seen job moved through the pool.
 *
 * `job_key` identifies the posting and is always required. When the key is not
 * stored yet the service requires the same fields as `CreateSeenJobDto`; when
 * it already exists every other field is optional, so a posting can be updated
 * with only the fields that changed.
 */
export class PoolSeenJobItemDto {
  @IsUUID()
  job_key: string; // UUID primary key of the offer

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string; // Job title

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  company?: string; // Hiring company

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  url?: string; // Original offer URL

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null; // Offer location, null clears it

  @IsOptional()
  @IsDateString()
  first_seen?: string; // Date the offer was first discovered

  @IsOptional()
  @IsDateString()
  posted_date?: string | null; // Date the offer was published, null clears it

  @IsOptional()
  @IsDateString()
  deadline?: string | null; // Application deadline, null clears it

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fit?: string | null; // Fit label, null clears it

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  status?: string; // Processing / application status

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  portal?: string; // Portal the offer was found on

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  source?: string; // Source channel / feed of the offer

  @IsOptional()
  @IsInt()
  rank_score?: number | null; // Numeric ranking score, null clears it

  @IsOptional()
  @IsString()
  @MaxLength(255)
  rank_verdict?: string | null; // Ranking verdict text, null clears it

  @IsOptional()
  @IsDateString()
  rank_date?: string | null; // Date the offer was ranked, null clears it

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location_verdict?: string | null; // Location verdict, null clears it

  @IsOptional()
  @IsString()
  @MaxLength(100)
  language_gate?: string | null; // Language gate result, null clears it

  @IsOptional()
  @IsString()
  language_note?: string | null; // Language notes, null clears them

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[] | null; // Strengths, null clears them

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gaps?: string[] | null; // Gaps, null clears them
}

/**
 * Body of the single pool endpoint (`POST /seen-jobs/pool`).
 *
 * `action` selects the direction:
 * - `pull` retrieves up to `limit` seen jobs owned by `u_id`.
 * - `push` uploads up to `limit` seen jobs in one call: unknown `job_key`
 *   values are created, known ones are updated.
 *
 * `limit` defaults to `SEEN_JOB_POOL_MAX_BATCH_SIZE` and is always capped by
 * it, so a single request can never move an unbounded number of rows.
 */
export class PoolSeenJobsDto {
  @IsUUID()
  u_id: string; // Owner of the records (user_data.id)

  @IsIn([...SEEN_JOB_POOL_ACTIONS])
  action: SeenJobPoolAction; // 'pull' | 'push'

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(SEEN_JOB_POOL_MAX_BATCH_SIZE)
  limit?: number; // Batch size for this request

  @ValidateIf((dto: PoolSeenJobsDto) => dto.action === 'push')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(SEEN_JOB_POOL_MAX_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => PoolSeenJobItemDto)
  items?: PoolSeenJobItemDto[]; // Seen jobs uploaded by a push
}
