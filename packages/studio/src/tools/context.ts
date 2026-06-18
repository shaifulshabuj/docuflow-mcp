import * as fs from "fs";
import * as path from "path";

/**
 * A minimal stub for Context-as-a-Service MCP tool.
 * Builds a tiny in-memory index of a directory to answer "where is X" queries.
 */
export async function getContext(args: { directory: string; query: string }) {
  const results: string[] = [];
  
  function scan(dir: string) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (item === "node_modules" || item === ".git" || item === "dist") continue;
      const fullPath = path.join(dir, item);
      
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scan(fullPath);
        } else {
          // Simple in-memory search for the stub
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.includes(args.query)) {
            results.push(fullPath);
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    }
  }

  try {
    scan(args.directory);
    return {
      message: `Found ${results.length} files matching '${args.query}' in '${args.directory}'`,
      matches: results,
      status: "success"
    };
  } catch (e: any) {
    return { error: `Context extraction failed: ${e.message}`, status: "error" };
  }
}
