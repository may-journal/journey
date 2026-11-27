import { expect, test, vi } from 'vitest';
import { GROUP } from '../src/journey.js';
import { HIDDEN_KEY, MATCH } from '../src/page.js';
import { APP, changed, KEY, nodeOf, openPage, TOKEN, TOOLS, typed, URL_BASE } from './page.js';

const PART = 'edi';

const LINK = `#show=users&hide=tools&find=${PART}`;

const boxes = (page) => [...page.ui.repos.querySelectorAll('[type=checkbox]')];

const opened = async (options) => {
  const page = openPage(options);
  await vi.waitFor(() => expect(boxes(page)).toHaveLength(2));
  await vi.waitFor(() => expect(page.ui.graphNote.textContent).not.toBe(''));
  return page;
};

const hashOf = (page) => page.window.location.hash;

const choose = (page, group) => {
  page.ui.group.value = group;
  changed(page, page.ui.group);
};

const toggle = (page, box) => {
  box.checked = !box.checked;
  changed(page, box);
};

test('0008.1 changing the Show filter names it in the hash', async () => {
  const page = await opened();
  choose(page, GROUP.users);
  expect(hashOf(page)).toBe('#show=users');
});

test('0008.2 unchecking repos names them in the hash', async () => {
  const page = await opened();
  for (const box of boxes(page)) toggle(page, box);
  expect(hashOf(page)).toBe('#hide=app+tools');
});

test('0008.3 the Find text goes in the hash', async () => {
  const page = await opened();
  typed(page, page.ui.find, ` ${PART} `);
  expect(hashOf(page)).toBe(`#find=${PART}`);
});

test('0008.4 opening a link restores the filter, the repo choice and the Find text', async () => {
  const page = await opened({ hash: LINK });
  expect(page.ui.group.value).toBe(GROUP.users);
  expect(boxes(page).map((b) => [b.value, b.checked])).toEqual([
    [APP, true],
    [TOOLS, false],
  ]);
  expect(page.ui.find.value).toBe(PART);
  await vi.waitFor(() => expect(nodeOf(page, KEY.edit).classList.contains(MATCH)).toBe(true));
  expect(hashOf(page)).toBe(LINK);
});

test('0008.5 the default view has no hash', async () => {
  const page = await opened();
  expect(page.window.location.href).toBe(URL_BASE);
  choose(page, GROUP.developers);
  expect(hashOf(page)).not.toBe('');
  choose(page, GROUP.both);
  expect(page.window.location.href).toBe(URL_BASE);
});

test('0008.6 a link repo choice shows, and the saved one is kept', async () => {
  const saved = JSON.stringify([APP]);
  const page = await opened({ hash: '#hide=tools', stored: { [HIDDEN_KEY]: saved } });
  expect(boxes(page).map((b) => b.checked)).toEqual([true, false]);
  expect(page.window.localStorage.getItem(HIDDEN_KEY)).toBe(saved);
});

test('0008.7 an unknown filter in the hash means Both', async () => {
  const page = await opened({ hash: '#show=everyone' });
  expect(page.ui.group.value).toBe(GROUP.both);
  expect(hashOf(page)).toBe('');
});

test('0008.8 the token never appears in the address', async () => {
  const page = await opened();
  choose(page, GROUP.users);
  typed(page, page.ui.find, PART);
  expect(page.saved()).toBe(TOKEN);
  expect(page.window.location.href).not.toContain(TOKEN);
});
