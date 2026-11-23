import { BadRequestException } from '@nestjs/common';

/** Maximum number of seen jobs a single pool request may move. */
export const SEEN_JOB_POOL_MAX_BATCH_SIZE = 100;

/** The two operations supported by the single pool endpoint. */
export const SEEN_JOB_POOL_ACTIONS = ['pull', 'push'] as const;

export type SeenJobPoolAction = (typeof SEEN_JOB_POOL_ACTIONS)[number];

/**
 * Fields that must be present when a pool push creates a brand new seen job.
 * They mirror the required fields of `CreateSeenJobDto` (minus `job_key` and
 * `u_id`, which are handled by the pool body) so an uploaded posting is
 * indistinguishable from one created through the single-record endpoint.
 */
export const SEEN_JOB_POOL_REQUIRED_CREATE_FIELDS = [
  'title',
  'company',
  'url',
  'first_seen',
  'status',
  'portal',
  'source',
] as const;

export type SeenJobPoolRequiredCreateField =
  (typeof SEEN_JOB_POOL_REQUIRED_CREATE_FIELDS)[number];

/**
 * Resolves the batch size of a pool request. When omitted the whole pool
 * window is used; explicit values outside `1..SEEN_JOB_POOL_MAX_BATCH_SIZE`
 * are rejected so a single request can never move an unbounded number of rows.
 */
export function resolveSeenJobPoolLimit(limit?: number): number {
  if (limit === undefined) {
    return SEEN_JOB_POOL_MAX_BATCH_SIZE;
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > SEEN_JOB_POOL_MAX_BATCH_SIZE
  ) {
    throw new BadRequestException(
      `limit must be an integer between 1 and ${SEEN_JOB_POOL_MAX_BATCH_SIZE}`,
    );
  }

  return limit;
}

/**
 * Returns the required create fields missing from a pushed pool item, in a
 * stable order. Array/date/score fields keep their `CreateSeenJobDto`
 * constraints and are validated by the DTO.
 */
export function collectMissingSeenJobCreateFields(
  item: Partial<Record<SeenJobPoolRequiredCreateField, unknown>>,
): SeenJobPoolRequiredCreateField[] {
  return SEEN_JOB_POOL_REQUIRED_CREATE_FIELDS.filter((field) => {
    const value = item[field];

    return typeof value !== 'string' || value.trim().length === 0;
  });
}
