# Increment 1: Context-as-a-Service Local Persistence

## What Shipped
We replaced the in-memory context indexing stub with a persistent local SQLite database using FTS5 (full-text search). 
- A `.context.db` SQLite database is now created at the root of the indexed directory.
- The `context` MCP tool interface was expanded to accept an `operation` field (`index` or `query`).
- `index` operation walks the provided directory, skipping ignored folders/files, and stores the content in an FTS5 virtual table.
- `query` operation returns matched snippets ranked by relevance using SQLite's FTS5 `MATCH` and `snippet()` functions.
- The dependency-light `better-sqlite3` was added to `packages/studio` to interface with the database.

## How to Run It
You can interact with the new MCP tool via an agent (like Claude Code or Copilot):
1. **Index a directory:**
   \`\`\`json
   {
     "operation": "index",
     "directory": "/path/to/project"
   }
   \`\`\`
2. **Query the index:**
   \`\`\`json
   {
     "operation": "query",
     "directory": "/path/to/project",
     "query": "authentication flow"
   }
   \`\`\`

*Note: Since this is an MCP tool inside `docuflow-mcp`, ensure the MCP server is built (`npm run build`) and restarted before testing.*

## Proof of Persistence
To prove persistence:
1. Run the `index` operation on a directory.
2. Observe `.context.db` is created in that directory.
3. Restart the MCP server (terminate the process and start it again).
4. Run the `query` operation on the same directory *without* re-indexing.
5. The query will return matching snippets from the persistent `.context.db`.

## Next Increment
The next increment should focus on **Embeddings / True Vector Search**.
- Integrate embeddings via a local vector extension like `sqlite-vec` or similar.
- Compute vector embeddings during the `index` operation.
- Implement cosine similarity search during the `query` operation for semantic context retrieval.
