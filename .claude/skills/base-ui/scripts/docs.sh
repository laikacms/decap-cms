#!/usr/bin/env bash
# Fetch Base UI (base-ui.com) documentation as markdown, on demand.
#
#   docs.sh list [filter]      list all doc pages (path + title), optionally filtered
#   docs.sh get <name>...      print doc page(s); <name> is a leaf like "menu" or a
#                              full path like "components/menu"
#
# Pages live at https://base-ui.com/react/<section>/<page>.md with sections:
# components/, utils/, handbook/, overview/. The index is https://base-ui.com/llms.txt.
set -euo pipefail

BASE=https://base-ui.com

index() {
  curl -fsSL --max-time 20 "$BASE/llms.txt"
}

list() {
  local filter="${1:-}"
  local rows
  rows=$(index | sed -n 's|^- \[\([^]]*\)\](https://base-ui.com/react/\([a-z0-9/-]*\)\.md)[: ]*\(.*\)$|\2\t\1: \3|p')
  if [[ -n "$filter" ]]; then
    grep -i -- "$filter" <<<"$rows" || { echo "no pages match '$filter'" >&2; exit 1; }
  else
    printf '%s\n' "$rows"
  fi
}

resolve() {
  local name="$1"
  if [[ "$name" == */* ]]; then
    printf '%s\n' "$name"
    return
  fi
  local paths
  paths=$(index | grep -o 'https://base-ui.com/react/[a-z0-9/-]*\.md' | sed 's|https://base-ui.com/react/||;s|\.md$||')
  local exact
  exact=$(grep -i -m1 "/$name\$" <<<"$paths" || true)
  if [[ -n "$exact" ]]; then
    printf '%s\n' "$exact"
    return
  fi
  local fuzzy
  fuzzy=$(grep -i -- "$name" <<<"$paths" || true)
  if [[ $(wc -l <<<"$fuzzy") -eq 1 && -n "$fuzzy" ]]; then
    printf '%s\n' "$fuzzy"
    return
  fi
  if [[ -n "$fuzzy" ]]; then
    echo "ambiguous name '$name', candidates:" >&2
    printf '%s\n' "$fuzzy" >&2
  else
    echo "no doc page matches '$name' (try: docs.sh list)" >&2
  fi
  exit 1
}

get() {
  [[ $# -ge 1 ]] || { echo "usage: docs.sh get <name>..." >&2; exit 1; }
  local name path
  for name in "$@"; do
    path=$(resolve "$name")
    echo "===== $path ($BASE/react/$path.md) ====="
    curl -fsSL --max-time 20 "$BASE/react/$path.md"
    echo
  done
}

cmd="${1:-}"
shift || true
case "$cmd" in
  list) list "$@" ;;
  get) get "$@" ;;
  *)
    echo "usage: docs.sh list [filter] | docs.sh get <name>..." >&2
    exit 1
    ;;
esac
