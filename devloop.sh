#!/usr/bin/env bash
set -euo pipefail

normalize_verdict_token() {
  local raw="${1:-}"
  local cleaned

  cleaned="$(
    printf '%s' "$raw" \
      | tr '[:lower:]' '[:upper:]' \
      | sed -E 's/[[:space:]]+/_/g; s/[^A-Z_]+/_/g; s/^_+|_+$//g; s/_+/_/g'
  )"

  case "$cleaned" in
    APPROVED) printf 'APPROVED' ;;
    NEEDS_WORK|NEEDSWORK|NEED_WORK) printf 'NEEDS_WORK' ;;
    REJECTED) printf 'REJECTED' ;;
    *) printf 'UNKNOWN' ;;
  esac
}

extract_verdict_from_line() {
  local line="${1:-}"
  local upper_line token
  upper_line="$(printf '%s' "$line" | tr '[:lower:]' '[:upper:]')"

  if [[ "$upper_line" =~ VERDICT[[:space:]]*:[[:space:]]*([A-Z_[:space:]-]+) ]]; then
    token="${BASH_REMATCH[1]}"
    normalize_verdict_token "$token"
    return 0
  fi

  printf 'UNKNOWN'
}

parse_review_verdict() {
  local review_text="${1:-}"
  local first_non_empty_line=""
  local line verdict
  local canonical_verdict=""

  while IFS= read -r line; do
    if [[ "$line" =~ [^[:space:]] ]]; then
      first_non_empty_line="$line"
      break
    fi
  done <<< "$review_text"

  # First pass: look for any canonical "Verdict: <TOKEN>" line anywhere
  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*Verdict:[[:space:]]* ]]; then
      verdict="$(extract_verdict_from_line "$line")"
      if [ "$verdict" != "UNKNOWN" ]; then
        canonical_verdict="$verdict"
        break
      fi
    fi
  done <<< "$review_text"

  # If we found a canonical verdict, use it
  if [ -n "$canonical_verdict" ]; then
    printf '%s' "$canonical_verdict"
    return 0
  fi

  # Fallback: check first non-empty line for any verdict-like pattern
  if [[ -n "$first_non_empty_line" ]]; then
    verdict="$(extract_verdict_from_line "$first_non_empty_line")"
    if [ "$verdict" != "UNKNOWN" ]; then
      printf '%s' "$verdict"
      return 0
    fi
  fi

  # Last resort: scan all lines for any valid verdict
  while IFS= read -r line; do
    verdict="$(extract_verdict_from_line "$line")"
    if [ "$verdict" != "UNKNOWN" ]; then
      printf '%s' "$verdict"
      return 0
    fi
  done <<< "$review_text"

  printf 'UNKNOWN'
}

print_unknown_verdict_diagnostics() {
  local review_file="${1:-<in-memory>}"
  echo "Could not determine verdict from review output."
  echo "Review source: $review_file"
  echo "Expected first non-empty line format: Verdict: APPROVED|NEEDS_WORK|REJECTED"
}

cmd_review() {
  local review_file="${1:-}"
  local review_text verdict

  if [ -z "$review_file" ] || [ ! -f "$review_file" ]; then
    echo "Missing review output file: $review_file" >&2
    return 2
  fi

  review_text="$(cat "$review_file")"
  verdict="$(parse_review_verdict "$review_text")"

  case "$verdict" in
    APPROVED|NEEDS_WORK|REJECTED)
      printf '%s\n' "$verdict"
      return 0
      ;;
    UNKNOWN)
      print_unknown_verdict_diagnostics "$review_file" >&2
      return 2
      ;;
  esac
}

orchestrator_review_loop() {
  local review_file="${1:-}"
  local max_attempts="${2:-3}"
  local attempt=1
  local verdict

  if [ -z "$review_file" ] || [ ! -f "$review_file" ]; then
    echo "Missing review output file for orchestrator loop: $review_file" >&2
    return 2
  fi

  while [ "$attempt" -le "$max_attempts" ]; do
    if verdict="$(cmd_review "$review_file")"; then
      case "$verdict" in
        APPROVED)
          echo "Review approved on attempt $attempt."
          return 0
          ;;
        NEEDS_WORK)
          echo "Review requires fixes on attempt $attempt."
          ;;
        REJECTED)
          echo "Review rejected on attempt $attempt."
          return 1
          ;;
        UNKNOWN)
          print_unknown_verdict_diagnostics "$review_file" >&2
          return 2
          ;;
        *)
          echo "Unexpected review verdict: $verdict" >&2
          return 2
          ;;
      esac
    else
      local review_status=$?
      case "$review_status" in
        2)
          return 2
          ;;
        *)
          echo "Unexpected review command failure." >&2
          return 2
          ;;
      esac
    fi
    attempt=$((attempt + 1))
  done

  return 1
}
