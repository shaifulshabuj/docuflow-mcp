# Copilot Instructions for Docuflow MCP

## Build, Test & Lint

**Monorepo build (both packages):**
```bash
npm run build --workspaces
```

**Build individual package:**
```bash
npm run build -w packages/server
npm run build -w packages/cli
```

**Run pre-release checks** (before any release):
```bash
bash scripts/pre-release-check.sh
```

The project uses **TypeScript** with no test suite — validation happens via:
- TypeScript compiler (`tsc`)
- Pre-release checks in `scripts/pre-release-check.sh` (builds, secrets scan, file integrity)
- GitHub Actions CI on every push/PR

## High-Level Architecture

**Docuflow** is an MCP (Model Context Protocol) server that extracts structural information from codebases and persists living specs.

```
User/Agent (e.g., Claude Code)
        ↓ (MCP protocol / stdio)
Docuflow MCP Server
        ↓ (filesystem operations only)
Project directory (read files) + .docuflow/specs/ (write specs)
```

### Core Design Principles

- **Stateless extraction**: The server does not persist state; agents make all decisions
- **Universal language support**: Single regex-based extractor (`packages/server/src/extractor.ts`) handles TypeScript, Python, C#, Java, SQL, and more
- **Zero external dependencies**: No API calls, no AI services, no vendor lock-in — only Node.js stdlib and MCP SDK
- **Stdio transport**: Runs as a subprocess with stdio-based request/response

### Monorepo Layout

```
packages/
├── server/          @doquflow/server — MCP server (main logic)
│   ├── src/
│   │   ├── index.ts           MCP server bootstrap + tool registration
│   │   ├── types.ts           Shared interfaces (ModuleInfo, ListResult, etc.)
│   │   ├── extractor.ts       Universal regex-based extraction engine
│   │   ├── filesystem.ts      File utilities (walk, isBinary, safeReadFile)
│   │   ├── language-map.ts    Filetype → language name mapping
│   │   └── tools/             MCP tool handlers
│   │       ├── read-module.ts    Single file analysis
│   │       ├── list-modules.ts   Bulk directory scan
│   │       ├── write-spec.ts     Persist specs with index write lock
│   │       └── read-specs.ts     Query existing specs
│   └── package.json
│
├── cli/             @doquflow/cli — Setup + diagnostics
│   ├── src/
│   │   ├── index.ts
│   │   └── commands/
│   │       ├── init.ts            Register MCP server in Claude Desktop config
│   │       └── status.ts          Show spec count + registration state
│   └── package.json
│
release/            Public-facing docs (synced to doquflows/docuflow repo)
scripts/            Pre-release validation
.github/workflows/  CI + automated release
```

### The Four MCP Tools

1. **read_module** — Extract structured info from a single file
   - Input: `path` (file path)
   - Output: `ModuleInfo` with classes, functions, dependencies, tables, endpoints, config refs, raw content (truncated at 8000 chars)

2. **list_modules** — Bulk directory scan (no raw content)
   - Input: `path` (root dir), `extensions?` (filter, e.g., `[".ts", ".js"]`)
   - Output: `ListResult` with all modules found
   - Auto-skips: `node_modules`, `dist`, `build`, `.git`, `vendor`, `obj`, `bin`, `.docuflow`, `*.min.js`, `*.map`, `*.lock`, files >300KB

3. **write_spec** — Persist a markdown spec to `.docuflow/specs/`
   - Input: `project_path`, `filename`, `content`
   - Output: Write path, bytes written, index update confirmation
   - Lock: Index file protected by atomic write to prevent conflicts

4. **read_specs** — Query existing specs
   - Input: `project_path`, `module_name?` (filter by module)
   - Output: Array of specs with filename and content

### Extraction Engine

`packages/server/src/extractor.ts` is the universal text processor. It recognizes:

| Field | Examples |
|-------|----------|
| **classes** | `class Foo`, `interface Bar`, `struct Baz`, `enum Color`, `record Point` |
| **functions** | Method declarations, arrow functions, labeled by keyword (async, static, public, etc.) |
| **dependencies** | `using X`, `import Y from Z`, `require()`, decorators, `new ClassName()` |
| **db_tables** | `FROM table_name`, `DbSet<T>`, `[Table("name")]`, EF property access (`_db.Users`) |
| **endpoints** | .NET attributes, `app.MapGet()`, Express/NestJS routers, Angular route metadata |
| **config_refs** | `IConfiguration`, `appsettings.json`, `ConnectionStrings:*`, `process.env.*` |

The extractor is **language-agnostic** — it uses line-matching regex patterns, so each language contributes its own patterns naturally.

## Key Conventions

### Version Management & Release

**Critical rule: Always bump versions in package.json BEFORE creating a git tag.**

The CI publishes whatever version is in `package.json` at tag time. If you tag before bumping, npm publishes the old version and release tags get out of sync.

**Release checklist:**
1. Update `packages/server/package.json` → `version`
2. Update `packages/cli/package.json` → `version` AND `@doquflow/server` dependency version
3. Update `CHANGELOG.md` (private) and `release/CHANGELOG.md` (public)
4. Run `npm install --package-lock-only` to regenerate lockfile
5. Run `bash scripts/pre-release-check.sh` → must show `RESULT: PASSED`
6. Commit: `git add -A && git commit -m "chore: bump to vX.Y.Z"`
7. Tag: `git tag vX.Y.Z`
8. Push: `git push origin main && git push origin vX.Y.Z`

GitHub Actions handles the rest: build → sync to `doquflows/docuflow` → npm publish → GitHub Release.

### Workspace Structure & Package Names

- Server package: **@doquflow/server** (not `docuflow-mcp`)
- CLI package: **@doquflow/cli** (not `docuflow-mcp`)
- No stale references to `docuflow-mcp` allowed in source code (checked in pre-release)

### Secrets & Security

The pre-release check prevents:
- `.env` files from being tracked
- Database files (`.db`) in git
- Secrets (API keys, tokens) in history

CI also scans for patterns like `sk-ant`, `ANTHROPIC_API_KEY`, `npm_*` in source files.

### Source File Structure

Each package follows:
```
src/
├── index.ts           Entry point
├── types.ts or ...ts  Type definitions / core logic
├── {feature}.ts       Named modules
└── {subfolder}/       Feature subfolders (e.g., tools/)
```

TypeScript compiles to `dist/` (gitignored).

### Dependencies

- Server: Only `@modelcontextprotocol/sdk` (required)
- CLI: Only `@doquflow/server` (required)
- Dev: `typescript`, `@types/node`

Minimal dependencies by design — the server should be lightweight and portable.

### Published Artifacts

- **npm**: `@doquflow/server` and `@doquflow/cli` (CI auto-publishes on tag)
- **Public GitHub**: `doquflows/docuflow` (synced from `release/` on tag)
- **Private dev repo**: This repo (`docuflow-mcp`)

The `release/` folder contains public-facing docs/binaries that are synced to the public repo during CI.

## Recommended MCP Servers

For Copilot sessions in this repository, configure these MCP servers in `~/.copilot/mcp.json`:

**GitHub MCP** — Access repository data, issues, workflows, and commits
- Useful for: understanding release workflows, checking CI status, querying GitHub Actions, reviewing issues
- Enable if: you need to cross-reference the public `doquflows/docuflow` repo or check release automation

**Filesystem MCP** — Enhanced file browsing and search
- Useful for: navigating the large `packages/*/src/` directory, searching across multiple files
