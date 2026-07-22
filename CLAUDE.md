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

