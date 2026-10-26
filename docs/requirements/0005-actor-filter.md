# 0005 Actor Filter

## Why

I can read the app journey without tooling acceptances swamping it, or the tooling journey alone.

## Measurement

acceptances placed in App users or Developers

-

acceptances in the fetched docs

Source: `src/journey.js:452`

## Requirements

- 0005.1
  - Given Viewer has the graph open
    - When they look at the filter
      - Then it offers App users, Developers and Both, with Both chosen
- 0005.2
  - Given Viewer chooses App users or Developers
    - When the graph rebuilds
      - Then it holds only acceptances whose Given key term names that group, with no new fetch
- 0005.3
  - Given Viewer has acceptances whose Given is spoken as I, you or we
    - When the page sorts them into groups
      - Then they count as app users
- 0005.4
  - Given Viewer has an acceptance whose Given fits neither group
    - When they choose a group
      - Then a note counts it and it still shows under Both
