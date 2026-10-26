import { expect, test, vi } from 'vitest';
import { HIDDEN_KEY } from '../src/page.js';
import { APP, changed, KEY, nodeOf, openPage, TOOLS } from './page.js';

const boxes = (/** @type {import('./page.js').Page} */ page) =>
  /** @type {HTMLInputElement[]} */ ([...page.ui.repos.querySelectorAll('[type=checkbox]')]);

const listed = async (/** @type {import('./page.js').Page} */ page) => {
  await vi.waitFor(() => expect(boxes(page)).toHaveLength(2));
  return boxes(page);
};

const toggle = (/** @type {import('./page.js').Page} */ page, /** @type {HTMLInputElement} */ box) => {
  box.checked = !box.checked;
  changed(page, box);
};

test('0006.1 every repo with docs gets a checkbox, all checked by default', async () => {
  const page = openPage();
  const all = await listed(page);
  expect(all.map((b) => [b.value, b.checked])).toEqual([
    [APP, true],
    [TOOLS, true],
  ]);
  expect(page.ui.repos.textContent).toBe(' app tools');
});

test('0006.2 unchecking a repo removes its acceptances, and nodes left with none disappear', async () => {
  const page = openPage();
  const [app] = await listed(page);
  await vi.waitFor(() => expect(nodeOf(page, KEY.writer)).not.toBeNull());
  toggle(page, app);
  await vi.waitFor(() => expect(nodeOf(page, KEY.writer)).toBeNull());
  expect(page.ui.graphNote.textContent).toMatch(/^3 terms\./);
});

test('0006.3 changing a checkbox rebuilds the graph without a new fetch', async () => {
  const page = openPage();
  const [app] = await listed(page);
  const calls = page.github.calls.length;
  toggle(page, app);
  toggle(page, app);
  await vi.waitFor(() => expect(page.ui.graphNote.textContent).toMatch(/^8 terms\./));
  expect(page.github.calls).toHaveLength(calls);
});

test('0006.4 the chosen repos stay in localStorage and are restored on open', async () => {
  const first = openPage();
  const [, tools] = await listed(first);
  toggle(first, tools);
  expect(first.window.localStorage.getItem(HIDDEN_KEY)).toBe(JSON.stringify([TOOLS]));
  const again = openPage({ stored: { [HIDDEN_KEY]: JSON.stringify([TOOLS]) } });
  const restored = await listed(again);
  expect(restored.map((b) => b.checked)).toEqual([true, false]);
  await vi.waitFor(() => expect(again.ui.graphNote.textContent).toMatch(/^5 terms\./));
  expect(nodeOf(again, KEY.developer)).toBeNull();
});

test('0006.5 a repo first seen after the choice was saved starts checked', async () => {
  const page = openPage({ stored: { [HIDDEN_KEY]: JSON.stringify(['elsewhere/old']) } });
  const all = await listed(page);
  expect(all.map((b) => [b.value, b.checked])).toEqual([
    [APP, true],
    [TOOLS, true],
  ]);
});
