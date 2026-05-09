# Docuflow Development Skill

You are working on the **Docuflow MCP** project. Your task: $ARGUMENTS

Before writing a single line of code, read this entire skill document. It contains hard-won knowledge from every previous development session. Following it prevents hours of debugging.

---

## 1. Project Architecture

```
docuflow-mcp/                          ← monorepo root (private: true)
├── packages/
│   ├── server/   (@doquflow/server)   ← MCP server, 15 tools, published to npm
│   ├── cli/      (@doquflow/cli)      ← CLI + Web UI command, published to npm
│   ├── ui/       (@docuflow/ui)       ← Vite+React 18, private: true
│   └── api/      (@docuflow/api)      ← Express bridge, private: true
├── scripts/
│   ├── release.js                     ← interactive version bump + git tag + push
│   └── pre-release-check.sh          ← 47-check validation suite
└── .claude/commands/                  ← project-level Claude slash commands (here)
```

**What's published to npm:** Only `@doquflow/server` and `@doquflow/cli`.
**What's bundled into the CLI:** `packages/ui/dist/` → `packages/cli/ui-dist/` (copied at build time).

---

## 2. TypeScript Rules (Non-Negotiable)

### CLI (`packages/cli/tsconfig.json`)
- `strict: true`, `module: commonjs`, `target: ES2022`
- No `noUnusedLocals` / `noUnusedParameters` — unused vars are allowed

### UI (`packages/ui/tsconfig.json`)
- `strict: true` **plus** `noUnusedLocals: true`, `noUnusedParameters: true`
- **Every declared variable must be used.** Zero tolerance.
- Use `_paramName` prefix for intentionally unused function params in callbacks
- Declare helper functions with `function foo()` (not `const foo = () =>`) if TypeScript incorrectly flags them as unused — this sometimes avoids the false positive

### Verify before marking complete
```bash
node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json   # UI
node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json  # API
npm run build -w packages/server && npm run build -w packages/cli  # server + CLI
```
**All must exit 0. No exceptions.**

---

## 3. Package Import Patterns

### In CLI commands — importing server tools
Server tools are at `@doquflow/server/dist/tools/<tool-file>.js`. Import them at runtime via `require()` to avoid TypeScript deep-import resolution issues:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolFn = (args: Record<string, any>) => Promise<any>;

function loadTool(file: string, exportName: string): ToolFn {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require(`@doquflow/server/dist/tools/${file}`) as Record<string, ToolFn>)[exportName];
}

// Usage (load once inside run(), not at module level):
const listWikiTool   = loadTool('list-wiki',   'listWiki');
const lintWikiTool   = loadTool('lint-wiki',   'lintWiki');
const queryWikiTool  = loadTool('query-wiki',  'queryWiki');
const wikiSearchTool = loadTool('wiki-search', 'wikiSearch');
```

**Why runtime require?** TypeScript can't resolve types for `@doquflow/server/dist/tools/list-wiki` without explicit type declarations. `require()` returns `any`, which we cast to `ToolFn`.

### In UI React components — fetching API data
```typescript
import { useApi }     from '../hooks/useApi';
import { useProject } from '../context/ProjectContext';

const { projectPath } = useProject();
const { data, loading } = useApi<MyType | null>(
  projectPath ? `/api/endpoint?path=${encodeURIComponent(projectPath)}` : null,
  null  // fallback value when API offline or projectPath not yet known
);
```

`API_BASE` in `useApi.ts` is hardcoded to `http://localhost:48821`. Do NOT change this — the same port serves API + static UI.

---

## 4. Adding a New CLI Command

1. Create `packages/cli/src/commands/<name>.ts` — export `async function run(opts): Promise<void>`
2. Register in `packages/cli/src/index.ts`:
   ```typescript
   } else if (cmd === 'mycommand') {
     const flagVal = getFlagValue('--my-flag');
     import('./commands/mycommand').then(m => m.run({ flag: flagVal }));
   }
   ```
3. Add to the help block in `index.ts` `console.log` section
4. Add to `scripts/pre-release-check.sh` Section 4 dist check loop: `for cmd in ... mycommand; do`
5. Add a help-text smoke test string to Section 7 grep loop

---

## 5. Adding a New API Endpoint

Both `packages/api/src/index.ts` (standalone dev server) and `packages/cli/src/commands/ui.ts` (packaged server) must receive the same change. They share identical route logic.

Pattern:
```typescript
app.get('/api/myroute', async (req, res) => {
  const projectPath = req.query.path as string;
  if (!projectPath) return res.status(400).json({ error: 'path required' });
  try {
    return res.json(await myTool({ project_path: projectPath }));
  } catch (e: unknown) {
    return res.status(500).json({ error: (e as Error).message });
  }
});
```

---

## 6. Build Order (Critical)

```bash
# Full build — order matters: UI must exist before CLI copies it
npm run build  # = server → ui → cli → api

# Core only (no UI/API):
npm run build:core   # = server → cli

# UI only:
npm run build:ui     # builds packages/ui/dist/

# After build:ui, rebuild CLI to sync ui-dist:
npm run build -w packages/cli
```

**Why order matters:** `packages/cli`'s build script copies `../ui/dist/` into `./ui-dist/`. If UI isn't built first, cli copies nothing (or stale files).

---

## 7. ui-dist Path Resolution

```typescript
// In packages/cli/src/commands/ui.ts (compiled to dist/commands/ui.js):
const uiDist = path.join(__dirname, '../../ui-dist');
// __dirname = packages/cli/dist/commands/
// ../../     = packages/cli/
// ui-dist    = packages/cli/ui-dist/  ✅
```

When installed globally via npm:
```
/usr/local/lib/node_modules/@doquflow/cli/dist/commands/ui.js
path.join(__dirname, '../../ui-dist')
→ /usr/local/lib/node_modules/@doquflow/cli/ui-dist/  ✅
```

---

## 8. Single-Port Web Server (Port 48821)

`docuflow ui` / `docuflow start` runs ONE Express server that serves both API routes and static UI:

```
http://localhost:48821/api/*   → Express route handlers
http://localhost:48821/*       → express.static(uiDist) → SPA fallback index.html
```

**Express middleware order is critical:**
1. `app.use(cors())`
2. `app.use(express.json())`
3. All `app.get('/api/...')` routes
4. `app.use(express.static(uiDist))`   ← MUST be after API routes
5. `app.get('*', (_, res) => res.sendFile(path.join(uiDist, 'index.html')))` ← SPA fallback

If you put `express.static` before API routes, `/api/ping` would try to serve a file called `ping` from `ui-dist/`.

**Custom port:** Set `DOCUFLOW_PORT` env var. The built UI always fetches `http://localhost:48821` (hardcoded in `useApi.ts`), so custom ports only work if you rebuild the UI with `VITE_API_URL`.

---

## 9. Log.md Parsing

DocuFlow's `log.md` uses heading format, not pipe-delimited:
```
## [2026-05-07T05:13:30.675Z] lint | Wiki lint check completed
```

Parse with:
```typescript
const headingRe = /^##\s+\[([^\]]+)\]\s+([^|]+?)(?:\s*\|\s*(.+))?$/;
```

Also support legacy pipe format: `timestamp | tool | target | delta`

---

## 10. npm Workspace Binaries

Binaries are **hoisted to root `node_modules/.bin/`**, NOT in per-package `node_modules/.bin/`:

```bash
# ✅ Correct:
node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json
node_modules/.bin/vite build packages/ui

# ❌ Wrong (binaries not there):
packages/ui/node_modules/.bin/tsc
packages/ui/node_modules/.bin/vite
```

---

## After completing work — UPDATE THE LEARNING LOG

After every development session, append a new entry to the Learning Log below. This is what makes this skill auto-improving. Include:
- Date + session context (what feature was built)
- New patterns discovered or confirmed
- Bugs hit + root causes + fixes
- Anything that surprised you or took >15 min to debug

---

## 🧠 Learning Log

<!-- Newest entry first -->

### 2026-05-09 | Session: DevLoop verdict parsing hardening
- The runtime DevLoop command implementation may live outside this repo, so in-repo reviewer contract docs and pre-release smoke checks are the reliable enforcement points.
- Canonical first-line verdict (`Verdict: APPROVED|NEEDS_WORK|REJECTED`) plus tolerant parser normalization is the safest combination for deterministic machine branching.
- Pre-release check drift guards should assert both canonical verdict examples and explicit first-line contract language to catch prompt regressions early.

### 2026-05-07 | Session: `docuflow ui` / `docuflow start` packaging
- `loadTool()` pattern cleanly bridges CLI → server tools without TypeScript deep-import issues
- `express.static` + `app.get('*')` SPA fallback MUST come after all `/api/*` routes
- Port 48821 used for single-server because `useApi.ts` has `API_BASE = 'http://localhost:48821'` hardcoded in the Vite build output — changing port at runtime doesn't help
- `path.join(__dirname, '../../ui-dist')` correctly resolves in both monorepo (`packages/cli/dist/commands/`) and global npm install
- `SIGTERM` vs `SIGINT` both need graceful handlers — `server.close(() => process.exit(0))`
- npm workspace hoists ALL binaries (tsc, vite, tsx) to root `node_modules/.bin/` — per-package bins don't exist
- `set -e` in bash + `$(command)` = if command fails with exit 127 (not found), the whole script exits immediately without printing FAIL — use `if cmd | grep` pattern instead
- `process.cwd()` in npm scripts = package directory (npm sets this), so `../ui/dist` from `packages/cli/` correctly resolves to `packages/ui/dist/`

### 2026-05-07 | Session: UI live data wiring (AskView, WikiView, GraphView, SyncView)
- `noUnusedLocals: true` in UI tsconfig — `closeList()` helper must be declared as `function closeList()` not `const closeList = () =>` when TypeScript incorrectly treats it as unused in a closure
- `useEffect` needed to auto-select first live wiki page when `active` state doesn't match any live page ID
- YAML frontmatter in wiki pages (`---\n...\n---`) must be stripped before rendering markdown
- `/api/activity` returned `[]` because parser expected pipe-delimited lines but log.md uses `## [timestamp] tool | description` heading format
- React `AbortController` cleanup in `useApi` prevents state updates on unmounted components
