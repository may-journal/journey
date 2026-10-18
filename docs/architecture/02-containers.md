---
fitnessFunctions: ['architecture-contract', 'architecture-containers']
---

# Containers

```mermaid
C4Container
    title Journey page

    Person(viewer, "1 Viewer")
    Person(developer, "2 Developer")

    System_Boundary(journey, "3 Journey page") {
        Container(build, "4 Page build", "HTML, TypeScript", "src, scripts/build.ts")
    }

    System_Ext(github, "5 GitHub API", "REST and GraphQL.")
    System_Ext(cdn, "6 jsDelivr", "Serves Mermaid 11.17.2.")

    Rel(developer, build, "7")
    Rel(viewer, build, "8")
    Rel(build, github, "9")
    Rel(build, cdn, "10")
```

```mermaid
C4Container
    title Legend

    Person(p, "Person", "Same people as the context")
    System_Boundary(b, "System boundary") {
        Container(c, "Container", "Tech", "What the build ships")
    }
    System_Ext(e, "External", "Reached at run time")
```

| #   | Description                                                | Why                                                  |
| --- | ---------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Same viewer as the system context.                         | Opens the built page.                                |
| 2   | Same developer as the system context.                      | Builds the page and runs its tests.                  |
| 3   | The page's boundary.                                       | Everything inside it ships from this repo.           |
| 4   | The one-file page `make build` writes from `src`.          | It runs in the viewer's browser, with no server.     |
| 5   | Same API as the system context.                            | The page reads it with the viewer's token.           |
| 6   | Same CDN as the system context.                            | The page checks the script's integrity hash.         |
| 7   | The developer runs `make build`.                           | The build writes `dist/index.html`.                  |
| 8   | The viewer opens the page and pastes a token.              | The token stays in that browser's local storage.     |
| 9   | The page fetches repos, docs, blame and history.           | Everything else is built in memory on each load.     |
| 10  | The page loads Mermaid to draw the graph.                  | Mermaid is the only script from outside the repo.    |
