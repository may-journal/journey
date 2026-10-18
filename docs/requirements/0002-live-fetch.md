---
relatedConfigurations: ['../../vitest.config.ts']
---

# 0002 Live Fetch

## Why

I see the org's current requirements with my own token, and nothing but the token is stored.

## Measurement

repos whose docs load or show an error
-
org repos the token can read

Source: `src/core.ts:377`

## Requirements

- 0002.1
    - Given Viewer has a token that reads every org repo
        - When the page loads
            - Then it lists the repos page by page and reads each repo's requirement docs
- 0002.2
    - Given Viewer has one repo whose docs fail to load
        - When the page loads
            - Then that repo carries an error, and the other repos still load
- 0002.3
    - Given Viewer has a wrong or expired token
        - When the page loads
            - Then it says GitHub rejected the token
- 0002.4
    - Given Viewer has used up the API rate limit
        - When the page loads
            - Then it says the limit is used up and when it resets
