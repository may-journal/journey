// The page: token screen, live fetch, graph drawing and node details. It
// takes its window, fetch and Mermaid as arguments, so tests open the real
// index.html with replayed GitHub answers and a stand-in Mermaid.

import {
  buildGraph,
  ERROR,
  fetchJourney,
  flatten,
  GROUP,
  groupsOf,
  KINDS,
  makeClient,
  selectGraph,
  termsOf,
  toMermaid,
} from './journey.js';
import {
  BAR,
  BUCKET,
  bucketOf,
  DAYS,
  fetchProof,
  judge,
  LABELS,
  LIST,
  RED,
  STATUS,
  SUITE,
  tally,
  UNPROVEN,
} from './proof.js';

export const TOKEN_KEY = 'journey.token';
export const HIDDEN_KEY = 'journey.hiddenRepos';
export const SELECTED = 'selected';
export const LINKS = { doc: 'Doc', test: 'Test' };
const LIMIT = 6;
// Mermaid names each node's group flowchart-<key>-<n>, after the SVG's own ID.
const NODE_ID = /^.*flowchart-(\w+)-\d+$/;
export const NODES = 'g.node';
// The attribute that marks the chosen tab.
export const CHOSEN = 'aria-selected';
const DIV = 'div';
const SPAN = 'span';
const LEGEND = {
  [BUCKET.notRun]: `Not run in ${DAYS} days`,
  [BUCKET.proven]: 'Proven',
  [BUCKET.unproven]: 'Unproven',
};
// Mermaid themes for each color scheme.
export const THEME = { dark: 'dark', light: 'neutral' };

/**
 * Every element with an ID, by ID.
 */
export function elements(document) {
  return Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, el]));
}

/**
 * Starts the page in `window`.
 */
export function start({ fetchImpl, mermaid, window }) {
  const { document, localStorage } = window;
  const ui = elements(document);
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  let token = localStorage.getItem(TOKEN_KEY);
  /** @type {Set<string>} Repos the viewer unchecked. */
  const hidden = new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'));
  let run = 0;
  let renders = 0;
  let acceptances = [];
  let shown = [];
  let graph = buildGraph([]);
  let selected = null;
  let listAll = false;

  const make = (tag, className = '', text = '') => {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  };

  const card = (text) => make(DIV, 'card', text);
  const row = () => make(DIV, 'row');

  const show = (asking) => {
    ui.tokenScreen.hidden = !asking;
    ui.app.hidden = asking;
    ui.actions.hidden = asking;
  };

  const askToken = (message) => {
    localStorage.removeItem(TOKEN_KEY);
    token = null;
    run += 1;
    renders += 1;
    acceptances = [];
    graph = buildGraph([]);
    ui.tokenError.textContent = message;
    ui.diagram.replaceChildren();
    show(true);
  };

  const load = async () => {
    const mine = ++run;
    ui.errors.replaceChildren();
    ui.status.textContent = "Loading every repo's requirements…";
    // Answers finish out of order, so the status keeps the lowest count left.
    const rate = { limit: 0, remaining: Number.POSITIVE_INFINITY, reset: 0 };
    const onRate = (r) => {
      if (r.remaining <= rate.remaining) Object.assign(rate, r);
    };
    const get = makeClient({ fetchImpl, onRate, token: String(token) });
    let results;
    try {
      results = await fetchJourney({ get, limit: LIMIT });
    } catch (error) {
      const failure = error;
      if (mine !== run) return;
      if (failure.kind === ERROR.TOKEN) return askToken(`${failure.message} Paste another.`);
      ui.status.textContent = '';
      const message = failure.kind === ERROR.RATE ? failure.message : `Loading failed: ${failure.message}`;
      ui.errors.append(card(message));
      return;
    }
    // The docs already loaded, so a failure reading test runs still draws the graph.
    const named = results.filter((r) => r.docs.length).map(({ repo }) => repo);
    let proofError = null;
    const proofs = await fetchProof({ get, limit: LIMIT, repos: named }).catch((error) => {
      proofError = error;
      return new Map();
    });
    if (mine !== run) return;
    if (proofError) ui.errors.append(card(`${proofError.message} Every promise shows as not run.`));
    for (const failed of results.filter((r) => r.error)) {
      ui.errors.append(card(`${failed.repo}: ${failed.error} Its requirements are left out.`));
    }
    ui.repos.replaceChildren(...named.map(repoBox));
    acceptances = flatten(results).map((a) => ({ ...a, proof: judge(a, proofs.get(a.repo)) }));
    showTiles();
    const reset = new Date(rate.reset * 1000).toLocaleTimeString();
    ui.status.textContent =
      `${named.length} of ${results.length} repos have requirements · ${acceptances.length} acceptances · ` +
      `${rate.remaining} of ${rate.limit} API calls left until ${reset}`;
    await rebuild();
  };

  // One checkbox per repo with docs. Unchecking one stores it as hidden, so
  // repos found later start checked.
  const repoBox = (repo) => {
    const box = make('input');
    box.type = 'checkbox';
    box.value = repo;
    box.checked = !hidden.has(repo);
    box.onchange = () => {
      if (box.checked) hidden.delete(repo);
      else hidden.add(repo);
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden].sort()));
      rebuild();
    };
    const label = make('label');
    label.append(box, ` ${repo}`);
    return label;
  };

  const rebuild = async () => {
    selected = null;
    ui.details.hidden = true;
    const group = ui.group.value;
    const chosen = acceptances.filter((a) => !hidden.has(a.repo));
    const groups = chosen.map(groupsOf);
    shown = chosen.filter((_, i) => group === GROUP.both || groups[i].has(group));
    const neither = groups.filter((g) => !g.size).length;
    ui.groupNote.textContent = `${neither} acceptances fit neither group, so they show only under Both.`;
    graph = buildGraph(shown);
    listAll = false;
    showTable();
    await draw();
  };

  // The Proof tab's headline, legend and one tile per repo, over every repo with docs.
  const showTiles = () => {
    const { repos, total } = tally(acceptances);
    const unproven = (counts) => `${counts[BUCKET.unproven]} unproven`;
    ui.proofBadge.textContent = unproven(total);
    const whole = (n) => n.toLocaleString('en-US');
    ui.proofTitle.textContent = `${whole(total[BUCKET.proven])} of ${whole(total.total)} promises proven`;
    ui.proofNote.textContent = `Read from each repo's newest ${SUITE} run in the last ${DAYS} days. A promise is proven when that run's tests ran and no failure names its ID.`;
    const dots = BAR.map((key) => {
      const entry = make(SPAN, '', `${LEGEND[key]} · ${total[key]}`);
      entry.prepend(make(SPAN, `dot ${key}`));
      return entry;
    });
    ui.proofLegend.replaceChildren(...dots);
    const tiles = [...repos].map(([repo, counts]) => {
      const bar = make(DIV, 'bar');
      for (const key of BAR) {
        const part = make(SPAN, key);
        part.style.width = `${Math.round((100 * counts[key]) / counts.total)}%`;
        bar.append(part);
      }
      let note = 'All proven';
      if (counts[BUCKET.notRun]) note = `${counts[BUCKET.notRun]} not run`;
      if (counts[BUCKET.unproven]) note = unproven(counts);
      const tile = make(DIV, 'tile');
      tile.append(make('strong', '', repo), make(SPAN, 'count', String(counts.total)), bar, make(SPAN, 'muted', note));
      return tile;
    });
    ui.tiles.replaceChildren(...tiles);
  };

  // The unproven promises among those shown, the broken ones first, then those not run.
  const showTable = () => {
    const rank = (a) => (UNPROVEN.has(a.proof.status) ? 0 : 1);
    const open = shown.filter((a) => a.proof.status !== STATUS.proven).sort((a, b) => rank(a) - rank(b));
    ui.unprovenTitle.textContent = `Not proven · ${open.length} of ${shown.length} promises shown`;
    const rows = (listAll ? open : open.slice(0, LIST)).map((a) => {
      const path = make('td');
      for (const kind of KINDS) {
        for (const term of termsOf(a[`${kind}s`], kind)) path.append(make(SPAN, `chip ${kind}`, term));
      }
      const why = make('td');
      why.append(make(SPAN, `why ${bucketOf(a.proof.status)}`, LABELS[a.proof.status]));
      why.append(a.proof.url ? link(a.proof.url, a.proof.detail) : a.proof.detail);
      const promise = make('td');
      promise.append(link(a.url, `${a.repo} · ${a.id}`));
      const tr = make('tr');
      tr.append(promise, make('td', '', a.thens.join('; ')), path, why);
      return tr;
    });
    ui.unprovenRows.replaceChildren(...rows);
    ui.listAll.textContent = `List all ${open.length}`;
    ui.listAll.hidden = listAll || open.length <= LIST;
  };

  const selectTab = (proof) => {
    ui.tabGraph.setAttribute(CHOSEN, String(!proof));
    ui.tabProof.setAttribute(CHOSEN, String(proof));
    ui.proofPanel.hidden = !proof;
    ui.unprovenCard.hidden = !proof;
  };

  const draw = async () => {
    const current = graph;
    const drawn = shown;
    if (!current.nodes.size) {
      ui.graphNote.textContent = '';
      ui.diagram.replaceChildren();
      return;
    }
    const min = Number(ui.min.value);
    const picked = selectGraph(current, { cap: Number(ui.cap.value), min });
    ui.graphNote.textContent = `${current.nodes.size} terms. Drawing the ${picked.nodes.length} largest with at least ${min} acceptances. Tap a term to list them.`;
    if (!picked.nodes.length) {
      ui.diagram.textContent = 'No term has that many acceptances. Lower the minimum.';
      return;
    }
    const mine = ++renders;
    let svg = '';
    let failure = '';
    try {
      mermaid.initialize({
        flowchart: { useMaxWidth: false },
        maxEdges: 5000,
        maxTextSize: 1000000,
        securityLevel: 'strict',
        startOnLoad: false,
        theme: dark.matches ? THEME.dark : THEME.light,
      });
      const red = {
        color: dark.matches ? RED.dark : RED.light,
        marked: (edge) => edge.acceptances.some((i) => UNPROVEN.has(drawn[i].proof.status)),
      };
      ({ svg } = await mermaid.render(`journey-svg-${mine}`, toMermaid(picked, red)));
    } catch (error) {
      failure = `Mermaid could not draw the graph. ${error}`;
    }
    if (mine !== renders) return;
    if (failure) {
      ui.diagram.textContent = failure;
      return;
    }
    ui.diagram.innerHTML = svg;
    for (const el of ui.diagram.querySelectorAll(NODES)) {
      const key = el.id.replace(NODE_ID, '$1');
      const node = current.nodes.get(key);
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${node.kind} ${node.term}, ${node.count} acceptances`);
      el.classList.toggle(SELECTED, key === selected);
      const open = () => {
        for (const other of ui.diagram.querySelectorAll(NODES)) other.classList.remove(SELECTED);
        el.classList.add(SELECTED);
        showDetails(node);
      };
      el.onclick = open;
      el.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      };
    }
  };

  const link = (href, text) => {
    const a = make('a', '', text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  };

  const showDetails = (node) => {
    selected = node.key;
    ui.detailsTitle.textContent = `${node.kind} “${node.term}” · ${node.count} acceptances`;
    const items = node.acceptances.map((i) => {
      const a = shown[i];
      const head = row();
      head.append(link(a.url, `${a.repo} · ${a.id}`), a.doc);
      const dl = make('dl');
      for (const [label, texts] of [
        ['Given', a.givens],
        ['When', a.whens],
        ['Then', a.thens],
      ]) {
        for (const text of texts) dl.append(make('dt', '', label), make('dd', '', text));
      }
      const foot = row();
      foot.append(link(a.url, LINKS.doc));
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
  ui.tabGraph.onclick = () => selectTab(false);
  ui.tabProof.onclick = () => selectTab(true);
  ui.listAll.onclick = () => {
    listAll = true;
    showTable();
  };
  ui.refresh.onclick = load;
  ui.group.onchange = rebuild;
  for (const slider of [ui.cap, ui.min]) {
    slider.oninput = () => (ui[`${slider.id}Out`].textContent = slider.value);
    slider.onchange = draw;
  }
  dark.onchange = draw;

  show(!token);
  if (token) load();
}
