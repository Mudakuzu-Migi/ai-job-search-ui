import { describe, expect, it } from 'vitest';
import {
  collectMissingSeenJobCreateFields,
  resolveSeenJobPoolLimit,
  SEEN_JOB_POOL_MAX_BATCH_SIZE,
  SEEN_JOB_POOL_REQUIRED_CREATE_FIELDS,
} from './seen-job-pool.util.js';

describe('resolveSeenJobPoolLimit', () => {
  it('defaults to the whole pool window', () => {
    expect(resolveSeenJobPoolLimit()).toBe(SEEN_JOB_POOL_MAX_BATCH_SIZE);
  });

  it('accepts an explicit batch size inside the window', () => {
    expect(resolveSeenJobPoolLimit(1)).toBe(1);
    expect(resolveSeenJobPoolLimit(25)).toBe(25);
    expect(resolveSeenJobPoolLimit(SEEN_JOB_POOL_MAX_BATCH_SIZE)).toBe(
      SEEN_JOB_POOL_MAX_BATCH_SIZE,
    );
  });

  it('rejects values outside the window', () => {
    expect(() => resolveSeenJobPoolLimit(0)).toThrow(/between 1 and/);
    expect(() => resolveSeenJobPoolLimit(-5)).toThrow(/between 1 and/);
    expect(() =>
      resolveSeenJobPoolLimit(SEEN_JOB_POOL_MAX_BATCH_SIZE + 1),
    ).toThrow(/between 1 and/);
  });

  it('rejects non-integer values', () => {
    expect(() => resolveSeenJobPoolLimit(2.5)).toThrow(/between 1 and/);
  });
});

describe('collectMissingSeenJobCreateFields', () => {
  const complete = {
    title: 'Engineer',
    company: 'ACME',
    url: 'https://example.com/job/1',
    first_seen: '2026-01-01',
    status: 'new',
    portal: 'linkedin',
    source: 'feed',
  };

  it('reports nothing for a complete posting', () => {
    expect(collectMissingSeenJobCreateFields(complete)).toEqual([]);
  });

  it('reports every missing field in a stable order', () => {
    expect(collectMissingSeenJobCreateFields({})).toEqual([
      ...SEEN_JOB_POOL_REQUIRED_CREATE_FIELDS,
    ]);
  });

  it('treats blank strings as missing', () => {
    expect(
      collectMissingSeenJobCreateFields({
        ...complete,
        url: '   ',
        portal: '',
      }),
    ).toEqual(['url', 'portal']);
  });
});
