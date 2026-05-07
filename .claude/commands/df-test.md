# Docuflow Testing Skill

You are running quality checks on the **Docuflow MCP** project. Your task: $ARGUMENTS

Read this entire document before running anything. It documents every check, every failure mode discovered, and the exact commands that work.

---

## 1. The Complete Check Suite

Docuflow has no unit test framework. Validation happens through 5 layers:

| Layer | What it checks | Command |
|-------|---------------|---------|
| TypeScript | Type safety, zero errors | `node_modules/.bin/tsc --noEmit` |
| CLI build | Compiles + copies ui-dist | `npm run build -w packages/cli` |
| Pre-release | 47-check full suite | `bash scripts/pre-release-check.sh` |
| Smoke tests | CLI commands actually run | Included in pre-release check |
| Live server | API + UI serve correctly | `DOCUFLOW_PORT=48822 node packages/cli/dist/index.js ui --no-open` |

**Run in order.** Fix TypeScript errors before running pre-release check.

---

## 2. TypeScript Checks — Exact Commands

```bash
# UI (strict + noUnusedLocals + noUnusedParameters)
node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json

# API
node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json

# CLI + Server (compiled together by npm workspace build)
npm run build -w packages/server && npm run build -w packages/cli

# All four in sequence (fastest feedback):
node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json && \
node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json && \
npm run build -w packages/server && \
npm run build -w packages/cli && \
echo "ALL PASS"
```

**Critical:** Binaries are in ROOT `node_modules/.bin/`, NOT in per-package dirs. `packages/ui/node_modules/.bin/tsc` does NOT exist.

---

## 3. UI-Specific TypeScript Issues and Fixes

### `noUnusedLocals: true` errors

The UI tsconfig has `noUnusedLocals: true`. Every import and declared variable must be used.

**Common patterns that trigger it:**
```typescript
// ❌ Fails: closeList declared but TypeScript thinks it's unused
const closeList = () => { ... };

// ✅ Fix: use function declaration (TypeScript treats it differently)
function closeList() { ... }

// ❌ Fails: imported type never referenced in JSX
import { SomeType } from './types';

// ✅ Fix: use it or remove the import

// ❌ Fails: unused function parameter
app.get('*', (req, res) => res.sendFile(...));

// ✅ Fix: prefix with underscore
app.get('*', (_req, res) => res.sendFile(...));
```

### Checking specific error context
```bash
# Show full error with file + line numbers
node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json 2>&1
```

---

## 4. Pre-Release Check — Full 47-Check Suite

```bash
bash scripts/pre-release-check.sh
```

### What it checks (9 sections):
1. **Secrets** — `.env` not tracked, no `.db` files, no leaked API keys in git history
2. **Core build** — TypeScript compiles for server + cli with zero `error TS` lines
3. **Required files** — `README.md`, `LICENSE`, `CHANGELOG.md`, `FEATURES.md`, `release/README.md`, `release/CHANGELOG.md`
4. **Dist files** — every CLI command `.js` exists in `dist/commands/`, `ui-dist/index.html` bundled
5. **Package metadata** — all 4 packages at same version, `@doquflow/cli` dep on server pinned correctly
6. **Stale refs** — no `docuflow-mcp` string in source files
7. **Smoke tests** — `sync`, `watch status`, `watch stop` all exit 0; help text contains expected strings
8. **Tool count** — MCP server registers ≥15 tools
9. **UI + API builds** — tsc, vite build, dist produced, API source exists

### Expected output
```
==========================
Checks:  47 total
Passed:  47
Failed:  0
==========================
RESULT: PASSED — safe to release
```

---

## 5. Smoke Tests — Running Manually

```bash
# CLI help (check all commands listed)
node packages/cli/dist/index.js

# sync (exits 0, no output in quiet mode)
node packages/cli/dist/index.js sync --no-lint --quiet

# watch lifecycle
node packages/cli/dist/index.js watch status   # → "stopped" or "running"
node packages/cli/dist/index.js watch stop     # → exits 0 even with no daemon

# ui server starts and serves correctly
DOCUFLOW_PORT=48822 node packages/cli/dist/index.js ui --no-open &
PID=$!; sleep 2
curl -s http://localhost:48822/api/ping         # → {"ok":true}
curl -s -o /dev/null -w "%{http_code}" http://localhost:48822/  # → 200
kill $PID
```

---

## 6. Vite Production Build

```bash
# Build the UI to packages/ui/dist/
node_modules/.bin/vite build packages/ui

# Verify output
ls packages/ui/dist/          # → assets/  index.html
ls packages/ui/dist/assets/   # → index-*.js  index-*.css
```

If vite build fails with "error" in output — check for:
- TypeScript errors (vite build runs tsc before bundling)
- Missing imports
- Circular dependencies

---

## 7. Known Failure Modes and Fixes

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Pre-release check exits with code 127, no FAIL shown | `set -e` killed on `$(missing-bin)` before check function ran | Binary path wrong — use `node_modules/.bin/` not `packages/ui/node_modules/.bin/` |
| `tsc` check passes but CI fails | Binary in per-package `node_modules/.bin/` doesn't exist, check silently passes | Always use root `node_modules/.bin/tsc` |
| `ui-dist/index.html` check fails | UI not built before CLI build | Run `npm run build:ui` first, then `npm run build -w packages/cli` |
| Help text grep check FAILs | Grep string doesn't match actual help output | Run `node packages/cli/dist/index.js 2>&1` and copy exact strings |
| `noUnusedLocals` error on a function that IS used | TypeScript doesn't detect usage of arrow-function-as-callback in some contexts | Redeclare as `function foo()` not `const foo = () =>` |
| Port 48821 already in use | Previous server instance running | `lsof -ti:48821 \| xargs kill` or use `DOCUFLOW_PORT=48822` |
| API returns 500 on all routes | Server tools not found at `@doquflow/server/dist/tools/` | Run `npm run build -w packages/server` first |

---

## 8. Checking git History for Secrets

```bash
# Pre-release check does this automatically, but manual version:
git log --all --oneline -p -- "*.ts" "*.js" | \
  grep -v "placeholder\|example\|YOUR_TOKEN" | \
  grep -E "sk-ant-[A-Za-z0-9]{36}|npm_[A-Za-z0-9]{36}"
# Should return nothing
```

---

## After completing checks — UPDATE THE LEARNING LOG

After every testing session, append a new entry below. Include:
- Date + what you were testing
- Any new failure mode discovered (symptom → root cause → fix)
- Any check that was missing and should be added to pre-release-check.sh
- Any command that was wrong and has been corrected

---

## 🧠 Learning Log

<!-- Newest entry first -->

### 2026-05-07 | Session: pre-release check fixes for ui/api packaging
- **BUG FOUND:** `packages/ui/node_modules/.bin/tsc` does not exist (npm workspaces hoists). The `if $(cmd) | grep` pattern with `set -e` causes script to exit with code 127 silently when cmd is not found — the FAIL branch never runs, giving a FALSE PASS.
- **FIX:** Changed all tsc/vite references to root `node_modules/.bin/tsc` and `node_modules/.bin/vite`
- **LESSON:** Never trust a PASS when the binary path looks per-package. Always verify with `ls node_modules/.bin/ | grep <bin>` first.
- Added checks: `ui.js compiled`, `start.js compiled`, `CLI ui-dist/index.html bundled`
- Added smoke test: `help contains: ui --port`, `help contains: Alias for`
- Final suite: 47 checks, all PASS

### 2026-05-07 | Session: UI TypeScript strict mode compliance
- `noUnusedLocals: true` is in `packages/ui/tsconfig.json` — this is stricter than CLI
- Every `import` that isn't used in JSX or called in code causes a compile error
- Arrow functions in closures that TypeScript can't statically trace as "called" may be flagged; redeclaring as named `function` resolves it
- `_req` prefix pattern for Express callbacks is the correct way to silence noUnusedParameters
