import { BadRequestException } from '@nestjs/common';

/** Maximum number of vacancies a single pool request may move. */
export const POOL_MAX_BATCH_SIZE = 100;

/** The two operations supported by the single pool endpoint. */
export const POOL_ACTIONS = ['pull', 'push'] as const;

export type VacancyPoolAction = (typeof POOL_ACTIONS)[number];

/**
 * Fields that must be present when the pool push operation creates a brand new
 * vacancy. They mirror the required fields of `CreateVacancyDto` so that a
 * posting uploaded through the pool is indistinguishable from one created
 * through the single-vacancy endpoint.
 */
export const POOL_REQUIRED_CREATE_FIELDS = [
  'date_pub',
  'company',
  'status',
  'role',
  'fit_rating',
  'source',
  'note',
  'chanel',
] as const;

export type PoolRequiredCreateField =
  (typeof POOL_REQUIRED_CREATE_FIELDS)[number];

/**
 * Resolves the batch size of a pool request. When omitted the whole pool
 * window is used; explicit values outside `1..POOL_MAX_BATCH_SIZE` are
 * rejected so a single request can never move an unbounded number of rows.
 */
export function resolvePoolLimit(limit?: number): number {
  if (limit === undefined) {
    return POOL_MAX_BATCH_SIZE;
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > POOL_MAX_BATCH_SIZE
  ) {
    throw new BadRequestException(
      `limit must be an integer between 1 and ${POOL_MAX_BATCH_SIZE}`,
    );
  }

  return limit;
}

/**
 * Returns the required create fields missing from a pushed pool item, in a
 * stable order. `0` is a valid value for `fit_rating`, so it is only reported
 * when the field is absent.
 */
export function collectMissingCreateFields(
  item: Partial<Record<PoolRequiredCreateField, unknown>>,
): PoolRequiredCreateField[] {
  return POOL_REQUIRED_CREATE_FIELDS.filter((field) => {
    const value = item[field];

    if (value === undefined || value === null) {
      return true;
    }

    if (field === 'fit_rating') {
      return typeof value !== 'number';
    }

    return typeof value !== 'string' || value.trim().length === 0;
  });
}
