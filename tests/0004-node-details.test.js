import { expect, test, vi } from 'vitest';
import { LINKS } from '../src/page.js';
import { ORG_REPOS, repoDocs } from './github.js';
import { APP, CHECK, EDIT, KEY, nodeOf, ORG, openPage, press, selectedNodes, settle, slide, tap } from './page.js';

const FIRST = `${ORG_REPOS}1`;

const drawn = (/** @type {import('./page.js').Page} */ page, /** @type {string} */ key) =>
  vi.waitFor(() => expect(nodeOf(page, key)).not.toBeNull());

const links = (/** @type {Element} */ li) => [...li.querySelectorAll('a')].map((a) => [a.textContent, a.href]);
const items = (/** @type {import('./page.js').Page} */ page) => page.ui.detailsList.querySelectorAll('li');

test('0004.1 tapping a node lists its acceptances with doc, Source and test links', async () => {
  const page = openPage();
  await drawn(page, KEY.writer);
  tap(page, KEY.writer);
  expect(selectedNodes(page)).toEqual([nodeOf(page, KEY.writer)]);
  expect(page.ui.details.hidden).toBe(false);
  expect(page.ui.detailsTitle.textContent).toBe('given “writer” · 2 acceptances');
  expect(items(page)).toHaveLength(2);
  const doc = 'https://github.com/may-journal/app/blob/main/docs/requirements/0001-sync.md?plain=1#L11';
  expect(links(items(page)[1])).toEqual([
    ['app · 0001.2', doc],
    [LINKS.doc, doc],
    [LINKS.source, 'https://github.com/may-journal/app/blob/main/src/sync.js#L7'],
    [
      LINKS.test,
      'https://github.com/search?type=code&q=repo%3Amay-journal%2Fapp%20%220001.2%22%20-path%3Adocs%2Frequirements',
    ],
  ]);
  expect([...items(page)[1].querySelectorAll('dt, dd')].map((e) => e.textContent)).toEqual([
    'Given',
    'Writer has no network, and a full disk',
    'When',
    EDIT,
    'Then',
    'the app warns',
  ]);
  tap(page, KEY.edit);
  expect(selectedNodes(page)).toEqual([nodeOf(page, KEY.edit)]);
});

test('0004.2 Enter or Space on a focused node lists its acceptances, and other keys do nothing', async () => {
  const page = openPage();
  await drawn(page, KEY.edit);
  const node = nodeOf(page, KEY.edit);
  expect(node.getAttribute('tabindex')).toBe('0');
  expect(node.getAttribute('aria-label')).toBe('when edit, 2 acceptances');
  expect(press(page, KEY.edit, 'a')).toBe(false);
  expect(page.ui.details.hidden).toBe(true);
  expect(press(page, KEY.edit, 'Enter')).toBe(true);
  expect(page.ui.detailsTitle.textContent).toBe('when “edit” · 2 acceptances');
  slide(page, page.ui.min, 1);
  await drawn(page, KEY.developer);
  expect(selectedNodes(page)).toEqual([nodeOf(page, KEY.edit)]);
  expect(press(page, KEY.developer, ' ')).toBe(true);
  expect(links(items(page)[0]).map(([text]) => text)).toEqual(['tools · 0002.1', LINKS.doc, LINKS.test]);
});

test('0004.3 Refresh fetches every repo again and rebuilds the graph from the new docs', async () => {
  /** @type {Record<string, import('./github.js').Route>} */
  const routes = { ...ORG };
  const page = openPage({ routes });
  await drawn(page, KEY.writer);
  tap(page, KEY.writer);
  const before = page.github.calls.length;
  Object.assign(routes, repoDocs(APP, { '0001-sync.md': CHECK }));
  page.ui.refresh.click();
  await drawn(page, KEY.developer);
  expect(page.github.calls.length - before).toBe(before);
  expect(nodeOf(page, KEY.writer)).toBeNull();
  expect(page.ui.details.hidden).toBe(true);
});

test('0004.4 only the newest load draws when Refresh is chosen during a load', async () => {
  /** @type {() => void} */
  let release = () => {};
  const gate = new Promise((resolve) => (release = () => resolve(undefined)));
  /** @type {Record<string, import('./github.js').Route>} */
  const routes = { ...ORG, [FIRST]: { ...ORG[FIRST], gate } };
  const page = openPage({ routes });
  routes[FIRST] = ORG[FIRST];
  page.ui.refresh.click();
  await drawn(page, KEY.writer);
  release();
  await vi.waitFor(() => expect(page.github.calls).toHaveLength(12));
  await settle();
  expect(page.mermaid.texts).toHaveLength(1);

  /** @type {() => void} */
  let fail = () => {};
  const failing = new Promise((resolve) => (fail = () => resolve(undefined)));
  routes[FIRST] = { body: {}, gate: failing, status: 500 };
  page.ui.refresh.click();
  routes[FIRST] = ORG[FIRST];
  page.ui.refresh.click();
  await vi.waitFor(() => expect(page.mermaid.texts).toHaveLength(2));
  fail();
  await settle();
  expect(page.github.calls.filter((c) => c.url === FIRST)).toHaveLength(4);
  expect(page.ui.errors.textContent).toBe('');
});
