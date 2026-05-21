#!/usr/bin/env bash
set -euo pipefail

echo "[build] Starting hardened static build checks..."

required_files=(
  "public/index.html"
  "netlify/edge-functions/relay.js"
  "netlify.toml"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "[build] Missing required file: $file" >&2
    exit 1
  fi
done

if ! rg -q "<html" public/index.html; then
  echo "[build] public/index.html does not look like an HTML page." >&2
  exit 1
fi

echo "[build] Static site is ready and Edge relay is configured."
