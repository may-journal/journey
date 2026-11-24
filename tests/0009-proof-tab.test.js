import { expect, test, vi } from 'vitest';
import { ERROR, makeClient, parseDoc } from '../src/journey.js';
import { CHOSEN } from '../src/page.js';
import { BUCKET, CONCLUSION, fetchProof, judge, LIST, RED, STATUS } from '../src/proof.js';
import { ORG_REPOS, RATE_LIMITED, replay, repo, repoDocs, runs, suiteRun } from './github.js';
import { APP, CHECK, changed, click, KEY, ORG, openPage, SYNC, TOOLS } from './page.js';

const FAILED = { annotation_level: CONCLUSION.failure, message: 'tests: 0001.2 the app warns failed', title: 'tests' };
const PROOF = { ...ORG, ...suiteRun(APP, { annotations: [FAILED] }) };
const RUN_KEY = 'w_run';
const ALARMS = 'alarms';

const opened = async (routes = PROOF) => {
  const page = openPage({ routes });
  await vi.waitFor(() => expect(page.ui.proofBadge.textContent).not.toBe(''));
  return page;
};

const openProof = async (routes) => {
  const page = await opened(routes);
  click(page, page.ui.tabProof);
  return page;
};

// Each cell's parts, such as a badge and its reason, joined by spaces.
const rows = (page) =>
  [...page.ui.unprovenRows.querySelectorAll('tr')].map((tr) =>
    [...tr.cells].map((td) => [...td.childNodes].map((node) => node.textContent).join(' '))
  );

// The style line Mermaid gets right after the edge from `from` to `to`.
const linkStyle = (text, from, to) => {
  const lines = text.split('\n');
  const at = lines.findIndex((line) => new RegExp(`^ {2}${from} -->\\|\\d+\\| ${to}$`).test(line));
  return at < 0 ? null : lines[at + 1];
};

test('0009.1 a Proof tab sits beside Graph with a count of unproven promises', async () => {
  const page = await opened();
  expect(page.ui.tabGraph.textContent).toBe('Graph');
  expect(page.ui.tabProof.textContent).toBe('Proof 1 unproven');
  expect(page.ui.tabGraph.getAttribute(CHOSEN)).toBe('true');
  expect(page.ui.proofPanel.hidden).toBe(true);
  expect(page.ui.unprovenCard.hidden).toBe(true);
});

test('0009.2 the Proof tab states the total proven and gives each repo a tile', async () => {
  const page = await openProof();
  expect(page.ui.tabProof.getAttribute(CHOSEN)).toBe('true');
  expect(page.ui.tabGraph.getAttribute(CHOSEN)).toBe('false');
  expect(page.ui.proofPanel.hidden).toBe(false);
  expect(page.ui.proofTitle.textContent).toBe('1 of 3 promises proven');
  expect([...page.ui.proofLegend.children].map((el) => el.textContent)).toEqual([
    'Proven · 1',
    'Unproven · 1',
    'Not run in 7 days · 1',
  ]);
  const tiles = [...page.ui.tiles.children].map((tile) => [...tile.children].map((el) => el.textContent));
  expect(tiles).toEqual([
    [APP, '2', '', '1 unproven'],
    [TOOLS, '1', '', '1 not run'],
  ]);
  const bar = page.ui.tiles.querySelector('.bar');
  expect([...bar.children].map((span) => [span.className, span.style.width])).toEqual([
    [BUCKET.proven, '50%'],
    [BUCKET.unproven, '50%'],
    [BUCKET.notRun, '0%'],
  ]);
  click(page, page.ui.tabGraph);
  expect(page.ui.proofPanel.hidden).toBe(true);
});

test('0009.3 a link carrying a failed, skipped or untested promise draws red', async () => {
  const page = await opened();
  const last = () => page.mermaid.texts.at(-1);
  expect(linkStyle(last(), KEY.writer, KEY.edit)).toMatch(new RegExp(`,stroke:${RED.light}$`));
  page.ui.min.value = '1';
  changed(page, page.ui.min);
  await vi.waitFor(() => expect(linkStyle(last(), KEY.developer, RUN_KEY)).not.toBeNull());
  expect(linkStyle(last(), KEY.developer, RUN_KEY)).not.toContain('stroke:');
  expect(linkStyle(last(), KEY.edit, 't_saved')).not.toContain('stroke:');
  page.setDark(true);
  await vi.waitFor(() => expect(linkStyle(last(), KEY.writer, KEY.edit)).toContain(`,stroke:${RED.dark}`));
});

test('0009.4 a table lists each unproven promise, its path and why, the first rows until List all', async () => {
  const page = await openProof();
  expect(page.ui.unprovenCard.hidden).toBe(false);
  expect(page.ui.unprovenTitle.textContent).toBe('Unproven · 2 of 3 promises shown');
  const [warns, passes] = [parseDoc(SYNC).acceptances[1], parseDoc(CHECK).acceptances[0]].map((a) => a.thens[0]);
  expect(rows(page)).toEqual([
    [`${APP} · 0001.2`, warns, 'writer full edit app', `Failed ${FAILED.message}`],
    [`${TOOLS} · 0002.1`, passes, 'developer run passes', 'Not run no Fitness suite run in 7 days'],
  ]);
  const links = [...page.ui.unprovenRows.querySelectorAll('a')].map((a) => a.href);
  expect(links).toContain(`https://github.com/may-journal/${APP}/actions/runs/1`);
  expect(page.ui.listAll.hidden).toBe(true);

  const many = Array.from(
    { length: LIST + 2 },
    (_, i) => `- 0003.${i + 1}\n  - Given Clock reads noon\n    - When the alarm rings\n      - Then it stops\n`
  );
  const long = await openProof({
    ...PROOF,
    [`${ORG_REPOS}1`]: { body: [...ORG[`${ORG_REPOS}1`].body, repo(ALARMS)] },
    ...repoDocs(ALARMS, { '0003-clock.md': `# 0003 Clock\n\n${many.join('')}` }),
    ...suiteRun(TOOLS, { conclusion: CONCLUSION.success, id: 2 }),
  });
  expect(long.ui.tiles.children[2].textContent).toBe(`${TOOLS}1All proven`);
  expect(rows(long)).toHaveLength(LIST);
  expect(long.ui.listAll.textContent).toBe(`List all ${LIST + 3}`);
  click(long, long.ui.listAll);
  expect(rows(long)).toHaveLength(LIST + 3);
  expect(long.ui.listAll.hidden).toBe(true);
});

const proofOf = async (routes, names = [APP]) => {
  const { fetchImpl } = replay(routes);
  const get = makeClient({ fetchImpl, onRate: () => {}, token: 't' });
  return fetchProof({ get, limit: 2, repos: names });
};

const promise = (id) => ({ id, repo: APP });
const [FIRST, THIRD, FOURTH, THIRTY_FIRST] = ['0001.1', '0001.3', '0001.4', '0001.31'].map(promise);

test('0009.5 each promise is judged by its repo’s newest Fitness suite run from the last week alone', async () => {
  const skipped = { annotation_level: 'warning', message: '0001.1 was skipped', title: '' };
  const untested = { annotation_level: CONCLUSION.failure, message: 'requirements: no test names 0001.3', title: '' };
  const warned = { annotation_level: 'warning', message: 'Node 20 is deprecated; 0001.4 ran', title: '' };
  const run = (await proofOf(suiteRun(APP, { annotations: [skipped, untested, warned] }))).get(APP);
  expect(run.url).toBe(`https://github.com/may-journal/${APP}/actions/runs/1`);
  expect(judge(FIRST, run).status).toBe(STATUS.skipped);
  expect(judge(THIRD, run).status).toBe(STATUS.noTest);
  expect(judge(FOURTH, run).status).toBe(STATUS.proven);
  expect(judge(THIRTY_FIRST, run).status).toBe(STATUS.proven);
  expect(judge(THIRD, undefined)).toEqual({ detail: 'no Fitness suite run in 7 days', status: STATUS.notRun });

  const old = (await proofOf(suiteRun(APP, { conclusion: CONCLUSION.success, hoursAgo: 8 * 24 }))).get(APP);
  expect(judge(FIRST, old).status).toBe(STATUS.notRun);
  const passed = (await proofOf(suiteRun(APP, { conclusion: CONCLUSION.success, step: undefined }))).get(APP);
  expect(judge(FIRST, passed).status).toBe(STATUS.proven);
  const stopped = (await proofOf(suiteRun(APP, { step: 'skipped' }))).get(APP);
  expect(judge(FIRST, stopped)).toEqual({
    detail: 'the newest run stopped before its tests',
    status: STATUS.notRun,
    url: stopped.url,
  });
  const cancelled = (await proofOf(suiteRun(APP, { conclusion: 'cancelled' }))).get(APP);
  expect(judge(FIRST, cancelled).status).toBe(STATUS.notRun);
  const denied = (await proofOf({ [runs(APP)]: { body: { message: 'Forbidden' }, status: 403 } })).get(APP);
  expect(judge(FIRST, denied)).toEqual({
    detail: 'its runs are unreadable: GitHub answered 403.',
    status: STATUS.notRun,
  });

  await expect(proofOf({ [runs(APP)]: RATE_LIMITED }, [APP, TOOLS])).rejects.toMatchObject({ kind: ERROR.RATE });
  const page = openPage({ routes: { ...PROOF, [runs(TOOLS)]: RATE_LIMITED } });
  await vi.waitFor(() => expect(page.ui.errors.textContent).toContain("GitHub's rate limit is used up."));
  expect(page.ui.proofBadge.textContent).toBe('');
});
