#!/usr/bin/env bash
set -e

echo "Docuflow Pre-Release Check"
echo "=========================="

PASS=0
FAIL=0

check() {
  local label="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    echo "  PASS: $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $label"
    FAIL=$((FAIL+1))
  fi
}

# ── 1. Secrets & sensitive files ────────────────────────────────────────────

if git ls-files --error-unmatch .env 2>/dev/null; then
  check ".env not tracked in git" "fail"
else
  check ".env not tracked in git" "pass"
fi

if git ls-files | grep -q '\.db$'; then
  check "No .db files tracked in git" "fail"
else
  check "No .db files tracked in git" "pass"
fi

if git ls-files | grep -q 'watch\.pid$'; then
  check "watch.pid not tracked in git" "fail"
else
  check "watch.pid not tracked in git" "pass"
fi

if git log --all --oneline -p -- "*.ts" "*.js" 2>/dev/null | \
  grep -v "WAYMARK_SLACK_WEBHOOK_URL\|YOUR_TOKEN\|placeholder\|example\|sk-ant-example\|sk-ant-test" | \
  grep -q "sk-ant\|npm_[A-Za-z0-9]\{36\}"; then
  echo "  WARN: Possible secrets in git history — review carefully"
else
  check "No obvious secrets in git history" "pass"
fi

# ── 2. Build ─────────────────────────────────────────────────────────────────

echo ""
echo "Running build..."
if npm run build 2>&1 | grep -q "error TS"; then
  check "TypeScript build succeeds (0 errors)" "fail"
else
  check "TypeScript build succeeds (0 errors)" "pass"
fi

# ── 3. Required files ────────────────────────────────────────────────────────

echo ""
echo "Checking required files..."
for f in README.md LICENSE CHANGELOG.md FEATURES.md; do
  [ -f "$f" ] && check "$f exists" "pass" || check "$f exists" "fail"
done

for f in release/README.md release/CHANGELOG.md; do
  [ -f "$f" ] && check "$f exists" "pass" || check "$f exists" "fail"
fi

# ── 4. Compiled dist files (CLI commands) ────────────────────────────────────

echo ""
echo "Checking compiled dist files..."
for cmd in init init-interactive status suggest watch watch-stop sync; do
  f="packages/cli/dist/commands/${cmd}.js"
  [ -f "$f" ] && check "dist: ${cmd}.js compiled" "pass" || check "dist: ${cmd}.js compiled" "fail"
done

for f in packages/server/dist/index.js packages/cli/dist/index.js; do
  [ -f "$f" ] && check "dist: $f exists" "pass" || check "dist: $f exists" "fail"
done

# ── 5. Package metadata ──────────────────────────────────────────────────────

echo ""
echo "Checking package metadata..."
CLI_NAME=$(node -e "console.log(require('./packages/cli/package.json').name)")
SERVER_NAME=$(node -e "console.log(require('./packages/server/package.json').name)")
[ "$CLI_NAME" = "@doquflow/cli" ] \
  && check "packages/cli name = @doquflow/cli" "pass" \
  || check "packages/cli name = @doquflow/cli" "fail"
[ "$SERVER_NAME" = "@doquflow/server" ] \
  && check "packages/server name = @doquflow/server" "pass" \
  || check "packages/server name = @doquflow/server" "fail"

CLI_VER=$(node -e "console.log(require('./packages/cli/package.json').version)")
SRV_VER=$(node -e "console.log(require('./packages/server/package.json').version)")
[ "$CLI_VER" = "$SRV_VER" ] \
  && check "CLI and server versions match ($CLI_VER)" "pass" \
  || check "CLI and server versions match (cli=$CLI_VER, srv=$SRV_VER)" "fail"

CLI_DEP=$(node -e "console.log(require('./packages/cli/package.json').dependencies['@doquflow/server'])")
[ "$CLI_DEP" = "$SRV_VER" ] \
  && check "CLI dep @doquflow/server pinned to $SRV_VER" "pass" \
  || check "CLI dep @doquflow/server pinned to $SRV_VER (got $CLI_DEP)" "fail"

# ── 6. No stale package name ─────────────────────────────────────────────────

if grep -r "docuflow-mcp" packages/ --include="*.ts" --include="*.js" 2>/dev/null \
  | grep -v "node_modules" | grep -q .; then
  check "No stale docuflow-mcp references in source" "fail"
else
  check "No stale docuflow-mcp references in source" "pass"
fi

# ── 7. Smoke tests — CLI commands ────────────────────────────────────────────

echo ""
echo "Running CLI smoke tests..."

# sync --no-lint should exit 0
if node packages/cli/dist/index.js sync --no-lint --quiet 2>/dev/null; then
  check "docuflow sync --no-lint --quiet exits 0" "pass"
else
  check "docuflow sync --no-lint --quiet exits 0" "fail"
fi

# watch status (no daemon) should exit 0
if node packages/cli/dist/index.js watch status 2>/dev/null | grep -q "stopped\|running"; then
  check "docuflow watch status exits 0 and prints state" "pass"
else
  check "docuflow watch status exits 0 and prints state" "fail"
fi

# watch stop (no daemon) should exit 0
if node packages/cli/dist/index.js watch stop 2>/dev/null; then
  check "docuflow watch stop (no daemon) exits 0 gracefully" "pass"
else
  check "docuflow watch stop (no daemon) exits 0 gracefully" "fail"
fi

# help output includes all key commands
HELP=$(node packages/cli/dist/index.js 2>&1)
for cmd in "watch stop" "watch status" "watch restart" "sync --ai" "--copilot" "--claude"; do
  echo "$HELP" | grep -q "$cmd" \
    && check "help contains: $cmd" "pass" \
    || check "help contains: $cmd" "fail"
done

# ── 8. Tool count in server ───────────────────────────────────────────────────

echo ""
echo "Checking MCP tool count..."
TOOL_COUNT=$(grep -c '"name":' packages/server/src/index.ts 2>/dev/null || echo 0)
[ "$TOOL_COUNT" -ge 15 ] \
  && check "MCP server registers ≥15 tools (found $TOOL_COUNT)" "pass" \
  || check "MCP server registers ≥15 tools (found $TOOL_COUNT)" "fail"

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "=========================="
echo "Checks:  $((PASS+FAIL)) total"
echo "Passed:  $PASS"
echo "Failed:  $FAIL"
echo "=========================="

if [ "$FAIL" -eq 0 ]; then
  echo "RESULT: PASSED — safe to release"
else
  echo "RESULT: FAILED — $FAIL check(s) failed"
  exit 1
fi
