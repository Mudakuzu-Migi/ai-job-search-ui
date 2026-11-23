import type { CreateSeenJobDto } from '../dto/create-seen-job.dto.js';
import type { SeenJobEntity } from '../sj.entity.js';
import {
  assertMaxLength,
  assertNonEmptyString,
  assertOptionalStringArray,
} from './seen-job-validation.util.js';
import {
  normalizeOptionalStringArray,
  normalizeOptionalText,
} from './seen-job-normalizer.util.js';

/**
 * Fields a client may change on an existing seen job. `job_key` is the
 * primary key and `u_id` is the owner, so neither is editable.
 */
export type SeenJobEditableFields = Partial<
  Omit<CreateSeenJobDto, 'job_key' | 'u_id'>
>;

/**
 * Validates and normalises the editable fields of a seen job. Only fields
 * that are present in `patch` are included in the result, so a partial update
 * leaves every other column untouched.
 *
 * The result can be empty when `patch` carries no editable values; callers
 * decide whether that is an error (single update) or a no-op (pool upsert).
 */
export function buildSeenJobChanges(
  patch: SeenJobEditableFields,
): Partial<SeenJobEntity> {
  const changes: Partial<SeenJobEntity> = {};

  if (patch.title !== undefined) {
    assertNonEmptyString(patch.title, 'title');
    assertMaxLength(patch.title, 255, 'title');
    changes.title = patch.title.trim();
  }

  if (patch.company !== undefined) {
    assertNonEmptyString(patch.company, 'company');
    assertMaxLength(patch.company, 255, 'company');
    changes.company = patch.company.trim();
  }

  if (patch.url !== undefined) {
    assertNonEmptyString(patch.url, 'url');
    changes.url = patch.url.trim();
  }

  if (patch.location !== undefined) {
    changes.location = normalizeOptionalText(patch.location);
  }

  if (patch.first_seen !== undefined) {
    assertNonEmptyString(patch.first_seen, 'first_seen');
    changes.first_seen = patch.first_seen;
  }

  if (patch.posted_date !== undefined) {
    changes.posted_date = patch.posted_date ?? null;
  }

  if (patch.deadline !== undefined) {
    changes.deadline = patch.deadline ?? null;
  }

  if (patch.fit !== undefined) {
    changes.fit = normalizeOptionalText(patch.fit);
  }

  if (patch.status !== undefined) {
    assertNonEmptyString(patch.status, 'status');
    assertMaxLength(patch.status, 100, 'status');
    changes.status = patch.status.trim();
  }

  if (patch.portal !== undefined) {
    assertNonEmptyString(patch.portal, 'portal');
    assertMaxLength(patch.portal, 100, 'portal');
    changes.portal = patch.portal.trim();
  }

  if (patch.source !== undefined) {
    assertNonEmptyString(patch.source, 'source');
    assertMaxLength(patch.source, 255, 'source');
    changes.source = patch.source.trim();
  }

  if (patch.rank_score !== undefined) {
    changes.rank_score = patch.rank_score ?? null;
  }

  if (patch.rank_verdict !== undefined) {
    changes.rank_verdict = normalizeOptionalText(patch.rank_verdict);
  }

  if (patch.rank_date !== undefined) {
    changes.rank_date = patch.rank_date ?? null;
  }

  if (patch.location_verdict !== undefined) {
    changes.location_verdict = normalizeOptionalText(patch.location_verdict);
  }

  if (patch.language_gate !== undefined) {
    changes.language_gate = normalizeOptionalText(patch.language_gate);
  }

  if (patch.language_note !== undefined) {
    changes.language_note = normalizeOptionalText(patch.language_note);
  }

  if (patch.strengths !== undefined) {
    assertOptionalStringArray(patch.strengths, 'strengths');
    changes.strengths = normalizeOptionalStringArray(patch.strengths);
  }

  if (patch.gaps !== undefined) {
    assertOptionalStringArray(patch.gaps, 'gaps');
    changes.gaps = normalizeOptionalStringArray(patch.gaps);
  }

  return changes;
}
