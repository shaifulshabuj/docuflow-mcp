# Docuflow MCP — Developer Guide

Private development repository for the Docuflow MCP server.
Public releases live at [github.com/doquflows/docuflow](https://github.com/doquflows/docuflow).

## What it does

Docuflow is an MCP server that lets AI agents read any codebase and write persistent
specs to `.docuflow/specs/`. Zero AI inside the server — the agent does all thinking.

```
AI Agent (Claude Code)
       │ calls MCP tools
Docuflow MCP Server           ← reads files, extracts, writes markdown
       │ filesystem only
Any project on disk           ← any language, any structure
```

## Monorepo structure

```
docuflow-mcp/
├── packages/
│   ├── server/          @doquflow/server  — MCP server (stdio)
│   └── cli/             @doquflow/cli     — docuflow init / status
├── .github/workflows/   CI + release automation
├── release/             Public-facing docs (synced to doquflows/docuflow)
├── scripts/             pre-release-check.sh
├── CHANGELOG.md         Private dev changelog
├── LICENSE
└── README.md            This file
```

## Packages

### `@doquflow/server` (`packages/server/`)

The MCP server. Exposes 4 tools over stdio.

| Source file | Purpose |
|-------------|---------|
| `src/index.ts` | MCP server bootstrap, stdio transport, tool registration |
| `src/types.ts` | Shared TypeScript interfaces (ModuleInfo, ListResult, etc.) |
| `src/extractor.ts` | Universal regex extraction engine |
| `src/filesystem.ts` | walk(), isBinary(), safeReadFile(), ensureDir() |
| `src/language-map.ts` | File extension → language name |
| `src/tools/read-module.ts` | `read_module` tool handler |
| `src/tools/list-modules.ts` | `list_modules` tool handler |
| `src/tools/write-spec.ts` | `write_spec` tool handler (with index write lock) |
| `src/tools/read-specs.ts` | `read_specs` tool handler |

### `@doquflow/cli` (`packages/cli/`)

Two commands:
- `docuflow init` — registers MCP server in Claude Desktop config, creates `.docuflow/specs/`
- `docuflow status` — shows spec count and MCP registration state

## MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `read_module` | `{ path: string }` | `ModuleInfo` with classes, functions, deps, tables, endpoints, config_refs, raw_content |
| `list_modules` | `{ path: string, extensions?: string[] }` | `ListResult` with all modules (no raw_content) |
| `write_spec` | `{ project_path, filename, content }` | `{ written_to, bytes_written, index_updated }` |
| `read_specs` | `{ project_path, module_name? }` | `{ specs_found, specs[] }` |

## Extraction engine

`packages/server/src/extractor.ts` applies universal regex patterns:

| Field | Patterns |
|-------|---------|
| `classes` | `class`, `interface`, `struct`, `enum`, `record` keywords |
| `functions` | Keyword-prefixed method declarations + arrow functions |
| `dependencies` | `using`, `import … from`, `require()`, decorators, `new ClassName()` |
| `db_tables` | `FROM/JOIN/INTO` SQL, `DbSet<T>`, `[Table("…")]`, EF `_db.TableName` property access |
| `endpoints` | .NET attributes, `app.MapGet()`, Express router, NestJS decorators, Angular `path:` |
| `config_refs` | `IConfiguration`, `appsettings`, `ConnectionStrings:*`, `process.env.*` |

## Development

```bash
npm install                     # install all workspace deps
npm run build --workspaces      # compile both packages

node packages/server/dist/index.js   # start server (waits on stdio)
node packages/cli/dist/index.js      # show CLI usage
node packages/cli/dist/index.js init # register in Claude Desktop config
```

## Release operations

> **CRITICAL: Always bump package versions BEFORE tagging.**
> The CI workflow publishes whatever version is in `package.json` at tag time.
> If you tag before bumping, npm publishes the old version and the release tag is out of sync.

### Release checklist

1. Edit `packages/server/package.json` → bump `version`
2. Edit `packages/cli/package.json` → bump `version` AND update `@doquflow/server` dep version
3. Update `CHANGELOG.md` (private) and `release/CHANGELOG.md` (public)
4. `npm install --package-lock-only` (regenerate lockfile with new versions)
5. `bash scripts/pre-release-check.sh` → must show **RESULT: PASSED**
6. `git add -A && git commit -m "chore: bump to vX.Y.Z"`
7. `git tag vX.Y.Z`
8. `git push origin main && git push origin vX.Y.Z`

CI handles: build verification → push to doquflows/docuflow → npm publish → GitHub Release.

## GitHub secrets

| Secret | Purpose |
|--------|---------|
| `NPM_TOKEN` | Publish access to `@doquflow` npm scope |
| `RELEASE_REPO_TOKEN` | PAT with repo write access to `doquflows/docuflow` |

## Requirements

- Node.js 18+ (Node 20 recommended)
- No API keys, no network calls, no AI dependencies
