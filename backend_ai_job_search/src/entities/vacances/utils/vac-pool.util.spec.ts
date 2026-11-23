import { describe, expect, it } from 'vitest';
import {
  collectMissingCreateFields,
  POOL_MAX_BATCH_SIZE,
  POOL_REQUIRED_CREATE_FIELDS,
  resolvePoolLimit,
} from './vac-pool.util.js';

describe('resolvePoolLimit', () => {
  it('defaults to the whole pool window', () => {
    expect(resolvePoolLimit()).toBe(POOL_MAX_BATCH_SIZE);
  });

  it('accepts an explicit batch size inside the window', () => {
    expect(resolvePoolLimit(1)).toBe(1);
    expect(resolvePoolLimit(25)).toBe(25);
    expect(resolvePoolLimit(POOL_MAX_BATCH_SIZE)).toBe(POOL_MAX_BATCH_SIZE);
  });

  it('rejects values outside the window', () => {
    expect(() => resolvePoolLimit(0)).toThrow(/between 1 and/);
    expect(() => resolvePoolLimit(-5)).toThrow(/between 1 and/);
    expect(() => resolvePoolLimit(POOL_MAX_BATCH_SIZE + 1)).toThrow(
      /between 1 and/,
    );
  });

  it('rejects non-integer values', () => {
    expect(() => resolvePoolLimit(2.5)).toThrow(/between 1 and/);
  });
});

describe('collectMissingCreateFields', () => {
  const complete = {
    date_pub: '2026-01-01',
    company: 'ACME',
    status: 'new',
    role: 'Engineer',
    fit_rating: 0,
    source: 'https://example.com',
    note: 'note',
    chanel: 'linkedin',
  };

  it('reports nothing for a complete posting', () => {
    expect(collectMissingCreateFields(complete)).toEqual([]);
  });

  it('keeps a fit rating of 0', () => {
    expect(collectMissingCreateFields(complete)).not.toContain('fit_rating');
  });

  it('reports every missing field in a stable order', () => {
    expect(collectMissingCreateFields({})).toEqual([
      ...POOL_REQUIRED_CREATE_FIELDS,
    ]);
  });

  it('treats null and blank strings as missing', () => {
    expect(
      collectMissingCreateFields({
        ...complete,
        note: null,
        chanel: '   ',
      }),
    ).toEqual(['note', 'chanel']);
  });
});
