# 0006 Repo Choice

## Why

I can see one app's journey without the other repos' terms in the way.

## Measurement

acceptances drawn from the checked repos

-

acceptances in the fetched docs

## Requirements

1. Checkboxes
   1. GIVEN Viewer has repos with requirement docs
      1. WHEN the graph loads
         1. THEN each such repo gets a checkbox
         2. THEN all are checked
2. Unchecking
   1. GIVEN Viewer unchecks a repo
      1. WHEN the graph rebuilds
         1. THEN its acceptances leave the graph
         2. THEN nodes left with none disappear
3. No refetch
   1. GIVEN Viewer changes a checkbox
      1. WHEN the graph rebuilds
         1. THEN nothing is fetched again
4. Remembered choice
   1. GIVEN Viewer has unchecked repos
      1. WHEN they open the page again in that browser
         1. THEN localStorage restores the same choice
5. New repo
   1. GIVEN Viewer saved a choice before a repo was first seen
      1. WHEN the page lists that repo
         1. THEN it starts checked
