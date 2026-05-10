# DocuFlow — Feature Reference

DocuFlow is an MCP server + CLI toolkit that gives AI agents structured access to any codebase and maintains a persistent, self-healing wiki of project knowledge. It runs as a local subprocess over stdio, requires no API keys or external services, and stores everything as plain markdown files.

---

## MCP Server Tools

All 15 tools are registered by `packages/server/src/index.ts` and callable from any MCP-compatible client (Claude Desktop, VS Code, Copilot CLI, Codex CLI).

---

### Code Extraction Tools

#### `read_module`

Reads a single source file, auto-detects its language, and extracts structured facts.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | ✅ | Absolute or relative path to the source file |

**Returns:** language, classes, functions, dependencies, DB tables, REST endpoints, config/env references, and raw content (first 8,000 chars). Never fails on unknown file types.

```json
// Example call
{
  "tool": "read_module",
  "arguments": { "path": "src/UserService.ts" }
}
```

---

#### `list_modules`

Recursively walks a directory and returns extracted facts for every non-binary file.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | ✅ | Root directory to scan |
| `extensions` | `string[]` | ❌ | Extension filter e.g. `[".ts", ".go"]`; if omitted all non-binary files are included |

**Returns:** same structured facts as `read_module` per file (raw content omitted for bulk results).

**Auto-skips:** `node_modules`, `dist`, `build`, `.git`, `vendor`, `obj`, `bin`, `.docuflow`, `*.min.js`, `*.map`, `*.lock`, and files larger than 300 KB.

```json
{
  "tool": "list_modules",
  "arguments": {
    "path": "/my/project",
    "extensions": [".ts", ".py"]
  }
}
```

---

#### `write_spec`

Writes an agent-generated markdown spec to `.docuflow/specs/<filename>.md` and updates the spec index.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root (where `.docuflow/` lives) |
| `filename` | `string` | ✅ | Spec filename without `.md` extension |
| `content` | `string` | ✅ | Full markdown content to write |

**Returns:** path written, `written_at` timestamp.

```json
{
  "tool": "write_spec",
  "arguments": {
    "project_path": "/my/project",
    "filename": "UserService",
    "content": "# UserService\n\nHandles authentication..."
  }
}
```

---

#### `read_specs`

Reads previously written specs from `.docuflow/specs/`. Specs older than 30 days are flagged `stale: true`.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `module_name` | `string` | ❌ | Name of a specific spec to retrieve (with or without `.md`) |

**Returns:** array of spec objects with `filename`, `content`, `written_at`, `stale`.

```json
{
  "tool": "read_specs",
  "arguments": {
    "project_path": "/my/project",
    "module_name": "UserService"
  }
}
```

---

### Wiki Pipeline Tools

#### `ingest_source`

Reads a markdown document from `.docuflow/sources/`, extracts named entities and concepts, and creates or updates wiki pages with surrounding paragraph context.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `source_filename` | `string` | ✅ | Filename inside `.docuflow/sources/` (e.g. `overview.md`) |

**Returns:** list of pages created/updated, entities discovered, concepts extracted.

```json
{
  "tool": "ingest_source",
  "arguments": {
    "project_path": "/my/project",
    "source_filename": "architecture.md"
  }
}
```

---

#### `update_index`

Scans all wiki pages and regenerates `.docuflow/index.md` organised by category. Appends a timestamped entry to `.docuflow/log.md`.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |

**Returns:** total page count, per-category breakdown, index path written.

```json
{
  "tool": "update_index",
  "arguments": { "project_path": "/my/project" }
}
```

---

#### `list_wiki`

Lists all wiki pages, optionally filtered by category. Pages not updated in 30+ days are flagged `stale: true`.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `category` | `entity \| concept \| timeline \| synthesis` | ❌ | Filter to a single category |

**Returns:** page metadata (title, `created_at`, sources, tags, `stale`), total count, per-category counts, `stale_pages` count.

```json
{
  "tool": "list_wiki",
  "arguments": {
    "project_path": "/my/project",
    "category": "entity"
  }
}
```

---

#### `wiki_search`

BM25-inspired relevance search across all wiki pages. Entity pages are weighted higher in ranking.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `query` | `string` | ✅ | Search query |
| `limit` | `number` | ❌ | Max results to return (default: 10) |
| `category` | `entity \| concept \| timeline \| synthesis` | ❌ | Filter to a single category |

**Returns:** ranked results with relevance scores, category, content snippets, matched terms.

```json
{
  "tool": "wiki_search",
  "arguments": {
    "project_path": "/my/project",
    "query": "authentication flow",
    "limit": 5,
    "category": "concept"
  }
}
```

---

#### `synthesize_answer`

Builds a structured markdown answer from a specified set of wiki pages and a question. Extracts key sentences, adds section headings, appends citations.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `query` | `string` | ✅ | The question being answered |
| `source_page_ids` | `string[]` | ✅ | Wiki page IDs to synthesise from |

**Returns:** markdown answer with citations.

```json
{
  "tool": "synthesize_answer",
  "arguments": {
    "project_path": "/my/project",
    "query": "How does token refresh work?",
    "source_page_ids": ["entity/auth-service", "concept/jwt-flow"]
  }
}
```

---

#### `query_wiki`

One-stop Q&A: runs `wiki_search`, passes top results to `synthesize_answer`, and returns the synthesised answer with source citations and a confidence score.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `question` | `string` | ✅ | Question to ask |
| `max_sources` | `number` | ❌ | Max source pages to use in synthesis (default: 5) |

**Returns:** synthesised answer, source pages, confidence score.

```json
{
  "tool": "query_wiki",
  "arguments": {
    "project_path": "/my/project",
    "question": "How does the MCP protocol work?",
    "max_sources": 3
  }
}
```

---

#### `save_answer_as_page`

Persists a synthesised answer as a new wiki page, compounding query results back into the knowledge base.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `question` | `string` | ✅ | Original question that was answered |
| `answer` | `string` | ✅ | Markdown answer text |
| `page_title` | `string` | ✅ | Title for the new wiki page |
| `category` | `synthesis \| entity \| concept \| timeline` | ❌ | Wiki category (default: `synthesis`) |
| `source_page_ids` | `string[]` | ❌ | Source page IDs for cross-reference links |

**Returns:** path of the created wiki page, `updated_at`.

```json
{
  "tool": "save_answer_as_page",
  "arguments": {
    "project_path": "/my/project",
    "question": "How does auth work?",
    "answer": "## Auth Flow\n\nTokens are issued by...",
    "page_title": "How Auth Works",
    "category": "synthesis"
  }
}
```

---

### Health & Guidance Tools

#### `lint_wiki`

Full health audit: checks for orphan pages, broken internal references, stale content, metadata gaps, and contradictory statements between pages.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `check_type` | `all \| orphans \| contradictions \| stale \| metadata` | ❌ | Check to run (default: `all`) |

**Returns:** issues array, per-check metrics, health score (0–100), recommendations.

```json
{
  "tool": "lint_wiki",
  "arguments": {
    "project_path": "/my/project",
    "check_type": "stale"
  }
}
```

---

#### `get_schema_guidance`

Reads `.docuflow/schema.md` to detect the project domain, compares existing wiki pages against the domain-recommended list, and returns missing pages with reasons.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Project root |
| `domain` | `string` | ❌ | Domain hint (`Code/Architecture`, `Research`, `Business`, `Personal`); auto-detected if omitted |

**Returns:** detected domain, list of recommended-but-missing wiki pages with creation reasons.

```json
{
  "tool": "get_schema_guidance",
  "arguments": { "project_path": "/my/project" }
}
```

---

#### `preview_generation`

Shows what a tool will do before you run it. Reads actual wiki state to produce accurate predictions.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `tool_name` | `string` | ✅ | Name of the tool to preview (e.g. `ingest_source`) |
| `project_path` | `string` | ✅ | Project root |
| `params` | `object` | ✅ | Parameters you would pass to that tool |

**Returns:** predicted actions, expected output format, impact level (`none` / `low` / `medium` / `high`), affected files.

```json
{
  "tool": "preview_generation",
  "arguments": {
    "tool_name": "ingest_source",
    "project_path": "/my/project",
    "params": { "source_filename": "overview.md" }
  }
}
```

---

### Dependency Analysis Tools

#### `generate_dependency_graph`

Scans a project with `list_modules` and builds a module-level dependency graph.

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `project_path` | `string` | ✅ | Root directory to analyse |
| `extensions` | `string[]` | ❌ | Extension filter; if omitted all non-binary files are scanned |
| `focus` | `string` | ❌ | Partial file/module name — filters graph to first-hop (BFS) neighbours only |

**Returns:**
- `nodes` — all discovered modules
- `edges` — import edges (file A imports file B), shared-table edges, shared-endpoint edges
- `shared_tables` — DB tables accessed by multiple files
- `shared_endpoints` — HTTP endpoints defined in multiple files
- `most_connected` — top 10 highest-risk files by total edge count

```json
{
  "tool": "generate_dependency_graph",
  "arguments": {
    "project_path": "/my/project",
    "extensions": [".ts"],
    "focus": "user-service"
  }
}
```

---

## CLI Commands

Install: `npm install -g @doquflow/cli`  
Binary: `docuflow`

---

### `docuflow init`

Registers the DocuFlow MCP server in all supported agent configs, creates `.docuflow/` directory structure, and generates `CLAUDE.md` and `AGENTS.md` at the project root. Adds `.docuflow/` to `.gitignore`. Installs a git post-commit hook that runs `docuflow sync --ai --quiet &`.

```bash
docuflow init
```

| Flag | Description |
|------|-------------|
| `--interactive`, `-i` | Guided setup: prompts for domain, project name, description; generates domain-specific schema and `PLAN.md` |

```bash
docuflow init --interactive
```

---

### `docuflow status`

Displays MCP registration status, wiki page counts by category, spec count, source file count, last ingest date, and contextual hints.

```bash
docuflow status
```

---

### `docuflow suggest`

Domain-aware first-steps guidance. Reads `.docuflow/schema.md` for domain detection, counts existing pages and sources, and prints 5 prioritised starting-point suggestions with ready-to-paste prompt starters.

```bash
docuflow suggest
```

---

### `docuflow ui` / `docuflow start`

Starts an all-in-one Express server serving the React web UI and REST API bridge on port 48821. Auto-opens the browser (suppress with `--no-open`). `start` is an alias for `ui`.

| Flag | Description |
|------|-------------|
| `--port <n>` | Use a custom port (default: `48821`) |
| `--no-open` | Start server without auto-opening the browser |

```bash
docuflow ui --port 3000 --no-open
```

---

### `docuflow watch`

Background auto-sync daemon. Three trigger layers run concurrently:
1. **Source watcher** — `.docuflow/sources/` changes → direct ingest (< 1 s latency)
2. **Code watcher** — project source files change → AI-driven wiki update (debounced)
3. **Lint scheduler** — runs `lint_wiki` on a recurring interval

PID file is written to `.docuflow/watch.pid`. If the PID file already points to a live process, the command exits with an error — run `docuflow watch stop` first.

| Flag | Description |
|------|-------------|
| `--ai` | Enable AI bridge (auto-detects best available bridge) |
| `--copilot` | Force Copilot CLI bridge |
| `--claude` | Force Claude Code CLI bridge |
| `--codex` | Force Codex CLI bridge |
| `--lint-interval N` | Run lint every N hours (default: `24`) |
| `--code-ext ext,...` | Watch only these file extensions (comma-separated) |
| `--allow-dangerous-permissions` | Pass `--dangerously-skip-permissions` to Claude CLI (required for Claude bridge in non-interactive / daemon use; only use when project content is trusted) |

```bash
docuflow watch --ai --lint-interval 6 --code-ext ts,py
```

#### `docuflow watch stop`

Sends SIGTERM to the running daemon (SIGKILL after 5 s if still alive), then removes the PID file.

```bash
docuflow watch stop
```

#### `docuflow watch status`

Shows daemon state (running / stopped), PID, uptime, active AI bridge, and failover count.

```bash
docuflow watch status
```

#### `docuflow watch restart`

Stops the current daemon and restarts it with the same options.

```bash
docuflow watch restart
```

---

### `docuflow sync`

One-shot synchronisation: re-ingests all sources, rebuilds the index, and runs a lint health check. Designed for CI/CD pipelines and git hooks.

**Exit codes:**
| Code | Meaning |
|------|---------|
| `0` | Success — wiki is healthy (score ≥ threshold) |
| `1` | Wiki health score below threshold or ingest errors |
| `2` | Fatal — `.docuflow/` not found, server tools missing, or invalid git ref |

| Flag | Description |
|------|-------------|
| `--ai` | Enable AI bridge for code-change documentation |
| `--copilot` | Force Copilot CLI bridge |
| `--claude` | Force Claude Code CLI bridge |
| `--codex` | Force Codex CLI bridge |
| `--since-commit REF` | Only process source files changed since git ref (e.g. `HEAD~1`) |
| `--source FILE` | Sync a single source file instead of all |
| `--no-lint` | Skip health check (faster for CI) |
| `--fail-on-score N` | Exit `1` if health score < N (default: `70`) |
| `--quiet`, `-q` | Suppress output (CI / daemon mode) |
| `--allow-dangerous-permissions` | Pass `--dangerously-skip-permissions` to Claude CLI |

```bash
docuflow sync --ai --since-commit HEAD~1 --fail-on-score 80
```

---

### `docuflow review`

Reviews current git changes using deterministic rules (secrets, `eval`, TODOs, `console.log`, `any` types, empty catch blocks, long lines) and optionally appends an AI review.

| Flag | Description |
|------|-------------|
| `--staged` | Review staged (index) changes only |
| `--since-commit REF` | Review changes since git ref (e.g. `HEAD~1`) |
| `--ai` | Append Copilot AI review to deterministic findings |
| `--fail-on-critical` | Exit `1` if critical findings are detected |
| `--quiet`, `-q` | Compact output for CI / scripting |

```bash
docuflow review --staged --ai --fail-on-critical
```

---

### `docuflow update` / `docuflow upgrade`

Reinstalls the latest `@doquflow/cli` globally via npm. `upgrade` is an alias for `update`.

| Flag | Description |
|------|-------------|
| `--check` | Check whether a newer version is published without installing |
| `--force` | Reinstall even when already on the latest version |

```bash
docuflow update --check
```

---

### `docuflow --version`

Prints the installed CLI version.

| Flag | Alias |
|------|-------|
| `--version` | `-v` |

```bash
docuflow --version
```

---

## Web Interface & REST API

Start with `docuflow ui` (or `docuflow start`). The single Express server on port 48821 serves both the React UI and the REST API — no separate processes needed.

### Web UI Views

| View | Description |
|------|-------------|
| **Ask** | AI-powered Q&A — type a question, DocuFlow searches the wiki and synthesises an answer with source citations |
| **Wiki** | Live page browser with category tree (Entities / Concepts / Syntheses / Timelines); click any page to read its markdown |
| **Graph** | Interactive dependency visualiser — wiki pages as nodes, colour-coded by kind |
| **Health** | Health dashboard — real-time score (0–100), stale and orphan counts, open issues with fix actions |
| **Sync** | Daemon monitor — status (Listening / Paused), active AI bridge, last run time, recent log timeline |
| **Onboard** | New project setup wizard — choose domain, name project, get a ready-to-run `init` command |

Auto-discovers all DocuFlow projects in `~/dev`, `~/code`, `~/projects`, `~/work`, `~/src`, `~/Desktop`. Shows a project picker in the top bar when multiple projects are found.

### REST API Endpoints

The server exposes 10 REST API endpoints:

| Method | Path | Query / Body | Description |
|--------|------|--------------|-------------|
| `GET` | `/api/ping` | — | Health check — returns `{ ok: true }` |
| `GET` | `/api/projects` | `?path=` (optional) | Scan common dev directories for `.docuflow` projects; returns all found with stats |
| `GET` | `/api/project` | `?path=` | Stats for one project (name, health score, page count, entities, last ingest) |
| `GET` | `/api/wiki` | `?path=` | List all wiki pages grouped by category with stale flag |
| `GET` | `/api/wiki/:pageId` | `?path=` | Read one wiki page's full markdown content |
| `GET` | `/api/health` | `?path=` | Full lint report — health score, stale pages, orphans, open issues |
| `GET` | `/api/activity` | `?path=` | Recent activity from `.docuflow/log.md` (last 10 operations) |
| `POST` | `/api/ask` | `{ path, question }` | Q&A via `query_wiki` — returns synthesised answer with citations |
| `GET` | `/api/search` | `?path=&q=` | BM25 search across all wiki pages via `wiki_search` |
| `GET` | `/api/graph` | `?path=` | Wiki-page dependency graph — nodes, edges, colour-coded by kind |

```bash
# Quick test after starting server
curl http://localhost:48821/api/ping
# → {"ok":true}

curl -X POST http://localhost:48821/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"path":"/my/project","question":"How does auth work?"}'
```

---

## AI Bridge

The `--ai` flag activates the AI bridge in both `watch` and `sync`. The bridge is selected automatically in priority order, or forced via a flag.

### Priority Chain

| Priority | Bridge | How it works |
|----------|--------|-------------|
| 1 | **copilot** (`@github/copilot` CLI) | Calls DocuFlow MCP tools **directly** — `ingest_source`, `update_index`, `lint_wiki` — no intermediate step |
| 2 | **claude** (Claude Code CLI) | Calls DocuFlow MCP tools **directly** — same as copilot |
| 3 | **codex** (OpenAI Codex CLI) | Generates markdown documentation text, saves to `.docuflow/sources/`, then runs `ingest_source` |
| 4 | **api** (`ANTHROPIC_API_KEY` env) | Generates markdown documentation text, saves to `.docuflow/sources/`, then runs `ingest_source` |
| — | **none** | Sources-only mode — only `.docuflow/sources/` changes trigger direct ingest; no code change processing |

### Failover

If the forced bridge (`--copilot`, `--claude`, `--codex`) is not found in `PATH`, the system logs a warning and falls back to the next bridge in the priority chain. Maximum failover depth is 4. The active bridge and failover count are visible via `docuflow watch status`.

### Direct vs. Doc-Generation Bridges

**Direct MCP bridges (copilot, claude):** Since DocuFlow is pre-registered in the agent's MCP config (`~/.copilot/mcp-config.json`, Claude Desktop config), these bridges call MCP tools autonomously. Result: richer wiki maintenance with zero extra steps.

**Doc-generation bridges (codex, api):** Generate a markdown document describing the changed code, write it to `.docuflow/sources/`, then call `ingest_source`. Wiki quality depends on the generated doc.

### `--allow-dangerous-permissions`

Required when using the Claude bridge in non-interactive environments (daemon, CI). Passes `--dangerously-skip-permissions` to the Claude CLI. Only use this flag when the project's file content is fully trusted.

---

## Storage Layout

```
<project-root>/
├── CLAUDE.md                       ← Auto-generated by docuflow init
│                                      Contains: all 15 tool descriptions, workflows, paths
├── AGENTS.md                       ← Auto-generated by docuflow init
│                                      OpenCode / Pi agent instructions
│
└── .docuflow/
    ├── schema.md                   ← Domain config (Code / Research / Business / Personal)
    ├── index.md                    ← Auto-maintained catalog rebuilt by update_index
    ├── log.md                      ← Append-only operation audit trail
    ├── watch.pid                   ← PID file written by docuflow watch (pid, bridge, options)
    ├── PLAN.md                     ← Planning template (interactive init only)
    │
    ├── sources/                    ← Raw input documents (markdown, immutable by convention)
    │   └── overview.md
    │
    ├── wiki/                       ← LLM-maintained knowledge base
    │   ├── entities/               ← Named things: services, APIs, models, people, systems
    │   ├── concepts/               ← Design patterns, principles, integration ideas
    │   ├── timelines/              ← Chronological events and sequences
    │   └── syntheses/              ← Saved Q&A answers and cross-cutting synthesis pages
    │
    └── specs/                      ← Agent-written code and architecture specs
        ├── index.json              ← Spec index (title, written_at per spec)
        └── UserService.md
```

**Global registry:** `~/.docuflow/projects.json` — written by `docuflow init`, used by the UI and `docuflow status` to discover all initialised projects regardless of their location on disk.

---

## Integrations & Setup

### MCP Registration Targets

`docuflow init` automatically writes the MCP server entry to all of the following locations (where they already exist or can be created):

| Target | Config file |
|--------|-------------|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Claude Desktop (Linux) | `~/.config/Claude/claude_desktop_config.json` |
| VS Code (user, macOS) | `~/Library/Application Support/Code/User/mcp.json` |
| VS Code (user, Windows) | `%APPDATA%\Code\User\mcp.json` |
| VS Code (user, Linux) | `~/.config/Code/User/mcp.json` |
| VS Code workspace | `.vscode/mcp.json` (committable) |
| Copilot CLI | `~/.copilot/mcp-config.json` |
| Codex CLI | `~/.codex/config.toml` |

### Git Post-Commit Hook

`docuflow init` installs a git post-commit hook that runs automatically after every commit:

```bash
#!/bin/sh
# docuflow-auto-sync
# Auto-generated by docuflow init
# Syncs the DocuFlow wiki after every commit using Claude / Codex / Anthropic API
# AI bridge priority: Claude CLI > Codex CLI > ANTHROPIC_API_KEY
# Run in background (&) so it never delays your git workflow
if command -v docuflow &> /dev/null; then
  docuflow sync --ai --quiet &
fi
```

This keeps the wiki in sync with code changes without any manual steps.

### `.gitignore` Integration

`docuflow init` appends `.docuflow/` to the project's `.gitignore` so the wiki and specs are not accidentally committed.

### Global Project Registry

Every `docuflow init` call registers the project path in `~/.docuflow/projects.json`. The web UI (`docuflow ui`) and `docuflow status` read this registry to discover all projects without requiring the user to specify a path.
