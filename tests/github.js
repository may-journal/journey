// Replays GitHub's REST answers for the requirement tests, mapping each URL to the status, body and headers.
// A route may wait on a `gate` promise, so a test can hold one answer back.

export const API = 'https://api.github.com';
export const ORG_REPOS = `${API}/orgs/may-journal/repos?type=all&per_page=100&page=`;
export const RESET = 1800000000;

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
 */
export const repo = (name, extra = {}) => ({ archived: false, default_branch: 'main', name, ...extra });

/**
 * The URL of a repo's requirements folder listing.
 */
export const listing = (name) => `${API}/repos/may-journal/${name}/contents/docs/requirements`;

/**
 * A file entry in a folder listing.
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
 */
export function repoDocs(name, docs) {
  const files = Object.keys(docs).map((doc) => file(name, `docs/requirements/${doc}`));
  const routes = { [listing(name)]: { body: files } };
  files.forEach((f, i) => {
    routes[f.url] = { body: { content: Buffer.from(Object.values(docs)[i]).toString('base64') } };
  });
  return routes;
}

/**
 * A fetch that answers from `routes`; any other URL answers 404 like GitHub.
 */
export function replay(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ auth: init.headers.Authorization, url });
    const route = routes[url] ?? { body: { message: 'Not Found' }, status: 404 };
    await route.gate;
    return new Response(JSON.stringify(route.body), {
      headers: { ...RATE, ...route.headers },
      status: route.status ?? 200,
    });
  };
  return { calls, fetchImpl };
}
