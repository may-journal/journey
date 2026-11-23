# 0008 Share Link

## Why

I can hand someone the view I see by copying the page's address.

## Measurement

view choices restored from the address

-

view choices the address holds

## Requirements

- 0008.1
  - Given Viewer changes the Show filter
    - When the graph rebuilds
      - Then the address hash names that filter
- 0008.2
  - Given Viewer unchecks a repo
    - When the address updates
      - Then the address hash names the unchecked repos
- 0008.3
  - Given Viewer types text in the Find box
    - When the address updates
      - Then the address hash holds that text
- 0008.4
  - Given Viewer opens an address whose hash holds a view
    - When the graph loads
      - Then the filter, the repo choice and the Find text match the hash
- 0008.5
  - Given Viewer returns every choice to its default
    - When the graph rebuilds
      - Then the address has no hash
- 0008.6
  - Given Viewer saved a repo choice in that browser
    - When they open an address whose hash names other repos
      - Then the hash's choice shows, and the saved one is kept
- 0008.7
  - Given Viewer opens an address whose hash names an unknown filter
    - When the graph loads
      - Then the filter is Both
- 0008.8
  - Given Viewer saved a token
    - When the address hash changes
      - Then the token is not in the address
