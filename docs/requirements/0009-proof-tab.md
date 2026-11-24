# 0009 Proof Tab

## Why

I can see which promises the org's last test run proved, and where the broken ones sit in the journey.

## Measurement

promises judged by a Fitness suite run from the last seven days

-

promises in the fetched docs

## Requirements

- 0009.1
  - Given Viewer has the journey loaded
    - When they look above the graph
      - Then a Proof tab sits beside Graph, with a count of unproven promises
- 0009.2
  - Given Viewer opens the Proof tab
    - When it shows
      - Then it states how many promises are proven, and gives each repo a tile with its count and bar
- 0009.3
  - Given Viewer has a promise whose test failed, was skipped or has none
    - When the graph draws
      - Then each link carrying that promise is red
- 0009.4
  - Given Viewer opens the Proof tab
    - When some shown promises are not proven
      - Then a table lists each one, its Given, When and Then terms, and why: failed, skipped, no test or not run
- 0009.5
  - Given Viewer has a token that reads the repos' workflow runs
    - When the page loads
      - Then it judges each promise by its repo's newest Fitness suite run from the last seven days, once that run's tests ran
