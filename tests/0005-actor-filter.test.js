import { expect, test, vi } from 'vitest';
import { GROUP, groupsOf } from '../src/journey.js';
import { ORG_REPOS, repo, repoDocs } from './github.js';

const FIRST = `${ORG_REPOS}1`;

import { KEY, nodeOf, ORG, openPage } from './page.js';

const CLOCK_KEY = 'g_clock';
const CLOCK = `# 0003 Clock

- 0003.1
    - Given Clock reads noon
        - When the alarm rings
            - Then it stops
`;

const choose = (/** @type {import('./page.js').Page} */ page, /** @type {string} */ group) => {
  page.ui.group.value = group;
  page.ui.group.dispatchEvent(new page.window.Event('change'));
};

const opened = async () => {
  const page = openPage({
    routes: {
      ...ORG,
      [FIRST]: { body: [...ORG[FIRST].body, repo('timer')] },
      ...repoDocs('timer', { '0003-clock.md': CLOCK }),
    },
  });
  await vi.waitFor(() => expect(nodeOf(page, KEY.writer)).not.toBeNull());
  return page;
};

test('0005.1 the filter offers App users, Developers and Both, with Both chosen', async () => {
  const page = await opened();
  const options = [.../** @type {HTMLSelectElement} */ (/** @type {unknown} */ (page.ui.group)).options];
  expect(options.map((o) => [o.value, o.textContent])).toEqual([
    [GROUP.both, 'Both'],
    [GROUP.users, 'App users'],
    [GROUP.developers, 'Developers'],
  ]);
  expect(page.ui.group.value).toBe(GROUP.both);
  expect(nodeOf(page, KEY.writer)).not.toBeNull();
});

test('0005.2 choosing a group redraws only its acceptances without a new fetch', async () => {
  const page = await opened();
  const calls = page.github.calls.length;
  choose(page, GROUP.developers);
  await vi.waitFor(() => expect(nodeOf(page, KEY.writer)).toBeNull());
  expect(page.ui.graphNote.textContent).toMatch(/^3 terms\./);
  choose(page, GROUP.users);
  await vi.waitFor(() => expect(nodeOf(page, KEY.writer)).not.toBeNull());
  expect(page.ui.graphNote.textContent).toMatch(/^5 terms\./);
  expect(page.github.calls).toHaveLength(calls);
  expect([...groupsOf({ givens: ['App developer has a plugin', 'Guest joins'] })]).toEqual([
    GROUP.developers,
    GROUP.users,
  ]);
});

test('0005.3 a Given spoken as I, you or we counts as an app user', () => {
  expect([...groupsOf({ givens: ['I open May for the first time'] })]).toEqual([GROUP.users]);
  expect([...groupsOf({ givens: ['You have a connection'] })]).toEqual([GROUP.users]);
  expect([...groupsOf({ givens: ['We share a list'] })]).toEqual([GROUP.users]);
  expect([...groupsOf({ givens: ['Inbox has mail'] })]).toEqual([]);
});

test('0005.4 an acceptance that fits neither group is counted and stays under Both', async () => {
  const page = await opened();
  expect(page.ui.groupNote.textContent).toBe('1 acceptances fit neither group, so they show only under Both.');
  expect(nodeOf(page, CLOCK_KEY)).toBeNull();
  page.ui.min.value = '1';
  choose(page, GROUP.users);
  await vi.waitFor(() => expect(page.ui.graphNote.textContent).toMatch(/^5 terms\./));
  expect(nodeOf(page, CLOCK_KEY)).toBeNull();
  choose(page, GROUP.both);
  await vi.waitFor(() => expect(nodeOf(page, CLOCK_KEY)).not.toBeNull());
});
