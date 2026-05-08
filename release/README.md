# Docuflow

**Lets AI agents build persistent, incrementally-maintained knowledge bases using the LLM Wiki pattern.**

## The problem

AI agents lose all context between sessions. Every time you start a new conversation, the agent re-discovers everything from scratch. Regular RAG (Retrieval-Augmented Generation) re-extracts knowledge on every query — there's no accumulation, no memory, no compounding value.

## The solution

Docuflow implements the **LLM Wiki pattern** — a three-layer architecture where knowledge compounds over time instead of being re-discovered:

1. **Raw Sources** (immutable) — Your curated documents, code, articles
2. **Wiki Layer** (LLM-maintained) — Auto-generated markdown pages, entities, concepts, relationships
3. **Schema & Metadata** — Domain-specific configuration, index, operation log

When you add a new source, the LLM reads it once, extracts key information, integrates it into the existing wiki, updates cross-references, and notes contradictions. Next time someone asks a related question, the answer is better because the wiki is richer.

**Key difference from RAG**: The LLM does the bookkeeping once, then that work compounds. You're not re-deriving knowledge on every query.

## Install

```bash
npx @doquflow/cli init
```

Or install globally:

```bash
npm install -g @doquflow/cli
docuflow init
```

This registers Docuflow in your Claude Desktop config, Cursor, Copilot, or other MCP-compatible agents, and creates the `.docuflow/` directory structure in your project.

## Quick start

```bash
# Initialize with interactive setup (choose domain: Code/Research/Business/Personal)
docuflow init --interactive

# Add first source
cp /path/to/document.md .docuflow/sources/

# Agent ingests and queries automatically
# Or call tools directly
```

## Web UI (v0.6.0)

A live browser interface for your Docuflow wiki. No build step — runs straight from the npm package.

```bash
# Start the API bridge (port 48821)
npm run start-api

# In a second terminal, start the web interface (port 5173)
npm run start-web

# Open http://localhost:5173
```

Six views are available once both servers are running:

| View | What it shows |
|------|--------------|
| **Ask** | AI-powered Q&A — type a question, get a synthesised answer with wiki source citations |
| **Wiki** | Live page browser with category tree (Entities / Concepts / Syntheses / Timelines) |
| **Graph** | Dependency visualiser — all wiki pages as an interactive node graph |
| **Health** | Wiki quality dashboard — health score (0–100), stale pages, open issues with fix buttons |
| **Sync** | Daemon activity monitor — status, AI bridge detected, recent operation timeline |
| **Onboard** | New project setup wizard — choose domain and get a ready-to-run `init` command |

The UI auto-discovers all Docuflow projects in `~/dev`, `~/code`, `~/projects`, `~/work`, `~/src`, and `~/Desktop`. A project picker appears in the top bar when multiple projects are found. All views show live data; if the API server is offline the UI falls back to demo mode automatically.

## Tools (15 total)

### Code Extraction (4 tools)
| Tool | What it does |
|------|-------------|
| `read_module` | Read one source file → extract classes, functions, dependencies, DB tables, endpoints, config refs |
| `list_modules` | Walk directory → bulk extraction for every file |
| `write_spec` | Write markdown spec to `.docuflow/specs/` |
| `read_specs` | Read back saved specs (includes `stale: boolean` per spec) |

### Wiki Management (10 tools)
| Tool | What it does |
|------|-------------|
| `ingest_source` | Parse source → extract entities/concepts → create wiki pages with context paragraphs |
| `update_index` | Regenerate index.md and append to log.md |
| `list_wiki` | Query wiki structure by category (includes `stale: boolean` per page + `stale_pages` count) |
| `wiki_search` | Search with BM25-inspired relevance scoring |
| `query_wiki` | Main interface: search + synthesize answer |
| `answer_synthesis` | Build markdown answer from selected pages |
| `save_answer_as_page` | Save answers back to wiki as new pages |
| `lint_wiki` | Health checks: orphans, stale content, contradictions, broken links |
| `get_schema_guidance` | Recommend what documents should exist based on domain |
| `preview_generation` | Show what tools will do before running (reads real wiki state) |

### Dependency Analysis (1 tool)
| Tool | What it does |
|------|-------------|
| `generate_dependency_graph` | Build import/shared-table/shared-endpoint graph → returns nodes, edges, `most_connected` top 10 |

## CLI Commands

| Command | What it does |
|---------|-------------|
| `docuflow init` | Create `.docuflow/` structure, register MCP, generate `CLAUDE.md` |
| `docuflow init --interactive` | Interactive domain-aware setup (Code/Research/Business/Personal) |
| `docuflow status` | Show wiki counts by category, source count, CLAUDE.md presence, last ingest, version |
| `docuflow suggest` | Domain-aware first-steps: 5 prioritised page suggestions + ready-to-paste Claude prompts |
| `docuflow sync --ai` | One-shot wiki sync using local AI bridge (Copilot/Claude/Codex) |
| `docuflow watch --ai` | Continuous daemon sync: watches for code/source changes and updates wiki automatically |
| `docuflow review` | Review git changes with deterministic findings (`critical`, `warnings`, `improvements`) and optional `--ai` Copilot augmentation |

## Local Wiki Sync (v0.5.3+)

**New in v0.5.3**: Sync your wiki locally using **Copilot CLI**, **Claude Code CLI**, or **Codex CLI** — no API keys, no CI/CD overhead.

```bash
# Install global
npm install -g @doquflow/cli

# One-shot sync (whenever you want)
docuflow sync --ai
docuflow sync --ai --copilot        # Force Copilot

# Continuous background sync
docuflow watch --ai
docuflow watch status               # Check daemon
docuflow watch stop                 # Stop daemon

# Auto-sync on every commit (enabled by default)
# Just commit — `.git/hooks/post-commit` handles the rest
```

## Languages supported

TypeScript, JavaScript, Python, **Go** (structs, funcs, gorilla/gin/chi routes, GORM), **Ruby/Rails** (classes, defs, ActiveRecord, Rails routes), Rust, Java, C#, PHP, Kotlin, Swift, Angular, Vue, HTML, SQL, Shell, PowerShell, YAML, JSON, and more.

Unknown file types return full raw content — the server never fails on unfamiliar files.

## Features

- ✅ **Web UI** — Live browser interface with 6 views: Ask, Wiki, Graph, Health, Sync, Onboard (v0.6.0)
- ✅ **Persistent Knowledge** — Sources ingested once, not re-extracted on every query
- ✅ **Domain-Aware** — 4 built-in schemas (Code, Research, Business, Personal)
- ✅ **LLM-Maintained** — AI writes and maintains wiki; humans curate sources
- ✅ **CLAUDE.md Auto-Generation** — `docuflow init` writes `CLAUDE.md` so Claude auto-discovers all 15 tools
- ✅ **Staleness Detection** — `list_wiki` and `read_specs` flag content older than 30 days
- ✅ **Dependency Graph** — `generate_dependency_graph` shows which files are highest risk to touch
- ✅ **Transparent** — `preview_generation` tool shows what tools will do before running
- ✅ **Guided** — `get_schema_guidance` recommends what pages should exist; `docuflow suggest` gives starting-point prompts
- ✅ **Health Checks** — `lint_wiki` detects orphans, stale content, contradictions (path bug fixed in v0.4.0)
- ✅ **Easy Onboarding** — Interactive init with domain selection and next steps

## Documentation

- **Getting Started**: See `docs/WHEN_TO_USE.md` to decide if Docuflow is right for you
- **Troubleshooting**: `docs/TROUBLESHOOTING.md` for common issues and solutions
- **Examples**: `docs/USAGE_EXAMPLES.md` for 6 real-world workflows
- **LLM Integration**: `docs/COPILOT_INTEGRATION.md` for Claude/Copilot/Cursor setup
- **Best Practices**: `docs/BEST_PRACTICES.md` for wiki maintenance

## How it works

### The LLM Wiki Pattern (3 Layers)

```
Immutable Sources
    ↓ (LLM reads)
    → Extract entities/concepts
    → Create/update wiki pages
    → Update cross-references
    → Note contradictions
    ↓
LLM-Maintained Wiki
    ↑ (Next query)
    ← Wiki is richer now
    ← Answers are better
    ↑
Knowledge Compounds
```

### Example: Docuflow's Own Wiki

- 188 pages (auto-generated)
- 100% health score
- 0 issues found
- Demonstrates the pattern at scale

## Requirements

- Node.js 18+
- Claude Desktop, Cursor, Copilot, or any MCP-compatible agent

## No API keys. No network calls. No AI inside the server.

All intelligence stays in your agent. Docuflow is a pure filesystem tool — it reads files, runs extraction, and writes markdown.

## Status

✅ **Production Ready** — v0.6.0, 15 MCP tools, 7 CLI commands, Web UI with live API bridge, 0 known bugs

## License

MIT
