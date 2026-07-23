#!/usr/bin/env bash
set -euo pipefail

VERSION=$1
if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 VERSION"
  echo "  e.g. $0 1.0.0"
  echo ""
  echo "Triggers the publish workflow on repolens-ai/repolens-vscode via GitHub Actions."
  echo "Requires 'gh' CLI with sufficient permissions."
  exit 1
fi

echo "==> Triggering publish workflow for v$VERSION"
gh workflow run publish.yml \
  --repo repolens-ai/repolens-vscode \
  --field version="$VERSION"

echo ""
echo "Workflow triggered. Monitor at:"
echo "  https://github.com/repolens-ai/repolens-vscode/actions/workflows/publish.yml"
