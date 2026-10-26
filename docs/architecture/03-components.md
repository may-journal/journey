---
fitnessFunctions: ["architecture-contract", "architecture-components"]
---

# Components

```mermaid
C4Component
    title Journey page

    Person(viewer, "1 Viewer")

    Container_Boundary(page, "2 Journey page (index.html)") {
        Component(shell, "3 Shell", "HTML, CSS", "index.html")
        Component(screen, "4 Page script", "JavaScript", "src/page.js")
        Component(core, "5 Core", "JavaScript", "src/journey.js")
    }

    System_Ext(github, "6 GitHub API")
    System_Ext(cdn, "7 jsDelivr")

    Rel(viewer, shell, "A")
    Rel(shell, screen, "B")
    Rel(screen, core, "C")
    Rel(core, github, "D")
    Rel(shell, cdn, "E")

    UpdateElementStyle(viewer, $bgColor="#334155", $borderColor="#1e293b", $fontColor="#ffffff")
    UpdateElementStyle(shell, $bgColor="#b45309", $borderColor="#92400e", $fontColor="#ffffff")
    UpdateElementStyle(screen, $bgColor="#b45309", $borderColor="#92400e", $fontColor="#ffffff")
    UpdateElementStyle(core, $bgColor="#b45309", $borderColor="#92400e", $fontColor="#ffffff")
    UpdateElementStyle(github, $bgColor="#64748b", $borderColor="#475569", $fontColor="#ffffff")
    UpdateElementStyle(cdn, $bgColor="#64748b", $borderColor="#475569", $fontColor="#ffffff")
```

```mermaid
C4Component
    title Legend

    Person(p, "Person", "Human or agent actor")
    Container_Boundary(cb, "Container boundary") {
        Component(c, "Component", "Tech", "Logical unit")
    }
    System_Ext(e, "External", "Outside our boundary")

    UpdateElementStyle(p, $bgColor="#334155", $borderColor="#1e293b", $fontColor="#ffffff")
    UpdateElementStyle(c, $bgColor="#b45309", $borderColor="#92400e", $fontColor="#ffffff")
    UpdateElementStyle(e, $bgColor="#64748b", $borderColor="#475569", $fontColor="#ffffff")
```

Numbers on nodes and letters on arrows match the callout table.

| #   | Description                                            | Why                                                |
| --- | ------------------------------------------------------ | -------------------------------------------------- |
| 1   | Same viewer as the containers view.                    | Uses only the shell.                               |
| 2   | The page container.                                    | Its components split its sources.                  |
| 3   | The layout, styles and the two script tags.            | Light and dark styles live here.                   |
| 4   | The token screen, sliders, graph drawing and details.  | It takes its window, fetch and Mermaid as inputs.  |
| 5   | Parsing, key terms, the graph, Mermaid text and fetch. | It touches no DOM, so tests call it directly.      |
| 6   | Same API as the containers view.                       | Only the core calls it.                            |
| 7   | Same CDN as the containers view.                       | Only the shell loads from it.                      |
| A   | The viewer pastes a token, moves sliders, taps terms.  | The main way in.                                   |
| B   | The shell's module script starts the page script.      | It passes the browser's own fetch and Mermaid.     |
| C   | The page script calls the core to load and draw.       | The page script holds no parsing or fetch logic.   |
| D   | The core lists repos and reads their docs.             | Bad tokens and rate limits stop it with a message. |
| E   | The shell loads Mermaid before the page script runs.   | Deferred scripts run in document order.            |
