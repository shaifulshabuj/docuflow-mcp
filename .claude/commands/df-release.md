# Docuflow Release Skill

You are preparing or executing a release of **Docuflow MCP**. Your task: $ARGUMENTS

Read this entire document before touching anything. One wrong step in the release sequence can corrupt git history, publish a broken package, or require a patch release to fix.

---

## 1. Release Overview

```
Pre-release prep (manual) → clean git commit → node scripts/release.js → CI publishes
```

`scripts/release.js` is an **interactive** script. It:
1. Checks git status is clean (aborts if dirty)
2. Prompts for version bump type (major / minor / patch)
3. Bumps all 4 package.json files
4. Fills `[Unreleased]` → `[X.Y.Z] - YYYY-MM-DD` in both changelogs
5. Regenerates `package-lock.json`
6. Runs the full pre-release check (must pass 47/47)
7. Creates git commit: `chore: bump to vX.Y.Z`
8. Creates git tag: `vX.Y.Z`
9. Pushes branch + tag to origin

---

## 2. Version Rules

All 4 packages **must** have identical versions before running the release script:

| Package | npm name | Published? | Version source |
|---------|----------|-----------|----------------|
| `packages/server` | `@doquflow/server` | ✅ yes | Source of truth |
| `packages/cli` | `@doquflow/cli` | ✅ yes | Must match server |
| `packages/ui` | `@docuflow/ui` | ❌ no (private: true) | Must match server |
| `packages/api` | `@docuflow/api` | ❌ no (private: true) | Must match server |

The CLI's `dependencies["@doquflow/server"]` must also equal the version (not `^`, not `*`, exact).

**Check alignment:**
```bash
node -e "
  const s = require('./packages/server/package.json').version;
  const c = require('./packages/cli/package.json').version;
  const u = require('./packages/ui/package.json').version;
  const a = require('./packages/api/package.json').version;
  const d = require('./packages/cli/package.json').dependencies['@doquflow/server'];
  console.log({server:s, cli:c, ui:u, api:a, cliDep:d});
  if([c,u,a,d].every(v=>v===s)) console.log('✅ All aligned');
  else console.log('❌ MISMATCH — fix before releasing');
"
```

---

## 3. What to Update Before Releasing

### When adding a new feature / CLI command / API endpoint:

**Always update all of these:**

| File | What to add |
|------|------------|
| `CHANGELOG.md` | Entry under `[Unreleased]` → Added section |
| `release/CHANGELOG.md` | Same entry (public-facing changelog) |
| `FEATURES.md` | New row in relevant table, update counts |
| `release/README.md` | New command in CLI table, new feature in Features list |
| `scripts/pre-release-check.sh` | New dist file checks, new help-text smoke tests |

### When adding a CLI command:
- Section 4 dist loop: add command name
- Section 7 help-text loop: add distinctive string from help output

### When bumping version numbers manually (not via release.js):
```bash
# Bump all 4 at once to X.Y.Z:
node -e "
  const fs = require('fs');
  const v = 'X.Y.Z'; // ← set target version
  ['packages/server','packages/cli','packages/ui','packages/api'].forEach(p => {
    const pkg = JSON.parse(fs.readFileSync(p+'/package.json','utf8'));
    pkg.version = v;
    if (pkg.dependencies && pkg.dependencies['@doquflow/server']) pkg.dependencies['@doquflow/server'] = v;
    fs.writeFileSync(p+'/package.json', JSON.stringify(pkg,null,2)+'\n');
  });
  console.log('Bumped all packages to', v);
"
npm install --package-lock-only  # regenerate lockfile
```

---

## 4. CHANGELOG Format

### `CHANGELOG.md` (private, full details)

```markdown
# Changelog

## [Unreleased] — v0.7.0

### Added
- **New feature name** — description
  - Sub-bullet with detail

### Changed
- Changed thing description

### Fixed
- Bug description

## [0.6.0] - 2026-05-07   ← release.js fills this in from [Unreleased]

### Added
...
```

### `release/CHANGELOG.md` (public, same format, same content)

Both files have identical `[Unreleased]` blocks. The release script updates both simultaneously.

**Key rule:** Write changelog entries in `[Unreleased]` AS YOU DEVELOP, not all at once before release. Each feature addition should update the changelog immediately.

---

## 5. The Release Sequence

### Step 1: Prepare (do this during development)
- Write changelog entries under `[Unreleased]` as you build
- Update `FEATURES.md` and `release/README.md` for new capabilities
- Update `scripts/pre-release-check.sh` for new dist files / commands

### Step 2: Pre-release prep commit
Before running `release.js`, you need a clean working tree. Commit all your work:
```bash
git add <specific files>  # never git add -A blindly
git commit -m "feat: <what was built>"
```

**Note:** If `packages/ui/` or `packages/api/` are new/untracked:
```bash
git add packages/ui/ packages/api/ <other files>
```

### Step 3: Run the release script
```bash
node scripts/release.js
# → prompts: major / minor / patch
# → runs pre-release check (must be 47/47 PASS)
# → commits, tags, pushes
```

**Version guidance:**
- `patch` (0.6.0 → 0.6.1): bug fixes only
- `minor` (0.5.x → 0.6.0): new features, new CLI commands, new views
- `major` (0.x → 1.0.0): breaking API changes, major architecture change

### Step 4: CI takes over
After push, GitHub Actions:
1. Builds and verifies all packages
2. Syncs to public `doquflows/docuflow` repo
3. Publishes `@doquflow/server` and `@doquflow/cli` to npm
4. Creates GitHub Release with changelog

---

## 6. release.js Internals (in case of failure)

If `release.js` fails partway through:

**Failed at version bump** (before pre-release check):
- Versions may be bumped in some packages but not others
- Fix: manually align all 4 package.json versions + npm install --package-lock-only
- Then retry: `node scripts/release.js`

**Failed at pre-release check:**
- Versions are bumped, changelogs updated, lockfile regenerated
- But NO git commit or tag yet
- Fix: resolve the failing check, then re-run: `node scripts/release.js`
- The script checks git status first — since you haven't committed, it will abort
- Temporarily revert version bumps, fix the issue, then re-run from the top

**Failed after commit but before push:**
- You have a local commit and tag but nothing pushed
- Run: `git push origin main && git push origin vX.Y.Z`

---

## 7. What Gets Published to npm

```
@doquflow/cli npm package contents:
├── dist/              ← compiled TypeScript (all CLI commands)
│   ├── index.js       ← entry point / arg parser
│   └── commands/
│       ├── init.js, status.js, suggest.js, sync.js
│       ├── watch.js, watch-stop.js
│       ├── ui.js      ← Express server + API routes
│       └── start.js   ← alias → ui.js
├── ui-dist/           ← bundled Vite build (React UI static files)
│   ├── index.html
│   └── assets/
│       ├── index-*.js
│       └── index-*.css
└── README.md

@doquflow/server npm package contents:
├── dist/
│   ├── index.js       ← MCP server entry (stdio transport)
│   └── tools/         ← 15 tool implementations
└── README.md
```

**What is NOT published:** `packages/ui/` source, `packages/api/` source, `scripts/`, `.docuflow/`, `.github/`, `.claude/`

---

## 8. Pre-Release Check Quick Reference

```bash
bash scripts/pre-release-check.sh
```

Must show: `RESULT: PASSED — safe to release` (47/47 checks).

If any FAIL, fix it before creating the release. Common FAILs and fixes:

| FAIL | Fix |
|------|-----|
| `CLI ui-dist/index.html bundled` | Run `npm run build:ui && npm run build -w packages/cli` |
| `TypeScript build... (0 errors)` | Fix TS errors: `node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json` |
| `CLI and server versions match` | Align all 4 package.json versions |
| `CLI dep @doquflow/server pinned` | Set `packages/cli/package.json dependencies["@doquflow/server"]` to exact version |
| `dist: ui.js compiled` | Rebuild CLI: `npm run build -w packages/cli` |
| `No actual secrets in git history` | You have a leaked key — do NOT release, rotate the key immediately |

---

## After completing a release — UPDATE THE LEARNING LOG

After every release cycle, append a new entry below. Include:
- Date + what version was released
- What the bump type was and why
- Any release script failures encountered + fixes
- Any pre-release check gaps that were found
- Improvements to the release process

---

## 🧠 Learning Log

<!-- Newest entry first -->

### 2026-05-07 | Session: release prep for v0.6.0
- **Added UI/API to release scope:** `release.js` now bumps all 4 packages (was only server + cli)
- **Build order critical:** `package.json` root build script must be `server → ui → cli → api` (not server → cli → ui → api) so CLI can copy ui-dist from packages/ui/dist/
- **`private: true` packages:** ui and api won't be published even if included in version bump — this is correct, they just need version parity for the pre-release check
- **Changelog structure:** Both `CHANGELOG.md` and `release/CHANGELOG.md` use `[Unreleased]` block. The release script finds the first `##` line under the `#` heading and inserts the versioned header.
- **Commit before release.js:** release.js's first step is `git status --porcelain` → exits if dirty. Must commit all work first.
- **FEATURES.md + release/README.md:** Often forgotten. Both need updating for every feature release.
- **Two-step process**: Step 1 = commit all working changes (prep commit), Step 2 = `node scripts/release.js` for the actual version bump commit + tag

### 2026-05-07 | Session: pre-release-check.sh Section 9 addition
- Added checks for UI TypeScript, Vite build, API TypeScript — all using root `node_modules/.bin/` (not per-package bin paths which don't exist)
- `set -e` in bash makes `$(missing_binary)` in a variable assignment immediately exit the script with code 127, before any check() function is called — so a missing binary = silent exit, not a FAIL
- Fix: test binary existence before calling it, or use `if cmd 2>&1 | grep; then fail else pass` pattern (which catches exit codes via the pipe)
