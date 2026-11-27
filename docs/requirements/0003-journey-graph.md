# 0003 Journey Graph

## Why

I can read the whole org's requirements as one journey that runs from actors through actions to outcomes.

## Measurement

acceptances that add a node to the graph

-

acceptances in the fetched docs

## Requirements

1. Builds the graph
   1. GIVEN Viewer has acceptances sharing key terms
      1. WHEN the page builds the graph
         1. THEN each term is one node
         2. THEN edges run from condition to action to result
         3. THEN weighted by acceptance count
2. Writes Mermaid
   1. GIVEN Viewer has a node cap
   2. GIVEN a minimum count
      1. WHEN the page writes Mermaid text
         1. THEN it holds only the largest terms
         2. THEN it holds only the largest links
         3. THEN the output is the same every time
3. Sliders
   1. GIVEN Viewer moves the node or minimum slider
      1. WHEN the graph redraws
         1. THEN Mermaid draws the new selection
         2. THEN too high a minimum says so
4. Dark mode
   1. GIVEN Viewer uses dark mode
      1. WHEN the graph draws
         1. THEN Mermaid uses its dark theme
         2. THEN it redraws on a mode change
5. Phone width
   1. GIVEN Viewer is on a phone
      1. WHEN the graph is wider than the screen
         1. THEN the diagram keeps its full width
         2. THEN it scrolls sideways
6. Mermaid failure
   1. GIVEN Viewer has a graph Mermaid cannot draw
      1. WHEN the graph draws
         1. THEN the diagram says Mermaid could not draw it
