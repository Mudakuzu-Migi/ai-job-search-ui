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
  POOL_ACTIONS,
  POOL_MAX_BATCH_SIZE,
  type VacancyPoolAction,
} from '../utils/vac-pool.util.js';

/**
 * One job posting moved through the pool.
 *
 * `id` is omitted when a brand new posting is uploaded; in that case the
 * service requires the same fields as `CreateVacancyDto`. When `id` is set the
 * item describes an existing vacancy: every field is optional, so a posting
 * can be updated with only the fields that changed.
 */
export class PoolVacancyItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number; // Primary key of an existing vacancy (omit for new postings)

  @IsOptional()
  @IsDateString()
  date_pub?: string; // Publication date

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  company?: string; // Company name

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  status?: string; // Application status

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  role?: string; // Role title

  @IsOptional()
  @IsInt()
  fit_rating?: number; // Fit rating score

  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string | null; // Source URL or link

  @IsOptional()
  @IsString()
  note?: string | null; // Additional notes

  @IsOptional()
  @IsUUID()
  source_cover_latter_id?: string | null; // Cover letter file id

  @IsOptional()
  @IsUUID()
  source_resume_id?: string | null; // Resume file id

  @IsOptional()
  @IsString()
  @MaxLength(50)
  chanel?: string | null; // Communication or application channel
}

/**
 * Body of the single pool endpoint (`POST /vacances/pool`).
 *
 * `action` selects the direction:
 * - `pull` retrieves up to `limit` postings that belong to `uid`.
 * - `push` uploads up to `limit` postings in one call: items without an `id`
 *   are created, items with an `id` update the existing posting.
 *
 * `limit` defaults to `POOL_MAX_BATCH_SIZE` and is always capped by it, so a
 * single request can never move an unbounded number of rows.
 */
export class PoolVacanciesDto {
  @IsUUID()
  @IsNotEmpty()
  uid: string; // Owner of the postings (user_data.id)

  @IsIn([...POOL_ACTIONS])
  action: VacancyPoolAction; // 'pull' | 'push'

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(POOL_MAX_BATCH_SIZE)
  limit?: number; // Batch size for this request

  @ValidateIf((dto: PoolVacanciesDto) => dto.action === 'push')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(POOL_MAX_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => PoolVacancyItemDto)
  items?: PoolVacancyItemDto[]; // Postings uploaded by a push
}
