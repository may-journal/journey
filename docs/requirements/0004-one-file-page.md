---
relatedConfigurations: ['../../Makefile']
---

# 0004 One File Page

## Why

I open one HTML file from disk or any host, with no server and no other local file.

## Measurement

built pages that load no local file
-
built pages

Source: `src/build.ts:10`

## Requirements

- 0004.1
    - Given Developer runs the build
        - When it writes the page
            - Then the page holds the core code inline and loads no local script
