---
relatedConfigurations: ["../../vitest.config.js"]
---

# 0006 Repo Choice

## Why

I can see one app's journey without the other repos' terms in the way.

## Measurement

acceptances drawn from the checked repos

-

acceptances in the fetched docs

Source: `src/page.js:147`

## Requirements

- 0006.1
  - Given Viewer has repos with requirement docs
    - When the graph loads
      - Then each such repo gets a checkbox, and all are checked
- 0006.2
  - Given Viewer unchecks a repo
    - When the graph rebuilds
      - Then its acceptances leave the graph, and nodes left with none disappear
- 0006.3
  - Given Viewer changes a checkbox
    - When the graph rebuilds
      - Then nothing is fetched again
- 0006.4
  - Given Viewer has unchecked repos
    - When they open the page again in that browser
      - Then localStorage restores the same choice
- 0006.5
  - Given Viewer saved a choice before a repo was first seen
    - When the page lists that repo
      - Then it starts checked
