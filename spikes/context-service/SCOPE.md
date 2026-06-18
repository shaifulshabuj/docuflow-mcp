# Context-as-a-Service MCP Engine (docuflow-mcp extension)

## Overview
This spike evaluates adding a "Context-as-a-Service" module to `docuflow-mcp`, integrating codebase knowledge and external web aggregation under a unified MCP tool. The goal is to provide a comprehensive and low-friction way for LLM agents to maintain accurate context, avoiding context rot during long tasks.

## 1. Unified API Design
The unified MCP API provides a single entry point (`context`) for retrieving both local and external knowledge.

**Tool Name**: `context`
**Parameters**:
- `query` (string): The search query or concept requested.
- `scope` (enum: `local`, `external`, `both`): Directs the search to local codebase docs, external web aggregation, or both.
- `directory` (string, optional): Target directory for local scope.
- `urls` (string[], optional): Target URLs for external scope.

**Response Structure**:
```json
{
  "matches": [
    {
      "source": "local|external",
      "uri": "path/to/file or URL",
      "snippet": "Relevant text...",
      "confidence": 0.95
    }
  ],
  "summary": "AI-generated synthesis of the results..."
}
```

## 2. Integration of Concepts
We are drawing concepts from two forks/sources:
- **`code-context` (codebase RAG)**: Provides the model for chunking, indexing, and executing vector searches over local codebase files. This ensures high-accuracy retrieval of definitions and architectures inside the current workspace.
- **`firecrawl` (web scraping)**: Inspires the robust extraction of external URLs. It allows the agent to fetch documentation or external references on-the-fly when local context is insufficient.

In the final implementation, `code-context` handles the `local` scope and `firecrawl` concepts power the `external` scope, merged into the single `context` tool output.

## 3. Instability Risks
There are significant ecosystem risks with certain upstream tools:
- **`get-shit-done`**: Deprecated upstream following a security compromise. It must be strictly avoided and no legacy dependencies should rely on it.
- **`void`**: The project has been archived.
Attempting to build on or polyfill `get-shit-done` and `void` would introduce severe maintenance and security liabilities. We must build natively within `docuflow-mcp` or use stable, maintained dependencies.

## 4. Effort to Productionize
- **Local Indexing**: Migrating from the current memory stub to a persistent Vector DB (e.g., SQLite with vector extensions or a local chroma instance). (Est: 1-2 weeks).
- **Web Scraping**: Integrating a safe, sandboxed HTML parser for web extraction. (Est: 1 week).
- **Security & Waymark Integration**: Making sure the new tools comply with the existing `waymark.config.json` enforcement so external requests or broad file reads do not violate policy. (Est: 1 week).
- **Total Effort**: ~3-4 weeks.

## Verdict
**GO**: Extending `docuflow-mcp` with a unified context tool is technically feasible and highly valuable for reducing context rot. The stub proves the minimal local mechanism works.
