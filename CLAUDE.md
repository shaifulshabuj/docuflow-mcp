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
- `devloop agent-sync`          — refresh provider docs cache + analyse with AI (24h TTL)
- `devloop hooks`               — install Claude pipeline hooks
- `devloop logs [TYPE]`         — show pipeline/notification/session logs
- `devloop doctor`              — validate dependencies and configuration
- `devloop ci`                  — generate GitHub Actions review workflow
- `devloop check`               — check for DevLoop updates
- `devloop update`              — self-upgrade devloop

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
