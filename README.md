---
relatedConfigurations: ["Makefile", "package.json", "biome.json", "vitest.config.js"]
---

# journey

One live user journey drawn from every may-journal repo's requirements.

## The page

GitHub Pages serves this repo's main branch as it is, with no build or schedule. Open the page and paste a fine-grained, read-only Contents token. The page fetches each repo's `docs/requirements/*.md`, reduces every clause to a key term, and draws one Mermaid graph. The token stays in that browser's local storage, and nothing else is stored.

Given key terms name the actor or state, When terms the action, and Then terms the outcome. Each is the first word left after filler words and pronouns, kept as `not-<term>` after a "not". A When clause skips a leading "the noun" first, to reach its verb.

`src/journey.js` is also the package's one export, so other tools can reduce requirement docs the same way.

## Structure

`index.html` holds the layout and styles and loads Mermaid. `src/page.js` runs the screens, and `src/journey.js` holds the parsing, graph, Mermaid and GitHub code.

## Make targets

Run `npm ci` once.

| Target            | Does                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `make serve`      | Serves the page on port 8790, as Pages would. `PORT` picks another port. |
| `make test`       | Runs the requirement tests with full coverage.                           |
| `make check`      | Runs the fitness suite.                                                  |
| `make check-page` | Runs `scripts/check-page.js` against the live page, as below.            |

`make check-page` serves the page, opens it in headless Chrome with `GITHUB_TOKEN`, and taps a node. It prints what the page shows as JSON and saves light and dark screenshots to `out/`. `CHROME` picks the browser; the default is the shared Mac's Playwright Chromium.

## Docs

Requirements live in [docs/requirements](docs/requirements), and the C4 views live in [docs/architecture](docs/architecture).
