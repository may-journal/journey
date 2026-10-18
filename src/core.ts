// Core: pure parsing, key-term, graph and Mermaid functions, plus the GitHub
// fetch. The build strips its types and puts it in the page as an inline script.

export const ORG = 'may-journal';
export const API = 'https://api.github.com';

const HEADING = /^#\s+(\d{4})\s+(.+?)\s*$/;
const ACCEPTANCE = /^\s*-\s+(\d{4}\.\d+)\s*$/;
const CLAUSE = /^\s*-\s+(Given|When|Then)\s+(.+?)\s*$/;
const SOURCE = /^Source:\s*`([^`:]+):(\d+)`/;
const REMAINING = 'x-ratelimit-remaining';

export type Kind = 'given' | 'when' | 'then';
export const KINDS: Kind[] = ['given', 'when', 'then'];
const [GIVEN, WHEN, THEN] = KINDS;

// Kinds of FetchError: a rejected token, a used-up rate limit, any other answer.
export const ERROR = { HTTP: 'http', RATE: 'rate', TOKEN: 'token' };

export interface Acceptance {
  givens: string[];
  id: string;
  line: number;
  lines: number[];
  thens: string[];
  whens: string[];
}

export interface Doc {
  acceptances: Acceptance[];
  id: string | null;
  name: string | null;
  source: { line: number; path: string } | null;
}

export interface TermNode {
  acceptances: number[];
  count: number;
  key: string;
  kind: Kind;
  term: string;
}

export interface Edge {
  from: string;
  to: string;
  weight: number;
}

export interface Graph {
  edges: Map<string, Edge>;
  nodes: Map<string, TermNode>;
}

export interface Selected {
  edges: Edge[];
  nodes: TermNode[];
}

export interface Rate {
  limit: number;
  remaining: number;
  reset: number;
  resource: string | null;
}

export interface Client {
  get: <T>(url: string, allow404?: boolean) => Promise<T>;
  graphql: <T>(query: string, variables: Record<string, string>) => Promise<T>;
}

export interface GitFile {
  html_url: string;
  name: string;
  path: string;
  type: string;
  url: string;
}

export interface Stamp {
  date: string;
  url: string;
}

export interface BlameRange {
  commit: { committedDate: string; url: string };
  endingLine: number;
  startingLine: number;
}

export interface Found {
  firstSeen: Record<string, Stamp>;
  oldest: Stamp;
  ranges: BlameRange[];
}

export type Clauses = Pick<Acceptance, 'givens' | 'thens' | 'whens'>;
export type Dated = Pick<Acceptance, 'id' | 'lines'>;
export type Modified = (string | undefined)[];

export interface Dates {
  added: Stamp & { approx: boolean };
  modified: Stamp | null;
}

export interface JourneyOptions {
  client: Client;
  limit: number;
}

export interface DatesOptions {
  branch: string;
  client: Client;
  ids: string[];
  maxVersions: number;
  path: string;
  repo: string;
}

export interface RepoResult {
  branch?: string;
  docs: (Doc & { file: string; path: string; url: string })[];
  error?: string;
  repo: string;
}

// Parses one requirements doc into its id, name, Source and acceptances.
// Each acceptance keeps its Given, When and Then lines, and its 1-based lines.
export function parseDoc(markdown: string): Doc {
  const doc: Doc = { acceptances: [], id: null, name: null, source: null };
  let current: Acceptance | null = null;
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
      current = { givens: [], id: acceptance[1], line: index + 1, lines: [index + 1], thens: [], whens: [] };
      doc.acceptances.push(current);
      return;
    }
    const clause = current && line.match(CLAUSE);
    if (current && clause) {
      current[`${clause[1].toLowerCase() as Kind}s`].push(clause[2]);
      current.lines.push(index + 1);
    }
  });
  return doc;
}

// Splits a compound clause on commas and " and ", ignoring code spans.
export function splitClause(text: string): string[] {
  return text
    .replace(/`[^`]*`/g, ' ')
    .split(/,|\band\b/i)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const DETERMINERS = new Set(
  'a an the this that these those each every any all some no my our your his her its their another other'.split(' ')
);
const STOPWORDS = new Set([
  ...DETERMINERS,
  ...'i me we us you he him she it they them there here'.split(' '),
  ...'is are was were be been being am do does did has have had can could will would should may might must'.split(' '),
  ...'also still just only then now not already again'.split(' '),
  // Conjunctions, numerals and quantifiers never name an actor, action or outcome.
  ...'or nor but yet either neither both while whether'.split(' '),
  ...'one two three four five six seven eight nine ten first second third last next'.split(' '),
  ...'many much more most few fewer less least several such same own none'.split(' '),
  ...'of to in on at for with from by into onto as if so'.split(' '),
]);

function words(part: string): string[] {
  return part
    .toLowerCase()
    .replace(/'s\b/g, '')
    .replace(/[^a-z0-9-]+/g, ' ')
    .split(' ')
    .map((word) => word.replace(/^-+|-+$/g, ''))
    .filter((word) => word && !/^\d+$/.test(word));
}

// Reduces one clause part to its key term. Given and Then take the first word
// left after dropping filler; When skips a leading "the noun" to reach the verb.
export function keyTerm(part: string, kind: Kind): string | null {
  const all = words(part);
  const kept = all.filter((word) => !STOPWORDS.has(word));
  if (kind === WHEN && DETERMINERS.has(all[0]) && kept.length > 1) return kept[1];
  return kept[0] || null;
}

// Key terms of every part of every clause of one kind, deduplicated.
export function termsOf(clauses: string[], kind: Kind): string[] {
  const terms = new Set<string>();
  for (const clause of clauses) {
    for (const part of splitClause(clause)) {
      const term = keyTerm(part, kind);
      if (term) terms.add(term);
    }
  }
  return [...terms];
}

// Builds the term graph. Nodes are kind+term with the acceptances behind them;
// edges run Given→When→Then, weighted by how many acceptances carry them.
export function buildGraph(acceptances: Clauses[]): Graph {
  const nodes = new Map<string, TermNode>();
  const edges = new Map<string, Edge>();
  const node = (kind: Kind, term: string, index: number) => {
    const key = `${kind[0]}_${term.replace(/-/g, '_')}`;
    const entry = nodes.get(key) ?? { acceptances: [], count: 0, key, kind, term };
    nodes.set(key, entry);
    entry.count += 1;
    entry.acceptances.push(index);
    return key;
  };
  const link = (from: string, to: string) => {
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
const SHAPES = new Map<Kind, (label: string) => string>([
  [GIVEN, (label) => `("${label}")`],
  [WHEN, (label) => `{{"${label}"}}`],
  [THEN, (label) => `["${label}"]`],
]);
const byKind = (a: TermNode, b: TermNode) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind);
const byCount = (a: TermNode, b: TermNode) => b.count - a.count || byKind(a, b) || a.term.localeCompare(b.term);

// Picks the nodes and edges to draw: nodes with at least `min` acceptances,
// the `cap` largest, and edges between them carrying at least `min`.
export function selectGraph(graph: Graph, { cap, min }: { cap: number; min: number }): Selected {
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

// Writes deterministic Mermaid flowchart text for the selected nodes and edges.
// Terms in `highlight` end their label with a small dot.
export function toMermaid({ edges, nodes }: Selected, highlight: Set<string>): string {
  const lines = ['flowchart LR'];
  const sorted = [...nodes].sort((a, b) => byKind(a, b) || byCount(a, b));
  for (const n of sorted) {
    const shape = SHAPES.get(n.kind) as (label: string) => string;
    const dot = highlight.has(n.key) ? ' •' : '';
    lines.push(`  ${n.key}${shape(`${n.term} · ${n.count}${dot}`)}:::${n.kind}`);
  }
  const top = Math.max(1, ...edges.map((e) => e.weight));
  edges.forEach((e, i) => {
    lines.push(`  ${e.from} -->|${e.weight}| ${e.to}`);
    lines.push(`  linkStyle ${i} stroke-width:${(1 + (4 * e.weight) / top).toFixed(1)}px`);
  });
  return `${lines.join('\n')}\n`;
}

// --- GitHub fetch -------------------------------------------------------

export class FetchError extends Error {
  kind: string;
  reset: number | undefined;

  constructor(kind: string, message: string, reset?: number) {
    super(message);
    this.kind = kind;
    this.reset = reset;
  }
}

// Turns a failed response into a bad-token, rate-limit or plain HTTP error.
// A secondary limit sends Retry-After instead of a used-up X-RateLimit count.
export function responseError(status: number, headers: Headers): FetchError {
  if (status === 401) return new FetchError(ERROR.TOKEN, 'GitHub rejected the token. It may be wrong or expired.');
  const retry = Number(headers.get('retry-after'));
  if (headers.get(REMAINING) !== '0' && !(retry > 0)) {
    return new FetchError(ERROR.HTTP, `GitHub answered ${status}.`);
  }
  const reset = retry > 0 ? Math.ceil(Date.now() / 1000) + retry : Number(headers.get('x-ratelimit-reset'));
  const when = new Date(reset * 1000).toLocaleTimeString();
  return new FetchError(ERROR.RATE, `GitHub's rate limit is used up. It resets at ${when}.`, reset);
}

// Decodes the contents API's base64 into UTF-8 text.
export function decodeBase64(content: string): string {
  const bytes = Uint8Array.from(atob(content.replace(/\s/g, '')), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Runs `fn` over `items` with at most `limit` calls in flight, keeping order.
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// A GitHub client for one token: REST `get` and GraphQL `graphql`.
// Each response reports its X-RateLimit headers through `onRate`.
export function makeClient({
  fetchImpl,
  onRate,
  token,
}: {
  fetchImpl: typeof fetch;
  onRate: (rate: Rate) => void;
  token: string;
}): Client {
  const send = async (url: string, init: RequestInit, allow404: boolean) => {
    const response = await fetchImpl(url, {
      ...init,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
    });
    const header = (name: string) => response.headers.get(`x-ratelimit-${name}`);
    onRate({
      limit: Number(header('limit')),
      remaining: Number(header('remaining')),
      reset: Number(header('reset')),
      resource: header('resource'),
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw responseError(response.status, response.headers);
    return response.json();
  };
  return {
    get: (url, allow404 = false) => send(url, {}, allow404),
    graphql: async (query, variables) => {
      const body = await send(`${API}/graphql`, { body: JSON.stringify({ query, variables }), method: 'POST' }, false);
      if (body.errors) {
        const limited = body.errors.some((e: { type: string }) => e.type === 'RATE_LIMITED');
        throw new FetchError(limited ? ERROR.RATE : ERROR.HTTP, body.errors[0].message);
      }
      return body.data;
    },
  };
}

// Fetches every org repo's docs/requirements/*.md with the client.
// Bad-token and rate-limit errors stop the run; other failures stay per repo.
export async function fetchJourney({ client, limit }: JourneyOptions): Promise<RepoResult[]> {
  const repos: { archived: boolean; default_branch: string; name: string }[] = [];
  for (let page = 1; ; page++) {
    const batch = await client.get<typeof repos>(`${API}/orgs/${ORG}/repos?type=all&per_page=100&page=${page}`);
    repos.push(...batch.filter((r) => !r.archived));
    if (batch.length < 100) break;
  }
  repos.sort((a, b) => a.name.localeCompare(b.name));

  return mapLimit(repos, limit, async (repo): Promise<RepoResult> => {
    try {
      const listing = await client.get<GitFile[] | null>(
        `${API}/repos/${ORG}/${repo.name}/contents/docs/requirements`,
        true
      );
      if (!listing) return { docs: [], repo: repo.name };
      const files = listing.filter((f) => f.type === 'file' && f.name.endsWith('.md'));
      const docs = await mapLimit(files, limit, async (file) => {
        const body = await client.get<{ content: string }>(file.url);
        return { file: file.name, path: file.path, url: file.html_url, ...parseDoc(decodeBase64(body.content)) };
      });
      return { branch: repo.default_branch, docs, repo: repo.name };
    } catch (error) {
      const failure = error as FetchError;
      if (failure.kind === ERROR.TOKEN || failure.kind === ERROR.RATE) throw failure;
      return { docs: [], error: failure.message, repo: repo.name };
    }
  });
}

// Flattens fetched docs into acceptances that carry their repo and doc links.
export function flatten(results: RepoResult[]) {
  const out = [];
  for (const result of results) {
    for (const doc of result.docs) {
      const blob = `https://github.com/${ORG}/${result.repo}/blob/${result.branch}`;
      for (const acceptance of doc.acceptances) {
        out.push({
          ...acceptance,
          branch: result.branch,
          doc: `${doc.id} ${doc.name}`,
          path: doc.path,
          repo: result.repo,
          source: doc.source ? `${blob}/${doc.source.path}#L${doc.source.line}` : null,
          url: `${doc.url}?plain=1#L${acceptance.line}`,
        });
      }
    }
  }
  return out;
}

// --- Added and modified dates --------------------------------------------

// The acceptance ids a version of a requirements doc contains.
export function idsIn(markdown: string): Set<string> {
  const ids = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(ACCEPTANCE);
    if (match) ids.add(match[1]);
  }
  return ids;
}

// Picks one acceptance's dates. Modified is the newest blame commit over its
// id and clause lines. Added is the oldest version holding its id, or the
// file's first commit marked approx when the history walk never found it.
export function pickDates(acceptance: Dated, { firstSeen, oldest, ranges }: Found): Dates {
  let modified: Stamp | null = null;
  for (const range of ranges) {
    const touches = acceptance.lines.some((n) => n >= range.startingLine && n <= range.endingLine);
    if (touches && (!modified || range.commit.committedDate > modified.date)) {
      modified = { date: range.commit.committedDate, url: range.commit.url };
    }
  }
  const seen = firstSeen[acceptance.id];
  const added = seen ? { ...seen, approx: false } : { ...oldest, approx: true };
  return { added, modified };
}

// The terms where most acceptances changed on or after `since`, an ISO date.
// `modified[i]` is acceptance i's modified date, or undefined until it loads.
// A term counts only when more than half of its acceptances changed.
export function recentKeys(graph: Graph, modified: Modified, since: string): Set<string> {
  const keys = new Set<string>();
  for (const node of graph.nodes.values()) {
    const changed = node.acceptances.filter((i) => (modified[i] ?? '') >= since).length;
    if (changed * 2 > node.count) keys.add(node.key);
  }
  return keys;
}

const BLAME = `query($owner: String!, $name: String!, $ref: String!, $path: String!) {
  repository(owner: $owner, name: $name) {
    object(expression: $ref) {
      ... on Commit { blame(path: $path) { ranges { startingLine endingLine commit { committedDate url } } } }
    }
  }
}`;

// Fetches one doc's blame, then walks its history oldest-first until every id
// is found. The walk stops early after `maxVersions` versions or any failure,
// such as a rate limit, and ids not found fall back to the first commit.
// Renames are not followed.
export async function fetchDocDates({ branch, client, ids, maxVersions, path, repo }: DatesOptions): Promise<Found> {
  const data = await client.graphql<{ repository: { object: { blame: { ranges: BlameRange[] } } } }>(BLAME, {
    name: repo,
    owner: ORG,
    path,
    ref: branch,
  });
  const ranges: BlameRange[] = data.repository.object.blame.ranges;
  const query = `sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=100`;
  type Commit = { commit: { committer: { date: string } }; html_url: string; sha: string };
  const commits: Commit[] = (await client.get<Commit[]>(`${API}/repos/${ORG}/${repo}/commits?${query}`)).reverse();
  const stamp = (c: Commit): Stamp => ({ date: c.commit.committer.date, url: c.html_url });
  const firstSeen: Record<string, Stamp> = {};
  const missing = new Set(ids);
  for (const commit of commits.slice(0, maxVersions)) {
    if (!missing.size) break;
    let body: { content: string };
    try {
      body = await client.get<{ content: string }>(`${API}/repos/${ORG}/${repo}/contents/${path}?ref=${commit.sha}`);
    } catch {
      break;
    }
    for (const id of idsIn(decodeBase64(body.content))) {
      if (missing.delete(id)) firstSeen[id] = stamp(commit);
    }
  }
  return { firstSeen, oldest: stamp(commits[0]), ranges };
}
