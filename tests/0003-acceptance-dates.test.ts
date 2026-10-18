import { expect, test } from 'vitest';
import {
  buildGraph,
  ERROR,
  fetchDocDates,
  makeClient,
  parseDoc,
  pickDates,
  recentKeys,
  selectGraph,
  toMermaid,
} from '../src/core.ts';
import { API, base64, RATE_LIMITED, replay } from './github.ts';

const PATH = 'docs/requirements/0001-sync.md';
const ONE =
  '# 0001 Sync\n\n- 0001.1\n    - Given Writer is offline\n        - When I edit\n            - Then it saves\n';
const TWO = `${ONE}- 0001.2\n    - Given Writer is online\n        - When I edit\n            - Then it syncs\n`;
const COMMITS = `${API}/repos/may-journal/app/commits?sha=main&path=${encodeURIComponent(PATH)}&per_page=100`;
const version = (sha) => `${API}/repos/may-journal/app/contents/${PATH}?ref=${sha}`;
const commit = (sha, day) => ({
  commit: { committer: { date: `2026-10-${day}T00:00:00Z` } },
  html_url: `c/${sha}`,
  sha,
});
const stamp = (sha, day) => ({ date: `2026-10-${day}T00:00:00Z`, url: `c/${sha}` });
const range = (startingLine, endingLine, sha, day) => ({
  commit: { committedDate: `2026-10-${day}T00:00:00Z`, url: `c/${sha}` },
  endingLine,
  startingLine,
});
const blame = (ranges) => ({ body: { data: { repository: { object: { blame: { ranges } } } } } });
const history = { body: [commit('c3', '09'), commit('c2', '05'), commit('c1', '01')] };
const dates = (routes, maxVersions = 25) => {
  const github = replay(routes);
  const client = makeClient({ ...github, token: 't' });
  return fetchDocDates({ branch: 'main', client, ids: ['0001.1', '0001.2'], maxVersions, path: PATH, repo: 'app' });
};

test('0003.1 modified is the newest blame commit over its lines, added the oldest version with its id', async () => {
  const found = await dates({
    [COMMITS]: history,
    [`graphql:${PATH}`]: blame([
      range(1, 3, 'c1', '01'),
      range(4, 6, 'c3', '09'),
      range(7, 7, 'c2', '05'),
      range(8, 10, 'c2', '05'),
    ]),
    [version('c1')]: { body: { content: base64(ONE) } },
    [version('c2')]: { body: { content: base64(TWO) } },
  });
  const [first, second] = parseDoc(TWO).acceptances;
  expect(pickDates(first, found)).toEqual({
    added: { ...stamp('c1', '01'), approx: false },
    modified: stamp('c3', '09'),
  });
  expect(pickDates(second, found)).toEqual({
    added: { ...stamp('c2', '05'), approx: false },
    modified: stamp('c2', '05'),
  });
});

test('0003.2 when the history walk stops early, added is the first commit marked approximate', async () => {
  const routes = {
    [COMMITS]: history,
    [`graphql:${PATH}`]: blame([]),
    [version('c1')]: { body: { content: base64(ONE) } },
  };
  const [first, second] = parseDoc(TWO).acceptances;
  const rateLimited = await dates({ ...routes, [version('c2')]: RATE_LIMITED });
  expect(pickDates(second, rateLimited)).toEqual({ added: { ...stamp('c1', '01'), approx: true }, modified: null });
  const tooDeep = await dates(routes, 1);
  expect(pickDates(first, tooDeep).added.approx).toBe(false);
  expect(pickDates(second, tooDeep).added).toEqual({ ...stamp('c1', '01'), approx: true });
});

test("0003.3 a failed blame query fails that doc's dates with GitHub's message", async () => {
  const failing = (type) => ({ body: { errors: [{ message: `blame said ${type}`, type }] } });
  await expect(dates({ [`graphql:${PATH}`]: failing('NOT_FOUND') })).rejects.toMatchObject({
    kind: ERROR.HTTP,
    message: 'blame said NOT_FOUND',
  });
  await expect(dates({ [`graphql:${PATH}`]: failing('RATE_LIMITED') })).rejects.toMatchObject({ kind: ERROR.RATE });
});

test('0003.4 only terms where most acceptances changed in the window carry a dot', () => {
  const graph = buildGraph([
    { givens: ['Writer is offline'], thens: [], whens: [] },
    { givens: ['Writer is online'], thens: [], whens: [] },
    { givens: ['Writer edits'], thens: [], whens: [] },
    { givens: ['Owner signs in'], thens: [], whens: [] },
  ]);
  const since = '2026-10-04T00:00:00Z';
  const modified = ['2026-10-05T00:00:00Z', '2026-10-09T00:00:00Z', '2026-09-01T00:00:00Z', undefined];
  expect(recentKeys(graph, modified, since)).toEqual(new Set(['g_writer']));
  expect(recentKeys(graph, [modified[0]], since)).toEqual(new Set());
  const text = toMermaid(selectGraph(graph, { cap: 2, min: 1 }), recentKeys(graph, modified, since));
  expect(text).toBe('flowchart LR\n  g_writer("writer · 3 •"):::given\n  g_owner("owner · 1"):::given\n');
});
