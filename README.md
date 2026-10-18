---
relatedConfigurations: ['Makefile', 'package.json', 'biome.json', 'vitest.config.ts']
---

# journey

One live user journey drawn from every may-journal repo's requirements.

## The page

`make build` writes `dist/index.html`, one file that opens straight from disk. Paste a fine-grained read-only token, and the page fetches each repo's `docs/requirements/*.md`. It reduces every Given, When and Then clause to a key term and draws one Mermaid graph. The token stays in that browser's local storage.

Added and modified dates load after the graph, from blame and each file's history. History is read oldest first and stops after 25 versions or a rate limit. Renames are not followed.

## Structure

`src/core.ts` holds the parsing, graph, Mermaid and GitHub fetch code. `src/page.html` holds the layout and the page's own script. `src/build.ts` strips the core's types and puts it inside the page.

## Make targets

Run `npm ci` once.

| Target | Does | Needs |
| --- | --- | --- |
| `make build` | Writes the one-file page to `dist/index.html`. `OUT` picks another folder. | Node 26 |
| `make test` | Runs the requirement tests with full coverage. | Node 26 |
| `make check` | Runs the fitness suite. | Fitness |
| `make counts` | Prints repo, doc, acceptance, node and edge counts as JSON, using the page's code. `ARGS=--dates` adds dates. | `GITHUB_TOKEN` |
| `make check-page` | Builds the page, opens it in headless Chrome and taps a node. It prints what the page shows and saves screenshots to `out/`. | `GITHUB_TOKEN`, `CHROME` |

The default `CHROME` is the Playwright Chromium on the shared Mac.

## Docs

Requirements live in [docs/requirements](docs/requirements), and the C4 views live in [docs/architecture](docs/architecture).
