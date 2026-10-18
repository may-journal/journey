import { expect, test } from 'vitest';
import { ERROR, fetchJourney, flatten, makeClient } from '../src/core.ts';
import { API, base64, ORG_REPOS, RATE_LIMITED, RESET, replay } from './github.ts';

const APP = 'app';
const BROKEN = 'broken';
const ID = '0001.1';
const PATH = 'docs/requirements/0001-sync.md';
const DOC =
  '# 0001 Sync\n\n- 0001.1\n    - Given Writer is offline\n        - When I edit\n            - Then it saves\n';
const repo = (name, extra = {}) => ({ archived: false, default_branch: 'main', name, ...extra });
const listing = (name) => `${API}/repos/may-journal/${name}/contents/docs/requirements`;
const file = (name, path) => ({
  html_url: `https://github.com/may-journal/${name}/blob/main/${path}`,
  name: path.split('/').pop(),
  path,
  type: 'file',
  url: `${API}/repos/may-journal/${name}/contents/${path}`,
});
const docRoute = (text) => ({ [file(APP, PATH).url]: { body: { content: base64(text) } } });
const load = (routes) => {
  const github = replay(routes);
  return { github, run: fetchJourney({ client: makeClient({ ...github, token: 't' }), limit: 3 }) };
};

test("0002.1 the page lists repos page by page and reads each repo's docs", async () => {
  const first = Array.from({ length: 99 }, (_, i) => repo(`empty-${String(i).padStart(2, '0')}`));
  const sourced = DOC.replace('\n\n', '\n\nSource: `src/sync.js:7`\n\n');
  const { github, run } = load({
    [`${ORG_REPOS}1`]: { body: [...first, repo('old', { archived: true })] },
    [`${ORG_REPOS}2`]: { body: [repo(APP)] },
    [listing(APP)]: {
      body: [file(APP, PATH), file(APP, 'docs/requirements/notes.txt'), { ...file(APP, 'docs/x'), type: 'dir' }],
    },
    ...docRoute(sourced),
  });
  const results = await run;
  expect(results).toHaveLength(100);
  expect(results.map((r) => r.repo)).not.toContain('old');
  expect(results.find((r) => r.repo === APP).docs.map((d) => d.file)).toEqual(['0001-sync.md']);
  expect(flatten(results)).toMatchObject([
    {
      doc: '0001 Sync',
      id: ID,
      repo: APP,
      source: 'https://github.com/may-journal/app/blob/main/src/sync.js#L7',
      url: `https://github.com/may-journal/app/blob/main/${PATH}?plain=1#L5`,
    },
  ]);
  expect(github.rates[0]).toEqual({ limit: 5000, remaining: 4999, reset: RESET, resource: 'core' });
});

test('0002.2 a repo that fails carries an error while the others still load', async () => {
  const { run } = load({
    [`${ORG_REPOS}1`]: { body: [repo(APP), repo(BROKEN)] },
    [listing(APP)]: { body: [file(APP, PATH)] },
    [listing(BROKEN)]: { body: { message: 'Server Error' }, status: 500 },
    ...docRoute(DOC),
  });
  const results = await run;
  expect(results.find((r) => r.repo === BROKEN)).toEqual({ docs: [], error: 'GitHub answered 500.', repo: BROKEN });
  expect(flatten(results)).toMatchObject([{ id: ID, source: null }]);
});

test('0002.3 a wrong or expired token says GitHub rejected it', async () => {
  const { run } = load({ [`${ORG_REPOS}1`]: { body: { message: 'Bad credentials' }, status: 401 } });
  await expect(run).rejects.toMatchObject({
    kind: ERROR.TOKEN,
    message: expect.stringContaining('rejected the token'),
  });
});

test('0002.4 a used-up rate limit says so and when it resets', async () => {
  const when = new Date(RESET * 1000).toLocaleTimeString();
  const { run } = load({ [`${ORG_REPOS}1`]: { body: [repo(APP)] }, [listing(APP)]: RATE_LIMITED });
  await expect(run).rejects.toMatchObject({
    kind: ERROR.RATE,
    message: `GitHub's rate limit is used up. It resets at ${when}.`,
  });

  const secondary = { body: { message: 'secondary rate limit' }, headers: { 'retry-after': '60' }, status: 403 };
  const later = load({ [`${ORG_REPOS}1`]: secondary }).run;
  await expect(later).rejects.toMatchObject({ kind: ERROR.RATE, reset: expect.any(Number) });
});
