# 0002 Key Terms

## Why

I can see which actors, actions and outcomes repos share, since each clause shrinks to a single comparable word.

## Measurement

clause parts that give a key term

-

clause parts in the fetched docs

## Requirements

1. Reads a doc
   1. GIVEN Viewer has a requirement doc nested four or two spaces deep
   2. GIVEN with front matter
      1. WHEN the page reads it
         1. THEN each acceptance keeps its ID
         2. THEN line texts
         3. THEN clause texts
2. Splits a clause
   1. GIVEN Viewer has a clause joined by commas or "and"
      1. WHEN the page splits it
         1. THEN each part stands alone
         2. THEN code spans drop out
3. Key term of a condition or result
   1. GIVEN Viewer has a condition or result clause
      1. WHEN the page reduces it
         1. THEN its key term is the first word left after filler words
         2. THEN its key term skips pronouns
         3. THEN it is kept as not-<term> after a "not"
4. Key term of an action
   1. GIVEN Viewer has an action clause
      1. WHEN the page reduces it
         1. THEN its key term is the action verb
         2. THEN past a leading "the noun"
5. Front matter and heading
   1. GIVEN Viewer has a requirement doc with front matter
   2. GIVEN a doc with no heading
      1. WHEN the page reads it
         1. THEN front matter adds no acceptance
         2. THEN no heading means its path
