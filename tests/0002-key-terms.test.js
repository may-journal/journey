import { expect, test } from 'vitest';
import { flatten, KINDS, keyTerm, parseDoc, splitClause, termsOf } from '../src/journey.js';
import { EDIT, SYNC } from './page.js';

const [GIVEN, WHEN, THEN] = KINDS;

test('0002.1 each acceptance keeps its ID, line, Source and clause texts', () => {
  const doc = parseDoc(`${SYNC}- 0001.3\r\n- not an acceptance\n# 0009 Second heading\n`);
  expect(doc.id).toBe('0001');
  expect(doc.name).toBe('Sync');
  expect(doc.source).toEqual({ line: 7, path: 'src/sync.js' });
  expect(doc.acceptances.map((a) => a.id)).toEqual(['0001.1', '0001.2', '0001.3']);
  expect(doc.acceptances[1]).toEqual({
    givens: ['Writer has no network, and a full disk'],
    id: '0001.2',
    line: 11,
    thens: ['the app warns'],
    whens: [EDIT],
  });
  expect(parseDoc('- Given Writer before any acceptance\n')).toEqual({
    acceptances: [],
    id: null,
    name: null,
    source: null,
  });
  const bare = { ...parseDoc('- 0001.1\n'), path: 'docs/requirements/README.md', url: 'u' };
  expect(flatten([{ branch: 'main', docs: [bare], repo: 'x' }])[0].doc).toBe(bare.path);
});

test('0002.2 compound clauses split on commas and "and", and code spans drop out', () => {
  expect(splitClause('Writer has `a, b` and   a disk, Band member')).toEqual(['Writer has', 'a disk', 'Band member']);
  expect(splitClause('`only code`')).toEqual([]);
});

test('0002.3 Given and Then keep the first word left after filler words and pronouns', () => {
  expect(keyTerm("The owner's 3 repos", GIVEN)).toBe('owner');
  expect(keyTerm('I have two --dry-run flags', GIVEN)).toBe('dry-run');
  expect(keyTerm('it is saved locally', THEN)).toBe('saved');
  expect(keyTerm('it is the one', THEN)).toBeNull();
  expect(keyTerm("it doesn't crash", THEN)).toBe('not-crash');
  expect(keyTerm('it is not saved', THEN)).toBe('not-saved');
  expect(keyTerm('it won’t sync', THEN)).toBe('not-sync');
  expect(keyTerm("they can't sign in", THEN)).toBe('not-sign');
  expect(keyTerm("you're signed in", GIVEN)).toBe('signed');
  expect(termsOf(['Writer has no network, and a writer', 'it'], GIVEN)).toEqual(['writer']);
});

test('0002.4 When keeps its action verb past a leading "the noun"', () => {
  expect(keyTerm('the page reads it', WHEN)).toBe('reads');
  expect(keyTerm(EDIT, WHEN)).toBe('edit');
  expect(keyTerm('the build', WHEN)).toBe('build');
});
