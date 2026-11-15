# Fitness setup

<!-- cspell:words fitnessrc -->

may-journal/.github holds the source copy; org-settings syncs it by PR.

## Local hooks

Follow Fitness's [latest installer setup](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md#install-latest). It installs to `$HOME/.local/share/fitness` unless `FITNESS_INSTALL_DIR` names another folder, and the synced hooks follow the same rule.

The synced hooks run `${FITNESS_INSTALL_DIR:-$HOME/.local/share/fitness}/fitness-install` with `--version latest`. Before switching, review existing hooks and retain custom checks using the [shared hook guidance](https://github.com/may-journal/fitness-runner/blob/main/docs/adoption.md#per-repo-pieces). Keep custom message and push checks until their migration is reviewed; the sync leaves their files intact.

At each checkout's root, activate the synced hook directory and run Fitness:

```sh
git config --local core.hooksPath .fitness-hooks
"${FITNESS_INSTALL_DIR:-$HOME/.local/share/fitness}/fitness-install" --version latest
```

## Check pins

Each Fitness check installs on its own, and the synced hooks set `FITNESS_WITH_CHECKS=pinned`, so they install only the checks `checkVersions` in `.fitnessrc.json` pins. The sync writes `checkVersions` into each repo that sets none. It pins the checks an external policy lists, else `{"*": "v1"}` for every check.

A repo's own pins are kept. See [check versions](https://github.com/may-journal/fitness-runner/blob/main/docs/check-protocol.md#check-versions).

## Dependabot

The synced Dependabot PR caller completes each Dependabot pull request, so PR check passes it unchanged. It needs the automation App's `AUTOMATION_APP_ID` and `AUTOMATION_APP_KEY` as Actions secrets and as Dependabot secrets, since Dependabot's runs read only Dependabot secrets. Set both at the org level, once.

## Workflow ownership

The required Fitness suite runs at the org level. The sync distributes repo-level issue-check, close-check, comment-check and Dependabot PR callers, the check pins, local hooks, and this setup note through reviewable PRs. Installation and hook activation remain local setup steps.

For common behavior, see Fitness's [CI guide](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md) and [cache and version policy](https://github.com/may-journal/fitness-runner/blob/main/docs/ci.md#cache-and-versions).
