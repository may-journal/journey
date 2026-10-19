import { expect, test, vi } from 'vitest';
import { buildGraph, selectGraph, toMermaid } from '../src/journey.js';
import { THEME } from '../src/page.js';
import { drawnNodes, fakeMermaid, KEY, openPage, slide } from './page.js';

const RUN = 'they run fitness';

const clauses = (/** @type {string} */ given, /** @type {string} */ when, /** @type {string} */ then) => ({
  givens: [given],
  thens: [then],
  whens: [when],
});

const SAMPLE = [
  clauses('Developer has a repo', RUN, 'it passes'),
  clauses('Developer has a repo, and an agent', RUN, 'it fails'),
  clauses('Guest has a pass-code', RUN, 'it passes'),
];

test('0003.1 each key term is one node, and edges run Given to When to Then weighted by acceptance count', () => {
  const graph = buildGraph(SAMPLE);
  expect([...graph.nodes.values()].map((n) => [n.key, n.count, n.acceptances])).toEqual([
    [KEY.developer, 2, [0, 1]],
    ['w_run', 3, [0, 1, 2]],
    ['t_passes', 2, [0, 2]],
    ['g_agent', 1, [1]],
    ['t_fails', 1, [1]],
    ['g_guest', 1, [2]],
  ]);
  expect([...graph.edges.values()].map((e) => `${e.from}>${e.to}=${e.weight}`)).toEqual([
    'g_developer>w_run=2',
    'w_run>t_passes=2',
    'g_agent>w_run=1',
    'w_run>t_fails=1',
    'g_guest>w_run=1',
  ]);
  const odd = buildGraph([clauses('Pass-code holder', 'the build', 'it')]);
  expect([...odd.nodes.keys()]).toEqual(['g_pass_code', 'w_build']);
  expect([...odd.edges.keys()]).toEqual(['g_pass_code>w_build']);
});

test('0003.2 Mermaid text holds only the capped, minimum-count terms and links, the same every time', () => {
  const graph = buildGraph(SAMPLE);
  const text = toMermaid(selectGraph(graph, { cap: 3, min: 2 }));
  expect(text).toBe(
    [
      'flowchart LR',
      '  g_developer("developer · 2"):::given',
      '  w_run{{"run · 3"}}:::when',
      '  t_passes["passes · 2"]:::then',
      '  g_developer -->|2| w_run',
      '  linkStyle 0 stroke-width:5.0px',
      '  w_run -->|2| t_passes',
      '  linkStyle 1 stroke-width:5.0px',
      '',
    ].join('\n')
  );
  expect(toMermaid(selectGraph(buildGraph([...SAMPLE].reverse()), { cap: 3, min: 2 }))).toBe(text);
  expect(toMermaid(selectGraph(graph, { cap: 9, min: 1 }))).toContain('  g_agent -->|1| w_run\n');
  expect(toMermaid({ edges: [], nodes: [] })).toBe('flowchart LR\n');
});

test('0003.3 moving the sliders redraws the new selection, and too high a minimum says so', async () => {
  const page = openPage();
  await vi.waitFor(() => expect(page.mermaid.texts).toHaveLength(1));
  expect(page.ui.graphNote.textContent).toBe(
    '8 terms. Drawing the 2 largest with at least 2 acceptances. Tap a term to list them.'
  );
  slide(page, page.ui.min, 1);
  expect(page.ui.minOut.textContent).toBe('1');
  slide(page, page.ui.cap, 10);
  await vi.waitFor(() => expect(page.mermaid.texts).toHaveLength(3));
  expect(page.ui.capOut.textContent).toBe('10');
  expect(drawnNodes(page)).toHaveLength(8);
  slide(page, page.ui.min, 50);
  expect(page.ui.diagram.textContent).toBe('No term has that many acceptances. Lower the minimum.');
});

test("0003.4 dark mode draws with Mermaid's dark theme and redraws when the mode changes", async () => {
  const page = openPage({ dark: true });
  await vi.waitFor(() => expect(page.mermaid.configs).toHaveLength(1));
  expect(page.mermaid.configs[0]).toMatchObject({ securityLevel: 'strict', startOnLoad: false, theme: THEME.dark });
  page.setDark(false);
  await vi.waitFor(() => expect(page.mermaid.configs).toHaveLength(2));
  expect(page.mermaid.configs[1].theme).toBe(THEME.light);
});

test('0003.5 a graph wider than a phone keeps its full width and scrolls sideways', async () => {
  const mermaid = fakeMermaid();
  const page = openPage({ mermaid });
  await vi.waitFor(() => expect(mermaid.configs).toHaveLength(1));
  expect(mermaid.configs[0].flowchart).toEqual({ useMaxWidth: false });
  const style = page.window.getComputedStyle(page.ui.diagram);
  expect(style.overflowX).toBe('auto');
  const svg = /** @type {Element} */ (page.ui.diagram.querySelector('svg'));
  expect(page.window.getComputedStyle(svg).maxWidth).toBe('none');
  expect(page.window.document.querySelector('meta[name="viewport"]')?.getAttribute('content')).toBe(
    'width=device-width, initial-scale=1'
  );
});

test('0003.6 a graph Mermaid cannot draw says so in place of the diagram', async () => {
  const mermaid = fakeMermaid();
  mermaid.render = async () => {
    throw new Error('Parse error on line 2');
  };
  const page = openPage({ mermaid });
  await vi.waitFor(() =>
    expect(page.ui.diagram.textContent).toBe('Mermaid could not draw the graph. Error: Parse error on line 2')
  );
  expect(mermaid.configs[0].maxTextSize).toBe(1000000);
});
