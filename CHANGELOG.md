# Docuflow Changelog

## [1.7.0] - 2026-05-20

**Soft deprecation / core-vs-advanced surface split.** Second milestone of the philosophy reset. Zero command removal — every existing top-level path keeps working. See [release/v1.7.0.md](release/v1.7.0.md) for the full narrative.

### Added
- feat: `docuflow query "<question>"` core CLI command (#12) — direct value-out pipe, wraps `query_wiki` MCP tool; supports `--max-sources`, `--json`, `--no-cite`, `--save-as`, `--quiet`
- feat: `docuflow ingest <file>` core CLI command (#13) — direct value-in pipe, wraps `ingest_source` MCP tool; supports `--all`, `--dry-run`, `--quiet`
- feat: `MIGRATION.md` (#16) — philosophy-reset narrative + command mapping table; quotes the Tracker's Paradox LinkedIn post

### Changed
- refactor: CLI help core/advanced split (#14) — `docuflow --help` shows 5 core commands (init/ingest/query/status/rewiki); `docuflow advanced --help` shows 9 advanced commands (watch/sync/ui/start/review/recent/suggest/update); every old top-level path still works, the `advanced` prefix is optional
- docs: CLAUDE.md auto-generation now features 4 core MCP tools (`query_wiki`, `ingest_source`, `wiki_search`, `read_module`) with the 11 advanced tools demoted to a second section (#15); BEGIN/END markers added for idempotent re-runs

### Bright line
Zero command removal through v2.x. Every existing `docuflow watch`, `docuflow sync --ai`, `docuflow ui`, etc. keeps working exactly as before. The new `advanced` prefix is *optional* everywhere.

## [1.6.0] - 2026-05-20

**Philosophy Reset.** DocuFlow is returning to its core: *intent in, value out, nothing in between.* See [release/v1.6.0.md](release/v1.6.0.md) for the full narrative.

### Added
- feat: `docuflow rewiki` migration command (#4) — re-ingests all sources with current extractor rules, backs up wiki, migrates synthesiss/ typo, produces audit report
- feat: 5-rule entity extractor + Rule 6 for structural noise (#3) — stop-list, no emoji/punct-only slugs, structural anchor, min token signal, context requirement, plus rejection of numbered list items, file references, question-form headings, preposition-led phrases, layer/phase markers, sentence-form captures, emoji-led decoration, "the X" descriptives, and date metadata
- feat: `.docuflow/schema.md` philosophy-reset schema (#5) — canonical wiki structure for the Code & Architecture domain; CI guard fails the build if the placeholder template remains

### Fixed
- fix: `synthesiss/` typo bug (#2) — centralised `categoryDir()` helper replaces ad-hoc `category + "s"` pluralisation in `ingest-source.ts` and `save-answer-as-page.ts`
- fix: npm-chart commit noise (#6) — weekly cron (Mon 09:00 UTC) instead of every 6h, `stats:` prefix instead of `chore:`, SVG relocated to `docs/stats/`

### Proof run on this repo
- Entity pages: **256 → 96** (62.5% reduction)
- Total wiki pages: 283 → 123 (57% reduction)
- Unit tests: 76 passing (extractor rules + categoryDir + rewiki)

## [1.5.2] - 2026-05-13


## [1.5.1] - 2026-05-09


## [1.5.0] - 2026-05-09


## [1.4.0] - 2026-05-09


## [1.3.1] - 2026-05-09

### Fixed
- **Web UI navigation** — Removed duplicate nav items (Health/Sync appearing twice) caused by two separate `<nav>` blocks in Rail component; replaced with unified `RAIL_GROUPS` structure
- **Web UI CSS tokens** — Added missing `--df-text-5` and `--df-bg-hover` CSS variables that caused invisible hover/active states
- **Web UI active state** — Added `.df-action`, `.df-action--active`, and related component CSS classes; navigation items now show correct indigo left-bar indicator
- **Web UI Onboard icon** — Added `onboard` key to `ICON_MAP` (was missing, showing `●` fallback instead of help icon)
- **Web UI Settings version** — Fixed `v__APP_VERSION__` literal displaying instead of real version by adding Vite `define` injection in `vite.config.ts`
- **Web UI Settings port** — Replaced hardcoded `48821` with dynamic `window.location.port` so Settings shows actual server port
- **CLI dep pinning** — Changed `@doquflow/server` dependency in CLI `package.json` from `^1.3.0` to exact `1.3.0`

## [1.3.0] - 2026-05-09

### Added
- **`docuflow review`** — Review current git changes with deterministic findings and optional Copilot analysis
  - Analyzes staged, working tree, or commit range changes
  - Detects: hardcoded secrets, SQL destructive ops, debug statements, TODO markers, type weakening
  - `--ai` augments review with Copilot analysis when available
  - `--fail-on-critical` exits with code 1 when critical findings exist
  - Scopes: `--staged` (staged only), `--since-commit <ref>` (commit range), default (all changes)

### Fixed
- DevLoop reviewer agent contract now enforces canonical first-line verdict format (`Verdict: APPROVED / NEEDS_WORK / REJECTED`)

## [1.2.1] - 2026-05-07

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


## [1.2.0] - 2026-05-07

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


## [1.1.2] - 2026-05-07

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


## [1.1.1] - 2026-05-07

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


## [1.1.0] - 2026-05-07

### Added
- **`docuflow ui`** — New CLI command that starts an all-in-one Express server (port 48821) bundling the React web interface + HTTP API bridge
  - Serves `/api/*` routes and static Vite build from the same origin (no CORS)
  - Auto-discovers DocuFlow projects in `~/dev`, `~/code`, `~/projects`, `~/work`, `~/src`, `~/Desktop`
  - Opens browser automatically (suppressed with `--no-open`); custom port via `--port`
  - Graceful SIGINT/SIGTERM shutdown
- **`docuflow start`** — Alias for `docuflow ui`
- **Web UI bundled into `@doquflow/cli` npm package** — `ui-dist/` directory included in published package; no separate install needed
- **Project-level Claude skill files** — `.claude/commands/` directory with 3 auto-improving skill documents:
  - `df-develop.md` — Development patterns, `loadTool()` pattern, adding CLI commands and API endpoints
  - `df-test.md` — 5-layer validation, TypeScript checks, pre-release check breakdown, known failure modes
  - `df-release.md` — Release sequence, version alignment, CHANGELOG discipline, release.js internals
- **Copilot instructions updated** — `.github/copilot-instructions.md` rewritten for v1.1.0; references all 3 skill files

### Changed
- Root `package.json` build order: `server → ui → cli → api` (UI must build before CLI copies `ui-dist`)
- `packages/cli/package.json` now includes Express/cors dependencies and `ui-dist/**` in published files

### Fixed
- `.gitignore` — Changed `.claude/` → `.claude/settings.local.json` so skill files are tracked in git


## [1.0.0] - 2026-05-07

### Added
- `packages/ui/` — Vite + React 18 web interface (6 views: Ask, Wiki, Graph, Health, Sync, Onboard)
- `packages/api/` — Express HTTP bridge on port 48821 for development
- All 6 UI views wired to live API with graceful mock fallback when API offline


## [0.5.6] - 2026-05-07

### Changed
- Added `docuflow design/` to `.gitignore` — keeps AI design scratch files out of version control


## [0.5.5] - 2026-05-07

### Changed
- Removed `.github/workflows/docuflow-sync.yml` — GitHub Actions wiki sync retired; local `docuflow sync --ai` + post-commit hook is the canonical workflow


## [0.5.4] - 2026-05-01

### Changed
- Documentation update: expanded README and CHANGELOG for the v0.5.3 local-sync feature
- Local DocuFlow wiki sync guide added to `docs/LOCAL_SYNC_SETUP.md`


## [0.5.3] - 2026-05-01

### Added
- **`docuflow sync --ai`** — One-shot wiki sync command (AI-powered)
  - Auto-detects best local AI bridge (Copilot → Claude Code → Codex → API)
  - `--copilot`, `--claude`, `--codex` flags to force specific bridge
  - `--since-commit REF` for incremental sync
  - `--fail-on-score N` to fail if health < threshold
  - `--quiet` mode for CI integration
- **Local-first sync workflow** — No GitHub Actions, no API keys required
  - Move wiki sync to developer machine for instant feedback
  - Git post-commit hook auto-syncs on every commit (non-blocking)
  - Comprehensive `LOCAL_SYNC_SETUP.md` guide

### Changed
- **`.github/workflows/docuflow-sync.yml`** — Disabled GitHub Actions workflow
  - CI/CD wiki sync removed; developers now run sync locally
  - Reduces overhead and eliminates API key management
  - Post-commit hook provides automatic sync if enabled
- **Copilot CLI priority** — Now preferred bridge (faster MCP tool calling)

### Fixed
- Watch daemon now correctly recovers from failed Copilot calls
- Auto-sync properly handles files with no recent changes


## [0.5.2] - 2026-05-01

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


## [0.5.1] - 2026-05-01

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


## [0.5.0] - 2026-05-01

### Added

**Auto-Sync: `docuflow watch` — background daemon**
- Starts a persistent daemon that watches for file changes and keeps the wiki in sync automatically
- `SOURCE WATCHER` — monitors `.docuflow/sources/` and auto-ingests any new/changed `.md` file within <1 second
- `CODE WATCHER` — monitors project source files (`.ts`, `.py`, `.go`, `.rb`, `.java`, `.cs`, etc.) and triggers AI-powered doc generation on change (3-second debounce)
- `LINT SCHEDULER` — runs `lint_wiki` every N hours (default: 24h), reports health score and issues
- `--lint-interval N` flag — set lint schedule in hours
- `--code-ext ts,py` flag — restrict code watcher to specific file extensions
- **PID file management** — writes `.docuflow/watch.pid` on start; contains PID, bridge, started_at, options
- **Duplicate-start protection** — blocks second daemon for same project; shows existing PID and suggests `watch stop`
- **Graceful shutdown** — single `shutdown()` handler covers all watchers + timers; removes PID file on exit
- **macOS double-fire fix** — 500ms debounce on `fs.watch` `rename` event prevents double-ingest
- **32-bit overflow fix** — lint interval capped at `2,147,483,647 ms` (~24.8 days) to prevent Node.js `setInterval` overflow

**Auto-Sync: `docuflow watch stop/status/restart` — daemon lifecycle management**
- `docuflow watch stop` — sends SIGTERM to running daemon, waits 5s, SIGKILL if needed, removes PID file
- `docuflow watch status` — reads PID file: shows `● running` with PID/uptime/bridge/started-at, or `stopped`; auto-cleans stale PID files
- `docuflow watch restart` — stops current daemon, re-spawns with identical options (reads saved options from PID file)
- Stale PID handling — if process died without cleanup, status/stop detect and auto-clean the orphaned PID file

**Auto-Sync: `docuflow sync` — one-shot sync for CI/CD and git hooks**
- `docuflow sync` — re-ingests all sources, rebuilds index, runs lint check
- `docuflow sync --source <file>` — sync a single source file only
- `docuflow sync --no-lint` — skip health check (faster for CI)
- `docuflow sync --fail-on-score N` — exit 1 if health score < N (default: 70); useful for CI quality gates
- `docuflow sync --quiet` — suppress all output (pure CI mode)
- `docuflow sync --since-commit <REF>` — diff code changes since git ref, only process relevant sources
- Exit codes: 0 = success, 1 = health below threshold or ingest error, 2 = .docuflow/ not found

**AI Bridge system — 4-tier priority (for `watch --ai` and `sync --ai`)**
- Priority 1: **`copilot` CLI** (`@github/copilot`) — directly calls DocuFlow MCP tools (ingest, update_index, lint_wiki) via `copilot --prompt --allow-all-tools --no-ask-user --output-format json`; returns full wiki maintenance report
- Priority 2: **`claude` CLI** (Claude Code) — directly calls DocuFlow MCP tools via `claude --print --dangerously-skip-permissions --mcp-config`
- Priority 3: **`codex` CLI** (OpenAI Codex) — generates markdown doc from changed files, saves to sources/, ingests
- Priority 4: **Anthropic API** (`ANTHROPIC_API_KEY`) — same as codex but via direct HTTPS (no CLI required)
- `--copilot` / `--claude` / `--codex` flags — force specific bridge instead of auto-detecting
- Graceful fallback — if forced bridge not installed, automatically falls back to next priority
- `skipManualSync` flag — when Copilot/Claude handled everything via MCP, direct ingest/index steps are skipped

**Key discovery: Copilot CLI is the best bridge**
- `@github/copilot` registers DocuFlow in `~/.copilot/mcp-config.json` (done by `docuflow init`)
- In `--prompt` mode, Copilot directly calls `list_wiki`, `ingest_source`, `update_index`, `lint_wiki`
- No intermediate doc generation step — Copilot maintains the wiki natively as an MCP agent
- Returns structured markdown report: pages before/after, health score, issue analysis
- Verified: 216→219 pages in 40.8s, health score 95/100, full issue breakdown

**Git hook auto-installation**
- `docuflow init` now installs `.git/hooks/post-commit` automatically
- Hook runs `docuflow sync --ai --quiet &` in background after every commit (never delays git)
- Hook guards with `command -v docuflow` — safe on machines without DocuFlow
- Idempotent — re-running `docuflow init` detects existing hook marker and skips
- Appends to existing hooks rather than overwriting

**GitHub Actions workflow**
- New `.github/workflows/docuflow-sync.yml` — auto-syncs wiki on every push to main
- Mode A: `claude-code-action` (richest) — Claude reads diff, calls DocuFlow MCP tools, commits updated wiki
- Mode B: `docuflow sync --ai` — direct Anthropic API call, commits results
- Weekly scheduled lint check (`cron: '0 9 * * MON'`)
- Manual trigger via `workflow_dispatch` with `since_ref` and `force_full_sync` inputs
- Publishes health summary to GitHub Actions step summary

### Fixed

- **Double-fire on macOS `fs.watch`** — `rename` event fires twice when a file is created; fixed with 500ms debounce on sources watcher
- **32-bit `setInterval` overflow** — `--lint-interval` values >24.8 days caused Node.js overflow warning and immediate fire; capped at `2_147_483_647` ms
- **Duplicate SIGINT/SIGTERM handlers** — `codeWatcher` and main `shutdown()` both registered SIGTERM handlers causing stop to wait 5s unnecessarily; merged into single handler
- **Claude bridge auth filter** — `Invalid API key` error string now filtered from `--print` output before returning null
- **Claude bridge MCP config** — added `--dangerously-skip-permissions` and explicit `--mcp-config` to Claude CLI invocation for non-interactive MCP tool use
- **Release workflow `rsync`** — added `--exclude='*.pid'` to prevent `.docuflow/watch.pid` files from shipping to public repo

### Changed

- CLI tool count: 4 commands → **6 commands** (added `watch`, `sync`; `watch` has `stop/status/restart` sub-commands)
- `docuflow init` now installs git post-commit hook in addition to MCP registration
- `docuflow` help output updated with all new commands, flags, and AI bridge priority explanation
- Pre-release check script: 8 checks → **20 checks** (added dist file verification, version sync, smoke tests, CLI coverage)
- CI workflow: single build job → **2 jobs** (build + 10-step smoke test suite)
- Release workflow: added `--exclude='*.pid'` to rsync


### Added
- `docuflow init` now registers DocuFlow in **OpenAI Codex CLI** (`~/.codex/config.toml`) — DocuFlow MCP tools available in every Codex session automatically
- `docuflow init` now generates **AGENTS.md** in the project root — Codex reads tool instructions automatically (same as CLAUDE.md for Claude Code)
- `docuflow init` output now shows all 5 registration targets including Codex CLI and AGENTS.md



### Added
- `docuflow init` now registers DocuFlow in **GitHub Copilot CLI** (`~/.copilot/mcp-config.json`) — DocuFlow tools available in `gh copilot` agent mode automatically
- `docuflow init` now writes a **project-level `.vscode/mcp.json`** — committable workspace config so the whole team gets DocuFlow in VS Code Copilot without running init individually
- `docuflow init` output now shows registration status for all 4 targets: Claude Desktop, VS Code Copilot (user), Copilot CLI, and Workspace

## [0.4.4] - 2026-04-23

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


## [0.4.3] - 2026-04-23

### Added
- `docuflow init` now registers the MCP server in VS Code's user MCP config (`~/Library/Application Support/Code/User/mcp.json` on macOS) — DocuFlow tools are now available in GitHub Copilot Agent mode automatically after init
- `docuflow init` output now shows registration status for both Claude Desktop and GitHub Copilot

## [0.4.2] - 2026-04-23

### Added
- `docuflow --version` and `docuflow -v` flags — print the installed version
- Improved `docuflow` bare command output: now shows version header and structured help with Commands/Options sections


## [0.4.1] - 2026-04-23

### Added
- (Add your changes here)

### Changed
- (Add your changes here)

### Fixed
- (Add your changes here)


## [0.4.0] - 2026-04-23

### Added

**New MCP tool: `generate_dependency_graph`** (15th tool)
- Scans a project and builds a dependency graph showing how modules import each other, which DB tables are shared across files, and which endpoints overlap
- Returns `nodes`, `edges` (import/shared_table/shared_endpoint), `shared_tables`, `shared_endpoints`, `most_connected` (top 10 by connection count)
- Supports optional `focus` parameter (neighbourhood filter — only show files connected to a specific module)
- Supports `extensions` filter to narrow scan
- Identifies the highest-risk files to change before touching them

**New CLI command: `docuflow suggest`**
- Domain-aware first-steps guidance (Code/Architecture, Research, Business, Personal, General)
- Auto-detects domain from `.docuflow/schema.md`
- Shows 5 prioritised page suggestions with reasons and ready-to-paste Claude prompts
- Reports current wiki page count and source count as context
- Quick-start prompts section at the bottom of output

**CLAUDE.md auto-generation on `docuflow init`**
- Both `docuflow init` and `docuflow init --interactive` now generate `CLAUDE.md` at the project root
- Content: all 15 tool descriptions with examples, common workflows, storage layout, project-specific paths
- Idempotent: replaces the DocuFlow section if CLAUDE.md already exists, appends if file exists without DocuFlow section

**Staleness detection**
- `list_wiki` now returns `stale: boolean` per page (true if `updated_at` > 30 days ago) and `stale_pages: number` total
- `read_specs` now returns `stale: boolean` per spec (true if `written_at` > 30 days ago)

**Go language extraction** (`extractor.ts`)
- `type Foo struct` / `type Foo interface` → class detection
- `func FuncName(` and `func (recv) MethodName(` → function detection
- Go import blocks (`import "pkg"` inside blocks) → dependency detection
- `os.Getenv("KEY")` / `os.LookupEnv("KEY")` → config ref detection
- gorilla/mux, gin, chi, echo, stdlib HTTP routes → endpoint detection
- GORM `db.Table("name")` → DB table detection

**Ruby/Rails extraction** (`extractor.ts`)
- `class Foo` / `module Bar` → class detection
- `def method_name` / `def self.method_name` → function detection
- `require 'gem'` / `require_relative '../path'` → dependency detection
- `ENV['KEY']` / `ENV["KEY"]` → config ref detection
- Rails routes: `get '/path'`, `post '/path'`, `resources :users` → endpoint detection
- ActiveRecord: `has_many :table`, `belongs_to :table`, `self.table_name = 'name'` → DB table detection

**Enhanced `docuflow status`**
- Now shows: package version, CLAUDE.md presence, wiki page counts by category (entities/concepts/syntheses/timelines), source file count, last ingest date from log.md
- Smart hints: warns if CLAUDE.md missing, suggests `docuflow suggest` if wiki is empty

**Richer ingest_source page content**
- Entity and concept pages now extract surrounding paragraph context from the source document
- Before: `## Overview\nIntroduced in: sourceTitle` (empty stub)
- After: actual paragraph from the source that first mentions the entity, up to 400 chars

**Dynamic preview_generation**
- Previews now read actual wiki state before generating predictions
- `ingest_source` preview: reads real source file size, predicts page count range (low/high estimate)
- `query_wiki` preview: shows current page count and adjusts confidence hint
- `lint_wiki` preview: warns "wiki is empty" if no pages exist yet
- `save_answer_as_page` preview: shows `current + 1` page count

### Fixed

- **`list_wiki` category filter bug**: `input.category = "entity"` was building path `wiki/entitys/` (wrong). Now uses correct `SINGULAR_TO_PLURAL` map → `wiki/entities/`
- **`list_wiki` category label bug**: returned metadata had `category: "entitie"` for entities and `category: "ynthese"` for syntheses. Now uses `PLURAL_TO_SINGULAR` map correctly.
- **`wiki-search.ts` category name bug**: search results for entity and synthesis pages had wrong `category` field values. Fixed with `PLURAL_TO_SINGULAR` lookup.
- **`update-index.ts` category name bug**: same as above; index entries had wrong category labels.
- **`lint-wiki.ts` path bug**: all four check functions (`findOrphanPages`, `findStalePages`, `findMissingReferences`, `findMetadataGaps`) looked for pages at `wiki/pageId.md` (flat) when pages live at `wiki/entities/pageId.md` etc. Result: lint silently skipped every page, always reported 0 issues. Fixed: `lintWiki()` now builds a `Map<pageId, fullFilePath>` before passing to check functions.
- **`save-answer-as-page.ts` broken links**: Related Pages section linked to `../CATEGORY/pageId.md` (literal `"CATEGORY"` string). Fixed with `CATEGORY_DIR` lookup map.
- **`init-interactive.ts` misleading tip**: "Open `.claude/instructions.md` to understand how Claude uses Docuflow" — that file was never created. Tip now correctly references CLAUDE.md.

### Changed

- `docuflow init` output now lists CLAUDE.md as a generated file and points to it for Claude setup
- Tool count: 14 → 15 (added `generate_dependency_graph`)
- CLI commands: 2 → 3 (added `docuflow suggest`)
- `docuflow init --interactive` also generates CLAUDE.md



## [0.2.0] - 2026-04-16

### What was built

Complete Phase 6 implementation: User Experience & Onboarding enhancement. Addressed all 7 pre-LLM-wiki testing concerns through 4 sub-phases:
- **Phase 6A**: Copilot auto-discovery via `.claude/instructions.md`
- **Phase 6B**: Tool transparency (preview_generation, get_schema_guidance)
- **Phase 6C**: Enhanced documentation (troubleshooting, decision guides)
- **Phase 6D**: Interactive initialization with domain-specific setup

### Added

**Phase 6A: Copilot Integration**
- `.claude/instructions.md` (35 KB) — Comprehensive guide teaching Claude to auto-discover and use Docuflow
  - Explains what Docuflow does and why (LLM Wiki pattern)
  - Details all 14 MCP tools with examples
  - 3 main workflows (ingest, query, lint)
  - Automatic usage patterns (when Claude should use Docuflow without prompting)
  - Troubleshooting section for common issues
  - Example walkthrough showing end-to-end workflow
- `docs/COPILOT_INTEGRATION.md` (8 KB) — Reference guide for LLM agent integration

**Phase 6B: Tool Enhancement**
- `get_schema_guidance` tool — Analyzes wiki state and recommends what documents should exist
  - Auto-detects domain from schema.md content
  - Shows existing pages and missing pages
  - Provides domain-specific recommendations with reasons
  - Example: "❌ Performance Analysis (missing - would help track optimization work)"
- `preview_generation` tool — Shows what any tool will do BEFORE running
  - Displays predicted actions, outputs, impact level, files affected
  - Tool-specific behavior (ingest marks data_modified=true, query marks data_modified=false)
  - Example: "Impact Level: Low (read-only, no files modified)"

**Phase 6C: Enhanced Documentation**
- `docs/TROUBLESHOOTING.md` (8 KB) — Comprehensive problem-solving guide
  - Command not found / MCP initialization issues
  - Wiki pages not being created
  - Search and query problems
  - Wiki quality and maintenance
  - Performance issues
  - Understanding wiki structure
  - Data safety and backups
  - Includes FAQ and quick fixes table
- `docs/WHEN_TO_USE.md` (8.9 KB) — Decision framework
  - Quick decision matrix (all options at a glance)
  - Decision tree for when Docuflow is appropriate
  - Domain-specific guidance (code/research/business/personal)
  - Cost-benefit analysis with break-even calculation
  - Red flags and green lights
  - Real-world examples

**Phase 6D: Interactive Initialization**
- Interactive init command (`docuflow init --interactive`)
  - Domain selection (4 options: Code, Research, Business, Personal)
  - Project info prompts (name, description)
  - Domain-specific schema generation
  - Planning template creation
  - Next steps guidance for new users

### Changed

- Updated MCP server tool count from 12 to 14 (added guidance/transparency tools)
- Enhanced README.md with Phase 6 info, new tools, and getting started guide
- Updated monorepo structure documentation
- Updated package.json version to 0.2.0

### Fixed

- **Pre-LLM-wiki Issue #1**: Claude doesn't auto-discover Docuflow
  - **Solution**: `.claude/instructions.md` teaches Claude to auto-discover
  - **Result**: Claude now uses Docuflow without explicit instruction

- **Pre-LLM-wiki Issue #2**: Tool execution feels like a "black box"
  - **Solution**: `preview_generation` tool shows predictions before running
  - **Result**: Users understand what will happen before tools execute

- **Pre-LLM-wiki Issue #3**: No guidance on what documents to create
  - **Solution**: `get_schema_guidance` + decision frameworks
  - **Result**: Users know what pages should exist and why

- **Pre-LLM-wiki Issue #5**: Poor onboarding experience
  - **Solution**: Interactive init with domain-specific templates
  - **Result**: New users get domain-aware setup, not generic template

- **Pre-LLM-wiki Issue #6**: No troubleshooting guidance
  - **Solution**: `TROUBLESHOOTING.md` comprehensive guide
  - **Result**: Users can solve common problems independently

- **Pre-LLM-wiki Issue #7**: Unclear when to use Docuflow
  - **Solution**: `WHEN_TO_USE.md` decision matrix and examples
  - **Result**: Users make informed decisions about appropriateness

### Testing & Verification

- ✅ **Phase 6A**: 15/15 tests passing (3 features + 5 regression on Phase 1-5 tools)
- ✅ **Phase 6B**: 15/15 tests passing (5 features + 5 regression)
- ✅ **Phase 6C**: 15/15 tests passing (5 features + 5 regression)
- ✅ **Phase 6D**: 15/15 tests passing (3 features + 5 regression)
- ✅ **End-to-end**: 27/27 phase verification tests
- ✅ **Total**: 127+/127+ across all 6 phases (100% passing)
- ✅ **Build**: Clean (0 errors, 0 warnings)
- ✅ **Breaking changes**: Zero (100% backward compatible)

### Documentation Updates

- README.md: 4KB of new content (Phase 6, tools, getting started)
- COMPLETION_SUMMARY.md: Comprehensive project overview (16.3 KB)
- PHASE_6_COMPLETION.md: Phase 6 detailed summary (14.2 KB)
- Added 110+ KB total documentation

### Files Added

| File | Size | Purpose |
|------|------|---------|
| `.claude/instructions.md` | 35 KB | Copilot discovery guide |
| `docs/COPILOT_INTEGRATION.md` | 8 KB | LLM integration reference |
| `docs/TROUBLESHOOTING.md` | 8 KB | Problem-solving guide |
| `docs/WHEN_TO_USE.md` | 8.9 KB | Decision framework |
| `packages/server/src/tools/get-schema-guidance.ts` | 168 lines | Domain-aware recommendations |
| `packages/server/src/tools/preview-generation.ts` | 243 lines | Transparent tool predictions |
| `packages/cli/src/commands/init-interactive.ts` | 356 lines | Interactive initialization |
| `PHASE_6_COMPLETION.md` | 14.2 KB | Phase summary |
| `COMPLETION_SUMMARY.md` | 16.3 KB | Project overview |

### Status

**Production Ready**: All 6 phases (Phase 1-5 + Phase 6 with 4 sub-phases) complete and verified.
- 14 MCP tools working end-to-end
- 127+ tests passing (100%)
- 0 breaking changes
- 110+ KB comprehensive documentation
- All pre-LLM-wiki testing concerns resolved


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
