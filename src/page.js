// The page: token screen, live fetch, graph drawing and node details. It
// takes its window, fetch and Mermaid as arguments, so tests open the real
// index.html with replayed GitHub answers and a stand-in Mermaid.

import { buildGraph, ERROR, fetchJourney, flatten, makeClient, selectGraph, toMermaid } from './journey.js';

export const TOKEN_KEY = 'journey.token';
export const SELECTED = 'selected';
export const LINKS = { doc: 'Doc', source: 'Source', test: 'Test' };
const LIMIT = 6;
// Mermaid names each node's group flowchart-<key>-<n>, after the SVG's own ID.
const NODE_ID = /^.*flowchart-(\w+)-\d+$/;
export const NODES = 'g.node';
// Mermaid themes for each color scheme.
export const THEME = { dark: 'dark', light: 'neutral' };

/**
 * @typedef {object} Mermaid
 * @property {(config: object) => void} initialize Sets the theme and limits.
 * @property {(id: string, text: string) => Promise<{ svg: string }>} render Draws Mermaid text as SVG.
 */

/**
 * Every element with an ID, by ID.
 * @param {Document} document The page.
 * @returns {Record<string, HTMLInputElement>} The elements; inputs share the type, so value reads need no cast.
 */
export function elements(document) {
  return Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, el]));
}

/**
 * Starts the page in `window`.
 * @param {{ fetchImpl: typeof fetch, mermaid: Mermaid, window: Window }} options The page's window, fetch and Mermaid.
 */
export function start({ fetchImpl, mermaid, window }) {
  const { document, localStorage } = window;
  const ui = elements(document);
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  let token = localStorage.getItem(TOKEN_KEY);
  let run = 0;
  let renders = 0;
  /** @type {import('./journey.js').Linked[]} */
  let acceptances = [];
  let graph = buildGraph([]);
  /** @type {string | null} */
  let selected = null;

  const make = (/** @type {string} */ tag, /** @type {string} */ className = '', /** @type {string} */ text = '') => {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  };

  const card = (/** @type {string} */ text) => make('div', 'card', text);
  const row = () => make('div', 'row');

  const show = (/** @type {boolean} */ asking) => {
    ui.tokenScreen.hidden = !asking;
    ui.app.hidden = asking;
    ui.actions.hidden = asking;
  };

  const askToken = (/** @type {string} */ message) => {
    localStorage.removeItem(TOKEN_KEY);
    token = null;
    run += 1;
    ui.tokenError.textContent = message;
    ui.diagram.replaceChildren();
    show(true);
  };

  const load = async () => {
    const mine = ++run;
    selected = null;
    ui.details.hidden = true;
    ui.errors.replaceChildren();
    ui.status.textContent = "Loading every repo's requirements…";
    const rate = { limit: 0, remaining: 0, reset: 0 };
    const get = makeClient({ fetchImpl, onRate: (r) => Object.assign(rate, r), token: String(token) });
    /** @type {import('./journey.js').RepoResult[]} */
    let results;
    try {
      results = await fetchJourney({ get, limit: LIMIT });
    } catch (error) {
      const failure = /** @type {import('./journey.js').FetchError} */ (error);
      if (mine !== run) return;
      if (failure.kind === ERROR.TOKEN) return askToken(`${failure.message} Paste another.`);
      ui.status.textContent = '';
      const message = failure.kind === ERROR.RATE ? failure.message : `Loading failed: ${failure.message}`;
      ui.errors.append(card(message));
      return;
    }
    if (mine !== run) return;
    for (const failed of results.filter((r) => r.error)) {
      ui.errors.append(card(`${failed.repo}: ${failed.error} Its requirements are left out.`));
    }
    acceptances = flatten(results);
    const withDocs = results.filter((r) => r.docs.length).length;
    const reset = new Date(rate.reset * 1000).toLocaleTimeString();
    ui.status.textContent =
      `${withDocs} of ${results.length} repos have requirements · ${acceptances.length} acceptances · ` +
      `${rate.remaining} of ${rate.limit} API calls left until ${reset}`;
    await rebuild();
  };

  const rebuild = async () => {
    graph = buildGraph(acceptances);
    await draw();
  };

  const draw = async () => {
    const current = graph;
    const min = Number(ui.min.value);
    const picked = selectGraph(current, { cap: Number(ui.cap.value), min });
    ui.graphNote.textContent = `${current.nodes.size} terms. Drawing the ${picked.nodes.length} largest with at least ${min} acceptances. Tap a term to list them.`;
    if (!picked.nodes.length) {
      ui.diagram.textContent = 'No term has that many acceptances. Lower the minimum.';
      return;
    }
    mermaid.initialize({
      flowchart: { useMaxWidth: false },
      maxEdges: 5000,
      securityLevel: 'strict',
      startOnLoad: false,
      theme: dark.matches ? THEME.dark : THEME.light,
    });
    const mine = ++renders;
    const { svg } = await mermaid.render(`journey-svg-${mine}`, toMermaid(picked));
    if (mine !== renders) return;
    ui.diagram.innerHTML = svg;
    for (const el of ui.diagram.querySelectorAll(NODES)) {
      const key = el.id.replace(NODE_ID, '$1');
      const node = /** @type {import('./journey.js').TermNode} */ (current.nodes.get(key));
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${node.kind} ${node.term}, ${node.count} acceptances`);
      el.classList.toggle(SELECTED, key === selected);
      const open = () => {
        for (const other of ui.diagram.querySelectorAll(NODES)) other.classList.remove(SELECTED);
        el.classList.add(SELECTED);
        showDetails(node);
      };
      /** @type {HTMLElement} */ (el).onclick = open;
      /** @type {HTMLElement} */ (el).onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      };
    }
  };

  const link = (/** @type {string} */ href, /** @type {string} */ text) => {
    const a = /** @type {HTMLAnchorElement} */ (make('a', '', text));
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  };

  const showDetails = (/** @type {import('./journey.js').TermNode} */ node) => {
    selected = node.key;
    ui.detailsTitle.textContent = `${node.kind} “${node.term}” · ${node.count} acceptances`;
    const items = node.acceptances.map((i) => {
      const a = acceptances[i];
      const head = row();
      head.append(link(a.url, `${a.repo} · ${a.id}`), a.doc);
      const dl = make('dl');
      for (const [label, texts] of /** @type {[string, string[]][]} */ ([
        ['Given', a.givens],
        ['When', a.whens],
        ['Then', a.thens],
      ])) {
        for (const text of texts) dl.append(make('dt', '', label), make('dd', '', text));
      }
      const foot = row();
      foot.append(link(a.url, LINKS.doc));
      if (a.source) foot.append(link(a.source, LINKS.source));
      foot.append(link(a.test, LINKS.test));
      const li = make('li');
      li.append(head, dl, foot);
      return li;
    });
    ui.detailsList.replaceChildren(...items);
    ui.details.hidden = false;
  };

  ui.tokenForm.onsubmit = (event) => {
    event.preventDefault();
    token = ui.tokenInput.value.trim();
    ui.tokenInput.value = '';
    ui.tokenError.textContent = '';
    localStorage.setItem(TOKEN_KEY, token);
    show(false);
    load();
  };
  ui.forget.onclick = () => askToken('');
  ui.refresh.onclick = load;
  for (const slider of [ui.cap, ui.min]) {
    slider.oninput = () => (ui[`${slider.id}Out`].textContent = slider.value);
    slider.onchange = draw;
  }
  dark.onchange = draw;

  show(!token);
  if (token) load();
}
