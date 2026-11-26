# 0004 Node Details

## Why

I can go from any term in the journey to the acceptances, docs, code and tests behind that term.

## Measurement

node taps that list acceptances with their links

-

node taps

## Requirements

1. Tap a node
   1. GIVEN Viewer sees the graph
      1. WHEN they tap a node
         1. THEN it lists that node's acceptances with doc and test links
2. Keyboard
   1. GIVEN Viewer focuses a node with the keyboard
      1. WHEN they press Enter or Space
         1. THEN it lists the node's acceptances
         2. THEN other keys do nothing
3. Refresh
   1. GIVEN Viewer has the graph open
      1. WHEN they choose Refresh
         1. THEN every repo is fetched again and the graph is rebuilt from the new docs
4. Refresh during a load
   1. GIVEN Viewer chooses Refresh during a load
      1. WHEN both loads finish
         1. THEN only the newest one draws
