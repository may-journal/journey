# 0001 Live Fetch

## Why

I can see every repo's requirements with my own token, and nothing private gets published.

## Measurement

repos whose requirement docs load

-

unarchived repos in the org

## Requirements

1. Asks for a token
   1. GIVEN Viewer has no token saved
      1. WHEN they open the page
         1. THEN it asks for a token and fetches nothing
2. Keeps a pasted token
   1. GIVEN Viewer pastes a token
      1. WHEN they save it
         1. THEN it stays only in localStorage
         2. THEN every repo's docs load with it
         3. THEN the status shows the fewest calls left
3. Rejected token
   1. GIVEN Viewer has a token GitHub rejects
      1. WHEN the page loads
         1. THEN it forgets the token
         2. THEN stops fetching and asks for another
4. Rate limit
   1. GIVEN Viewer has used up GitHub's rate limit
      1. WHEN the page loads
         1. THEN it says when the limit resets
5. Failed repo
   1. GIVEN Viewer has a repo that fails to load
      1. WHEN the page loads
         1. THEN a card names that repo while the others still draw
6. Failed listing
   1. GIVEN Viewer cannot list the org's repos
      1. WHEN the page loads
         1. THEN it says loading failed
7. Forget token
   1. GIVEN Viewer has a saved token
      1. WHEN they choose Forget token
         1. THEN the token and its graph are removed and the page asks for one
