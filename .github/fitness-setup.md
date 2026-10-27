# Fitness setup

may-journal/.github holds the source copy; org-settings syncs it by PR.

## Local hooks

Follow Fitness's [latest installer setup](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md#install-latest). It installs to `$HOME/.local/share/fitness` unless `FITNESS_INSTALL_DIR` names another folder, and the synced hooks follow the same rule.

The synced hooks run `${FITNESS_INSTALL_DIR:-$HOME/.local/share/fitness}/fitness-install` with `--version latest`. Before switching, review existing hooks and retain custom checks using the [shared hook guidance](https://github.com/may-journal/fitness-runner/blob/main/docs/adoption.md#per-repo-pieces). Keep custom message and push checks until their migration is reviewed; the sync leaves their files intact.

At each checkout's root, activate the synced hook directory and run Fitness:

```sh
git config --local core.hooksPath .fitness-hooks
"${FITNESS_INSTALL_DIR:-$HOME/.local/share/fitness}/fitness-install" --version latest
```

## Workflow ownership

The required Fitness suite runs at the org level. The sync distributes repo-level issue-check, close-check, and comment-check callers, local hooks, and this setup note through reviewable PRs. Installation and hook activation remain local setup steps.

For common behavior, see Fitness's [CI guide](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md) and [cache and version policy](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md#cache-and-versions).
