import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Body for creating a seen job record. `job_key` is the string primary key
 * supplied by the client and `u_id` selects the owning user; there is no
 * generated identifier.
 */
export class CreateSeenJobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  job_key: string; // Client-supplied primary key of the offer

  @IsUUID()
  u_id: string; // Owner of the record (user_data.id)

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string; // Job title

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  company: string; // Hiring company

  @IsString()
  @IsNotEmpty()
  url: string; // Original offer URL

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null; // Offer location, null when unknown

  @IsDateString()
  @IsNotEmpty()
  first_seen: string; // Date the offer was first discovered (ISO date string)

  @IsOptional()
  @IsDateString()
  posted_date?: string | null; // Date the offer was published (ISO date string)

  @IsOptional()
  @IsDateString()
  deadline?: string | null; // Application deadline (ISO date string)

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fit?: string | null; // Fit label assigned to the offer

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  status: string; // Processing / application status

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  portal: string; // Portal the offer was found on

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  source: string; // Source channel / feed of the offer

  @IsOptional()
  @IsInt()
  rank_score?: number | null; // Numeric ranking score
}
