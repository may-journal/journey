---
relatedConfigurations: ['workflows/plan-check.yml', 'workflows/close-check.yml']
---

# Fitness setup

may-journal/.github holds the source copy; org-settings syncs it by PR.

## Local hooks

Follow Fitness's [latest installer setup](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md#install-latest) after setting this org-specific destination:

```sh
export FITNESS_INSTALL_DIR="$HOME/.local/share/may-journal/fitness"
```

The synced hooks expect `$HOME/.local/share/may-journal/fitness/fitness-install` and use `--version latest`. Before switching, review existing hooks and retain custom checks using the [shared hook guidance](https://github.com/may-journal/fitness-runner/blob/main/docs/adoption.md#per-repo-pieces). Keep custom message and push checks until their migration is reviewed; the sync leaves their files intact.

At each checkout's root, activate the synced hook directory and run Fitness:

```sh
git config --local core.hooksPath .fitness-hooks
"$HOME/.local/share/may-journal/fitness/fitness-install" --version latest
```

## Workflow ownership

The required Fitness suite runs at the org level. The sync distributes repo-level plan-check and close-check callers, local hooks, and this setup note through reviewable PRs. Installation and hook activation remain local setup steps.

For common behavior, see Fitness's [CI guide](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md) and [cache and version policy](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md#cache-and-versions).
