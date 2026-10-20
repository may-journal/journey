// Opens the real index.html in jsdom and starts the page the way its module
// script does, with replayed GitHub answers and a stand-in for Mermaid. The
// stand-in draws one SVG group per node, shaped like Mermaid's own output.

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

export const SYNC = `# 0001 Sync

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

export const CHECK = `# 0002 Check

- 0002.1
    - Given Developer has a repo
        - When they run fitness
            - Then it passes
`;

/** The org: app and tools have docs, empty has none, old is archived. */
export const ORG = {
  [`${ORG_REPOS}1`]: { body: [repo(TOOLS), repo(APP), repo('empty'), repo('old', { archived: true })] },
  ...repoDocs(APP, { '0001-sync.md': SYNC }),
  ...repoDocs(TOOLS, { '0002-check.md': CHECK }),
};

/**
 * A Mermaid stand-in that records each call and answers with node groups.
 * @returns {{ configs: any[], initialize: (config: object) => void, render: (id: string, text: string) => Promise<{ svg: string }>, texts: string[] }} The stand-in.
 */
export function fakeMermaid() {
  /** @type {any[]} */
  const configs = [];
  /** @type {string[]} */
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
 * Opens the page.
 * @param {{ dark?: boolean, mermaid?: ReturnType<typeof fakeMermaid>, routes?: Record<string, import('./github.js').Route>, token?: string | null }} [options] Saved token, GitHub answers, color scheme and Mermaid.
 */
export function openPage({ dark = false, mermaid = fakeMermaid(), routes = ORG, token = TOKEN } = {}) {
  const dom = new JSDOM(HTML, { url: 'https://may-journal.github.io/journey/' });
  const window = /** @type {Window & typeof globalThis} */ (/** @type {unknown} */ (dom.window));
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  const scheme = { matches: dark, onchange: () => {} };
  window.matchMedia = /** @type {any} */ (() => scheme);
  const github = replay(routes);
  start({ fetchImpl: github.fetchImpl, mermaid, window });
  const setDark = (/** @type {boolean} */ on) => {
    scheme.matches = on;
    scheme.onchange();
  };
  const saved = () => window.localStorage.getItem(TOKEN_KEY);
  return { github, mermaid, saved, setDark, ui: elements(window.document), window };
}

/** @typedef {ReturnType<typeof openPage>} Page */

/**
 * Sets a slider and fires its input and change events, as dragging it does.
 * @param {Page} page The page.
 * @param {HTMLInputElement} slider The slider.
 * @param {number} value New value.
 */
export function slide(page, slider, value) {
  slider.value = String(value);
  slider.dispatchEvent(new page.window.Event('input'));
  slider.dispatchEvent(new page.window.Event('change'));
}

/**
 * The drawn nodes.
 * @param {Page} page The page.
 * @returns {Element[]} Their SVG groups.
 */
export const drawnNodes = (page) => [...page.ui.diagram.querySelectorAll(NODES)];

/**
 * The drawn node with this Mermaid key.
 * @param {Page} page The page.
 * @param {string} key Node key, such as g_writer.
 * @returns {Element} The SVG group.
 */
export const nodeOf = (page, key) =>
  /** @type {Element} */ (page.ui.diagram.querySelector(`${NODES}[id*="-flowchart-${key}-"]`));

/**
 * Keys of the drawn nodes marked selected.
 * @param {Page} page The page.
 * @returns {string[]} Their group IDs.
 */
export const selectedNodes = (page) => drawnNodes(page).filter((n) => n.classList.contains(SELECTED));

/**
 * Taps a drawn node.
 * @param {Page} page The page.
 * @param {string} key Node key.
 */
export const tap = (page, key) => nodeOf(page, key).dispatchEvent(new page.window.MouseEvent('click'));

/**
 * Presses a key on a drawn node.
 * @param {Page} page The page.
 * @param {string} key Node key.
 * @param {string} name Key name, such as Enter.
 * @returns {boolean} Whether the page took the key.
 */
export function press(page, key, name) {
  const event = new page.window.KeyboardEvent('keydown', { cancelable: true, key: name });
  nodeOf(page, key).dispatchEvent(event);
  return event.defaultPrevented;
}

/**
 * Waits until no answer or timer is pending.
 * @returns {Promise<void>} Resolves after pending work.
 */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
