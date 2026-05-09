# Claude Code — DevLoop Project

## System
This project uses the DevLoop multi-agent pipeline:
- `devloop-orchestrator` — main thread, receives remote instructions
- `devloop-architect`    — subagent, designs implementation specs
- `devloop-reviewer`     — subagent, reviews the worker's implementation
- Worker — implements specs (CLI or cloud Copilot coding agent)
- Provider routing and worker mode are controlled in `devloop.config.sh`

## Start the system
```bash
devloop start
```
Then connect from claude.ai/code or the Claude mobile app.

## DevLoop commands
- `devloop architect "feature"` — design a spec
- `devloop work [TASK-ID]`      — launch worker to implement
- `devloop review [TASK-ID]`    — review implementation
- `devloop fix [TASK-ID]`       — launch worker with fix instructions
- `devloop tasks`               — list all specs
- `devloop status [TASK-ID]`    — show spec + review
- `devloop open [TASK-ID]`      — open spec in $EDITOR
- `devloop block [TASK-ID]`     — print Copilot Instructions Block
- `devloop clean [--days N]`    — remove old specs
- `devloop learn [TASK-ID]`     — extract lessons from review and save to CLAUDE.md
- `devloop hooks`               — install Claude pipeline hooks
- `devloop logs [TYPE]`         — show pipeline/notification/session logs
- `devloop doctor`              — validate dependencies and configuration
- `devloop ci`                  — generate GitHub Actions review workflow
- `devloop check`               — check for DevLoop updates
- `devloop update`              — self-upgrade devloop

## Stack
See devloop.config.sh for project-specific stack details.

## Learned Patterns
<!-- devloop learn appends dated lessons here -->

---

# DocuFlow — AI Documentation Assistant

DocuFlow is an MCP server that gives you structured access to this codebase and maintains a living wiki.
It is registered in your Claude Desktop config and available as MCP tools in every session.

## MCP Registration

DocuFlow is registered in **two places**:
1. **`.mcp.json`** (project-level) — auto-loaded by Claude Code CLI; use tools as `mcp__docuflow__<tool>`
2. **Claude Desktop global config** — registered under the server name from `docuflow init`; use bare tool names

> **Note:** Within a Claude Code CLI session, the project-level `.mcp.json` takes precedence over the global Claude Desktop config when both register a server named `docuflow`. Always use the `mcp__docuflow__` prefix in Claude Code CLI to ensure the project-local instance is invoked.

In Claude Code CLI sessions, always call DocuFlow tools with the `mcp__docuflow__` prefix:
- `mcp__docuflow__read_module` — analyse a source file
- `mcp__docuflow__list_modules` — scan all files in a directory
- `mcp__docuflow__query_wiki` — Q&A against the wiki
- `mcp__docuflow__write_spec` — persist a spec

Waymark is registered as `waymark-docuflow-mcp` in `.mcp.json`. Use:
- `mcp__waymark-docuflow-mcp__read_file` — read any file (policy-enforced)
- `mcp__waymark-docuflow-mcp__write_file` — write/edit any file (policy-enforced)
- `mcp__waymark-docuflow-mcp__bash` — run shell commands (policy-enforced)

## Codebase Scanner Tools

- **read_module** — Analyse a single source file. Returns language, classes, functions, dependencies, DB tables, endpoints, config refs, and raw content (first 8 KB).
  - Example: `read_module({ path: "src/UserService.cs" })`
- **list_modules** — Walk a directory and extract facts for every non-binary file. Use this to understand the full project in one call.
  - Example: `list_modules({ path: "/Volumes/SATECHI_WD_BLACK_2/dev/20260409_building_documentation_maintainer_to_forget_boringness_of_manual_writting/docuflow-mcp" })`
- **write_spec** — Persist a markdown spec to `.docuflow/specs/<filename>.md` and update the index.
  - Example: `write_spec({ project_path: "...", filename: "UserService", content: "# UserService\n..." })`
- **read_specs** — Read previously written specs, optionally filtered by name.
  - Example: `read_specs({ project_path: "..." })`

## Wiki Pipeline Tools

- **ingest_source** — Ingest a markdown file from `.docuflow/sources/` and generate wiki pages (entities, concepts).
- **update_index** — Rebuild `.docuflow/index.md` from all wiki pages.
- **list_wiki** — List all wiki pages, optionally filtered by category (entity/concept/timeline/synthesis).
- **wiki_search** — BM25 search across all wiki pages. Returns ranked results with previews.
- **query_wiki** — One-stop Q&A: searches wiki, synthesises an answer, returns source citations.
- **synthesize_answer** — Generate a markdown synthesis from a list of specific wiki page IDs.
- **save_answer_as_page** — Persist a synthesised answer back into the wiki (knowledge compounding).

## Health & Guidance Tools

- **lint_wiki** — Health check: orphan pages, broken refs, stale content, metadata gaps. Returns a 0–100 health score.
- **get_schema_guidance** — Analyse what wiki pages should exist based on the schema and current state.
- **preview_generation** — Preview what a tool will do before running it.

## Common Workflows

### First time — understand the codebase
```
list_modules({ path: "..." })
→ read the language breakdown and dependency map
→ write_spec each important module
```

### Ongoing — answer a question
```
query_wiki({ project_path: "...", question: "How does authentication work?" })
→ save_answer_as_page if the answer is worth keeping
```

### Maintenance — check wiki health
```
lint_wiki({ project_path: "..." })
→ fix orphans and broken refs
```

## Storage Layout

```
.docuflow/
├── specs/           Spec files written by write_spec
├── wiki/            LLM-generated wiki pages
│   ├── entities/    Named things (services, APIs, databases)
│   ├── concepts/    Design patterns, principles, integrations
│   ├── timelines/   Chronological pages
│   └── syntheses/   Cross-cutting synthesis pages
├── sources/         Raw input files for ingest_source
├── schema.md        Wiki configuration (edit to customise)
├── index.md         Auto-maintained catalog
└── log.md           Operation log
```

---

# 🔐 WAYMARK — Secure AI Development

## What is Waymark?

Waymark is a security policy enforcement system that allows Claude/Copilot to safely work on this project. It provides controlled access to files and shell commands while blocking dangerous operations.

## Why Waymark?

- **Safe AI Access**: AI can read, write, and run commands only within defined safe boundaries
- **Sensitive Data Protection**: Blocks access to .env files, secrets, keys, and other sensitive data
- **Dangerous Operation Prevention**: Blocks destructive commands (rm -rf, DROP TABLE, sudo, etc.)
- **Audit Trail**: All operations are logged and visible in the Waymark dashboard
- **Human Control**: Sensitive operations require manual approval

## How to Use Waymark

### For Claude/Copilot (Automatic)
All file and shell operations automatically go through Waymark. You don't need to do anything special — Claude will use Waymark MCP tools transparently.

### For Developers (Checking Status)

**View pending approvals:**
```bash
npx @way_marks/cli status
```

**Approve operations:**
Open the dashboard URL from the status command and approve/reject pending actions.

**View operation log:**
```bash
npx @way_marks/cli log
```

## Waymark Configuration

The project is configured with `waymark.config.json`:

**✅ Allowed Paths:**
- `src/**` — Source code
- `lib/**` — Library code
- `*.json` — JSON files (except sensitive ones)
- `*.md` — Markdown documentation
- `*.ts`, `*.js` — TypeScript and JavaScript
- `tests/**` — Test files
- `.docuflow/**` — Documentation

**❌ Blocked Paths:**
- `.env`, `.env.*` — Environment variables
- `./**/*.key`, `./**/*.pem` — Private keys
- `node_modules/**` — Dependencies
- `secrets/**` — Secret files
- `/etc/**`, `/usr/**` — System paths

**✅ Allowed Commands:**
- `npm` — Package management
- `node` — Node.js runtime
- `git` — Version control
- `tsc` — TypeScript compiler
- `eslint` — Linting

**❌ Blocked Commands:**
- `rm -rf` — Mass deletion
- `DROP TABLE`, `DROP DATABASE` — Database destruction
- `chmod 777` — Permission changes
- `sudo` — Privilege escalation
- `passwd` — Password changes
- Pipe commands to `bash`/`sh`
- `curl`/`wget` commands

**🔔 Requires Approval:**
- `waymark.config.json` — Configuration changes (must be approved)

## Common Tasks with Waymark

### Reading Files
```javascript
// Claude uses:
mcp__waymark-docuflow-mcp__read_file({ path: "src/index.ts" })
```

### Writing/Editing Files
```javascript
// Claude uses:
mcp__waymark-docuflow-mcp__write_file({ 
  path: "src/newFeature.ts", 
  content: "..." 
})
```

### Running Commands
```javascript
// Claude uses:
mcp__waymark-docuflow-mcp__bash({ command: "npm test" })
```

## Troubleshooting

### "Path not in allowedPaths"
The file/directory is blocked by policy. Check `waymark.config.json` to see if it should be allowed, then update it if needed.

### "Command blocked"
The command matches a blocked pattern (e.g., pipe to bash, rm -rf). Use an equivalent safe command instead.

### "Requires Approval"
Sensitive operations (like editing waymark.config.json) require manual approval via the Waymark dashboard.

### Waymark Server Not Running
```bash
npx @way_marks/cli start
# Then restart Claude Code
```

## Updating Waymark Policy

To modify allowed paths or commands:

1. Edit `waymark.config.json`
2. Changes require approval in the Waymark dashboard
3. Once approved, new policy takes effect immediately
4. All future operations follow the new policy

---

# ⚠️ WAYMARK ACTIVE — MANDATORY INSTRUCTIONS

## You are operating under Waymark agent control

Waymark is active in this project (docuflow-mcp).
All file and shell operations MUST go through
Waymark MCP tools. No exceptions.

## MANDATORY tool usage

You MUST replace ALL built-in file and shell
operations with Waymark MCP equivalents:

| Operation              | Built-in (DO NOT USE) | Waymark (ALWAYS USE) |
|------------------------|-----------------------|----------------------|
| Write or edit a file   | write_file            | mcp__waymark-docuflow-mcp__write_file |
| Read a file            | read_file             | mcp__waymark-docuflow-mcp__read_file  |
| Run shell commands     | bash / run_command    | mcp__waymark-docuflow-mcp__bash       |
| Scan codebase / wiki   | (none — use directly) | mcp__docuflow__list_modules / mcp__docuflow__query_wiki |

This applies to ALL tasks in this project —
refactoring, creating files, running tests,
installing packages, git operations, everything.

## What Waymark does with each action

- Allowed paths → executes normally, logged
- Blocked paths → stopped, you will see why
- Sensitive paths → held for human approval,
  do not retry, tell the user to check dashboard

## If a Waymark tool returns a block decision

Accept the block. Do not attempt to work around it
using built-in tools. Tell the user what was blocked
and why. Suggest they update waymark.config.json
if the block was unintended.

## If Waymark MCP tools are unavailable

Do NOT fall back to built-in file tools.
Stop and tell the user:

"Waymark MCP server is not running for this project.
Please run in your terminal:
  npx @way_marks/cli start

Then restart Claude Code and try again."

## Dashboard

Pending and recent actions are visible in the
Waymark dashboard. Run `npx @way_marks/cli status`
to see the current dashboard URL for this project.
Approve pending actions there. Roll back any write there.

<!-- DEVLOOP:CLAUDE:START -->
# Claude Code — DevLoop Project

## System
This project uses the DevLoop multi-agent pipeline:
- `devloop-orchestrator` — main thread, receives remote instructions
- `devloop-architect`    — subagent, designs implementation specs
- `devloop-reviewer`     — subagent, reviews the worker's implementation
- Worker — implements specs (CLI or cloud Copilot coding agent)
- Provider routing and worker mode are controlled in `devloop.config.sh`

## Start the system
```bash
devloop start
```
Then connect from claude.ai/code or the Claude mobile app (when main provider is claude).
If main provider is copilot, the session runs locally in the terminal.

## DevLoop commands — Quick (full pipeline in one shot)
- `devloop run "feature"`       — **full pipeline**: architect → work → review → fix loop → learn
- `devloop go  "feature"`       — alias for run
- `devloop queue add "task"`    — add to batch queue
- `devloop queue run`           — process all queued tasks sequentially

## DevLoop commands — Step-by-step
- `devloop architect "feature"` — design a spec
- `devloop work [TASK-ID]`      — launch worker to implement
- `devloop review [TASK-ID]`    — review implementation
- `devloop fix [TASK-ID]`       — launch worker with fix instructions

## DevLoop commands — Management
- `devloop tasks`               — list all specs
- `devloop status [TASK-ID]`    — show spec + review
- `devloop open [TASK-ID]`      — open spec in $EDITOR
- `devloop block [TASK-ID]`     — print Copilot Instructions Block
- `devloop clean [--days N]`    — remove old specs
- `devloop learn [TASK-ID]`     — extract lessons from review and save to CLAUDE.md
- `devloop agent-sync`          — refresh provider docs cache + analyse with AI (24h TTL)
- `devloop hooks`               — install Claude pipeline hooks
- `devloop logs [TYPE]`         — show pipeline/notification/session logs
- `devloop doctor`              — validate dependencies and configuration
- `devloop ci`                  — generate GitHub Actions review workflow
- `devloop check`               — check for DevLoop updates (works out-of-the-box)
- `devloop update`              — self-upgrade devloop (pulls from GitHub, refreshes project configs)

## Agent Provider Context
_See `.devloop/agent-docs/provider-context.md` for the full provider reference._
_Run `devloop agent-sync` to refresh docs and check for provider updates._

## Stack
See devloop.config.sh for project-specific stack details.

## Learned Patterns
<!-- devloop learn appends dated lessons here -->
<!-- DEVLOOP:CLAUDE:END -->

### Agent Sync — 2026-05-09 (providers: claude copilot)
### DevLoop CLI Doc Delta (Claude + Copilot)

**Bottom line:** no clear new flag-level changes are visible in the extracted snippets; the only explicit breaking shift is on the Copilot side.

1. **New CLI features/flags for non-interactive or piped usage**
- **Copilot CLI docs now emphasize agentic automation surfaces**: *Autonomous task completion*, *Parallel task execution*, *Run the CLI programmatically*, and *Automate with Actions* (from the navigation structure).
- **No concrete new flags/options** are shown in the extracted content (only page/index metadata and nav trees).
- **Claude extract** is mostly site shell/JS and does not expose CLI flags or non-interactive options.

2. **Breaking changes in invocation syntax**
- **Breaking change confirmed:** the **GitHub CLI Copilot extension is retired** and replaced by the **new GitHub Copilot CLI**.
- Practical impact: workflows using `gh` extension-style Copilot commands should be migrated to standalone Copilot CLI commands.

3. **Best practices for large prompts/spec files**
- Prefer **file-based/programmatic invocation** over giant inline arguments (more stable quoting/escaping).
- Use **stdin/heredoc or checked-in spec files** and pass paths/streams, not long shell-escaped strings.
- Keep reusable guidance in **custom instructions / skills**; keep per-run payloads in versioned task/spec files.

4. **Recommended DevLoop improvements**
- Add a **provider migration check** that fails fast if legacy `gh` Copilot extension commands are still used.
- Standardize a **“spec-from-file” execution path** for both providers to avoid prompt truncation/escaping issues.
- Add a **docs-delta CI job** that watches key provider pages and alerts only on actionable changes (flags, command syntax, deprecations).


Changes   +0 -0
Requests  1 Premium (19s)
Tokens    ↑ 54.0k • ↓ 698 • 1.5k (cached) • 311 (reasoning)

### From TASK-20260509-153232 (2026-05-09)
- When promoting `[Unreleased]` to a versioned block in CHANGELOG.md, the bare `## [Unreleased]` header must be removed entirely — never leave it as an empty header above the new version block.
- All stale partial `[Unreleased]` sections (e.g. `## [Unreleased] — v0.6.0`) must be deleted at release time, not left as dead entries in the changelog.
- Both `CHANGELOG.md` and `release/CHANGELOG.md` must receive identical changelog edits simultaneously; they are treated as a mirrored pair by pre-release checks.
- Fix commits should touch only the files listed in the spec — no collateral edits; the reviewer explicitly validates staged file scope.
- Commit messages for reviewer-driven fixes must use the `fix(TASK-ID):` prefix (not `feat()`), include the Co-authored-by trailer, and reference the original task ID.


Changes   +0 -0
Requests  1 Premium (19s)
Tokens    ↑ 84.8k • ↓ 582 • 64.1k (cached)

### From TASK-20260509-154241 (2026-05-09)
- Always run `bash scripts/pre-release-check.sh` and confirm `RESULT: PASSED` before every commit, even when only non-source files (changelogs, docs, gitignored artifacts) are changed — the spec treats it as a mandatory gate, not optional.
- When editing `CHANGELOG.md`, apply identical edits to `release/CHANGELOG.md` in the same commit; the pre-release suite enforces that both files mirror each other exactly.
- Scope commit diffs strictly to files listed in the spec — a clean 2-file diff is a positive signal; any extra file in the diff is a red flag for contamination.
- Deletion tasks are scoped exactly by the spec's enumerated list — do not delete files the spec doesn't mention (e.g., residual `.pre-commit` files not in the list), and do not leave files the spec does mention.
- Use the `chore:` commit prefix (not `feat:` or `fix:`) for housekeeping tasks like changelog updates, spec cleanup, and artifact deletion; always include the `Co-authored-by` trailer verbatim.


Changes   +0 -0
Requests  1 Premium (19s)
Tokens    ↑ 87.0k • ↓ 534 • 65.3k (cached)

### From TASK-20260509-230924 (2026-05-09)
- When parsing YAML frontmatter without a library, support all three list forms (inline JSON-flow, block-style with indented dashes, scalar) and use `indexOf(":")` to split keys/values so embedded colons in timestamps and URLs survive intact.
- Compute graph metrics like `in_degree`/`out_degree`/`degree` from the **resolved** edge list (post-dedup, post-collapse), never from raw frontmatter counts — the resolved edges are the authoritative source.
- For deterministic D3 force-layout positioning, seed initial coordinates via a stable hash (e.g. FNV-1a of sorted node IDs) plus a low-discrepancy sequence (Halton); never rely on `Math.random()` for "same data → same layout" guarantees.
- Keep React effect dependency arrays minimal and semantic: bind `d3.drag` on `[visibleNodes.length, visibleEdges.length]`, not on per-tick state like `tickVersion`, to avoid rebinding 60×/s during simulation settle.
- Make schema/type extensions additive-only (e.g. add `outbound_links`, `inbound_links`, `degree` to `WikiPageMetadata` without removing or renaming existing fields) so existing clients keep working without coordinated changes.
- Register new Express routes (e.g. `/api/graph`) **before** `express.static` and SPA fallback, and load the backing tool via the existing `loadTool(file, exportName)` closure pattern for consistency.


Changes   +0 -0
Requests  15 Premium (17s)
Tokens    ↑ 59.9k • ↓ 504 • 29.7k (cached)
