import { describe, expect, it } from 'vitest';
import { buildSeenJobChanges } from './seen-job-update.util.js';

describe('buildSeenJobChanges', () => {
  it('keeps only the fields that are present', () => {
    const changes = buildSeenJobChanges({
      title: '  Engineer  ',
      status: 'applied',
    });

    expect(changes).toEqual({ title: 'Engineer', status: 'applied' });
  });

  it('ignores undefined fields', () => {
    expect(buildSeenJobChanges({ company: undefined })).toEqual({});
  });

  it('normalises optional text and string arrays', () => {
    const changes = buildSeenJobChanges({
      location: '  ',
      fit: ' good ',
      strengths: [' Java ', '', 'SQL'],
      gaps: null,
    });

    expect(changes).toEqual({
      location: null,
      fit: 'good',
      strengths: ['Java', 'SQL'],
      gaps: null,
    });
  });

  it('rejects a blank required field', () => {
    expect(() => buildSeenJobChanges({ title: '   ' })).toThrow(
      /title must be a non-empty string/,
    );
  });
});
