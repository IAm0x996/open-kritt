import { describe, expect, it } from 'vitest';

import { filterAgentSkills } from './agentSkillSearch.js';

const skills = [
  {
    id: '1',
    name: 'Solidity Review',
    description: 'Review smart contracts for access-control bugs.',
    slug: 'solidity-review',
    licenseSpdx: 'MIT',
    content: 'private prompt text should not be part of search',
    sourceUrl: 'https://example.com/invisible-source-marker',
    attribution: 'Invisible attribution marker',
  },
  {
    id: '2',
    name: 'Rust Memory Safety',
    description: 'Find unsafe memory usage.',
    slug: 'rust-safety',
    licenseSpdx: 'Apache-2.0',
  },
];

describe('filterAgentSkills', () => {
  it('returns every skill when the query is empty', () => {
    expect(filterAgentSkills(skills, '')).toBe(skills);
    expect(filterAgentSkills(skills, '   ')).toBe(skills);
  });

  it('searches displayed metadata case-insensitively', () => {
    expect(filterAgentSkills(skills, '  SOLIDITY  ')).toEqual([skills[0]]);
    expect(filterAgentSkills(skills, 'rust-safety')).toEqual([skills[1]]);
    expect(filterAgentSkills(skills, 'access-control')).toEqual([skills[0]]);
    expect(filterAgentSkills(skills, 'apache-2.0')).toEqual([skills[1]]);
  });

  it('allows query terms to match across different metadata fields', () => {
    expect(filterAgentSkills(skills, 'rust apache')).toEqual([skills[1]]);
    expect(filterAgentSkills(skills, 'review mit')).toEqual([skills[0]]);
  });

  it('does not search full skill prompt content', () => {
    expect(filterAgentSkills(skills, 'private prompt')).toEqual([]);
    expect(filterAgentSkills(skills, 'invisible-source-marker')).toEqual([]);
    expect(filterAgentSkills(skills, 'attribution marker')).toEqual([]);
  });

  it('preserves the incoming newest-first order without mutation', () => {
    const original = [...skills];
    expect(filterAgentSkills(skills, 'safety')).toEqual([skills[1]]);
    expect(skills).toEqual(original);
  });

  it('handles missing collections and metadata safely', () => {
    expect(filterAgentSkills(undefined, 'review')).toEqual([]);
    expect(filterAgentSkills([{ id: '3', name: null }], 'review')).toEqual([]);
  });
});
