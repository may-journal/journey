# 0005 Actor Filter

## Why

I can read the app journey without tooling acceptances swamping it, or read the tooling journey alone.

## Measurement

acceptances placed in App users or Developers

-

acceptances in the fetched docs

## Requirements

1. Offers groups
   1. GIVEN Viewer has the graph open
      1. WHEN they look at the filter
         1. THEN it offers App users
         2. THEN Developers and Both
         3. THEN with Both chosen
2. Filters by group
   1. GIVEN Viewer chooses App users or Developers
      1. WHEN the graph rebuilds
         1. THEN it holds only acceptances whose Given key term names that group
         2. THEN with no new fetch
3. Spoken pronouns
   1. GIVEN Viewer has acceptances whose Given is spoken as a pronoun
      1. WHEN the page sorts a Given spoken as I into groups
         1. THEN it counts as app users
      2. WHEN the page sorts a Given spoken as you into groups
         1. THEN it counts as app users
      3. WHEN the page sorts a Given spoken as we into groups
         1. THEN it counts as app users
4. Fits neither group
   1. GIVEN Viewer has an acceptance whose Given fits neither group
      1. WHEN they choose a group
         1. THEN a note counts it and it still shows under Both
