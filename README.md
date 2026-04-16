# Docuflow MCP — Developer Guide

Private development repository for the Docuflow MCP server.
Public releases live at [github.com/doquflows/docuflow](https://github.com/doquflows/docuflow).

## What it does

Docuflow is an MCP server that lets AI agents read any codebase and build persistent, incrementally-maintained knowledge bases using the **LLM Wiki pattern**. The server provides 10 tools across 4 phases: legacy code extraction, source ingestion, wiki querying, and maintenance.

```
AI Agent (Claude, Copilot, Cursor)
       │ calls MCP tools
Docuflow MCP Server
       │ 10 MCP tools: read, ingest, query, lint
.docuflow/
  ├─ sources/        (immutable raw documents)
  ├─ wiki/           (LLM-generated markdown)
  ├─ index.md        (searchable catalog)
  ├─ log.md          (operation audit trail)
  └─ schema.md       (configuration)
```

## The LLM Wiki Pattern

Instead of re-extracting knowledge from scratch on every query, Docuflow implements the LLM Wiki pattern — a three-layer architecture for accumulating knowledge over time:

### Three Layers

1. **Raw Sources** (immutable)
   - Curated collection of code, articles, documents
   - Located in `.docuflow/sources/`
   - LLM reads but never modifies
   - Audit trail: every source is kept

2. **Wiki Layer** (LLM-maintained)
   - Structured markdown pages organized by category
   - Located in `.docuflow/wiki/`
   - Entities, concepts, timelines, syntheses
   - Cross-referenced and indexed
   - Grows incrementally with each source and query

3. **Schema & Metadata** (configuration)
   - `.docuflow/schema.md` — domain-specific structure and workflows
   - `.docuflow/index.md` — auto-maintained catalog
   - `.docuflow/log.md` — append-only operation history

### Key Insight

The LLM does the bookkeeping (updating cross-references, maintaining consistency, tracking contradictions) once, then that work compounds. You ask the same question weeks later and the answer is better because the wiki is richer. This is fundamentally different from RAG systems that re-discover knowledge on every query.

---

## Monorepo structure

```
docuflow-mcp/
├── packages/
│   ├── server/          @doquflow/server  — MCP server (stdio)
│   └── cli/             @doquflow/cli     — docuflow init / status
├── .docuflow/           LLM Wiki for Docuflow itself
│   ├── sources/         Design docs, architecture, patterns
│   ├── wiki/            185 auto-generated pages
│   ├── index.md         Searchable catalog
│   ├── log.md           Operation history
│   └── schema.md        Configuration template
├── .github/workflows/   CI + release automation
├── release/             Public-facing docs (synced to doquflows/docuflow)
├── scripts/             pre-release-check.sh, release.js
├── CHANGELOG.md         Private dev changelog
├── PHASE_1_COMPLETION.md, PHASE_2_COMPLETION.md, PHASE_3_COMPLETION.md, PHASE_4_COMPLETION.md
└── README.md            This file
```

## MCP Tools (10 total)

### Phase 0: Legacy Code Extraction (4 tools)

Read and catalog source code.

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `read_module` | Read single file + extract facts | `{ path }` | Classes, functions, dependencies, DB tables, endpoints, config refs |
| `list_modules` | Scan directory recursively | `{ path, extensions? }` | All modules (bulk) |
| `write_spec` | Write markdown spec to `.docuflow/specs/` | `{ project_path, filename, content }` | Filepath, bytes written, index updated |
| `read_specs` | Query written specs | `{ project_path, module_name? }` | All specs found |

### Phase 2: Ingest & Index (3 tools)

Process sources and maintain wiki structure.

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `ingest_source` | Parse source → extract entities/concepts → create wiki pages | `{ project_path, source_filename }` | Source ID, summary, pages created/updated, entities discovered |
| `update_index` | Scan wiki → regenerate index.md → append to log.md | `{ project_path }` | Entries indexed, log appended |
| `list_wiki` | Query wiki structure by category | `{ project_path, category? }` | Total pages, breakdown by category |

### Phase 3: Query & Synthesis (3 tools)

Search and synthesize from wiki; save answers back.

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `wiki_search` | BM25-inspired search with relevance scoring | `{ project_path, query, limit?, category? }` | Ranked results with scores and snippets |
| `query_wiki` | Main interface: search → synthesize | `{ project_path, question, max_sources? }` | Question, answer (markdown), source pages |
| `synthesize_answer` | (Internal) Build markdown answer from selected pages | `{ pages, question }` | Answer markdown with citations |
| `save_answer_as_page` | Save answer as new wiki page | `{ project_path, title, content, source_page_ids? }` | Page ID, filepath, saved_at timestamp |

### Phase 4: Maintenance (1 tool)

Health checks and recommendations.

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `lint_wiki` | Find quality issues: orphans, stale, broken refs, metadata gaps, contradictions | `{ project_path, check_type? }` | Issues array, metrics, health score (0-100), recommendations |

---

## Packages

### `@doquflow/server` (`packages/server/`)

The MCP server. Exposes 10 tools over stdio transport.

| File | Purpose |
|------|---------|
| `src/index.ts` | MCP server bootstrap, tool registration, schema definitions |
| `src/types.ts` | TypeScript interfaces (ModuleInfo, WikiPage, IngestResult, LintResult, etc.) |
| `src/extractor.ts` | Universal regex extraction engine for code |
| `src/filesystem.ts` | walk(), isBinary(), safeReadFile(), ensureDir() helpers |
| `src/language-map.ts` | File extension → language name mapping |
| `src/tools/read-module.ts` | read_module tool handler |
| `src/tools/list-modules.ts` | list_modules tool handler |
| `src/tools/write-spec.ts` | write_spec tool handler |
| `src/tools/read-specs.ts` | read_specs tool handler |
| `src/tools/ingest-source.ts` | ingest_source tool handler |
| `src/tools/update-index.ts` | update_index tool handler |
| `src/tools/list-wiki.ts` | list_wiki tool handler |
| `src/tools/wiki-search.ts` | wiki_search tool handler (BM25 scoring) |
| `src/tools/answer-synthesis.ts` | answer_synthesis tool handler |
| `src/tools/query-wiki.ts` | query_wiki tool handler (orchestrator) |
| `src/tools/save-answer-as-page.ts` | save_answer_as_page tool handler |
| `src/tools/lint-wiki.ts` | lint_wiki tool handler (health checks) |

### `@doquflow/cli` (`packages/cli/`)

Command-line interface for Docuflow.

**Commands:**
- `docuflow init` — Create `.docuflow/` structure, setup schema template
- `docuflow status` — Show page count, health score, MCP registration state

---

## Workflows

### Workflow 1: Ingest a New Source

LLM ingests a document and integrates it into the wiki.

```bash
1. Call ingest_source({ project_path, source_filename })
   ↓
2. Parser reads markdown, extracts entities, concepts
   ↓
3. Creates wiki pages for each entity and concept
   ↓
4. Call update_index({ project_path })
   ↓
5. Index regenerated, log entry appended
   ↓
Output: Summary of what was added/updated
```

**Docuflow example:** Ingested 4 sources → 188 pages generated in seconds.

### Workflow 2: Query and Synthesize

LLM answers a question by searching and synthesizing from wiki.

```bash
1. Call query_wiki({ project_path, question })
   ↓
2. wiki_search finds relevant pages (BM25 scoring)
   ↓
3. synthesize_answer extracts key sentences, builds markdown with citations
   ↓
4. (optional) save_answer_as_page({ project_path, title, content, ... })
   ↓
5. New synthesis page added to wiki, log entry appended
   ↓
Output: Answer markdown, source pages, new page ID (if saved)
```

**Key insight:** Answers that are saved become part of the wiki. Next time someone asks a related question, the wiki is richer.

### Workflow 3: Maintenance and Lint

LLM performs health checks and generates improvement recommendations.

```bash
1. Call lint_wiki({ project_path })
   ↓
2. Checks for:
   - Orphan pages (no inbound links)
   - Stale content (>30 days old)
   - Missing references (broken links)
   - Metadata gaps (missing frontmatter)
   - Contradictions (conflicting statements)
   ↓
3. Calculates health score (0-100)
   ↓
4. Generates actionable recommendations
   ↓
Output: Issues array, metrics, health score, recommendations
```

**Docuflow example:** 188-page wiki → 100% health score, 0 issues, "Continue maintaining current standards."

---

## Development

```bash
npm install                     # install all workspace deps
npm run build                   # compile both packages (TS → JS)
npm run release                 # automated version bump + tag + publish

# Manual build/test
node packages/server/dist/index.js   # start MCP server (stdio)
node packages/cli/dist/index.js      # show CLI usage
docuflow init                        # initialize in current project
docuflow status                      # show wiki status
```

---

## Release operations

### Automated release

```bash
npm run release
```

Interactive script handles: version bump → changelog → git commit → tag → push → publish.

### Manual release

1. Edit `packages/server/package.json` → bump `version`
2. Edit `packages/cli/package.json` → bump `version` and `@doquflow/server` dependency
3. Update `CHANGELOG.md` and `release/CHANGELOG.md`
4. `npm install --package-lock-only`
5. `bash scripts/pre-release-check.sh`
6. `git add -A && git commit -m "chore: bump to vX.Y.Z"`
7. `git tag vX.Y.Z && git push origin main && git push origin vX.Y.Z`

---

## GitHub secrets

| Secret | Purpose |
|--------|---------|
| `NPM_TOKEN` | Publish access to `@doquflow` npm scope |
| `RELEASE_REPO_TOKEN` | PAT for syncing to public repo |

---

## Requirements

- Node.js 18+ (Node 20+ recommended)
- No external APIs, no AI dependencies (LLM runs on client side)
- No database (markdown files + git for version control)

---

## Further Reading

- [Phase 1 Completion](./PHASE_1_COMPLETION.md) — Wiki foundation and schema
- [Phase 2 Completion](./PHASE_2_COMPLETION.md) — Ingest and index tools
- [Phase 3 Completion](./PHASE_3_COMPLETION.md) — Query and synthesis tools
- [Phase 4 Completion](./PHASE_4_COMPLETION.md) — Lint and maintenance tools
- [LLM Wiki Pattern](./docs/LLM_WIKI_PATTERN.md) — Detailed pattern explanation
- [Usage Examples](./docs/USAGE_EXAMPLES.md) — Workflows with real output
- [Best Practices](./docs/BEST_PRACTICES.md) — Maintaining wikis
- [Example Schemas](./docs/EXAMPLE_SCHEMAS.md) — Domain-specific configuration
- [Copilot Integration](./docs/COPILOT_INTEGRATION.md) — How Claude auto-discovers docuflow
- [When to Use](./docs/WHEN_TO_USE.md) — Decision tree and cost-benefit
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Common issues and fixes
