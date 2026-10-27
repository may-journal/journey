# 0004 Node Details

## Why

I can go from any term in the journey to the acceptances, docs, code and tests behind it.

## Measurement

node taps that list acceptances with their links

-

node taps

## Requirements

- 0004.1
  - Given Viewer sees the graph
    - When they tap a node
      - Then it lists that node's acceptances with doc and test links
- 0004.2
  - Given Viewer focuses a node with the keyboard
    - When they press Enter or Space
      - Then it lists the node's acceptances, and other keys do nothing
- 0004.3
  - Given Viewer has the graph open
    - When they choose Refresh
      - Then every repo is fetched again and the graph is rebuilt from the new docs
- 0004.4
  - Given Viewer chooses Refresh during a load
    - When both loads finish
      - Then only the newest one draws
