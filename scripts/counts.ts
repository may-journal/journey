#!/usr/bin/env node
// Fetches every org repo's requirements with the page's own code and prints
// the counts the page would draw. Usage and output are in README.md.

import {
  buildGraph,
  fetchDocDates,
  fetchJourney,
  flatten,
  makeClient,
  mapLimit,
  pickDates,
  selectGraph,
} from '../src/core.ts';

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('counts: set GITHUB_TOKEN to a token that can read the org repos');
  process.exit(2);
}
let rate = null;
const client = makeClient({
  fetchImpl: fetch,
  onRate: (r) => {
    rate = r;
  },
  token,
});
const results = await fetchJourney({ client, limit: 6 });
const acceptances = flatten(results);
const graph = buildGraph(acceptances);
const drawn = selectGraph(graph, { cap: 40, min: 3 });
const counts = {
  acceptances: acceptances.length,
  docs: results.reduce((n, r) => n + r.docs.length, 0),
  drawnEdges: drawn.edges.length,
  drawnNodes: drawn.nodes.length,
  edges: graph.edges.size,
  incomplete: acceptances
    .filter((a) => !a.givens.length || !a.whens.length || !a.thens.length)
    .map((a) => `${a.repo} ${a.id}`),
  nodes: graph.nodes.size,
  repoErrors: results.filter((r) => r.error).map((r) => `${r.repo}: ${r.error}`),
  repos: results.length,
  reposWithDocs: results.filter((r) => r.docs.length).length,
};

if (process.argv.includes('--dates')) {
  const docs = results.flatMap((r) => r.docs.filter((d) => d.acceptances.length).map((d) => ({ d, r })));
  const dated = await mapLimit(docs, 4, async ({ d, r }) => {
    const ids = d.acceptances.map((a) => a.id);
    const found = await fetchDocDates({ branch: r.branch, client, ids, maxVersions: 25, path: d.path, repo: r.repo });
    return d.acceptances.map((a) => pickDates(a, found));
  });
  const all = dated.flat();
  counts.dates = {
    approxAdded: all.filter((d) => d.added.approx).length,
    withAdded: all.filter((d) => !d.added.approx).length,
    withModified: all.filter((d) => d.modified).length,
  };
}
counts.rateRemaining = `${rate.remaining}/${rate.limit} (${rate.resource})`;
console.log(JSON.stringify(counts, null, 2));
