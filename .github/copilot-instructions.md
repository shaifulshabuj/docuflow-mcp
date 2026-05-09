# GitHub Copilot Instructions — DevLoop Worker

## Your Role
You are the implementation worker in the DevLoop pipeline.
Follow DEVLOOP TASK specs exactly — no improvisation on behaviour not specified in the spec.
If  is set to , DevLoop will route worker tasks through Claude instead of Copilot.

## Project Stack
- **Stack**: TypeScript 5, Node.js, MCP SDK (@modelcontextprotocol/sdk), npm workspaces monorepo
- **Patterns**: SOLID, Clean Architecture, Monorepo (packages/server + packages/cli), tool-per-file pattern
- **Conventions**: async/await throughout, handle all errors explicitly, tsc build via `npm run build`, dist/ output
- **Test framework**: none (tsc validation only)

## Understanding the Spec
Each task spec has these sections — read all of them before writing any code:

| Section | What it contains |
|---------|-----------------|
| **Files to Touch** | Which files to CREATE or MODIFY |
| **Implementation Steps** | Exact method signatures and per-step rules |
| **Acceptance Criteria** | Checklist of what "done" looks like |
| **Edge Cases** | Non-happy-path behaviours to implement |
| **Test Scenarios** | Table of test cases to write |
| **Copilot Instructions Block** | Condensed machine-readable summary |

## Workflow
1. Read the **full** spec — especially Files to Touch, Implementation Steps, Edge Cases
2. Use `/plan` to build a step-by-step implementation checklist
3. Implement each step in order, following every rule listed
4. Write tests for every row in the Test Scenarios table
5. Run `npm run build --workspaces` — fix failures before committing
6. Stage **all** changed files and commit in a single commit

## Commit Message Format
```
feat(TASK-ID): <one-line summary of what was implemented>
```
Example: `feat(TASK-20260506-143022): add GET /orders endpoint with date range filter`

Stage ALL changed files in a SINGLE commit with the TASK ID in the message.

## Standards
- Follow every rule listed in the spec (zero improvisation)
- Handle every edge case enumerated in the spec
- Write tests for every row in the Test Scenarios table
- Never skip error handling
- Do not add unrequested features or refactor unrelated code

## Definition of Done
- [ ] All Acceptance Criteria satisfied
- [ ] All Edge Cases handled
- [ ] Tests written and passing (tsc validation)
- [ ] Single commit with TASK ID in message (feat(TASK-ID): ...)

---

# Copilot Instructions for Docuflow MCP

> **v0.6.0** — 4-package npm monorepo | 15 MCP tools | 8 CLI commands | Web UI on port 48821

---

## 🎓 Active Skills

Three accumulated skill documents guide all work on this project. Read the relevant one **before starting any task**.

| Task type | Skill file | Claude command |
|-----------|-----------|----------------|
| Building features, adding commands, fixing bugs | `.claude/commands/df-develop.md` | `/project:df-develop` |
| Running checks, debugging TypeScript, smoke testing | `.claude/commands/df-test.md` | `/project:df-test` |
| Pre-release prep, version bumps, changelog, publishing | `.claude/commands/df-release.md` | `/project:df-release` |

Each skill file contains:
- Established patterns with code examples
- Anti-patterns that caused real bugs
- Quick-reference commands
- A **Learning Log** (append new discoveries after each session — this is what makes skills auto-improving)

---

## 📦 Monorepo Layout

```
docuflow-mcp/                    ← private root workspace
├── packages/
│   ├── server/  @doquflow/server   ← 15 MCP tools, published to npm
│   ├── cli/     @doquflow/cli      ← 8 CLI commands + web UI server, published to npm
│   ├── ui/      @docuflow/ui       ← Vite+React 18, private (bundled into CLI)
│   └── api/     @docuflow/api      ← Express dev bridge, private
├── scripts/
│   ├── release.js                  ← interactive version bump + git tag + push
│   └── pre-release-check.sh        ← 47-check validation suite
├── .claude/commands/               ← project skill files (Claude slash commands)
└── release/                        ← public-facing docs (synced to npm repo)
```

**Only `@doquflow/server` and `@doquflow/cli` are published to npm.**
UI is pre-built into `packages/cli/ui-dist/` at build time.

---

## 🛠️ Development Skill (condensed)

Full details: `.claude/commands/df-develop.md`

### Critical rules
- **TypeScript strict:** UI has `noUnusedLocals: true` — zero unused vars allowed
- **Build order:** `server → ui → cli → api` (UI must exist before CLI copies it)
- **Port 48821:** single server serves both `/api/*` routes and static UI — never split
- **Binaries:** use root `node_modules/.bin/tsc`, NOT `packages/ui/node_modules/.bin/tsc`

### Loading server tools in CLI commands
```typescript
type ToolFn = (args: Record<string, any>) => Promise<any>;
function loadTool(file: string, exportName: string): ToolFn {
  return (require(`@doquflow/server/dist/tools/${file}`) as Record<string, ToolFn>)[exportName];
}
// Load once inside run(), use via closure:
const listWikiTool = loadTool('list-wiki', 'listWiki');
```

### Adding a new CLI command — checklist
1. Create `packages/cli/src/commands/<name>.ts` → export `async function run(opts)`
2. Register in `packages/cli/src/index.ts` (arg parser + help text)
3. Add to Section 4 dist loop in `scripts/pre-release-check.sh`
4. Add distinctive help-text string to Section 7 grep loop

### Express server route order (ui.ts)
```
cors() → json() → /api/* routes → express.static(uiDist) → app.get('*') SPA fallback
```
Static serving MUST come after all API routes.

---

## 🧪 Testing Skill (condensed)

Full details: `.claude/commands/df-test.md`

### The 5 validation layers (run in order)
```bash
# 1. TypeScript — UI (strictest)
node_modules/.bin/tsc --noEmit -p packages/ui/tsconfig.json

# 2. TypeScript — API
node_modules/.bin/tsc --noEmit -p packages/api/tsconfig.json

# 3. CLI + Server build
npm run build -w packages/server && npm run build -w packages/cli

# 4. Full 47-check suite
bash scripts/pre-release-check.sh   # must show RESULT: PASSED

# 5. Live server smoke test
DOCUFLOW_PORT=48822 node packages/cli/dist/index.js ui --no-open &
sleep 2 && curl -s http://localhost:48822/api/ping  # → {"ok":true}
```

### Known failure modes
| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Pre-release check exits code 127, silent | Binary not found + `set -e` killed shell | Always use root `node_modules/.bin/` |
| TypeScript PASS but binary was missing | `if $(missing) \| grep` silently passes | Verify `ls node_modules/.bin/tsc` |
| `noUnusedLocals` error on used function | Arrow fn in closure not traced | Redeclare as `function foo()` not `const foo = () =>` |
| Port 48821 in use | Previous server running | `lsof -ti:48821 \| xargs kill` or `DOCUFLOW_PORT=48822` |

---

## 🚀 Release Skill (condensed)

Full details: `.claude/commands/df-release.md`

### Version alignment — all 4 must match
```bash
node -e "
  ['server','cli','ui','api'].forEach(p=>{
    const pkg=require('./packages/'+p+'/package.json');
    console.log(p+': '+pkg.version);
  });
  console.log('cli dep: '+require('./packages/cli/package.json').dependencies['@doquflow/server']);
"
```

### Release sequence
```bash
# Step 1: commit all working changes (release.js needs clean git)
git add <files> && git commit -m "feat: <what was built>"

# Step 2: interactive release (bumps versions, runs 47 checks, commits, tags, pushes)
node scripts/release.js
# → prompts: major / minor / patch
# → must pass 47/47 pre-release checks to proceed
```

### What to update for every feature release
- `CHANGELOG.md` → `[Unreleased]` Added section
- `release/CHANGELOG.md` → same entry (public)
- `FEATURES.md` → update tables and counts
- `release/README.md` → update CLI table + Features list
- `scripts/pre-release-check.sh` → new dist file + help text checks

---

## 🏗️ Architecture Reference

### CLI Commands (8 total)
| Command | What it does |
|---------|-------------|
| `docuflow init` | Create `.docuflow/`, register MCP, write `CLAUDE.md` |
| `docuflow init --interactive` | Guided domain setup |
| `docuflow status` | Wiki stats, MCP registration, version |
| `docuflow suggest` | Domain-aware first-steps (5 suggestions) |
| `docuflow ui` | Start web interface (API + static UI on port 48821) |
| `docuflow start` | Alias for `ui` |
| `docuflow watch [--ai]` | Background auto-sync daemon |
| `docuflow sync [--ai]` | One-shot sync for CI/CD |

### MCP Tools (15 total)
Code: `read_module`, `list_modules`, `write_spec`, `read_specs`
Wiki: `ingest_source`, `update_index`, `list_wiki`, `wiki_search`, `query_wiki`, `answer_synthesis`, `save_answer_as_page`
Health: `lint_wiki`, `get_schema_guidance`, `preview_generation`
Graph: `generate_dependency_graph`

### Web UI (port 48821)
6 views: Ask, Wiki, Graph, Health, Sync, Onboard
API routes: `/api/ping`, `/api/projects`, `/api/project`, `/api/wiki`, `/api/wiki/:pageId`, `/api/health`, `/api/activity`, `/api/ask`, `/api/search`

---

## 🔑 Key Conventions

### Secrets & git hygiene
- `.env` must never be committed (pre-release check enforces this)
- `packages/ui/` and `packages/api/` are `private: true` — never publish them
- No `docuflow-mcp` string allowed in source code (stale name check)

### Changelog discipline
Write `[Unreleased]` entries **as you develop**, not all at once before release. Both `CHANGELOG.md` and `release/CHANGELOG.md` must stay in sync.

### Workspace binaries
All dev tool binaries (tsc, vite, tsx, playwright) are hoisted to root `node_modules/.bin/`. Per-package `node_modules/.bin/` entries do NOT exist.

---

## Recommended MCP Servers

**Both DocuFlow and Waymark are pre-registered in `.mcp.json`** and will be auto-loaded
by Copilot CLI. No manual registration step is needed for this project.

For Copilot sessions in this repository:

**GitHub MCP** — Repository data, issues, workflows, CI status
- Useful for: checking release CI, querying the public `doquflows/docuflow` repo

**Filesystem MCP** — Enhanced file browsing
- Useful for: navigating `packages/*/src/`, cross-package searches

**DocuFlow MCP** — This project's own wiki knowledge base
- Pre-registered in `.mcp.json`; tools are available as `mcp__docuflow__<tool>`
- Key tools: `mcp__docuflow__read_module`, `mcp__docuflow__list_modules`, `mcp__docuflow__query_wiki`, `mcp__docuflow__write_spec`

<!-- DEVLOOP:COPILOT:START -->
# GitHub Copilot Instructions — DevLoop Worker

## Your Role
You are the implementation worker in the DevLoop pipeline.
Follow DEVLOOP TASK specs exactly — no improvisation on behaviour not specified in the spec.
If `DEVLOOP_WORKER_PROVIDER` is set to `claude`, DevLoop will route worker tasks through Claude instead of Copilot.

## Project Stack
- **Stack**: TypeScript 5, Node.js, MCP SDK (@modelcontextprotocol/sdk), npm workspaces monorepo
- **Patterns**: Monorepo (packages/server + packages/cli), tool-per-file pattern under src/tools/, MCP server/client split
- **Conventions**: async/await throughout, no test framework configured, tsc build via npm run build, dist/ output, ESM-compatible modules
- **Test framework**: none

## Understanding the Spec
Each task spec has these sections — read all of them before writing any code:

| Section | What it contains |
|---------|-----------------|
| **Files to Touch** | Which files to CREATE or MODIFY |
| **Implementation Steps** | Exact method signatures and per-step rules |
| **Acceptance Criteria** | Checklist of what "done" looks like |
| **Edge Cases** | Non-happy-path behaviours to implement |
| **Test Scenarios** | Table of test cases to write |
| **Copilot Instructions Block** | Condensed machine-readable summary |

## Workflow
1. Read the **full** spec — especially Files to Touch, Implementation Steps, Edge Cases
2. Use `/plan` to build a step-by-step implementation checklist
3. Implement each step in order, following every rule listed
4. Write tests for every row in the Test Scenarios table
5. Run tests (`none`) — fix failures before committing
6. Stage **all** changed files and commit in a single commit

## Commit Message Format
```
feat(TASK-ID): <one-line summary of what was implemented>
```
Example: `feat(TASK-20260506-143022): add GET /orders endpoint with date range filter`

Stage ALL changed files in a SINGLE commit with the TASK ID in the message.

## Standards
- Follow every rule listed in the spec (zero improvisation)
- Handle every edge case enumerated in the spec
- Write tests for every row in the Test Scenarios table
- Never skip error handling
- Do not add unrequested features or refactor unrelated code

## Definition of Done
- [ ] All Acceptance Criteria satisfied
- [ ] All Edge Cases handled
- [ ] Tests written and passing (framework: none)
- [ ] Single commit with TASK ID in message (feat(TASK-ID): ...)
<!-- DEVLOOP:COPILOT:END -->
