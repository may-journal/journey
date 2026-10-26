---
fitnessFunctions: ["architecture-contract", "architecture-code"]
---

# Code

```mermaid
classDiagram
    class page["1 Page script"] {
        <<abstract>>
        +start(options)
    }
    class core["2 Core module"] {
        <<abstract>>
        +fetchJourney(options)
        +buildGraph(acceptances)
        +toMermaid(selected)
    }
    class failure["3 Fetch failure"] {
        <<abstract>>
        +kind
        +reset
    }

    page --> core : A
    core --> failure : B

    style page fill:#6d28d9,stroke:#4c1d95,color:#ffffff
    style core fill:#6d28d9,stroke:#4c1d95,color:#ffffff
    style failure fill:#6d28d9,stroke:#4c1d95,color:#ffffff
```

```mermaid
classDiagram
    class Example {
        +property
        +method()
    }
    class Parent
    class Child
    Parent <|-- Child : inherits
    Parent --> Child : uses

    style Example fill:#6d28d9,stroke:#4c1d95,color:#ffffff
    style Parent fill:#6d28d9,stroke:#4c1d95,color:#ffffff
    style Child fill:#6d28d9,stroke:#4c1d95,color:#ffffff
```

Numbers on classes and letters on relationships match the callout table.

| #   | Description                                                    | Why                                                  |
| --- | -------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | The page script, which starts the screens in a window.         | Tests start it in jsdom the same way.                |
| 2   | The core module: fetch, key terms, graph and Mermaid text.     | Fitness reads no JavaScript, so these stay abstract. |
| 3   | A failed GitHub answer: a bad token, a rate limit or HTTP.     | The page words each kind its own way.                |
| A   | The page loads docs, builds the graph and draws its selection. | Sliders and Refresh rebuild in memory.               |
| B   | A bad token or rate limit stops the load.                      | Other failures stay with their repo.                 |
