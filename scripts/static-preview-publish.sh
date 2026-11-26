#!/usr/bin/env bash
# Synced from templates/static-site in may-journal/.github, so edit it there.
# It publishes SITE to gh-pages under TARGET, or removes TARGET when CLOSED is true.
set -euo pipefail
git config --global user.name 'github-actions[bot]'
git config --global user.email '41898282+github-actions[bot]@users.noreply.github.com'
for attempt in 1 2 3 4 5; do
  rm -rf "$PAGES"
  if git ls-remote --exit-code "$REMOTE" refs/heads/gh-pages >/dev/null; then
    git clone --quiet --depth 1 --branch gh-pages "$REMOTE" "$PAGES"
  else
    git init --quiet --initial-branch=gh-pages "$PAGES"
    git -C "$PAGES" remote add origin "$REMOTE"
  fi
  # main replaces everything but the previews; a pull request
  # replaces only its own folder.
  if [ "$TARGET" = . ]; then
    find "$PAGES" -mindepth 1 -maxdepth 1 ! -name .git ! -name pr -exec rm -rf {} +
  else
    rm -rf "${PAGES:?}/$TARGET"
  fi
  if [ "$CLOSED" != true ]; then
    mkdir -p "$PAGES/$TARGET"
    cp -R "$SITE/." "$PAGES/$TARGET/"
  fi
  # Pages would run Jekyll on the branch without this file, cspell:words nojekyll
  touch "$PAGES/.nojekyll"
  git -C "$PAGES" add -A
  if git -C "$PAGES" diff --cached --quiet; then
    exit 0
  fi
  git -C "$PAGES" commit --quiet -m "chore(pages): publish $TARGET at ${SHA:0:7}"
  if git -C "$PAGES" push --quiet origin HEAD:gh-pages; then
    exit 0
  fi
  echo "::notice::Another run pushed to gh-pages first; retrying ($attempt of 5)."
done
exit 1
