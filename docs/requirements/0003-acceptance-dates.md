---
relatedConfigurations: ['../../vitest.config.ts']
---

# 0003 Acceptance Dates

## Why

I see when each acceptance was first added and last changed, with links to those commits.

## Measurement

acceptances with an added and a modified date
-
acceptances in the fetched docs

Source: `src/core.ts:444`

## Requirements

- 0003.1
    - Given Viewer opens a node's acceptances
        - When the dates load
            - Then modified is the newest blame commit over the acceptance's lines, and added is the oldest version holding its id
- 0003.2
    - Given Viewer has a doc whose history walk stops early
        - When the dates load
            - Then added falls back to the file's first commit, marked approximate
- 0003.3
    - Given Viewer has a doc whose blame query fails
        - When the dates load
            - Then that doc's dates fail with GitHub's message
- 0003.4
    - Given Viewer asks for terms changed in the last few days
        - When the dates load
            - Then only terms where most acceptances changed carry a dot
