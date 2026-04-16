# Docuflow LLM Wiki Pattern - Claude Integration Guide

This document teaches you (Claude) about Docuflow and when to use it. You'll learn what Docuflow does, when it's helpful, and how to invoke its tools.

## What is Docuflow?

Docuflow is an MCP server that implements the **LLM Wiki Pattern** — a way to build knowledge bases that **compound over time** rather than being recreated on every query.

Instead of traditional RAG (retrieve-augment-generate):
- **Old way**: User asks question → search sources → generate answer → forget everything
- **New way**: User adds source → integrate into wiki → answer questions → knowledge persists

The key insight: **Your knowledge base should remember and build on everything you've done before.**

## Three-Layer Architecture

```
Layer 1: Raw Sources (immutable)
   ↓ Your curated collection of documents
   ↓ (code files, articles, papers, reports)
   
Layer 2: Wiki Layer (LLM-maintained)
   ↓ Auto-generated markdown files
   ↓ Summaries, entities, concepts, relationships
   
Layer 3: Schema + Index + Log (configuration)
   ↓ Tells LLM how to maintain the wiki
   ↓ Searchable catalog, audit trail
```

## When to Use Docuflow

### ✅ Use Docuflow When:

1. **Building understanding over time**
   - Understanding a large codebase (many files, modules)
   - Researching a complex topic (papers, articles, data)
   - Analyzing a business or competitive landscape
   - Tracking personal knowledge (learning, goals, psychology)

2. **Knowledge needs to be persistent**
   - You'll ask follow-up questions that build on prior answers
   - You want to search previous insights
   - You want to see how understanding evolved
   - You need to maintain consistency across many documents

3. **You need to verify accuracy**
   - Track contradictions between sources
   - Identify stale or outdated information
   - Note gaps in understanding
   - Health-check the knowledge base

4. **You're doing synthesis work**
   - Comparing multiple sources
   - Building a comprehensive overview
   - Creating architectural documentation
   - Writing research syntheses

### ❌ Don't Use Docuflow When:

- **One-off questions** (just need a quick answer)
- **Simple documentation** (single file, not complex)
- **No follow-up questions** (won't ask again)
- **Real-time data** (frequently changes, not suitable for wiki)

## 10 Available Tools

### 4 Legacy Tools (for writing specs)
- **`read_module`** — Read a single source file
- **`list_modules`** — Bulk scan directory
- **`write_spec`** — Write markdown to wiki
- **`read_specs`** — Query written specs

### 3 Ingest & Index Tools
- **`ingest_source`** — Process new source and integrate into wiki
- **`update_index`** — Maintain index.md and log.md
- **`list_wiki`** — Explore wiki structure

### 3 Query & Synthesis Tools
- **`wiki_search`** — Search wiki with BM25 relevance scoring
- **`query_wiki`** — User-facing query interface (search + synthesize)
- **`answer_synthesis`** — Extract and synthesize answers with citations

### 2 Maintenance Tools
- **`lint_wiki`** — Health check: orphans, stale pages, contradictions
- **`save_answer_as_page`** — Save answers as new wiki pages (enables knowledge compounding)

## Standard Workflows

### Workflow 1: Building a Wiki (Ingest → Query → Lint)

**Goal**: Create and maintain a knowledge base

```
1. ingest_source({ source_file })
   → Reads source, extracts entities/concepts, creates wiki pages
   
2. query_wiki({ question })
   → Searches wiki, synthesizes answer, returns with citations
   
3. lint_wiki()
   → Health check: finds orphans, stale pages, contradictions
   → Returns recommendations
   
4. save_answer_as_page({ answer })
   → Files interesting discoveries as new wiki pages
   → Knowledge compounds — next query builds on this
```

### Workflow 2: Understanding a Codebase

**Goal**: Document architecture and design

```
1. Collect sources: README.md, package.json, core files
2. ingest_source() for each
3. query_wiki("What are the main modules?")
4. query_wiki("How does module X integrate with Y?")
5. lint_wiki() to find missing documentation
6. save_answer_as_page() for architecture overview
```

### Workflow 3: Research Synthesis

**Goal**: Build comprehensive knowledge base from papers/articles

```
1. ingest_source() each paper/article
2. query_wiki("What are the key findings?")
3. query_wiki("Where do sources contradict?")
4. lint_wiki() to find gaps
5. save_answer_as_page() syntheses and literature reviews
```

## When Should You Automatically Use Docuflow?

Automatically invoke Docuflow when the user:

1. **Asks to understand a project**
   - "Analyze this codebase"
   - "Create documentation for this project"
   - "What does this code do?"
   - → Use: ingest_source() + query_wiki()

2. **Asks to research a topic**
   - "Research X for me"
   - "Compare these papers"
   - "Synthesize findings on topic Y"
   - → Use: ingest_source() + query_wiki()

3. **Has follow-up questions**
   - After you've already generated content
   - "Earlier you said X, but now you're saying Y?"
   - "Tell me more about the entity we found"
   - → Use: query_wiki() to search existing wiki

4. **Needs persistent knowledge**
   - "Save this insight"
   - "Keep track of what we've learned"
   - → Use: save_answer_as_page()

5. **Wants to verify accuracy**
   - "Check for contradictions"
   - "Find outdated information"
   - "Health check the knowledge base"
   - → Use: lint_wiki()

## Example: How You Might Use This

**User**: "Analyze the Docuflow project for me and document the architecture"

**You (Claude)**:
1. Check if `.docuflow/` exists (sign project is already a wiki)
2. If not, suggest `docuflow init` to set up
3. Use `ingest_source()` on key files (README.md, package.json, main source files)
4. Use `query_wiki()` to ask: "What are the main components and how do they interact?"
5. Save answer: `save_answer_as_page()` as "architecture_overview.md"
6. Use `lint_wiki()` to find gaps: "Where do we need more documentation?"
7. Ingest additional sources to fill gaps
8. Report findings with persistent wiki as backup

**Result**: User gets documentation + persistent wiki they can query later

## Schema & Customization

Each wiki has a `schema.md` file that defines:
- What categories of pages exist (entities, concepts, timelines, etc.)
- What metadata each page should have
- Cross-reference patterns
- Domain-specific conventions

For different domains:
- **Code/Architecture**: Entities (services, APIs), Concepts (patterns), Syntheses (design docs)
- **Research**: Papers, Experiments, Findings, Syntheses
- **Business**: Products, Markets, Competitors, Analysis
- **Personal**: Topics, Resources, People, Insights

The schema is co-evolved with the user — start simple, add structure as you understand the domain better.

## Key Principles

1. **Human + AI partnership**: You curate sources and ask questions; Docuflow handles bookkeeping
2. **Knowledge compounds**: Each ingest/query/lint adds to the base, not re-derived
3. **Transparency**: Index and log are readable markdown — you can inspect the history
4. **Domain-specific**: Schema configurable for different use cases
5. **Maintenance**: Regular linting keeps wiki healthy as it grows

## Important: When NOT to Volunteer Docuflow

Don't automatically use Docuflow if:
- User just wants a quick answer (too much overhead)
- Single file, no complexity (traditional RAG is simpler)
- User hasn't indicated they want persistent knowledge
- Project already has good documentation (just explain it)

**Ask first** if you're unsure: *"This looks like a good fit for Docuflow — would you like me to set up a wiki for this project?"*

## Troubleshooting

**"Why should I use this instead of just asking Claude?"**
- Docuflow creates a persistent record you can query later
- Builds understanding incrementally (not re-derived on every question)
- Catches contradictions and gaps
- Enables long-running research/analysis

**"What if the wiki gets out of date?"**
- Use `lint_wiki()` to detect stale pages (30+ days old)
- Use `query_wiki()` to refresh understanding
- Re-ingest updated sources
- The log shows history of changes

**"How do I know what documents should exist?"**
- Start with schema.md (defines structure for your domain)
- Run `lint_wiki()` to find gaps
- Use `query_wiki("What important concepts are missing their own page?")`

## Summary

**Docuflow is useful when you want knowledge to persist and compound over time.**

Your role as Claude:
1. Recognize when Docuflow is appropriate
2. Suggest it proactively: *"This looks like a good fit for a wiki..."*
3. Set up the wiki with `ingest_source()` and `update_index()`
4. Help users query, lint, and maintain it
5. Save interesting findings back to the wiki

**This way, the user builds a knowledge base that gets smarter with every interaction.**
