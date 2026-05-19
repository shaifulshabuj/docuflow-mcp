<!-- BEGIN DOCUFLOW -->
# DocuFlow — AI Documentation Assistant

DocuFlow preserves decision context for AI agents. Intent in, value out.

## MCP Registration

DocuFlow is registered in **two places**:
1. **`.mcp.json`** (project-level) — auto-loaded by Claude Code CLI; use tools as `mcp__docuflow__<tool>`
2. **Claude Desktop global config** — registered under the server name from `docuflow init`; use bare tool names

> **Note:** Within a Claude Code CLI session, the project-level `.mcp.json` takes precedence over the global Claude Desktop config when both register a server named `docuflow`. Always use the `mcp__docuflow__` prefix in Claude Code CLI to ensure the project-local instance is invoked.

In Claude Code CLI sessions, always call DocuFlow tools with the `mcp__docuflow__` prefix:
- `mcp__docuflow__query_wiki` — Q&A against the wiki
- `mcp__docuflow__ingest_source` — fold a source into the wiki
- `mcp__docuflow__wiki_search` — BM25 search across pages
- `mcp__docuflow__read_module` — analyse a source file

Waymark is registered as `waymark-docuflow-mcp` in `.mcp.json`. Use:
- `mcp__waymark-docuflow-mcp__read_file` — read any file (policy-enforced)
- `mcp__waymark-docuflow-mcp__write_file` — write/edit any file (policy-enforced)
- `mcp__waymark-docuflow-mcp__bash` — run shell commands (policy-enforced)

## Core tools (use these first)

- **query_wiki({ project_path, question })** — Ask the wiki. Returns an answer with citations.
- **ingest_source({ project_path, source_filename })** — Fold a markdown source into the wiki.
- **wiki_search({ project_path, query })** — BM25 search across all pages.
- **read_module({ path })** — Read and extract facts from a single source file.

## CLI — Core Commands

```
docuflow query "<question>"         # ask the wiki from the shell
docuflow ingest <source.md>         # add a source doc to the wiki
docuflow status                     # wiki health and counts
docuflow rewiki                     # re-ingest with current rules
docuflow init                       # initialise .docuflow/ in this project
```

## Workflows

### Answer a question
```
mcp__docuflow__query_wiki({ project_path: ".", question: "How does authentication work?" })
```

### Add new context
```
# drop a markdown file in .docuflow/sources/
mcp__docuflow__ingest_source({ project_path: ".", source_filename: "auth-design.md" })
```

## Advanced tools

Use when the core tools don't cover the workflow. Each has more parameters and side effects.

- **list_modules** — Walk a directory tree and extract facts in bulk
- **list_wiki** — Inventory pages by category, with staleness flags
- **write_spec / read_specs** — Persistent agent-written specs
- **save_answer_as_page** — Promote a synthesised answer into the wiki
- **synthesize_answer** — Combine multiple pages into a markdown synthesis
- **update_index** — Rebuild `.docuflow/index.md`
- **lint_wiki** — Health checks: orphans, broken refs, stale content
- **get_schema_guidance** — Recommend what pages should exist
- **preview_generation** — Show what a tool will do before running
- **generate_dependency_graph** — Build the import/shared-table graph

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
<!-- END DOCUFLOW -->

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

