/**
 * Helpers for the `job_posting_processing` task payload. They are kept outside
 * the worker so the worker stays focused on orchestration.
 *
 * The queue row carries a pool of recent postings:
 *
 * ```json
 * {
 *   "u_id": "<owner uuid>",
 *   "items": [
 *     { "job_key": "<offer id>", "title": "...", "company": "...", "url": "..." }
 *   ]
 * }
 * ```
 *
 * A bare array of postings is accepted as well; in that case every item must
 * carry its owner id. Fields that are required by `seen_jobs` but usually not
 * scraped (`status`, `portal`, `source`) fall back to documented defaults, and
 * `first_seen` falls back to the current UTC date.
 */

/** One posting from the queue payload, normalised for `seen_jobs`. */
export type JobPostingItemPayload = {
  u_id: string;
  job_key: string;
  title: string;
  company: string;
  url: string;
  first_seen: string;
  status: string;
  portal: string;
  source: string;
  location: string | null;
  posted_date: string | null;
  deadline: string | null;
  fit: string | null;
  rank_score: number | null;
};

/** Parsed payload: a pool of postings ready for the duplicate check. */
export type JobPostingPayload = {
  items: JobPostingItemPayload[];
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maximum length of the `seen_jobs.job_key` varchar(255) column. */
const JOB_KEY_MAX_LENGTH = 255;

/** Accepted spellings of the owner id (`ID` in the posting pool). */
const OWNER_FIELDS = ['u_id', 'uID', 'uid', 'ID', 'id'] as const;

/** Values used when the scraped posting does not provide them. */
const DEFAULT_STATUS = 'new';
const DEFAULT_PORTAL = 'unknown';
const DEFAULT_SOURCE = 'unknown';

/** Turns an unknown thrown value into a message safe to log. */
export function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Returns true for JSON objects (not arrays, not null). */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads the first non-blank string among the accepted field names. */
function readRequiredText(
  source: Record<string, unknown>,
  keys: readonly string[],
  label: string,
  context: string,
): string {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  throw new Error(`${context} has an invalid ${label}; expected a non-empty string`);
}

/** Owner id lookup; absent on the item means "inherit the pool owner". */
function resolveOwnerId(
  source: Record<string, unknown>,
  context: string,
): string | null {
  for (const key of OWNER_FIELDS) {
    const value = source[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      const ownerId = value.trim();

      if (!UUID_REGEX.test(ownerId)) {
        throw new Error(`${context} has an invalid ${key}; expected a UUID`);
      }

      return ownerId;
    }
  }

  return null;
}

function readOptionalText(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key];

  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

/** Normalises a date-like value to the `YYYY-MM-DD` form used by `seen_jobs`. */
function readOptionalDate(
  source: Record<string, unknown>,
  key: string,
  context: string,
): string | null {
  const value = source[key];

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(
      `${context} has an invalid ${key}; expected an ISO date string`,
    );
  }

  return new Date(value).toISOString().slice(0, 10);
}

function readOptionalInt(
  source: Record<string, unknown>,
  key: string,
  context: string,
): number | null {
  const value = source[key];

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${context} has an invalid ${key}; expected an integer`);
  }

  return value;
}

/** Accepts `{ items }` (or a few common aliases) and a bare array. */
function resolveRawItems(payload: unknown, taskId: string): unknown[] {
  const raw = Array.isArray(payload)
    ? payload
    : isJsonObject(payload)
      ? (payload.items ?? payload.postings ?? payload.jobs ?? payload.vacancies)
      : undefined;

  if (!Array.isArray(raw)) {
    throw new Error(
      `Task ${taskId} has no posting pool; expected { u_id, items: [...] }`,
    );
  }

  if (raw.length === 0) {
    throw new Error(`Task ${taskId} has an empty posting pool`);
  }

  return raw;
}

function parsePosting(
  taskId: string,
  index: number,
  raw: unknown,
  defaultOwnerId: string | null,
): JobPostingItemPayload {
  const context = `Task ${taskId} item ${index}`;

  if (!isJsonObject(raw)) {
    throw new Error(`${context} must be a JSON object`);
  }

  const uId = resolveOwnerId(raw, context) ?? defaultOwnerId;

  if (!uId) {
    throw new Error(`${context} has no u_id; expected an owner UUID`);
  }

  const jobKey = readRequiredText(raw, ['job_key', 'jobKey'], 'job_key', context);

  if (jobKey.length > JOB_KEY_MAX_LENGTH) {
    throw new Error(
      `${context} has an invalid job_key; expected at most ${JOB_KEY_MAX_LENGTH} characters`,
    );
  }

  return {
    u_id: uId,
    job_key: jobKey,
    title: readRequiredText(raw, ['title', 'role'], 'title', context),
    company: readRequiredText(raw, ['company'], 'company', context),
    url: readRequiredText(raw, ['url'], 'url', context),
    first_seen:
      readOptionalDate(raw, 'first_seen', context) ??
      new Date().toISOString().slice(0, 10),
    status: readOptionalText(raw, 'status') ?? DEFAULT_STATUS,
    portal: readOptionalText(raw, 'portal') ?? DEFAULT_PORTAL,
    source: readOptionalText(raw, 'source') ?? DEFAULT_SOURCE,
    location: readOptionalText(raw, 'location'),
    posted_date: readOptionalDate(raw, 'posted_date', context),
    deadline: readOptionalDate(raw, 'deadline', context),
    fit: readOptionalText(raw, 'fit'),
    rank_score: readOptionalInt(raw, 'rank_score', context),
  };
}

/**
 * Validates and normalises the payload of a `job_posting_processing` job.
 * Errors include the task id and item index so a malformed pool can be traced
 * back to the queue row that produced it.
 */
export function parseJobPostingPayload(
  taskId: string,
  payload: unknown,
): JobPostingPayload {
  const rawItems = resolveRawItems(payload, taskId);
  const defaultOwnerId = isJsonObject(payload)
    ? resolveOwnerId(payload, `Task ${taskId}`)
    : isJsonObject(rawItems[0])
      ? resolveOwnerId(rawItems[0], `Task ${taskId}`)
      : null;

  return {
    items: rawItems.map((raw, index) =>
      parsePosting(taskId, index, raw, defaultOwnerId),
    ),
  };
}
