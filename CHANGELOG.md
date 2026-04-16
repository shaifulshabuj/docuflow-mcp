# Docuflow Changelog

## [0.2.0] - 2026-04-16

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


This file documents every version of Docuflow: what was built, what the original
spec asked for, what broke during testing, and how it was fixed. Each entry is
written so a human or AI agent can understand not just *what* changed but *why*.

---

## v1.0 — Initial Monorepo + Release Workflow (2026-04-09)

### What was built

Restructured Docuflow from a single package to an npm workspaces monorepo
matching the Waymarks project workflow. Added full CI/CD, private/public repo
isolation, well-managed changelogs, and npm publish automation.

### Package structure

**Before**: Single package `docuflow-mcp@0.1.0` in root `src/`

**After**:
- `@doquflow/server@0.1.0` in `packages/server/` — MCP server (moved from src/)
- `@doquflow/cli@0.1.0` in `packages/cli/` — CLI for init and status

### Module system change

The original package used `"type": "module"` (ESM) with NodeNext resolution.
Switched to CommonJS (`"module": "commonjs"`) for both packages to:
1. Avoid explicit `.js` extension requirement on all imports
2. Match the Waymarks convention for compiled bin entries
3. Simplify the build/test setup

Removed `"type": "module"` from server package.json.
Stripped `.js` extensions from all relative imports in server source.
External SDK sub-path imports (`@modelcontextprotocol/sdk/server/index.js`) retain
their `.js` suffixes as required by those packages.

### Files added

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Build + secrets scan on every push/PR |
| `.github/workflows/release.yml` | Tag-based: sync to doquflows/docuflow, npm publish |
| `scripts/pre-release-check.sh` | 8-point local sanity check before tagging |
| `LICENSE` | MIT, copyright Docuflow 2026 |
| `.env.example` | Template for environment vars |
| `release/README.md` | Public-facing install + usage docs |
| `release/CHANGELOG.md` | Public semver changelog |
| `CHANGELOG.md` | This file — private dev changelog |

### Release process

1. Edit both `packages/*/package.json` version fields
2. Update `CHANGELOG.md` (private) and `release/CHANGELOG.md` (public)
3. Run `bash scripts/pre-release-check.sh` → must pass all 8 checks
4. `npm install --package-lock-only` (regenerate lockfile)
5. Commit: `git commit -m "chore: bump to vX.Y.Z"`
6. Tag: `git tag vX.Y.Z && git push origin main && git push origin vX.Y.Z`
7. CI publishes `@doquflow/cli` and `@doquflow/server` to npm automatically

### GitHub secrets required

- `NPM_TOKEN` — publish access to `@doquflow` scope on npmjs.com
- `RELEASE_REPO_TOKEN` — PAT with repo access to `doquflows/docuflow`

---

## v0.1.0 — Initial MCP Server (2026-04-09)

### What was built

First working version of the Docuflow MCP server:
- 4 MCP tools: `read_module`, `list_modules`, `write_spec`, `read_specs`
- Universal regex extraction engine (language-agnostic)
- Binary file detection via null-byte scan
- Per-project write lock on `index.json` (prevents concurrent write races)
- EF DbContext property-access table detection for C#

### Bugs found and fixed during testing

**SQL alias noise**: C# LINQ `from u in _db.Users join o in _db.Orders` was feeding
single-letter aliases (`u`, `o`) into the SQL table regex. Fixed by filtering
entries shorter than 2 characters and adding a SQL keyword noise list.

**EF table misses**: `_db.Users` in `from u in _db.Users join` ended with a space,
not `.` or `(`, so it wasn't matched. Fixed regex lookahead to `(?=[\s.(])`.

**Concurrent index race**: 5 parallel `write_spec` calls corrupted `index.json`.
Fixed with per-project promise chain (`indexLocks` map) serialising index updates.
