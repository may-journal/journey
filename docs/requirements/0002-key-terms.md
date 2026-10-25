---
relatedConfigurations: ["../../vitest.config.js"]
---

# 0002 Key Terms

## Why

I can see which actors, actions and outcomes repos share, since each clause shrinks to one comparable word.

## Measurement

clause parts that give a key term

-

clause parts in the fetched docs

Source: `src/journey.js:114`

## Requirements

- 0002.1
  - Given Viewer has a requirement doc
    - When the page reads it
      - Then each acceptance keeps its ID, line, Source and clause texts, and a doc without a heading goes by its path
- 0002.2
  - Given Viewer has a clause joined by commas or "and"
    - When the page splits it
      - Then each part stands alone and code spans drop out
- 0002.3
  - Given Viewer has a Given or Then clause
    - When the page reduces it
      - Then its key term is the first word left after filler and pronouns, kept as not-<term> after a "not"
- 0002.4
  - Given Viewer has a When clause
    - When the page reduces it
      - Then its key term is the action verb, past a leading "the noun"
