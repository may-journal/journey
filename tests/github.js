// Replays GitHub's REST answers for the requirement tests. Each route maps a
// URL to the status, JSON body and headers GitHub sends. A route may wait on
// a `gate` promise, so a test can hold one answer back.

export const API = 'https://api.github.com';
export const ORG_REPOS = `${API}/orgs/may-journal/repos?type=all&per_page=100&page=`;
export const RESET = 1800000000;

/** @typedef {{ body?: unknown, gate?: Promise<void>, headers?: Record<string, string>, status?: number }} Route */

export const REMAINING = 'x-ratelimit-remaining';

const RATE = {
  'x-ratelimit-limit': '5000',
  [REMAINING]: '4999',
  'x-ratelimit-reset': String(RESET),
};

/** GitHub's answer once the primary rate limit is used up. */
export const RATE_LIMITED = {
  body: { message: 'API rate limit exceeded' },
  headers: { [REMAINING]: '0' },
  status: 403,
};

/**
 * A repo as the org listing returns it.
 * @param {string} name Repo name.
 * @param {object} [extra] Fields to override.
 * @returns {object} The listing entry.
 */
export const repo = (name, extra = {}) => ({ archived: false, default_branch: 'main', name, ...extra });

/**
 * The URL of a repo's requirements folder listing.
 * @param {string} name Repo name.
 * @returns {string} The URL.
 */
export const listing = (name) => `${API}/repos/may-journal/${name}/contents/docs/requirements`;

/**
 * A file entry in a folder listing.
 * @param {string} name Repo name.
 * @param {string} path File path.
 * @param {string} [type] Entry type.
 * @returns {{ html_url: string, name: string, path: string, type: string, url: string }} The entry.
 */
export const file = (name, path, type = 'file') => ({
  html_url: `https://github.com/may-journal/${name}/blob/main/${path}`,
  name: String(path.split('/').pop()),
  path,
  type,
  url: `${API}/repos/may-journal/${name}/contents/${path}`,
});

/**
 * Routes for one repo holding the given docs, keyed by file name.
 * @param {string} name Repo name.
 * @param {Record<string, string>} docs Doc texts by file name.
 * @returns {Record<string, Route>} The routes.
 */
export function repoDocs(name, docs) {
  const files = Object.keys(docs).map((doc) => file(name, `docs/requirements/${doc}`));
  /** @type {Record<string, Route>} */
  const routes = { [listing(name)]: { body: files } };
  files.forEach((f, i) => {
    routes[f.url] = { body: { content: Buffer.from(Object.values(docs)[i]).toString('base64') } };
  });
  return routes;
}

/**
 * A fetch that answers from `routes`; any other URL answers 404 like GitHub.
 * @param {Record<string, Route>} routes Answers by URL.
 * @returns {{ calls: { auth: string, url: string }[], fetchImpl: typeof fetch }} The fetch and its calls.
 */
export function replay(routes) {
  /** @type {{ auth: string, url: string }[]} */
  const calls = [];
  const fetchImpl = /** @type {typeof fetch} */ (
    /** @type {unknown} */ (
      async (/** @type {string} */ url, /** @type {{ headers: Record<string, string> }} */ init) => {
        calls.push({ auth: init.headers.Authorization, url });
        const route = routes[url] ?? { body: { message: 'Not Found' }, status: 404 };
        await route.gate;
        return new Response(JSON.stringify(route.body), {
          headers: { ...RATE, ...route.headers },
          status: route.status ?? 200,
        });
      }
    )
  );
  return { calls, fetchImpl };
}
