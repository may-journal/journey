#!/usr/bin/env bash
# Synced from templates/static-site in may-journal/.github, so edit it there.
# It posts or edits the one comment linking the preview of pull request NUMBER.
set -euo pipefail
marker='<!-- static-preview -->'
site=$(gh api "repos/$OWNER/$REPO/pages" --jq .html_url 2>/dev/null || echo "https://$OWNER.github.io/$REPO/")
body=$(printf 'Preview of %s: %s\n\n%s\n' "${SHA:0:7}" "${site%/}/pr/$NUMBER/" "$marker")
id=$(gh api "repos/$OWNER/$REPO/issues/$NUMBER/comments" --paginate \
  --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | contains(\"$marker\"))) | .id" | sed -n 1p)
if [ -n "$id" ]; then
  gh api -X PATCH "repos/$OWNER/$REPO/issues/comments/$id" -f "body=$body" >/dev/null
else
  gh api "repos/$OWNER/$REPO/issues/$NUMBER/comments" -f "body=$body" >/dev/null
fi
