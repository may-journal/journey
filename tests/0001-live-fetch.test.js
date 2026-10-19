import { expect, test, vi } from 'vitest';
import { listing, ORG_REPOS, RATE_LIMITED, RESET, repo } from './github.js';
import { drawnNodes, ORG, openPage, TOKEN, TOOLS } from './page.js';

const RATE_MESSAGE = "GitHub's rate limit is used up. It resets at ";

const loaded = (/** @type {import('./page.js').Page} */ page) =>
  vi.waitFor(() => expect(page.ui.status.textContent).toContain('acceptances'));

test('0001.1 with no token the page asks for one and fetches nothing', () => {
  const page = openPage({ token: null });
  expect(page.ui.tokenScreen.hidden).toBe(false);
  expect(page.ui.app.hidden).toBe(true);
  expect(page.github.calls).toEqual([]);
});

test('0001.2 a pasted token stays only in localStorage and loads every repo page by page', async () => {
  const first = Array.from({ length: 100 }, (_, i) => repo(`bare-${String(i).padStart(3, '0')}`));
  const page = openPage({
    routes: { ...ORG, [`${ORG_REPOS}1`]: { body: first }, [`${ORG_REPOS}2`]: ORG[`${ORG_REPOS}1`] },
    token: null,
  });
  page.ui.tokenInput.value = `  ${TOKEN} `;
  page.ui.tokenForm.dispatchEvent(new page.window.Event('submit', { cancelable: true }));
  await loaded(page);
  expect(page.saved()).toBe(TOKEN);
  expect(page.ui.tokenInput.value).toBe('');
  expect(new Set(page.github.calls.map((c) => c.auth))).toEqual(new Set([`Bearer ${TOKEN}`]));
  expect(page.github.calls.every((c) => c.url.startsWith('https://api.github.com/'))).toBe(true);
  expect(page.github.calls.map((c) => c.url)).not.toContain(listing('old'));
  const reset = new Date(RESET * 1000).toLocaleTimeString();
  expect(page.ui.status.textContent).toBe(
    `2 of 103 repos have requirements · 3 acceptances · 4999 of 5000 API calls left until ${reset}`
  );
});

test('0001.3 a token GitHub rejects is forgotten and the page asks for another', async () => {
  const page = openPage({ routes: { [`${ORG_REPOS}1`]: { body: { message: 'Bad credentials' }, status: 401 } } });
  await vi.waitFor(() => expect(page.ui.tokenScreen.hidden).toBe(false));
  expect(page.ui.tokenError.textContent).toBe('GitHub rejected the token. It may be wrong or expired. Paste another.');
  expect(page.saved()).toBeNull();
});

test('0001.4 a used-up rate limit says when it resets', async () => {
  const primary = openPage({ routes: { ...ORG, [listing('app')]: RATE_LIMITED } });
  const when = new Date(RESET * 1000).toLocaleTimeString();
  await vi.waitFor(() => expect(primary.ui.errors.textContent).toBe(`${RATE_MESSAGE}${when}.`));
  const secondary = openPage({
    routes: { [`${ORG_REPOS}1`]: { body: {}, headers: { 'retry-after': '60' }, status: 403 } },
  });
  await vi.waitFor(() => expect(secondary.ui.errors.textContent).toContain(RATE_MESSAGE));
});

test('0001.5 a repo that fails gets its own card while the others still draw', async () => {
  const page = openPage({ routes: { ...ORG, [listing(TOOLS)]: { body: {}, status: 500 } } });
  await loaded(page);
  expect(page.ui.errors.textContent).toBe('tools: GitHub answered 500. Its requirements are left out.');
  expect(page.ui.status.textContent).toMatch(/^1 of 3 repos have requirements · 2 acceptances/);
  expect(drawnNodes(page).length).toBeGreaterThan(0);
});

test('0001.6 a failed org listing says loading failed', async () => {
  const page = openPage({ routes: { [`${ORG_REPOS}1`]: { body: {}, status: 502 } } });
  await vi.waitFor(() => expect(page.ui.errors.textContent).toBe('Loading failed: GitHub answered 502.'));
  expect(page.ui.status.textContent).toBe('');
});

test('0001.7 Forget token removes it and asks for one again', async () => {
  const page = openPage();
  await loaded(page);
  page.ui.forget.click();
  expect(page.saved()).toBeNull();
  expect(page.ui.tokenScreen.hidden).toBe(false);
  expect(page.ui.tokenError.textContent).toBe('');
  expect(page.ui.diagram.childElementCount).toBe(0);
});
