import { expect, test, vi } from 'vitest';
import { DIM, MATCH } from '../src/page.js';
import { drawnNodes, KEY, nodeOf, openPage, slide, typed } from './page.js';

const marked = (page, name) =>
  drawnNodes(page)
    .filter((n) => n.classList.contains(name))
    .map((n) => n.id);

const find = (page, text) => typed(page, page.ui.find, text);

const drawn = async () => {
  const page = openPage();
  await vi.waitFor(() => expect(nodeOf(page, KEY.writer)).not.toBeNull());
  return page;
};

test('0007.1 typed text marks the terms that contain it and dims the others', async () => {
  const page = await drawn();
  find(page, 'writ');
  expect(marked(page, MATCH)).toEqual([nodeOf(page, KEY.writer).id]);
  expect(marked(page, DIM)).toHaveLength(drawnNodes(page).length - 1);
  expect(nodeOf(page, KEY.writer).classList.contains(DIM)).toBe(false);
});

test('0007.2 matching ignores letter case', async () => {
  const page = await drawn();
  find(page, ' WRITER ');
  expect(marked(page, MATCH)).toEqual([nodeOf(page, KEY.writer).id]);
});

test('0007.3 a note counts the matching terms among the drawn ones', async () => {
  const page = await drawn();
  find(page, 'e');
  const matches = marked(page, MATCH).length;
  expect(matches).toBeGreaterThan(1);
  expect(page.ui.findNote.textContent).toBe(`${matches} of ${drawnNodes(page).length} drawn terms match.`);
});

test('0007.4 text no term contains dims every term and counts zero', async () => {
  const page = await drawn();
  find(page, 'zebra');
  expect(marked(page, MATCH)).toEqual([]);
  expect(marked(page, DIM)).toHaveLength(drawnNodes(page).length);
  expect(page.ui.findNote.textContent).toMatch(/^0 of \d+ drawn terms match\.$/);
});

test('0007.5 emptying the box clears the marks and the note', async () => {
  const page = await drawn();
  find(page, 'writ');
  find(page, '');
  expect(marked(page, MATCH)).toEqual([]);
  expect(marked(page, DIM)).toEqual([]);
  expect(page.ui.findNote.textContent).toBe('');
});

test('0007.6 the marks follow the terms a slider newly draws', async () => {
  const page = await drawn();
  find(page, 'develop');
  expect(page.ui.findNote.textContent).toMatch(/^0 of /);
  slide(page, page.ui.min, 1);
  await vi.waitFor(() => expect(nodeOf(page, KEY.developer)).not.toBeNull());
  await vi.waitFor(() => expect(marked(page, MATCH)).toEqual([nodeOf(page, KEY.developer).id]));
  expect(page.ui.findNote.textContent).toBe(`1 of ${drawnNodes(page).length} drawn terms match.`);
});
