# DocuFlow MCP

An MCP server that lets AI agents (Claude Code, Codex, Copilot) read any codebase and persist living specs to disk. Zero AI calls inside the server — it only reads files, applies universal regex extraction, and writes markdown. The agent does all analysis.

## Tools

| Tool | What it does |
|------|-------------|
| `read_module` | Read one source file → extract classes, functions, dependencies, DB tables, endpoints, config refs + raw content (truncated 8000 chars) |
| `list_modules` | Walk a project directory → bulk extraction for every non-binary file (skips node_modules, dist, .git, etc.) |
| `write_spec` | Write a markdown spec to `.docuflow/specs/<name>.md` and update the index |
| `read_specs` | Read back saved specs; optionally filter by module name |

Works with any language. Unknown file types return `language: "unknown"` with raw content — the server never crashes on unfamiliar files.

## Install

```bash
cd docuflow-mcp
npm install
npm run build
```

## Register with Claude Code

Add to your Claude Code MCP config (usually `~/.claude/mcp.json` or via **Settings → MCP Servers**):

```json
{
  "mcpServers": {
    "docuflow": {
      "command": "node",
      "args": ["/absolute/path/to/docuflow-mcp/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/docuflow-mcp` with the real path on your machine.

## Usage examples

**Scan one file:**
```
Call read_module with path: "./src/Orders/OrderService.cs"
→ returns extracted facts + raw content
→ agent writes a spec with write_spec
```

**Scan whole project:**
```
Call list_modules with path: "./"
→ returns all modules with extracted facts
→ agent identifies high-risk modules, DB hotspots, writes specs
```

**Answer "what breaks if I change X":**
```
Call read_specs with project_path: "./"
→ agent reads all saved specs, finds which ones list X in dependencies
→ answers without re-scanning
```

## Output location

Specs are saved to `.docuflow/specs/` inside your project directory. Add `.docuflow/` to `.gitignore` or commit it — your choice.

## Requirements

- Node.js 18+
- No API keys, no network calls, no AI dependencies
