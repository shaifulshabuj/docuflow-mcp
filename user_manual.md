# DocuFlow — User Manual

**Version:** 0.4.1  
**Packages:** `@doquflow/cli` · `@doquflow/server`

---

## Contents

- [Part 1 — Getting Started & Workflows](#part-1--getting-started--workflows)
  - [Chapter 1: First-Time Setup](#chapter-1-first-time-setup)
  - [Chapter 2: Workflow A — Understand a Codebase](#chapter-2-workflow-a--understand-a-codebase)
  - [Chapter 3: Workflow B — Build a Living Wiki](#chapter-3-workflow-b--build-a-living-wiki)
  - [Chapter 4: Workflow C — Query the Wiki](#chapter-4-workflow-c--query-the-wiki)
  - [Chapter 5: Workflow D — Maintain & Keep Healthy](#chapter-5-workflow-d--maintain--keep-healthy)
  - [Chapter 6: Workflow E — Dependency & Risk Analysis](#chapter-6-workflow-e--dependency--risk-analysis)
- [Part 2 — MCP Tool Reference (15 tools)](#part-2--mcp-tool-reference)
- [Part 3 — CLI Reference (4 commands)](#part-3--cli-reference)
- [Appendix — .docuflow/ directory layout](#appendix--docuflow-directory-layout)

---

# Part 1 — Getting Started & Workflows

## Chapter 1: First-Time Setup

### Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | `node --version` to check |
| Claude Desktop or Claude Code | MCP server runs as a subprocess |
| `npm` (comes with Node) | Used to install the CLI |

---

### Step 1 — Install the CLI

```bash
npm install -g @doquflow/cli
```

Verify:

```bash
docuflow --version
# 0.4.1
```

---

### Step 2 — Register the MCP Server

Navigate to the root of any project you want to document and run:

```bash
cd /your/project
docuflow init
```

This does four things:

1. **Creates the `.docuflow/` folder** — stores all specs, wiki pages, sources, and config.
2. **Registers `@doquflow/server` in Claude Desktop's MCP config** — so Claude can call DocuFlow tools in every session.
3. **Creates `CLAUDE.md`** at your project root — a persistent prompt that tells Claude what DocuFlow is and how to use it.
4. **Creates `schema.md`** — a domain template (Code/Architecture by default).

**What CLAUDE.md does:** Claude Code reads `CLAUDE.md` automatically at the start of every session. Without it, you'd need to re-explain DocuFlow manually every time. With it, Claude already knows what tools are available and what your project is about.

---

### Step 2 (alternative) — Interactive Setup

If you want to configure your project's domain and fill in context upfront:

```bash
docuflow init --interactive
```

Interactive mode guides you through:
- Project name and description
- Choosing a domain (Code/Architecture, Research, Business, Personal)
- Key technologies or topics
- Generating a `PLAN.md` template

Use interactive mode for new projects where you want structured onboarding. Use plain `docuflow init` for existing projects where you just want to add DocuFlow quickly.

---

### Step 3 — Check Status

After init, run:

```bash
docuflow status
```

Example output:
```
DocuFlow v0.4.0

  MCP server   ✓ registered in Claude Desktop
  CLAUDE.md    ✓ exists at /your/project/CLAUDE.md
  Wiki pages   0 entities · 0 concepts · 0 timelines · 0 syntheses
  Specs        0 written
  Sources      0 files in .docuflow/sources/

Hints:
  → Run "docuflow suggest" to see what to document first
  → Add markdown files to .docuflow/sources/ and ingest them
```

If `MCP server` shows ✗, restart Claude Desktop and check again.

---

### Step 4 — Get Your First Suggestions

```bash
docuflow suggest
```

Example output (Code/Architecture domain):
```
💡 DocuFlow Suggestions — Code/Architecture domain

   Current wiki: 0 pages | 0 source(s) ingested

🌱 Your wiki is empty. Here's where to start:

  1. 📄 System Architecture Overview
     High-level view of how all components fit together
     → Ingest the README or architecture doc, then ask: 'Create a System Architecture Overview page in the wiki'

  2. 📄 Core Architectural Patterns
     ...
```

`docuflow suggest` reads your `.docuflow/schema.md`, detects your domain, and tailors the suggestions. It's your starting point every time you open a new project in Claude.

---

## Chapter 2: Workflow A — Understand a Codebase

**Goal:** Use DocuFlow to scan a codebase and write permanent spec files — so Claude understands your code in every session without re-scanning.

**Tools used:** `list_modules` → `read_module` → `write_spec` → `read_specs`

---

### Step 1 — Scan the Whole Project

Open Claude Code (or Claude Desktop) in your project. Paste this prompt:

```
Use list_modules to scan /path/to/my/project and give me a summary of:
- How many modules were found
- What languages are used
- Which files have the most dependencies
- Which files touch the most DB tables
```

DocuFlow scans every source file and returns structured data — language, classes, functions, dependencies, DB tables, endpoints, and config refs — for each file. No raw content is included in bulk scans (to keep token counts low).

**What to look for in the result:**
- `languages_found` — the tech stack at a glance
- `modules` — each file as a structured object
- `skipped_count` — how many files were ignored (node_modules, dist, etc.)

---

### Step 2 — Deep-Dive a Single File

Once you have the overview, zoom into any file that looks interesting:

```
Use read_module on /path/to/my/project/src/user-service.ts and explain what this file does.
```

`read_module` returns:
- `language` — detected language
- `classes` — all class/interface/struct names
- `functions` — all function/method names
- `dependencies` — imports and require() calls
- `db_tables` — tables touched (SQL keywords + ORM patterns)
- `endpoints` — API routes defined
- `config_refs` — environment variables and config keys referenced
- `content` — raw file content (first 8000 chars)

---

### Step 3 — Write a Spec

After Claude analyses the file or module, save the finding permanently:

```
Write a spec called "user-service-overview" for /path/to/my/project with this content:
[paste Claude's analysis here, or ask Claude to write it]
```

Or ask Claude to write and save it in one step:

```
Use list_modules on my project, analyse the architecture, then write a spec called
"architecture-overview" to .docuflow/specs/ summarising what you found.
```

The spec is saved to `.docuflow/specs/architecture-overview.md`.

---

### Step 4 — Read Specs Back in a Later Session

In any future session:

```
Read the specs for /path/to/my/project and tell me what has been documented so far.
```

Or retrieve a specific spec:

```
Read the "architecture-overview" spec for /path/to/my/project.
```

`read_specs` returns each spec with:
- `filename` — the spec name
- `written_at` — when it was written
- `stale` — `true` if the spec is more than 30 days old (review it)
- `content` — the full markdown

**Why this matters:** Without specs, Claude re-scans the same code every session. With specs, it reads structured summaries instantly — faster, cheaper, and consistent.

---

### Complete Example — C#/.NET Project

```
1. Use list_modules on /Users/me/MyApi with extensions [".cs"]
2. Tell me which files have the most dependencies and which DB tables appear most
3. Write a spec called "csharp-overview" with your findings

Then:
4. Read the "csharp-overview" spec and start a sprint planning session
```

---

## Chapter 3: Workflow B — Build a Living Wiki

**Goal:** Turn your documents, notes, PDFs (converted to markdown), and research into a structured, queryable knowledge base.

**Tools used:** `preview_generation` → `ingest_source` → `update_index` → `list_wiki`

---

### What the Wiki Is

The DocuFlow wiki is a set of markdown files in `.docuflow/wiki/`, organised into four categories:

| Category | What goes here |
|---|---|
| **entity** | Named things — classes, people, companies, systems, tools |
| **concept** | Ideas and patterns — design patterns, methodologies, principles |
| **timeline** | Events and sequences — what happened when |
| **synthesis** | Synthesized answers — conclusions drawn from multiple sources |

Unlike a RAG vector store, wiki pages are readable markdown files you can open and edit. They also cross-reference each other.

---

### Step 1 — Add a Source File

Copy any markdown document into `.docuflow/sources/`:

```bash
cp my-architecture-notes.md /path/to/my/project/.docuflow/sources/
```

Supported formats: `.md`, `.txt`. If you have Word, PDF, or HTML documents, convert them to markdown first (Pandoc works well).

---

### Step 2 — Preview Before Ingesting

Before running `ingest_source`, see what DocuFlow will do:

```
Use preview_generation with tool_name "ingest_source", project_path "/path/to/my/project",
and params { "source_filename": "my-architecture-notes.md" }
```

This shows:
- How many pages will be created
- What categories they'll go into
- The source file size
- No changes are made — it's read-only

---

### Step 3 — Ingest the Source

```
Use ingest_source with project_path "/path/to/my/project" and
source_filename "my-architecture-notes.md"
```

DocuFlow reads the source file, extracts:
- Named entities (classes, people, systems mentioned)
- Concepts and patterns
- Creates a wiki page for each one with surrounding context from the source

**Result:** Several new pages appear in `.docuflow/wiki/entities/` and `.docuflow/wiki/concepts/`.

---

### Step 4 — Rebuild the Index

After ingesting, regenerate the catalog:

```
Use update_index on /path/to/my/project
```

This writes `.docuflow/index.md` — a master catalog of all pages by category — and appends an entry to `log.md` (the audit trail).

---

### Step 5 — Browse What Was Created

```
Use list_wiki on /path/to/my/project to show me all pages created so far.
```

Or filter by category:

```
Use list_wiki on /path/to/my/project with category "entity"
```

Returns each page with:
- `title`
- `category`
- `created_at`
- `tags`
- `sources` — which source files contributed to this page
- `stale` — `true` if not updated in 30+ days

---

## Chapter 4: Workflow C — Query the Wiki

**Goal:** Ask questions against the accumulated knowledge and save good answers back into the wiki so it keeps growing.

**Tools used:** `query_wiki` → `wiki_search` → `synthesize_answer` → `save_answer_as_page`

---

### Option A — One-Stop Query (Recommended)

The easiest way to query:

```
Use query_wiki on /path/to/my/project with the question
"What are the main architectural patterns used in this project?"
```

`query_wiki` automatically:
1. Searches all wiki pages for relevant content
2. Selects the top matching pages
3. Synthesizes a coherent answer from them
4. Returns the answer plus source pages and a confidence score

**When to use:** Any time you want an answer quickly. This is the primary query tool.

---

### Option B — Manual Search

If you want to browse pages matching a term:

```
Use wiki_search on /path/to/my/project with query "database connection"
```

Returns ranked results with:
- Page title and category
- A short preview snippet
- Matched terms highlighted
- Relevance score

You can filter to a category:

```
Use wiki_search on /path/to/my/project with query "authentication" and category "concept"
```

---

### Option C — Synthesize from Specific Pages

If you know which pages to combine:

```
Use synthesize_answer on /path/to/my/project with:
- query: "How does authentication flow work end-to-end?"
- source_page_ids: ["auth-service", "jwt-token-concept", "user-entity"]
```

Returns:
- A markdown answer with citations
- Key concepts extracted
- The source pages used

**When to use:** When `query_wiki` returns the wrong pages, and you want to manually select what to synthesize from.

---

### Saving Answers Back to the Wiki

Good answers should not be lost. Save them:

```
Use save_answer_as_page on /path/to/my/project with:
- question: "How does authentication work end-to-end?"
- answer: [the answer from query_wiki]
- page_title: "Authentication Flow End-to-End"
- category: "synthesis"
- source_page_ids: ["auth-service", "jwt-token-concept"]
```

The page lands in `.docuflow/wiki/syntheses/authentication-flow-end-to-end.md` and becomes a source for future queries. This is how the wiki compounds — answers become sources for better future answers.

---

## Chapter 5: Workflow D — Maintain & Keep Healthy

**Goal:** Keep the wiki accurate over time, identify gaps, and get guidance on what to create next.

**Tools used:** `lint_wiki` → `get_schema_guidance` → staleness flags from `list_wiki` / `read_specs`

---

### Run a Health Check

Periodically run:

```
Use lint_wiki on /path/to/my/project
```

Returns:
- **Health score** (0–100)
- **Orphan pages** — pages not referenced anywhere
- **Stale pages** — pages not updated in 30+ days
- **Metadata gaps** — pages missing titles or tags
- **Contradictions** — pages where content conflicts with other pages
- **Recommendations** — what to fix first

**Targeted checks:**

```
# Only check for stale content
Use lint_wiki on /path/to/my/project with check_type "stale"

# Only check for orphan pages
Use lint_wiki on /path/to/my/project with check_type "orphans"

# Only check metadata
Use lint_wiki on /path/to/my/project with check_type "metadata"
```

Valid check types: `all`, `orphans`, `contradictions`, `stale`, `metadata`

---

### Get Guidance on What to Create Next

```
Use get_schema_guidance on /path/to/my/project
```

DocuFlow reads your `schema.md`, detects your domain, looks at current wiki coverage, and returns:
- Which page types are recommended for your domain
- Which ones are currently missing
- Priority order for what to create next

Pass a domain hint if auto-detection isn't right:

```
Use get_schema_guidance on /path/to/my/project with domain "Research"
```

Valid domains: `Code/Architecture`, `Research`, `Business`, `Personal`

---

### Identify Stale Specs

When specs go stale (code changed but spec wasn't updated), `read_specs` flags them:

```
Use read_specs on /path/to/my/project
```

Each spec in the result has a `stale: true/false` field. If `stale: true`, ask Claude to re-scan and update the spec.

---

### Preview Before Running Any Tool

Before running any expensive tool, preview it:

```
Use preview_generation with tool_name "query_wiki", project_path "/path/to/my/project",
and params { "question": "What DB tables are used by the orders module?" }
```

Supported for: `ingest_source`, `query_wiki`, `list_modules`, `write_spec`, `read_module`, `update_index`, `generate_dependency_graph`

---

## Chapter 6: Workflow E — Dependency & Risk Analysis

**Goal:** Build a visual dependency graph of your codebase to understand coupling, identify the riskiest files to change, and plan refactoring safely.

**Tool used:** `generate_dependency_graph`

---

### Step 1 — Scan the Whole Project

```
Use generate_dependency_graph on /path/to/my/project
```

Returns:
- **`nodes`** — every file in the project (id, path, language, connection count)
- **`edges`** — import/dependency relationships between files
- **`shared_tables`** — DB tables accessed by multiple files
- **`most_connected`** — top 10 most-coupled files (sorted by edge count)
- **`summary`** — node count, edge count, shared table count

**The `most_connected` list is your risk map.** Files with the most connections break the most things when changed.

---

### Step 2 — Focus on One Module's Neighbourhood

If you want to understand only the files connected to a specific module:

```
Use generate_dependency_graph on /path/to/my/project with focus "user-service"
```

`focus` is a partial match — any file whose path contains `"user-service"` becomes the center node, and the graph is filtered to its direct neighbours only.

---

### Step 3 — Filter by Extension

For a TypeScript-only graph:

```
Use generate_dependency_graph on /path/to/my/project with extensions [".ts", ".tsx"]
```

For a C# project:

```
Use generate_dependency_graph on /path/to/my/project with extensions [".cs"]
```

---

### Step 4 — Use the Output

Ask Claude to reason about the graph:

```
Use generate_dependency_graph on /path/to/my/project, then:
- Tell me which 3 files are highest risk to change
- Which DB tables are shared across the most modules?
- Draw a Mermaid diagram of the top-5 most-connected files
```

Claude can convert the raw nodes/edges into a Mermaid diagram, a risk ranking, or a refactoring plan based on this data.

---

### Real-World Use Cases

| Question | How to answer |
|---|---|
| "What breaks if I change user-service.ts?" | `focus: "user-service"` → look at all neighbours |
| "Which DB tables are shared?" | `shared_tables` in the output |
| "What's the most tangled module?" | `most_connected[0]` — the file with the highest edge count |
| "Is the auth module isolated?" | `focus: "auth"` → if few edges, it's isolated |
| "Where should I start a refactor?" | Nodes with high connections but small size = early refactor targets |

---

# Part 2 — MCP Tool Reference

All 15 tools are called by Claude — you give natural-language prompts and Claude translates them into tool calls. Each tool below includes the exact MCP name (for reference), parameters, and example prompts.

---

## 1. `read_module`

**What it does:** Read a single source file and extract structured information about its contents.

**When to use:** When you want to deeply understand one specific file — its classes, dependencies, DB touches, and endpoints.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | string | ✓ | Absolute or relative path to the source file |

**Extracted fields returned:**
- `language` — detected language name
- `classes` — class, interface, struct, enum names
- `functions` — function and method names
- `dependencies` — imports, requires, using statements
- `db_tables` — DB tables referenced
- `endpoints` — API route patterns
- `config_refs` — environment variables and config keys
- `content` — raw file content (truncated at 8000 chars)

**Languages with full extraction:** TypeScript, JavaScript, C#, Java, Python, Go, Ruby, PHP, SQL, CSS/HTML  
**Other languages:** content returned as-is, basic class/function patterns attempted

**Example prompt:**
```
Use read_module on /my/project/src/orders/order-service.ts
and explain what this file's responsibilities are.
```

**Example output shape:**
```json
{
  "path": "src/orders/order-service.ts",
  "language": "TypeScript",
  "classes": ["OrderService", "OrderValidator"],
  "functions": ["createOrder", "cancelOrder", "getOrderById"],
  "dependencies": ["@nestjs/common", "TypeORM", "PaymentService"],
  "db_tables": ["orders", "order_items"],
  "endpoints": ["/orders", "/orders/:id"],
  "config_refs": ["DATABASE_URL", "PAYMENT_API_KEY"],
  "content": "import { Injectable } from '@nestjs/common'..."
}
```

---

## 2. `list_modules`

**What it does:** Walk a project directory recursively and return extracted facts for every non-binary source file.

**When to use:** Scanning an entire codebase to understand its structure, languages, and module relationships. The starting point for any new project.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | string | ✓ | Root directory to scan |
| `extensions` | string[] | — | Optional filter, e.g. `[".cs", ".ts"]`. All non-binary files included if omitted |

**Auto-skipped:** `node_modules`, `dist`, `build`, `.git`, `.svn`, `vendor`, `obj`, `bin`, `.docuflow`, `*.min.js`, `*.map`, `*.lock`, files > 300KB

**Note:** Raw file content is omitted from bulk results to keep output manageable. Use `read_module` for content.

**Example prompt:**
```
Use list_modules on /my/project to scan everything, then tell me:
- What languages does this project use?
- Which files have the most external dependencies?
- Are there any files touching more than 5 DB tables?
```

**Example output shape:**
```json
{
  "modules": [
    {
      "path": "src/orders/order-service.ts",
      "language": "TypeScript",
      "classes": ["OrderService"],
      "functions": ["createOrder"],
      "dependencies": ["TypeORM"],
      "db_tables": ["orders"],
      "endpoints": ["/orders"],
      "config_refs": ["DATABASE_URL"]
    }
  ],
  "languages_found": ["TypeScript", "SQL", "YAML"],
  "total_count": 47,
  "skipped_count": 12
}
```

---

## 3. `write_spec`

**What it does:** Save a markdown spec file to `.docuflow/specs/<filename>.md` and update the index automatically.

**When to use:** After Claude analyses code or documents, save the findings permanently so they're available in future sessions.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project (where `.docuflow/` will be created) |
| `filename` | string | ✓ | Name for the spec file, without `.md` extension |
| `content` | string | ✓ | Full markdown content to write |

**Example prompt:**
```
Use list_modules on /my/project, analyse the architecture,
then write a spec called "architecture-overview" summarising what you found.
Include: key modules, dependencies between them, DB tables, and any patterns you noticed.
```

**Example output:**
```
Spec written to: /my/project/.docuflow/specs/architecture-overview.md
Bytes written: 2847
Index updated: architecture-overview added
```

---

## 4. `read_specs`

**What it does:** Read previously written specs from `.docuflow/specs/`. Returns all specs or a specific one.

**When to use:** At the start of a session to recall what has been documented, or to check if a spec is stale.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `module_name` | string | — | Optional: name of a specific spec to retrieve (with or without `.md`) |

**Each spec includes:**
- `filename`
- `written_at` — ISO timestamp
- `stale` — `true` if spec is older than 30 days
- `content` — full markdown

**Example prompts:**
```
# All specs
Read the specs for /my/project and list what has been documented.

# Specific spec
Read the "order-service-spec" spec for /my/project.
```

**If `stale: true`:** Ask Claude to re-scan the relevant files and update the spec.

---

## 5. `ingest_source`

**What it does:** Parse a markdown source file from `.docuflow/sources/` and generate wiki pages (entities and concepts) with context extracted from the source.

**When to use:** When you have documentation, notes, research papers, or other markdown files you want to turn into queryable wiki pages.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `source_filename` | string | ✓ | Filename in `.docuflow/sources/` to ingest (e.g., `"overview.md"`) |

**Before running:** Place your source file in `.docuflow/sources/` first.

**After running:** Multiple wiki pages are created in `.docuflow/wiki/entities/` and `.docuflow/wiki/concepts/`. Run `update_index` to regenerate the catalog.

**Example prompt:**
```
Ingest the source file "system-architecture.md" for /my/project
and tell me what pages were created.
```

**Example output shape:**
```json
{
  "source": "system-architecture.md",
  "pages_created": 8,
  "entities": ["OrderService", "PaymentGateway", "UserRepository"],
  "concepts": ["Event-Driven Architecture", "CQRS Pattern"],
  "wiki_path": "/my/project/.docuflow/wiki"
}
```

---

## 6. `update_index`

**What it does:** Scan all wiki pages and regenerate `.docuflow/index.md` — a master catalog by category. Appends an operation entry to `log.md`.

**When to use:** After any ingest operation, or periodically to ensure the index is current.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |

**Example prompt:**
```
Use update_index on /my/project to rebuild the wiki catalog.
```

**Example output:**
```
Index updated: 23 pages catalogued
Categories: 10 entities · 8 concepts · 2 timelines · 3 syntheses
Written to: /my/project/.docuflow/index.md
Log updated: /my/project/.docuflow/log.md
```

---

## 7. `list_wiki`

**What it does:** List all wiki pages in `.docuflow/wiki/`, optionally filtered by category. Returns metadata including staleness flags.

**When to use:** To browse what's in the wiki, check staleness, or see page counts by category.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `category` | string | — | Optional filter: `entity`, `concept`, `timeline`, `synthesis` |

**Each page includes:**
- `title`
- `category`
- `created_at`
- `tags`
- `sources` — source files that contributed to this page
- `stale` — `true` if not updated in 30+ days

**Example prompts:**
```
# All pages
Use list_wiki on /my/project to show everything in the wiki.

# Entity pages only
Use list_wiki on /my/project with category "entity"

# Check for stale pages
Use list_wiki on /my/project and filter results to show only pages where stale is true
```

---

## 8. `wiki_search`

**What it does:** Search wiki pages using relevance scoring (BM25-inspired). Returns ranked results with snippets. Entity pages are weighted higher.

**When to use:** When you want to browse pages matching a topic, or before manually selecting pages for `synthesize_answer`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `query` | string | ✓ | Search query |
| `limit` | number | — | Max results to return (default: 10) |
| `category` | string | — | Optional filter: `entity`, `concept`, `timeline`, `synthesis` |

**Example prompts:**
```
Use wiki_search on /my/project with query "payment processing"

Use wiki_search on /my/project with query "authentication" and category "concept" and limit 5
```

**Example output shape:**
```json
{
  "results": [
    {
      "id": "payment-gateway-entity",
      "title": "PaymentGateway",
      "category": "entity",
      "score": 0.87,
      "snippet": "...PaymentGateway handles all payment processing transactions...",
      "matched_terms": ["payment", "processing"]
    }
  ],
  "total": 3,
  "query": "payment processing"
}
```

---

## 9. `synthesize_answer`

**What it does:** Generate a coherent answer from a manually specified list of wiki pages. Extracts relevant sentences, key concepts, and builds a cited markdown answer.

**When to use:** When `query_wiki` returns the wrong pages and you want full control over which pages to synthesize from.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `query` | string | ✓ | The question being answered |
| `source_page_ids` | string[] | ✓ | List of wiki page IDs to synthesize from |

**How to get page IDs:** Run `wiki_search` or `list_wiki` first — each result has an `id` field.

**Example prompt:**
```
Use synthesize_answer on /my/project with:
- query: "How does the auth system interact with the payment gateway?"
- source_page_ids: ["auth-service-entity", "payment-gateway-entity", "jwt-concept"]
```

---

## 10. `query_wiki`

**What it does:** One-stop search + synthesize. Searches the wiki automatically, picks the most relevant pages, and returns a synthesized answer with sources and confidence score.

**When to use:** The default query tool for everyday questions. Use `wiki_search` + `synthesize_answer` only when you need manual control.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `question` | string | ✓ | The question to ask |
| `max_sources` | number | — | Max source pages to synthesize from (default: 5) |

**Example prompts:**
```
Use query_wiki on /my/project with question "What design patterns are used in this codebase?"

Use query_wiki on /my/project with question "How does error handling work?" and max_sources 3
```

**Example output shape:**
```json
{
  "question": "What design patterns are used?",
  "answer": "The codebase uses three main patterns: **Repository Pattern** for data access...",
  "sources_used": ["repository-pattern-concept", "cqrs-concept"],
  "confidence": 0.82,
  "pages_searched": 23
}
```

---

## 11. `save_answer_as_page`

**What it does:** Save a generated answer as a new wiki page. Adds frontmatter, updates `log.md`, and makes the answer queryable in future sessions.

**When to use:** Whenever `query_wiki` or `synthesize_answer` produces a valuable answer you want to keep. This is how the wiki compounds over time.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `question` | string | ✓ | The original question answered |
| `answer` | string | ✓ | The markdown answer text |
| `page_title` | string | ✓ | Title for the new page |
| `category` | string | — | Category for the page (default: `synthesis`) |
| `source_page_ids` | string[] | — | Source wiki page IDs used to generate the answer |

**Example prompt:**
```
Use save_answer_as_page on /my/project with:
- question: "How does user authentication work end-to-end?"
- answer: [the answer you just received from query_wiki]
- page_title: "User Authentication End-to-End Flow"
- category: "synthesis"
- source_page_ids: ["auth-service-entity", "jwt-concept"]
```

---

## 12. `lint_wiki`

**What it does:** Run quality checks on the wiki and return issues, metrics, a health score, and recommendations.

**When to use:** Periodically (weekly or after large ingests) to maintain wiki quality.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `check_type` | string | — | Type of check: `all`, `orphans`, `contradictions`, `stale`, `metadata` (default: `all`) |

**Checks performed:**

| Check | What it finds |
|---|---|
| `orphans` | Pages with no incoming references from other pages |
| `stale` | Pages not updated in 30+ days |
| `metadata` | Pages missing required frontmatter fields (title, tags) |
| `contradictions` | Pages where content conflicts semantically with other pages |

**Example prompts:**
```
Use lint_wiki on /my/project to run a full health check.

Use lint_wiki on /my/project with check_type "stale" to find outdated pages.
```

**Example output shape:**
```json
{
  "health_score": 74,
  "issues": [
    { "type": "orphan", "page": "legacy-auth-entity", "severity": "medium" },
    { "type": "stale", "page": "payment-gateway-entity", "days_old": 45, "severity": "low" }
  ],
  "metrics": { "total_pages": 23, "orphans": 1, "stale": 2 },
  "recommendations": ["Update payment-gateway-entity", "Link legacy-auth-entity from another page"]
}
```

---

## 13. `get_schema_guidance`

**What it does:** Analyse your project domain and current wiki coverage, then return a prioritised list of pages to create next.

**When to use:** When starting a new project, or when the wiki feels incomplete and you're not sure what to add.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root of the project |
| `domain` | string | — | Domain hint: `Code/Architecture`, `Research`, `Business`, `Personal`. Auto-detected from `schema.md` if omitted. |

**Example prompts:**
```
Use get_schema_guidance on /my/project to see what's missing.

Use get_schema_guidance on /my/project with domain "Research"
```

---

## 14. `preview_generation`

**What it does:** Preview what a tool will do before running it. Shows predicted pages to be created, impact on existing data, and any pre-flight checks. Read-only — makes no changes.

**When to use:** Before any ingest or write operation, especially on large sources or important projects.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tool_name` | string | ✓ | Name of the tool to preview |
| `project_path` | string | ✓ | Root of the project |
| `params` | object | ✓ | Parameters you would pass to that tool |

**Supported tool names for preview:** `ingest_source`, `query_wiki`, `list_modules`, `write_spec`, `read_module`, `update_index`, `generate_dependency_graph`

**Example prompts:**
```
Use preview_generation with:
- tool_name: "ingest_source"
- project_path: "/my/project"
- params: { "source_filename": "big-report.md" }
```

---

## 15. `generate_dependency_graph`

**What it does:** Scan a project and build a module dependency graph showing import relationships, shared DB tables, and the most-connected (riskiest) files.

**When to use:** Before a refactor, before a risky change, or when joining a new codebase and wanting to understand coupling.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_path` | string | ✓ | Root directory to analyse |
| `extensions` | string[] | — | Optional extension filter (e.g. `[".ts", ".go"]`) |
| `focus` | string | — | Partial file/module name — filters graph to neighbours of matching file only |

**Example prompts:**
```
# Full project graph
Use generate_dependency_graph on /my/project and tell me which files are highest risk to change.

# Focus on one module
Use generate_dependency_graph on /my/project with focus "auth-service"

# TypeScript only
Use generate_dependency_graph on /my/project with extensions [".ts", ".tsx"]
```

**Example output shape:**
```json
{
  "nodes": [
    { "id": "src/auth/auth.service.ts", "language": "TypeScript", "connections": 8 }
  ],
  "edges": [
    { "from": "src/auth/auth.service.ts", "to": "src/users/user.entity.ts", "type": "import" }
  ],
  "shared_tables": [
    { "table": "users", "files": ["auth.service.ts", "user.service.ts", "admin.service.ts"] }
  ],
  "most_connected": [
    { "file": "src/auth/auth.service.ts", "connections": 8 },
    { "file": "src/users/user.service.ts", "connections": 6 }
  ],
  "summary": { "nodes": 47, "edges": 89, "shared_tables": 3 }
}
```

---

# Part 3 — CLI Reference

CLI commands are run in your terminal from inside a project directory. They use the current working directory as the project path automatically.

---

## `docuflow init`

**What it does:** Initialise DocuFlow in the current directory.

```bash
docuflow init
```

**Creates:**
- `.docuflow/` — main folder with `sources/`, `wiki/`, `specs/`, `schema.md`, `index.md`, `log.md`
- `CLAUDE.md` — auto-generated instructions for Claude (idempotent: updates existing file if present)
- Registers `@doquflow/server` in Claude Desktop's MCP config at `~/Library/Application Support/Claude/claude_desktop_config.json`

**When CLAUDE.md already exists:**
- If it contains `"DocuFlow"` text → replaces the DocuFlow section in-place
- If it exists but has no DocuFlow content → appends a DocuFlow section
- If absent → creates a fresh file

**After running:** Restart Claude Desktop for the MCP server to be available.

---

## `docuflow init --interactive`

**What it does:** Guided setup with domain selection and project configuration.

```bash
docuflow init --interactive
# or
docuflow init -i
```

**In addition to standard init, it also:**
- Prompts for project name and description
- Asks you to choose a domain (Code/Architecture, Research, Business, Personal)
- Asks for key technologies or topics
- Generates a `PLAN.md` template in `.docuflow/`
- Customises `schema.md` and `CLAUDE.md` with your domain

**When to use:** On a brand new project where you want to give Claude rich context from the start.

---

## `docuflow status`

**What it does:** Show the current state of DocuFlow in this project.

```bash
docuflow status
```

**Shows:**
- DocuFlow version
- MCP server registration status (`✓` / `✗`)
- Whether `CLAUDE.md` exists
- Wiki page counts by category (entities, concepts, timelines, syntheses)
- Number of spec files written
- Number of source files in `.docuflow/sources/`
- Last ingest date (from `log.md`)
- Smart hints for next steps

**Run this:** At the start of any session to get oriented, or after running `docuflow init` to confirm everything is set up correctly.

---

## `docuflow suggest`

**What it does:** Print domain-aware suggestions for what to document next, with Claude prompts ready to copy-paste.

```bash
docuflow suggest
```

**How it works:**
1. Reads `.docuflow/schema.md` to detect your domain
2. Counts current wiki pages and sources
3. Selects the 5 most relevant suggestions for your domain and current state
4. Prints each with: a title, reason, and a ready-to-use Claude prompt

**Output varies by domain:**

| Domain | Suggestions focus on |
|---|---|
| Code/Architecture | Architecture overview, module dependencies, DB schema, risky modules |
| Research | Domain overview, key findings, contradictions, open questions |
| Business | Market overview, competitive analysis, key players |
| Personal | Learning goals, insights, action items |
| General | First source file, overview page, key entities |

**When to use:** After `docuflow init`, or any time you're not sure what to do next in Claude.

---

# Appendix — `.docuflow/` Directory Layout

```
.docuflow/
│
├── sources/                ← Place your markdown/text documents here before ingesting
│   └── my-notes.md
│
├── wiki/                   ← Generated wiki pages (auto-managed by MCP tools)
│   ├── entities/           ← Named things: classes, people, systems, tools
│   │   └── order-service.md
│   ├── concepts/           ← Ideas and patterns: design patterns, methodologies
│   │   └── event-driven-architecture.md
│   ├── timelines/          ← Events and sequences: what happened when
│   │   └── project-history.md
│   └── syntheses/          ← Saved query answers: compound knowledge
│       └── auth-flow-explained.md
│
├── specs/                  ← Agent-written code specifications
│   ├── index.json          ← Spec index: { filename, title, written_at }
│   ├── architecture-overview.md
│   └── order-service-spec.md
│
├── schema.md               ← Domain configuration (auto-created by init)
├── index.md                ← Master wiki catalog (auto-regenerated by update_index)
├── log.md                  ← Append-only operation audit trail
└── PLAN.md                 ← Planning template (interactive init only)
```

**What you own:** `sources/` — put files here manually.  
**What DocuFlow owns:** Everything else — don't manually edit wiki pages or the index unless you know what you're doing.

---

## Quick Reference Card

| Task | Command / Prompt |
|---|---|
| First-time setup | `docuflow init` |
| Guided setup | `docuflow init --interactive` |
| Check status | `docuflow status` |
| Get suggestions | `docuflow suggest` |
| Scan whole project | `Use list_modules on /my/project` |
| Deep-dive one file | `Use read_module on /my/project/src/file.ts` |
| Save findings | `Use write_spec on /my/project with filename "..." and content "..."` |
| Read saved specs | `Use read_specs on /my/project` |
| Add source to wiki | Copy file to `.docuflow/sources/` then `Use ingest_source` |
| Preview ingest | `Use preview_generation with tool_name "ingest_source"` |
| Rebuild wiki index | `Use update_index on /my/project` |
| Browse wiki pages | `Use list_wiki on /my/project` |
| Search wiki | `Use wiki_search on /my/project with query "..."` |
| Ask a question | `Use query_wiki on /my/project with question "..."` |
| Save an answer | `Use save_answer_as_page on /my/project` |
| Health check | `Use lint_wiki on /my/project` |
| What to create next | `Use get_schema_guidance on /my/project` |
| Dependency analysis | `Use generate_dependency_graph on /my/project` |
| Risk analysis (one file) | `Use generate_dependency_graph on /my/project with focus "module-name"` |

---

*DocuFlow is built and maintained at [github.com/shaifulshabuj/docuflow-mcp](https://github.com/shaifulshabuj/docuflow-mcp). Published to npm as `@doquflow/cli` and `@doquflow/server`.*
