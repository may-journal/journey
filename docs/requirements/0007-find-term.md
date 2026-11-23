# 0007 Find Term

## Why

I can find where a term sits in the graph without reading every node.

## Measurement

matching terms marked

-

drawn terms that contain the typed text

## Requirements

- 0007.1
  - Given Viewer types text in the Find box
    - When the graph is drawn
      - Then each drawn term that contains the text is marked, and the others are dimmed
- 0007.2
  - Given Viewer types text in another letter case
    - When the graph is drawn
      - Then the same terms are marked
- 0007.3
  - Given Viewer typed text in the Find box
    - When the marks change
      - Then a note counts the matching terms among the drawn ones
- 0007.4
  - Given Viewer typed text that no drawn term contains
    - When the marks change
      - Then every term is dimmed, and the note counts zero
- 0007.5
  - Given Viewer empties the Find box
    - When the marks change
      - Then no term is marked or dimmed, and the note is empty
- 0007.6
  - Given Viewer typed text in the Find box
    - When a slider redraws the graph
      - Then the marks and the note follow the newly drawn terms
