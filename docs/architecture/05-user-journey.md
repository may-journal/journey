---
fitnessFunctions: ['architecture-contract', 'architecture-journey']
---

# User Journey

```mermaid
flowchart TB
    developer((1 Developer)):::persona
    build(2 Run make build<br/>Req 0004):::action
    file[3 One HTML file in dist<br/>Req 0004]:::screen
    viewer((4 Viewer)):::persona
    token[5 Paste-token screen<br/>Req 0002]:::screen
    github[(6 GitHub API<br/>Req 0002)]:::system
    graph[7 Key-term graph with cap and minimum<br/>Req 0001]:::screen
    details[8 Acceptances behind a term, with dates<br/>Req 0001, 0003]:::screen

    developer --> build
    build --> file
    viewer --> token
    token -->|Save and load 0002| github
    github -->|Docs reduced to terms 0001| graph
    graph -->|Tap a term 0001| details
    github -->|Blame and history 0003| details

    classDef persona fill:#eef2ff,stroke:#6366f1,color:#312e81,stroke-width:2px
    classDef screen fill:#f8fafc,stroke:#64748b,color:#1e293b,stroke-width:2px
    classDef action fill:#fff7ed,stroke:#f97316,color:#9a3412,stroke-width:2px
    classDef system fill:#ecfdf5,stroke:#10b981,color:#064e3b,stroke-width:2px
```

| #   | Description                                         | Why                                                 |
| --- | --------------------------------------------------- | --------------------------------------------------- |
| 1   | Same developer as the system context.               | Makes the page.                                     |
| 2   | The developer runs the build.                       | One command writes the page.                        |
| 3   | The page holds the core inline.                     | It opens from disk or any host.                     |
| 4   | Same viewer as the system context.                  | Reads the journey.                                  |
| 5   | With no token, the page asks for one.               | A bad token brings this screen back with a message. |
| 6   | The page reads every repo's docs with the token.    | A failed repo shows an error card.                  |
| 7   | Shared terms form one graph, Given to When to Then. | Sliders set the cap and the minimum count.          |
| 8   | Each acceptance shows its text, links and dates.    | Sort by newest change, or mark recent terms.        |
