---
relatedConfigurations: ['../../vitest.config.ts']
---

# 0001 Journey Graph

## Why

I see every repo's acceptances as one Given, When and Then journey of shared key terms.

## Measurement

acceptances that add a term to the graph
-
acceptances in the fetched docs

Source: `src/core.ts:216`

## Requirements

- 0001.1
    - Given Viewer has a requirement doc with nested acceptances
        - When the page reads it
            - Then each acceptance keeps its id, its lines and its Given, When and Then text
- 0001.2
    - Given Viewer has a clause joined by commas or "and"
        - When the page reduces it
            - Then each part gives its own key term, and code spans give none
- 0001.3
    - Given Viewer has clauses with filler words and pronouns
        - When the page picks key terms
            - Then Given and Then keep the first word left, and When skips "the noun" to reach the verb
- 0001.4
    - Given Viewer sets a node cap and a minimum count
        - When the page draws the graph
            - Then the Mermaid text holds only the largest terms and links, in the same order every time
