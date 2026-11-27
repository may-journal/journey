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
         2. THEN it offers Developers
         3. THEN it offers Both
         4. THEN Both is chosen
2. Filters by group
   1. GIVEN Viewer chooses App users or Developers
      1. WHEN the graph rebuilds
         1. THEN it holds only acceptances whose condition key term names that group
         2. THEN it makes no new fetch
3. Spoken pronouns
   1. GIVEN Viewer has acceptances whose condition is spoken as a personal pronoun
      1. WHEN the page sorts them into groups
         1. THEN each counts as app users
4. Fits neither group
   1. GIVEN Viewer has an acceptance whose condition fits neither group
      1. WHEN they choose a group
         1. THEN a note counts it
         2. THEN it still shows under Both
