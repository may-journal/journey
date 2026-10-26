// Opens the real index.html in jsdom and starts the page as its module script does.
// It uses replayed GitHub answers and a Mermaid stand-in drawing one SVG group per node.

import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { elements, NODES, SELECTED, start, TOKEN_KEY } from '../src/page.js';
import { ORG_REPOS, replay, repo, repoDocs } from './github.js';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const NODE = /^ {2}(\w+)[({[]+"(.+?)"[)}\]]+:::(\w+)$/;

export const TOKEN = 'github_pat_test';
export const APP = 'app';
export const TOOLS = 'tools';
export const EDIT = 'I edit an entry';
/** Mermaid keys of nodes the org's docs give. */
export const KEY = { developer: 'g_developer', edit: 'w_edit', writer: 'g_writer' };

export const SYNC_FILE = '0001-sync.md';
export const SYNC = `# 0001 Sync

## Requirements

- 0001.1
    - Given Writer has no network
        - When ${EDIT}
            - Then it is saved locally
- 0001.2
    - Given Writer has no network, and a full disk
        - When ${EDIT}
            - Then the app warns
`;

export const CHECK = `# 0002 Check

- 0002.1
    - Given Developer has a repo
        - When they run fitness
            - Then it passes
`;

/** The org: app and tools have docs, empty has none, old is archived. */
export const ORG = {
  [`${ORG_REPOS}1`]: { body: [repo(TOOLS), repo(APP), repo('empty'), repo('old', { archived: true })] },
  ...repoDocs(APP, { [SYNC_FILE]: SYNC }),
  ...repoDocs(TOOLS, { '0002-check.md': CHECK }),
};

/**
 * A Mermaid stand-in that records each call and answers with node groups.
 */
export function fakeMermaid() {
  const configs = [];
  const texts = [];
  return {
    configs,
    initialize: (config) => configs.push(config),
    render: async (id, text) => {
      texts.push(text);
      const groups = text
        .split('\n')
        .map((line) => line.match(NODE))
        .filter((match) => match !== null)
        .map(
          ([, key, label, kind], i) =>
            `<g class="node default ${kind}" id="${id}-flowchart-${key}-${i}"><rect></rect><text>${label}</text></g>`
        );
      return { svg: `<svg id="${id}">${groups.join('')}</svg>` };
    },
    texts,
  };
}

/**
 * Opens the page with replayed GitHub answers and the fake Mermaid.
 * @param {{ dark?: boolean, mermaid?: ReturnType<typeof fakeMermaid>, routes?: Record<string, import('./github.js').Route>, stored?: Record<string, string>, token?: string | null }} [options] Saved token, other stored values, GitHub answers, color scheme and Mermaid.
 */
export function openPage({ dark = false, mermaid = fakeMermaid(), routes = ORG, stored = {}, token = TOKEN } = {}) {
  const dom = new JSDOM(HTML, { url: 'https://may-journal.github.io/journey/' });
  const window = dom.window;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  for (const [key, value] of Object.entries(stored)) window.localStorage.setItem(key, value);
  const scheme = { matches: dark, onchange: () => {} };
  window.matchMedia = () => scheme;
  const github = replay(routes);
  start({ fetchImpl: github.fetchImpl, mermaid, window });
  const setDark = (on) => {
    scheme.matches = on;
    scheme.onchange();
  };
  const saved = () => window.localStorage.getItem(TOKEN_KEY);
  return { github, mermaid, saved, setDark, ui: elements(window.document), window };
}

/**
 * Sets a slider and fires its input and change events, as dragging it does.
 */
export function slide(page, slider, value) {
  slider.value = String(value);
  slider.dispatchEvent(new page.window.Event('input'));
  changed(page, slider);
}

/**
 * Fires a change event, as the browser does after a viewer's edit.
 * @param {Page} page The page.
 * @param {HTMLElement} el The changed control.
 */
export function changed(page, el) {
  el.dispatchEvent(new page.window.Event('change'));
}

/**
 * Lists the nodes the diagram has drawn.
 */
export const drawnNodes = (page) => [...page.ui.diagram.querySelectorAll(NODES)];

/**
 * The drawn node with this Mermaid key.
 */
export const nodeOf = (page, key) => page.ui.diagram.querySelector(`${NODES}[id*="-flowchart-${key}-"]`);

/**
 * Keys of the drawn nodes marked selected.
 */
export const selectedNodes = (page) => drawnNodes(page).filter((n) => n.classList.contains(SELECTED));

/**
 * Taps a drawn node.
 */
export const tap = (page, key) => nodeOf(page, key).dispatchEvent(new page.window.MouseEvent('click'));

/**
 * Presses a key on a drawn node.
 */
export function press(page, key, name) {
  const event = new page.window.KeyboardEvent('keydown', { cancelable: true, key: name });
  nodeOf(page, key).dispatchEvent(event);
  return event.defaultPrevented;
}

/**
 * Waits until no answer or timer is pending.
 */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

// The same doc as SYNC in Biome 2.6's layout: front matter, two-space nesting
// and a Measurement whose lone `-` is not an acceptance. Its IDs sit on lines 19 and 23.
export const NESTED = `---
title: Sync notes
---

# 0001 Sync

## Measurement

things saved

-

things edited

Source: \`src/sync.js:7\`

## Requirements

- 0001.1
  - Given Writer has no network
    - When ${EDIT}
      - Then it is saved locally
- 0001.2
  - Given Writer has no network, and a full disk
    - When ${EDIT}
      - Then the app warns
`;
