# DocuFlow + Waymark — Agent Integration Guide

How DocuFlow (codebase wiki) and Waymark (security policy enforcer) MCP tools
are registered and used across each supported coding agent.

---

## Claude Code

**MCP registration**: `.mcp.json` (auto-loaded by Claude Code)
**Instructions**: `CLAUDE.md`

| Server name | Prefix in Claude | Key tools |
|-------------|-----------------|-----------|
| `docuflow` | `mcp__docuflow__` | `read_module`, `list_modules`, `query_wiki`, `write_spec` |
| `waymark-docuflow-mcp` | `mcp__waymark-docuflow-mcp__` | `read_file`, `write_file`, `bash` |

Rules:
- Always use `mcp__waymark-docuflow-mcp__read_file` / `write_file` / `bash` instead of
  built-in file/shell tools — Waymark enforces the security policy defined in `waymark.config.json`
- Use `mcp__docuflow__query_wiki` before starting any coding task to load relevant context
- If Waymark blocks a path, do NOT retry with built-in tools; report the block to the user

---

## GitHub Copilot CLI

**MCP registration**: `.mcp.json` (loaded by Copilot CLI ≥ 1.x)
**Instructions**: `.github/copilot-instructions.md`

| Server name | Prefix in Copilot | Key tools |
|-------------|------------------|-----------|
| `docuflow` | `docuflow-read_module`, `docuflow-query_wiki`, etc. | Codebase scanning + wiki Q&A |
| `waymark-docuflow-mcp` | `waymark-docuflow-mcp-read_file`, etc. | File + shell operations under policy |

> **Note:** Copilot CLI uses dash-separated prefixes (e.g. `docuflow-read_module`); Claude Code uses double-underscore format (`mcp__docuflow__read_module`). Do not mix these formats.

Rules:
- Copilot reads `.mcp.json` for server config — both servers are now registered
- Use DocuFlow tools (`docuflow-list_modules`, `docuflow-query_wiki`) for codebase exploration
- Waymark tools gate file and shell access; consult `waymark.config.json` for allowed paths/commands

---

## OpenCode

**MCP registration**: `opencode.json` (auto-loaded by OpenCode from project root)
**Instructions**: `AGENTS.md` (this file)

| Server name | Key tools |
|-------------|-----------|
| `docuflow` | `read_module`, `list_modules`, `query_wiki`, `write_spec` |
| `waymark` | `read_file`, `write_file`, `bash` |

Setup:
1. Ensure `packages/server/dist/index.js` exists: `npm run build -w packages/server`
2. Ensure `.waymark/server.js` is present (committed in repo)
3. Make the shim executable: `chmod +x .waymark/server.js`

---

## Pi

**MCP registration**: Pi does not support project-level MCP config files.
**Instructions**: `AGENTS.md` (this file) + passed via `pi --context AGENTS.md "prompt"`

Pi can be invoked directly with relevant context injected into the prompt. DocuFlow wiki context
should be pre-fetched and included in the Pi prompt. Waymark policy must be enforced externally.

---

## Setup Checklist (all agents)

- [ ] `npm run build -w packages/server` — build DocuFlow server
- [ ] Verify `.mcp.json` has both `docuflow` and `waymark-docuflow-mcp` entries
- [ ] Verify `opencode.json` exists at project root
- [ ] Verify `waymark.config.json` lists all 4 platforms
- [ ] Run `chmod +x .waymark/server.js` on first clone (required for OpenCode)
