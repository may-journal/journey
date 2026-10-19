---
relatedConfigurations: ['../../vitest.config.js']
---

# 0001 Live Fetch

## Why

I can see every repo's requirements with my own token, and nothing private is ever published.

## Measurement

repos whose requirement docs load
-
unarchived repos in the org

Source: `src/journey.js:338`

## Requirements

- 0001.1
    - Given Viewer has no token saved
        - When they open the page
            - Then it asks for a token and fetches nothing
- 0001.2
    - Given Viewer pastes a token
        - When they save it
            - Then it stays only in localStorage, every repo's docs load with it, and the status shows the fewest calls left
- 0001.3
    - Given Viewer has a token GitHub rejects
        - When the page loads
            - Then it forgets the token, stops fetching and asks for another
- 0001.4
    - Given Viewer has used up GitHub's rate limit
        - When the page loads
            - Then it says when the limit resets
- 0001.5
    - Given Viewer has a repo that fails to load
        - When the page loads
            - Then a card names that repo while the others still draw
- 0001.6
    - Given Viewer cannot list the org's repos
        - When the page loads
            - Then it says loading failed
- 0001.7
    - Given Viewer has a saved token
        - When they choose Forget token
            - Then the token and its graph are removed and the page asks for one
