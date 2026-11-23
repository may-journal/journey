import { expect, test } from 'vitest';
import { buildGraph, flatten, foldPlurals, KINDS, keyTerm, parseDoc, splitClause, termsOf } from '../src/journey.js';
import { EDIT, NESTED, SYNC } from './page.js';

const [GIVEN, WHEN, THEN] = KINDS;

test('0002.1 each acceptance keeps its ID, line and clause texts at either indent', () => {
  const doc = parseDoc(`${SYNC}- 0001.3\r\n- not an acceptance\n# 0009 Second heading\n`);
  expect(doc.id).toBe('0001');
  expect(doc.name).toBe('Sync');
  expect(doc.acceptances.map((a) => a.id)).toEqual(['0001.1', '0001.2', '0001.3']);
  expect(doc.acceptances[1]).toEqual({
    givens: ['Writer has no network, and a full disk'],
    id: '0001.2',
    line: 9,
    thens: ['the app warns'],
    whens: [EDIT],
  });
  expect(parseDoc('- Given Writer before any acceptance\n')).toEqual({
    acceptances: [],
    id: null,
    name: null,
  });
  const nested = parseDoc(NESTED);
  expect(nested.acceptances.map((a) => a.line)).toEqual([19, 23]);
  const unlined = (a) => ({ ...a, line: 0 });
  expect(nested.acceptances.map(unlined)).toEqual(doc.acceptances.slice(0, 2).map(unlined));
  const bare = { ...parseDoc('- 0001.1\n'), path: 'docs/requirements/README.md', url: 'u' };
  expect(flatten([{ docs: [bare], repo: 'x' }])[0].doc).toBe(bare.path);
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

test('0002.5 a plural term joins its singular when both are seen, and stays as written alone', () => {
  const one = (given, then) => ({ givens: [given], thens: [then], whens: [EDIT] });
  const graph = buildGraph([
    one('Writer, and a box', 'it syncs'),
    one('Writers, and boxes, and a writer', 'it is saved'),
    one('Entries, and guests', 'it is not saved'),
    one('Entry', 'it syncs'),
  ]);
  const counts = Object.fromEntries([...graph.nodes.values()].map((n) => [n.key, n.acceptances]));
  expect(counts).toEqual({
    g_box: [0, 1],
    g_entry: [2, 3],
    g_guests: [2],
    g_writer: [0, 1],
    t_not_saved: [2],
    t_saved: [1],
    t_syncs: [0, 3],
    w_edit: [0, 1, 2, 3],
  });
  expect(graph.edges.get('g_writer>w_edit').weight).toBe(2);
  const root = 'prince';
  const chain = [...foldPlurals([root, 'princes', 'princess']).values()];
  expect(chain).toEqual([root, root]);
});
