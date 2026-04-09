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
    echo "PASS: $label"
    PASS=$((PASS+1))
  else
    echo "FAIL: $label"
    FAIL=$((FAIL+1))
  fi
}

# 1. .env not tracked
if git ls-files --error-unmatch .env 2>/dev/null; then
  check ".env not in git" "fail"
else
  check ".env not in git" "pass"
fi

# 2. No .db files tracked
if git ls-files | grep -q '\.db$'; then
  check "No .db files in git" "fail"
else
  check "No .db files in git" "pass"
fi

# 3. No secrets in git history
if git log --all --oneline -p -- "*.ts" "*.js" 2>/dev/null | \
  grep -v "WAYMARK_SLACK_WEBHOOK_URL\|YOUR_TOKEN\|placeholder\|example\|sk-ant-example\|sk-ant-test" | \
  grep -q "sk-ant\|npm_[A-Za-z0-9]\{36\}"; then
  echo "WARN: Possible secrets in git history"
  echo "      Review output above carefully"
else
  check "No obvious secrets in git history" "pass"
fi

# 4. Build passes
echo "Running build check..."
if npm run build --workspaces 2>&1 | grep -q "error TS"; then
  check "Build succeeds" "fail"
else
  check "Build succeeds" "pass"
fi

# 5. Required root files
for f in README.md LICENSE CHANGELOG.md; do
  [ -f "$f" ] && check "$f exists" "pass" || check "$f exists" "fail"
done

# 6. Release docs
for f in release/README.md release/CHANGELOG.md; do
  [ -f "$f" ] && check "$f exists" "pass" || check "$f exists" "fail"
done

# 7. Package names
CLI_NAME=$(node -e "console.log(require('./packages/cli/package.json').name)")
SERVER_NAME=$(node -e "console.log(require('./packages/server/package.json').name)")
[ "$CLI_NAME" = "@doquflow/cli" ] && check "packages/cli name = @doquflow/cli" "pass" || check "packages/cli name = @doquflow/cli" "fail"
[ "$SERVER_NAME" = "@doquflow/server" ] && check "packages/server name = @doquflow/server" "pass" || check "packages/server name = @doquflow/server" "fail"

# 8. No stale old package name
if grep -r "docuflow-mcp" packages/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -q .; then
  check "No stale docuflow-mcp references in source" "fail"
else
  check "No stale docuflow-mcp references in source" "pass"
fi

echo ""
echo "=========================="
if [ "$FAIL" -eq 0 ]; then
  echo "RESULT: PASSED — safe to release"
else
  echo "RESULT: FAILED — $FAIL check(s) failed"
  exit 1
fi
