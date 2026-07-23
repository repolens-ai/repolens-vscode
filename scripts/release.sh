#!/usr/bin/env bash
set -euo pipefail

VERSION=$1
if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 VERSION"
  echo "  e.g. $0 1.0.0"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> Downloading binaries for v$VERSION"
./scripts/download-binaries.sh "$VERSION"

echo "==> Installing binaries"
mkdir -p repolens_binaries/install
mv downloaded_binaries/{linux,mac-arm64,mac-x86_64,win} repolens_binaries/install/

echo "==> Bumping version to $VERSION"
yarn run bump "$VERSION"

echo "==> Packaging VSIX for all targets"
for target in win32-x64 linux-x64 darwin-x64 darwin-arm64; do
  echo "  Packaging for $target..."
  yarn run vsce package --target "$target"
done

echo "==> Done"
echo ""
echo "Generated VSIX files:"
ls -lh repolens-*.vsix
