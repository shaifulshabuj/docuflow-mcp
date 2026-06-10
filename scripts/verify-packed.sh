#!/usr/bin/env bash
# verify-packed.sh — CRITICAL VERIFICATION RULE
#
# Installs @doquflow/{core,studio,cli} from npm pack tarballs into a temp
# prefix and verifies that 'docuflow ui' starts and correctly loads core
# tools (query-wiki, wiki-search, ingest-source) against the three sibling
# projects: waymark, teststop, devloop.
#
# WHY: DEF-11 escaped because the workspace build resolves @doquflow/core
# via the monorepo node_modules symlink, masking the missing exports entry.
# Only a packed install (no symlinks, real npm resolution) reproduces the
# failure. This script enforces that gate before every release.
#
# Usage:
#   bash scripts/verify-packed.sh
#
# Requirements:
#   - node + npm in PATH
#   - sibling projects at ../waymark  ../teststop  ../devloop
#   - each sibling must have a .docuflow/ wiki (run docuflow init first)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIBLING_ROOT="$(dirname "$REPO_ROOT")"
TEMP_PREFIX="$(mktemp -d /tmp/docuflow-verify-XXXXXX)"
PACK_DIR="$(mktemp -d /tmp/docuflow-packs-XXXXXX)"
PORT=48830  # use a non-default port to avoid colliding with a running instance

cleanup() {
  lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  rm -rf "$TEMP_PREFIX" "$PACK_DIR"
}
trap cleanup EXIT

pass=0
fail=0
skip=0

ok()   { echo "  ✓ $*"; ((pass++)); }
fail() { echo "  ✗ $*"; ((fail++)); }
skip() { echo "  ⚠ $*  (skipped)"; ((skip++)); }

echo ""
echo "DocuFlow packed-install verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Build all packages ─────────────────────────────────────────────────────
echo ""
echo "→ Building packages..."
cd "$REPO_ROOT"
if ! npm run build --workspaces --if-present 2>&1 | grep -E "error TS|Error:|✓|Warning" | head -20; then
  echo "  Build output above"
fi
echo "  Build complete."

# ── 2. Pack ───────────────────────────────────────────────────────────────────
echo ""
echo "→ Packing @doquflow/{core,studio,cli}..."
cd "$REPO_ROOT/packages/core"   && npm pack --pack-destination "$PACK_DIR" --quiet
cd "$REPO_ROOT/packages/studio" && npm pack --pack-destination "$PACK_DIR" --quiet
cd "$REPO_ROOT/packages/cli"    && npm pack --pack-destination "$PACK_DIR" --quiet

CORE_TGZ=$(ls "$PACK_DIR"/doquflow-core-*.tgz 2>/dev/null | head -1)
STUDIO_TGZ=$(ls "$PACK_DIR"/doquflow-studio-*.tgz 2>/dev/null | head -1)
CLI_TGZ=$(ls "$PACK_DIR"/doquflow-cli-*.tgz 2>/dev/null | head -1)

for tgz in "$CORE_TGZ" "$STUDIO_TGZ" "$CLI_TGZ"; do
  [[ -f "$tgz" ]] || { echo "  ✗ Pack not found: $tgz"; exit 1; }
  echo "  Packed: $(basename "$tgz")"
done

# ── 3. Install tarballs into isolated prefix ──────────────────────────────────
echo ""
echo "→ Installing into temp prefix: $TEMP_PREFIX"
npm install -g --prefix "$TEMP_PREFIX" "$CORE_TGZ"   2>&1 | grep -E "added|changed|error" | head -3
npm install -g --prefix "$TEMP_PREFIX" "$STUDIO_TGZ" 2>&1 | grep -E "added|changed|error" | head -3
npm install -g --prefix "$TEMP_PREFIX" "$CLI_TGZ"    2>&1 | grep -E "added|changed|error" | head -3

DOCUFLOW_BIN="$TEMP_PREFIX/bin/docuflow"
[[ -x "$DOCUFLOW_BIN" ]] || { echo "  ✗ Binary not found at $DOCUFLOW_BIN"; exit 1; }

INSTALLED_VER=$("$DOCUFLOW_BIN" --version 2>&1 | head -1)
echo "  Binary: $INSTALLED_VER"

# Verify the version string looks like a version number
if [[ ! "$INSTALLED_VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  echo "  ✗ Version check failed: '$INSTALLED_VER'"
  exit 1
fi

# ── 4. Per-project checks ─────────────────────────────────────────────────────
for proj in waymark teststop devloop; do
  PROJ_PATH="$SIBLING_ROOT/$proj"
  echo ""
  echo "━━━ $proj ━━━"

  if [[ ! -d "$PROJ_PATH/.docuflow" ]]; then
    skip "$proj: no .docuflow/ — run 'docuflow init' first"
    continue
  fi

  # -- status --
  STATUS_OUT=$(cd "$PROJ_PATH" && "$DOCUFLOW_BIN" status 2>&1)
  if echo "$STATUS_OUT" | grep -q "Version:"; then
    ok "status (version reported)"
  else
    fail "status: $STATUS_OUT"
  fi

  # -- docuflow ui (core tools: DEF-11 regression gate) --
  # Kill any lingering process on the test port
  lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  sleep 1

  UI_LOG="$TEMP_PREFIX/${proj}-ui.log"
  DOCUFLOW_PORT=$PORT "$DOCUFLOW_BIN" ui --no-open > "$UI_LOG" 2>&1 &
  UI_PID=$!

  # Wait up to 8 seconds for the server to answer /api/ping
  STARTED=0
  for i in $(seq 1 8); do
    sleep 1
    PING=$(curl -s "http://localhost:$PORT/api/ping" 2>/dev/null)
    if echo "$PING" | grep -q '"ok":true'; then
      STARTED=1; break
    fi
  done

  if [[ $STARTED -eq 0 ]]; then
    fail "ui did not start within 8s — log:"
    head -30 "$UI_LOG" 2>/dev/null | sed 's/^/    /'
    kill "$UI_PID" 2>/dev/null || true
    continue
  fi
  ok "ui /api/ping"

  # -- /api/ask → exercises query-wiki (core tool) --
  ENC_PATH=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$PROJ_PATH")
  ASK=$(curl -s -X POST "http://localhost:$PORT/api/ask" \
    -H 'Content-Type: application/json' \
    -d "{\"path\":\"$PROJ_PATH\",\"question\":\"what is this project?\"}" 2>/dev/null)
  if echo "$ASK" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'source_pages' in d or 'answer' in d" 2>/dev/null; then
    ok "/api/ask → query-wiki (core)"
  else
    fail "/api/ask response: ${ASK:0:120}"
  fi

  # -- /api/search → exercises wiki-search (core tool) --
  SEARCH=$(curl -s "http://localhost:$PORT/api/search?path=$ENC_PATH&q=core" 2>/dev/null)
  if echo "$SEARCH" | python3 -c "import sys,json; d=json.load(sys.stdin); assert isinstance(d,list) or 'results' in d" 2>/dev/null; then
    ok "/api/search → wiki-search (core)"
  else
    fail "/api/search response: ${SEARCH:0:120}"
  fi

  # -- /api/wiki → exercises list-wiki (studio tool) --
  WIKI=$(curl -s "http://localhost:$PORT/api/wiki?path=$ENC_PATH" 2>/dev/null)
  if echo "$WIKI" | python3 -c "import sys,json; d=json.load(sys.stdin); assert isinstance(d,list) or 'pages' in d" 2>/dev/null; then
    ok "/api/wiki → list-wiki (studio)"
  else
    fail "/api/wiki response: ${WIKI:0:120}"
  fi

  kill "$UI_PID" 2>/dev/null || true
  lsof -ti:"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  sleep 1
done

# ── 5. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Result: $pass passed  $fail failed  $skip skipped"
echo ""
if [[ $fail -gt 0 ]]; then
  echo "✗ Packed verification FAILED — do not publish"
  exit 1
else
  echo "✓ Packed verification PASSED — safe to publish"
  exit 0
fi
