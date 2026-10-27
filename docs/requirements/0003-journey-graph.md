# 0003 Journey Graph

## Why

I can read the whole org's requirements as one journey from actors through actions to outcomes.

## Measurement

acceptances that add a node to the graph

-

acceptances in the fetched docs

Source: `src/journey.js:162`

## Requirements

- 0003.1
  - Given Viewer has acceptances sharing key terms
    - When the page builds the graph
      - Then each term is one node, and edges run Given to When to Then, weighted by acceptance count
- 0003.2
  - Given Viewer has a node cap and a minimum count
    - When the page writes Mermaid text
      - Then it holds only the largest terms and links, the same every time
- 0003.3
  - Given Viewer moves the node or minimum slider
    - When the graph redraws
      - Then Mermaid draws the new selection, and too high a minimum says so
- 0003.4
  - Given Viewer uses dark mode
    - When the graph draws
      - Then Mermaid uses its dark theme and redraws when the mode changes
- 0003.5
  - Given Viewer is on a phone
    - When the graph is wider than the screen
      - Then the diagram keeps its full width and scrolls sideways
- 0003.6
  - Given Viewer has a graph Mermaid cannot draw
    - When the graph draws
      - Then the diagram says Mermaid could not draw it
