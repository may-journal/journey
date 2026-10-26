# 0002 Key Terms

## Why

I can see which actors, actions and outcomes repos share, since each clause shrinks to one comparable word.

## Measurement

clause parts that give a key term

-

clause parts in the fetched docs

## Requirements

- 0002.1
  - Given Viewer has a requirement doc nested four or two spaces deep, with front matter
    - When the page reads it
      - Then each acceptance keeps its ID, line and clause texts, front matter adds none, and no heading means its path
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
