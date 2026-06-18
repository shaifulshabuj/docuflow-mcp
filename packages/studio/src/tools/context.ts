import * as fs from "fs";
import * as path from "path";
import Database from "better-sqlite3";

/**
 * Context-as-a-Service MCP tool.
 * Builds and queries a persistent SQLite index of a directory using FTS5.
 */
export async function getContext(args: { operation?: "index" | "query", directory: string; query?: string }) {
  const operation = args.operation || "query";
  const dbPath = path.join(args.directory, ".context.db");

  if (operation === "index") {
    let db: any;
    try {
      db = new Database(dbPath);
      // Initialize FTS5 table
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS docs USING fts5(path, content);
      `);

      // Clear existing entries for this directory (simple full re-index for increment 1)
      db.exec(`DELETE FROM docs;`);

      const insert = db.prepare(`INSERT INTO docs (path, content) VALUES (?, ?)`);
      const insertMany = db.transaction((files: {path: string, content: string}[]) => {
        for (const file of files) insert.run(file.path, file.content);
      });

      const filesToIndex: {path: string, content: string}[] = [];

      function scan(dir: string) {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (item === "node_modules" || item === ".git" || item === "dist" || item === "build" || item === ".docuflow" || item === ".context.db" || item === ".context.db-journal") continue;
          const fullPath = path.join(dir, item);
          
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              scan(fullPath);
            } else {
              // Basic check to skip large/binary files
              if (stat.size > 300 * 1024) continue;
              const content = fs.readFileSync(fullPath, "utf-8");
              // Check if it looks like text (not perfect, but simple)
              if (content.indexOf("\0") === -1) {
                 filesToIndex.push({ path: fullPath, content });
              }
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }

      scan(args.directory);
      insertMany(filesToIndex);

      return {
        message: `Indexed ${filesToIndex.length} files in '${args.directory}'`,
        status: "success"
      };
    } catch (e: any) {
      return { error: `Indexing failed: ${e.message}`, status: "error" };
    } finally {
      if (db) db.close();
    }
  } else {
    // operation === "query"
    if (!args.query) {
      return { error: "Query string is required for 'query' operation", status: "error" };
    }

    if (!fs.existsSync(dbPath)) {
      return { error: `Index not found at '${dbPath}'. Please run the 'index' operation first.`, status: "error" };
    }

    let db: any;
    try {
      db = new Database(dbPath, { readonly: true });
      
      const stmt = db.prepare(`
        SELECT path, snippet(docs, 1, '<b>', '</b>', '...', 64) as snippet 
        FROM docs 
        WHERE docs MATCH ? 
        ORDER BY rank 
        LIMIT 20
      `);

      // SQLite FTS5 matching expects terms. 
      const ftsQuery = args.query.includes(" ") ? `"${args.query}"` : args.query;
      
      const results = stmt.all(ftsQuery);

      return {
        message: `Found ${results.length} files matching '${args.query}' in '${args.directory}'`,
        matches: results,
        status: "success"
      };
    } catch (e: any) {
      return { error: `Query failed: ${e.message}`, status: "error" };
    } finally {
      if (db) db.close();
    }
  }
}
