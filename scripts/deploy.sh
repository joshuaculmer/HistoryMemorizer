#!/usr/bin/env bash
#
# Builds the app and publishes it to the gh-pages branch.
#
# Runs the same way locally (npm run deploy) and inside GitHub Actions, so CI and
# a hand-run deploy can never drift apart.
#
#   BASE_PATH   Repo name the site is served under. Defaults to the origin repo.
#   DEPLOY_REF  Branch to publish to. Defaults to gh-pages.

set -euo pipefail

# Stop Git Bash rewriting Unix-looking values into Windows paths.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

cd "$(dirname "$0")/.."

BRANCH="${DEPLOY_REF:-gh-pages}"
WORKTREE=".deploy-worktree"

remote_url="$(git config --get remote.origin.url || true)"
if [ -z "$remote_url" ]; then
  echo "No 'origin' remote. Add one before deploying:" >&2
  echo "  git remote add origin https://github.com/<user>/<repo>.git" >&2
  exit 1
fi

repo="$(basename -s .git "$remote_url")"
export BASE_PATH="${BASE_PATH:-$repo}"

echo "==> Building for base path /$BASE_PATH/"
npm run build

if [ ! -f dist/index.html ]; then
  echo "Build produced no dist/index.html. Stopping." >&2
  exit 1
fi

# Pages serves the branch verbatim and would otherwise run the output through
# Jekyll, which drops files and folders whose names begin with an underscore.
touch dist/.nojekyll

echo "==> Publishing to $BRANCH"
git worktree remove --force "$WORKTREE" 2>/dev/null || true
rm -rf "$WORKTREE"

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git fetch origin "$BRANCH" --depth 1
  git worktree add "$WORKTREE" "origin/$BRANCH" --detach
else
  git worktree add --detach "$WORKTREE"
  git -C "$WORKTREE" checkout --orphan "$BRANCH"
fi

# Replace the published tree wholesale so deleted files actually disappear.
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$WORKTREE"/

cd "$WORKTREE"
git add --all

if git diff --cached --quiet; then
  echo "==> No change in build output. Nothing to publish."
else
  git commit -m "Deploy $(git -C .. rev-parse --short HEAD)"
  git push --force origin "HEAD:$BRANCH"
  echo "==> Pushed to $BRANCH"
fi

cd ..
git worktree remove --force "$WORKTREE"

owner="$(basename "$(dirname "$remote_url")")"
echo "==> Live shortly at https://${owner##*:}.github.io/$repo/"
