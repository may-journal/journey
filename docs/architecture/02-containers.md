---
fitnessFunctions: ["architecture-contract", "architecture-containers"]
---

# Containers

```mermaid
C4Container
    title Journey

    Person(viewer, "1 Viewer")

    System_Boundary(journey, "2 Journey") {
        Container(page, "3 journey", "Node, JavaScript, HTML", "index.html and src, served as they are. The core module is the package export.")
    }

    System_Ext(pages, "4 GitHub Pages", "Serves this repo's files.")
    System_Ext(github, "5 GitHub API", "REST.")
    System_Ext(cdn, "6 jsDelivr", "Serves Mermaid 12.2.0.")

    Rel(viewer, pages, "A")
    Rel(pages, page, "B")
    Rel(page, github, "C")
    Rel(page, cdn, "D")
```

```mermaid
C4Container
    title Legend

    Person(p, "Person", "Human or agent actor")
    System_Boundary(b, "System boundary") {
        Container(c, "Container", "Tech", "Runnable or deployable unit")
    }
    System_Ext(e, "External", "Outside our boundary")
```

Numbers on nodes and arrows match the callout table.

| #   | Description                                       | Why                                               |
| --- | ------------------------------------------------- | ------------------------------------------------- |
| 1   | Same viewer as the system context.                | Every visit starts with this actor.               |
| 2   | Journey's boundary.                               | Everything inside it ships from this repo.        |
| 3   | The `journey` package: `index.html` and `src`.    | It runs in the viewer's browser, with no server.  |
| 4   | Same GitHub Pages as the system context.          | It serves the main branch's files unchanged.      |
| 5   | Same API as the system context.                   | The page reads it with the viewer's token.        |
| 6   | Same CDN as the system context.                   | The page checks the script's integrity hash.      |
| A   | The viewer opens the page.                        | The public way in.                                |
| B   | Pages hands the browser the HTML and its scripts. | No build step stands between a commit and Pages.  |
| C   | The page lists repos and reads each one's docs.   | Everything else is built in memory on each load.  |
| D   | The page loads Mermaid to draw the graph.         | Mermaid is the only script from outside the repo. |
