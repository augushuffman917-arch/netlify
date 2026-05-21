#!/usr/bin/env sh
set -eu

echo "[build] Starting hardened static build checks..."

for file in public/index.html netlify/edge-functions/relay.js netlify.toml; do
  if [ ! -f "$file" ]; then
    echo "[build] Missing required file: $file" >&2
    exit 1
  fi
done

if ! grep -qi "<html" public/index.html; then
  echo "[build] public/index.html does not look like an HTML page." >&2
  exit 1
fi

echo "[build] Static site is ready and Edge relay is configured."
