// The journey core: it parses requirement docs, reduces clauses to key terms,
// builds the term graph and its Mermaid text, and fetches docs from GitHub.
// It touches no DOM, so the page and the tests share it unchanged.

export const ORG = 'may-journal';
export const API = 'https://api.github.com';

const HEADING = /^#\s+(\d{4})\s+(.+?)\s*$/;
const ACCEPTANCE = /^\s*-\s+(\d{4}\.\d+)\s*$/;
const CLAUSE = /^\s*-\s+(Given|When|Then)\s+(.+?)\s*$/;
const SOURCE = /^Source:\s*`([^`:]+):(\d+)`/;

/** @typedef {'given' | 'when' | 'then'} Kind */

/** @type {Kind[]} */
export const KINDS = ['given', 'when', 'then'];
const [GIVEN, WHEN, THEN] = KINDS;

// Kinds of FetchError: a rejected token, a used-up rate limit, any other answer.
export const ERROR = { HTTP: 'http', RATE: 'rate', TOKEN: 'token' };

/**
 * @typedef {object} Acceptance
 * @property {string} id The acceptance ID, such as 0001.1.
 * @property {number} line The 1-based line of the ID.
 * @property {string[]} givens Given clause texts.
 * @property {string[]} whens When clause texts.
 * @property {string[]} thens Then clause texts.
 */

/**
 * Parses one requirement doc into its ID, name, Source and acceptances.
 * @param {string} markdown The doc's text.
 * @returns {{ acceptances: Acceptance[], id: string | null, name: string | null, source: { line: number, path: string } | null }} The parsed doc.
 */
export function parseDoc(markdown) {
  /** @type {ReturnType<typeof parseDoc>} */
  const doc = { acceptances: [], id: null, name: null, source: null };
  /** @type {Acceptance | null} */
  let current = null;
  markdown.split(/\r?\n/).forEach((line, index) => {
    const heading = !doc.id && line.match(HEADING);
    if (heading) {
      doc.id = heading[1];
      doc.name = heading[2];
      return;
    }
    const source = !doc.source && line.match(SOURCE);
    if (source) {
      doc.source = { line: Number(source[2]), path: source[1] };
      return;
    }
    const acceptance = line.match(ACCEPTANCE);
    if (acceptance) {
      current = { givens: [], id: acceptance[1], line: index + 1, thens: [], whens: [] };
      doc.acceptances.push(current);
      return;
    }
    const clause = current && line.match(CLAUSE);
    if (clause) current[`${clause[1].toLowerCase()}s`].push(clause[2]);
  });
  return doc;
}

/**
 * Splits a compound clause on commas and "and", dropping code spans.
 * @param {string} text One clause.
 * @returns {string[]} Its parts.
 */
export function splitClause(text) {
  return text
    .replace(/`[^`]*`/g, ' ')
    .split(/,|\band\b/i)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const DETERMINERS = new Set(
  'a an the this that these those each every any all some no my our your his her its their another other'.split(' ')
);
const FILLER = new Set([
  ...DETERMINERS,
  ...'i me we us you he him she it they them there here'.split(' '),
  ...'is are was were be been being am do does did has have had can could will would should may might must'.split(' '),
  ...'also still just only then now not already again'.split(' '),
  ...'or nor but yet either neither both while whether'.split(' '),
  ...'one two three four five six seven eight nine ten first second third last next'.split(' '),
  ...'many much more most few fewer less least several such same own none'.split(' '),
  ...'of to in on at for with from by into onto as if so'.split(' '),
]);

/**
 * Lowercases a clause part into plain words, without possessives or numbers.
 * @param {string} part A clause part.
 * @returns {string[]} Its words.
 */
export function words(part) {
  return part
    .toLowerCase()
    .replace(/'s\b/g, '')
    .replace(/[^a-z0-9-]+/g, ' ')
    .split(' ')
    .map((word) => word.replace(/^-+|-+$/g, ''))
    .filter((word) => word && !/^\d+$/.test(word));
}

/**
 * Reduces one clause part to its key term. Given and Then keep the first word
 * left after filler and pronouns; When skips a leading "the noun" to its verb.
 * @param {string} part A clause part.
 * @param {Kind} kind The clause kind.
 * @returns {string | null} The key term, or null when only filler is left.
 */
export function keyTerm(part, kind) {
  const all = words(part);
  const kept = all.filter((word) => !FILLER.has(word));
  if (kind === WHEN && DETERMINERS.has(all[0]) && kept.length > 1) return kept[1];
  return kept[0] || null;
}

/**
 * Key terms of every part of every clause of one kind, without repeats.
 * @param {string[]} clauses Clause texts.
 * @param {Kind} kind Their kind.
 * @returns {string[]} The key terms.
 */
export function termsOf(clauses, kind) {
  const terms = new Set();
  for (const clause of clauses) {
    for (const part of splitClause(clause)) {
      const term = keyTerm(part, kind);
      if (term) terms.add(term);
    }
  }
  return [...terms];
}

/**
 * @typedef {object} TermNode
 * @property {string} key Mermaid node ID.
 * @property {Kind} kind Clause kind.
 * @property {string} term Key term.
 * @property {number} count Acceptances behind it.
 * @property {number[]} acceptances Indexes of those acceptances.
 */

/**
 * @typedef {object} Edge
 * @property {string} from Source node key.
 * @property {string} to Target node key.
 * @property {number} weight Acceptances carrying it.
 */

/** @typedef {{ edges: Map<string, Edge>, nodes: Map<string, TermNode> }} Graph */

/**
 * Builds the term graph. A node is a kind and term with the acceptances
 * behind it; edges run Given to When to Then, weighted by acceptance count.
 * @param {Pick<Acceptance, 'givens' | 'whens' | 'thens'>[]} acceptances The acceptances.
 * @returns {Graph} The graph.
 */
export function buildGraph(acceptances) {
  /** @type {Map<string, TermNode>} */
  const nodes = new Map();
  /** @type {Map<string, Edge>} */
  const edges = new Map();
  const node = (/** @type {Kind} */ kind, /** @type {string} */ term, /** @type {number} */ index) => {
    const key = `${kind[0]}_${term.replace(/-/g, '_')}`;
    const entry = nodes.get(key) ?? { acceptances: [], count: 0, key, kind, term };
    nodes.set(key, entry);
    entry.count += 1;
    entry.acceptances.push(index);
    return key;
  };
  const link = (/** @type {string} */ from, /** @type {string} */ to) => {
    const key = `${from}>${to}`;
    const edge = edges.get(key) ?? { from, to, weight: 0 };
    edges.set(key, edge);
    edge.weight += 1;
  };
  acceptances.forEach((acceptance, index) => {
    const [given, when, then] = KINDS.map((kind) =>
      termsOf(acceptance[`${kind}s`], kind).map((term) => node(kind, term, index))
    );
    for (const g of given) for (const w of when) link(g, w);
    for (const w of when) for (const t of then) link(w, t);
  });
  return { edges, nodes };
}

// Mermaid shapes by kind: Given rounded, When hexagon, Then box. A Map, since
// an object with a `then` key would read as a promise.
const SHAPES = new Map([
  [GIVEN, (/** @type {string} */ label) => `("${label}")`],
  [WHEN, (/** @type {string} */ label) => `{{"${label}"}}`],
  [THEN, (/** @type {string} */ label) => `["${label}"]`],
]);
const byKind = (/** @type {TermNode} */ a, /** @type {TermNode} */ b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind);
const byCount = (/** @type {TermNode} */ a, /** @type {TermNode} */ b) =>
  b.count - a.count || byKind(a, b) || a.term.localeCompare(b.term);

/**
 * Picks what to draw: nodes with at least `min` acceptances, the `cap`
 * largest of them, and the edges between them carrying at least `min`.
 * @param {Graph} graph The full graph.
 * @param {{ cap: number, min: number }} limits Node cap and minimum count.
 * @returns {{ edges: Edge[], nodes: TermNode[] }} The drawn part.
 */
export function selectGraph(graph, { cap, min }) {
  const nodes = [...graph.nodes.values()]
    .filter((n) => n.count >= min)
    .sort(byCount)
    .slice(0, cap);
  const kept = new Set(nodes.map((n) => n.key));
  const edges = [...graph.edges.values()]
    .filter((e) => e.weight >= min && kept.has(e.from) && kept.has(e.to))
    .sort((a, b) => b.weight - a.weight || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  return { edges, nodes };
}

/**
 * Writes deterministic Mermaid flowchart text, left to right, with edge
 * widths scaled to their weight.
 * @param {{ edges: Edge[], nodes: TermNode[] }} selected The drawn part.
 * @returns {string} Mermaid text.
 */
export function toMermaid({ edges, nodes }) {
  const lines = ['flowchart LR'];
  for (const n of [...nodes].sort((a, b) => byKind(a, b) || byCount(a, b))) {
    lines.push(`  ${n.key}${SHAPES.get(n.kind)?.(`${n.term} · ${n.count}`)}:::${n.kind}`);
  }
  const top = Math.max(1, ...edges.map((e) => e.weight));
  edges.forEach((e, i) => {
    lines.push(`  ${e.from} -->|${e.weight}| ${e.to}`);
    lines.push(`  linkStyle ${i} stroke-width:${(1 + (4 * e.weight) / top).toFixed(1)}px`);
  });
  return `${lines.join('\n')}\n`;
}

/** An error from GitHub, with its kind and, for a rate limit, its reset. */
export class FetchError extends Error {
  /**
   * @param {string} kind One of ERROR's values.
   * @param {string} message What to tell the viewer.
   * @param {number} [reset] Unix seconds when the rate limit resets.
   */
  constructor(kind, message, reset) {
    super(message);
    this.kind = kind;
    this.reset = reset;
  }
}

/**
 * Turns a failed response into a bad-token, rate-limit or plain error. A
 * secondary limit sends Retry-After instead of a used-up remaining count.
 * @param {number} status HTTP status.
 * @param {Headers} headers Response headers.
 * @returns {FetchError} The error.
 */
export function responseError(status, headers) {
  if (status === 401) return new FetchError(ERROR.TOKEN, 'GitHub rejected the token. It may be wrong or expired.');
  const retry = Number(headers.get('retry-after'));
  if (headers.get('x-ratelimit-remaining') !== '0' && !(retry > 0)) {
    return new FetchError(ERROR.HTTP, `GitHub answered ${status}.`);
  }
  const reset = retry > 0 ? Math.ceil(Date.now() / 1000) + retry : Number(headers.get('x-ratelimit-reset'));
  const when = new Date(reset * 1000).toLocaleTimeString();
  return new FetchError(ERROR.RATE, `GitHub's rate limit is used up. It resets at ${when}.`, reset);
}

/**
 * Decodes the contents API's base64 into UTF-8 text.
 * @param {string} content Base64 with line breaks.
 * @returns {string} The text.
 */
export function decodeBase64(content) {
  const bytes = Uint8Array.from(atob(content.replace(/\s/g, '')), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Runs `fn` over `items` with at most `limit` calls in flight, keeping order.
 * @template T, R
 * @param {T[]} items Inputs.
 * @param {number} limit Calls in flight.
 * @param {(item: T) => Promise<R>} fn The call.
 * @returns {Promise<R[]>} Results in input order.
 */
export async function mapLimit(items, limit, fn) {
  /** @type {R[]} */
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** @typedef {{ limit: number, remaining: number, reset: number }} Rate */

/**
 * A GitHub REST reader for one token. Each answer reports its rate headers.
 * @param {{ fetchImpl: typeof fetch, onRate: (rate: Rate) => void, token: string }} options Fetch, rate callback and token.
 * @returns {(url: string, allow404?: boolean) => Promise<any>} A GET that returns JSON, or null for an allowed 404.
 */
export function makeClient({ fetchImpl, onRate, token }) {
  return async (url, allow404 = false) => {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
    });
    const header = (/** @type {string} */ name) => Number(response.headers.get(`x-ratelimit-${name}`));
    onRate({ limit: header('limit'), remaining: header('remaining'), reset: header('reset') });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw responseError(response.status, response.headers);
    return response.json();
  };
}

/**
 * @typedef {object} RepoResult
 * @property {string} repo Repo name.
 * @property {string} [branch] Default branch.
 * @property {(ReturnType<typeof parseDoc> & { path: string, url: string })[]} docs Its requirement docs.
 * @property {string} [error] Why it failed to load.
 */

/**
 * Fetches every unarchived org repo's docs/requirements/*.md. A bad token or
 * a rate limit stops the run; any other failure stays with its repo.
 * @param {{ get: ReturnType<typeof makeClient>, limit: number }} options The GitHub reader and calls in flight.
 * @returns {Promise<RepoResult[]>} One result per repo, sorted by name.
 */
export async function fetchJourney({ get, limit }) {
  /** @type {{ archived: boolean, default_branch: string, name: string }[]} */
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await get(`${API}/orgs/${ORG}/repos?type=all&per_page=100&page=${page}`);
    repos.push(...batch.filter((/** @type {{ archived: boolean }} */ r) => !r.archived));
    if (batch.length < 100) break;
  }
  repos.sort((a, b) => a.name.localeCompare(b.name));
  return mapLimit(repos, limit, async (repo) => {
    try {
      const listing = await get(`${API}/repos/${ORG}/${repo.name}/contents/docs/requirements`, true);
      if (!listing) return { docs: [], repo: repo.name };
      /** @type {{ html_url: string, name: string, path: string, type: string, url: string }[]} */
      const files = listing.filter(
        (/** @type {{ name: string, type: string }} */ f) => f.type === 'file' && f.name.endsWith('.md')
      );
      const docs = await mapLimit(files, limit, async (file) => {
        const body = await get(file.url);
        return { path: file.path, url: file.html_url, ...parseDoc(decodeBase64(body.content)) };
      });
      return { branch: repo.default_branch, docs, repo: repo.name };
    } catch (error) {
      const failure = /** @type {FetchError} */ (error);
      if (failure.kind === ERROR.TOKEN || failure.kind === ERROR.RATE) throw failure;
      return { docs: [], error: failure.message, repo: repo.name };
    }
  });
}

/**
 * @typedef {Acceptance & { doc: string, repo: string, source: string | null, test: string, url: string }} Linked
 */

/**
 * GitHub code search for an acceptance ID outside the requirement docs, which
 * finds the one test named for it without spending the viewer's API budget.
 * @param {string} repo Repo name.
 * @param {string} id Acceptance ID.
 * @returns {string} The search page URL.
 */
export function testSearch(repo, id) {
  const query = `repo:${ORG}/${repo} "${id}" -path:docs/requirements`;
  return `https://github.com/search?type=code&q=${encodeURIComponent(query)}`;
}

/**
 * Flattens fetched docs into acceptances that carry their repo and links.
 * @param {RepoResult[]} results Fetched repos.
 * @returns {Linked[]} Every acceptance.
 */
export function flatten(results) {
  /** @type {Linked[]} */
  const out = [];
  for (const result of results) {
    const blob = `https://github.com/${ORG}/${result.repo}/blob/${result.branch}`;
    for (const doc of result.docs) {
      const source = doc.source ? `${blob}/${doc.source.path}#L${doc.source.line}` : null;
      for (const acceptance of doc.acceptances) {
        out.push({
          ...acceptance,
          doc: `${doc.id} ${doc.name}`,
          repo: result.repo,
          source,
          test: testSearch(result.repo, acceptance.id),
          url: `${doc.url}?plain=1#L${acceptance.line}`,
        });
      }
    }
  }
  return out;
}
