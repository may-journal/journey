// Replays GitHub API answers for the requirement tests. Each route maps a URL
// to the status, JSON body and headers GitHub sends, with its X-RateLimit headers.

import type { Rate } from '../src/core.ts';

export const API = 'https://api.github.com';
export const ORG_REPOS = `${API}/orgs/may-journal/repos?type=all&per_page=100&page=`;
export const RESET = 1800000000;
const REMAINING = 'x-ratelimit-remaining';

export interface Route {
  body: unknown;
  headers?: Record<string, string>;
  status?: number;
}

const RATE = {
  [REMAINING]: '4999',
  'x-ratelimit-limit': '5000',
  'x-ratelimit-reset': String(RESET),
  'x-ratelimit-resource': 'core',
};

// GitHub's answer once the primary rate limit is used up.
export const RATE_LIMITED: Route = {
  body: { message: 'API rate limit exceeded' },
  headers: { [REMAINING]: '0' },
  status: 403,
};

export const base64 = (text: string) => Buffer.from(text).toString('base64');

// A fetch that answers from `routes`. GraphQL routes are keyed by the blame
// path, as `graphql:<path>`. Any other URL answers 404 like GitHub does.
export function replay(routes: Record<string, Route>) {
  const rates: Rate[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const key = init.method === 'POST' ? `graphql:${JSON.parse(String(init.body)).variables.path}` : url;
    const route = routes[key] ?? { body: { message: 'Not Found' }, status: 404 };
    return new Response(JSON.stringify(route.body), {
      headers: { ...RATE, ...route.headers },
      status: route.status ?? 200,
    });
  }) as typeof fetch;
  return { fetchImpl, onRate: (rate: Rate) => rates.push(rate), rates };
}
