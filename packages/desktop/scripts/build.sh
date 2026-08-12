#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"

# Build main and preload only (skip renderer)
cd "$ROOT/packages/desktop"
npx electron-vite build --mode production

# Copy pre-built renderer dist to desktop out/renderer
RENDERER_DIST="$ROOT/packages/renderer/dist"
DESKTOP_RENDERER_OUT="$ROOT/packages/desktop/out/renderer"

if [ -d "$RENDERER_DIST" ]; then
  rm -rf "$DESKTOP_RENDERER_OUT"
  cp -r "$RENDERER_DIST" "$DESKTOP_RENDERER_OUT"
  echo "[build] Copied renderer dist to desktop out/renderer"
else
  echo "[build] WARNING: renderer dist not found at $RENDERER_DIST"
  echo "[build] Run 'pnpm --filter @dusk/renderer build' first"
  exit 1
fi

echo "[build] Desktop build complete"
