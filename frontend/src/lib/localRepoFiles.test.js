import { describe, expect, it } from 'vitest';

import { configuredMaxFiles, localRepoFilePreflight } from './localRepoFiles.js';

describe('configuredMaxFiles', () => {
  it('reads a positive safe integer from JSON text or a parsed object', () => {
    expect(configuredMaxFiles('{"max_files":4000}')).toBe(4000);
    expect(configuredMaxFiles({ max_files: 1200 })).toBe(1200);
  });

  it.each([
    ['', null],
    ['not JSON', null],
    ['[]', null],
    ['{}', null],
    ['{"max_files":"4000"}', null],
    ['{"max_files":0}', null],
    ['{"max_files":-1}', null],
    ['{"max_files":1.5}', null],
    [`{"max_files":${Number.MAX_SAFE_INTEGER + 1}}`, null],
  ])('treats %s as having no comparable limit', (configuration, expected) => {
    expect(configuredMaxFiles(configuration)).toBe(expected);
  });
});

describe('localRepoFilePreflight', () => {
  it('derives within-limit and exact-limit presentations', () => {
    expect(localRepoFilePreflight(3842, 4000)).toMatchObject({
      kind: 'within',
      summary: '3,842 / 4,000 files',
      remaining: 158,
      overBy: null,
      isOverLimit: false,
    });
    expect(localRepoFilePreflight(4000, 4000)).toMatchObject({
      kind: 'at_limit',
      remaining: 0,
      isOverLimit: false,
    });
  });

  it('keeps exact over-limit copy advisory', () => {
    expect(localRepoFilePreflight(4250, 4000)).toEqual({
      kind: 'over_limit',
      fileCount: 4250,
      maxFiles: 4000,
      complete: true,
      isOverLimit: true,
      remaining: null,
      overBy: 250,
      summary: '4,250 / 4,000 files',
      detail: 'This folder is 250 files over max_files. Workflows that treat it as a limit may fail or skip files.',
    });
  });

  it('shows an exact count without comparison when max_files is unavailable', () => {
    expect(localRepoFilePreflight(4250, null)).toMatchObject({
      kind: 'advisory',
      summary: '4,250 files',
      maxFiles: null,
      complete: true,
      isOverLimit: false,
    });
  });

  it('does not claim an incomplete lower-bound count is within the limit', () => {
    expect(localRepoFilePreflight(3800, 4000, { complete: false })).toMatchObject({
      kind: 'advisory',
      summary: 'At least 3,800 / 4,000 files',
      remaining: null,
      overBy: null,
      complete: false,
      isOverLimit: false,
    });
    expect(localRepoFilePreflight(4000, 4000, { complete: false })).toMatchObject({
      kind: 'advisory',
      complete: false,
      isOverLimit: false,
    });
  });

  it('reports only the proven minimum overage for an incomplete count', () => {
    expect(localRepoFilePreflight(4250, 4000, { complete: false })).toEqual({
      kind: 'over_limit',
      fileCount: 4250,
      maxFiles: 4000,
      complete: false,
      isOverLimit: true,
      remaining: null,
      overBy: 250,
      summary: 'At least 4,250 / 4,000 files',
      detail:
        'This folder is at least 250 files over max_files. Workflows that treat it as a limit may fail or skip files.',
    });
  });

  it('handles zero files and rejects unusable count values', () => {
    expect(localRepoFilePreflight(0, 4000)).toMatchObject({
      kind: 'within',
      summary: '0 / 4,000 files',
      remaining: 4000,
    });
    expect(localRepoFilePreflight(-1, 4000)).toBeNull();
    expect(localRepoFilePreflight(1.5, 4000)).toBeNull();
    expect(localRepoFilePreflight('10', 4000)).toBeNull();
  });
});
