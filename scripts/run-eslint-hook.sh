#!/usr/bin/env bash

set -euo pipefail

server_files=()
web_files=()

for file in "$@"; do
  case "$file" in
    packages/server/*)
      server_files+=("${file#packages/server/}")
      ;;
    packages/web/*)
      web_files+=("${file#packages/web/}")
      ;;
  esac
done

if [[ ${#server_files[@]} -gt 0 ]]; then
  pnpm --dir packages/server exec eslint --fix "${server_files[@]}"
fi

if [[ ${#web_files[@]} -gt 0 ]]; then
  pnpm --dir packages/web exec eslint --fix "${web_files[@]}"
fi
