import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function getClaudeDesktopConfigPath(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  } else if (platform === "win32") {
    return path.join(os.homedir(), "AppData", "Roaming", "Claude", "claude_desktop_config.json");
  }
  return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

function resolveServerBin(): string {
  // Try npm-installed package first
  try {
    return require.resolve("@doquflow/server/dist/index.js");
  } catch {
    // Fallback: monorepo sibling path (dev environment)
    return path.resolve(__dirname, "..", "..", "server", "dist", "index.js");
  }
}

async function copyTemplateFile(templateName: string, destPath: string): Promise<void> {
  try {
    // Try package-installed location first
    const templatePath = require.resolve(`@doquflow/cli/templates/${templateName}`);
    const content = await fsp.readFile(templatePath, "utf8");
    await fsp.writeFile(destPath, content, "utf8");
  } catch {
    try {
      // Fallback: monorepo sibling path (dev environment)
      const templatePath = path.resolve(__dirname, "..", "..", "templates", templateName);
      const content = await fsp.readFile(templatePath, "utf8");
      await fsp.writeFile(destPath, content, "utf8");
    } catch (err) {
      // If template not found, create a minimal version
      console.warn(`  ⚠ Could not find template for ${templateName}, creating minimal version`);
      if (templateName === "schema.md") {
        await fsp.writeFile(destPath, "# Docuflow Wiki Schema\n\n## Domain\n[Edit this file to customize your wiki]\n", "utf8");
      } else if (templateName === "index.md") {
        await fsp.writeFile(destPath, "# Wiki Index\n\nAuto-maintained catalog of pages.\n", "utf8");
      } else if (templateName === "log.md") {
        await fsp.writeFile(destPath, "# Operation Log\n\nRecord of wiki operations.\n", "utf8");
      }
    }
  }
}

export function buildClaudeMd(projectDir: string): string {
  return `# DocuFlow — AI Documentation Assistant

DocuFlow is an MCP server that gives you structured access to this codebase and maintains a living wiki.
It is registered in your Claude Desktop config and available as MCP tools in every session.

## Codebase Scanner Tools

- **read_module** — Analyse a single source file. Returns language, classes, functions, dependencies, DB tables, endpoints, config refs, and raw content (first 8 KB).
  - Example: \`read_module({ path: "src/UserService.cs" })\`
- **list_modules** — Walk a directory and extract facts for every non-binary file. Use this to understand the full project in one call.
  - Example: \`list_modules({ path: "${projectDir}" })\`
- **write_spec** — Persist a markdown spec to \`.docuflow/specs/<filename>.md\` and update the index.
  - Example: \`write_spec({ project_path: "${projectDir}", filename: "UserService", content: "# UserService\\n..." })\`
- **read_specs** — Read previously written specs, optionally filtered by name.
  - Example: \`read_specs({ project_path: "${projectDir}" })\`

## Wiki Pipeline Tools

- **ingest_source** — Ingest a markdown file from \`.docuflow/sources/\` and generate wiki pages (entities, concepts).
- **update_index** — Rebuild \`.docuflow/index.md\` from all wiki pages.
- **list_wiki** — List all wiki pages, optionally filtered by category (entity/concept/timeline/synthesis).
- **wiki_search** — BM25 search across all wiki pages. Returns ranked results with previews.
- **query_wiki** — One-stop Q&A: searches wiki, synthesises an answer, returns source citations.
- **synthesize_answer** — Generate a markdown synthesis from a list of specific wiki page IDs.
- **save_answer_as_page** — Persist a synthesised answer back into the wiki (knowledge compounding).

## Health & Guidance Tools

- **lint_wiki** — Health check: orphan pages, broken refs, stale content, metadata gaps. Returns a 0–100 health score.
- **get_schema_guidance** — Analyse what wiki pages should exist based on the schema and current state.
- **preview_generation** — Preview what a tool will do before running it.

## Common Workflows

### First time — understand the codebase
\`\`\`
list_modules({ path: "${projectDir}" })
→ read the language breakdown and dependency map
→ write_spec each important module
\`\`\`

### Ongoing — answer a question
\`\`\`
query_wiki({ project_path: "${projectDir}", question: "How does authentication work?" })
→ save_answer_as_page if the answer is worth keeping
\`\`\`

### Maintenance — check wiki health
\`\`\`
lint_wiki({ project_path: "${projectDir}" })
→ fix orphans and broken refs
\`\`\`

## Storage Layout

\`\`\`
.docuflow/
├── specs/           Legacy spec files written by write_spec
├── wiki/            LLM-generated wiki pages
│   ├── entities/    Named things (services, APIs, databases)
│   ├── concepts/    Design patterns, principles, integrations
│   ├── timelines/   Chronological pages
│   └── syntheses/   Cross-cutting synthesis pages
├── sources/         Raw input files for ingest_source
├── schema.md        Wiki configuration (edit to customise)
├── index.md         Auto-maintained catalog
└── log.md           Operation log
\`\`\`
`;
}

async function writeClaudeMd(projectDir: string): Promise<void> {
  const claudeMdPath = path.join(projectDir, "CLAUDE.md");
  const newSection = buildClaudeMd(projectDir);

  if (fs.existsSync(claudeMdPath)) {
    const existing = await fsp.readFile(claudeMdPath, "utf8");
    if (existing.includes("DocuFlow")) {
      // Already has DocuFlow section — replace it
      const withoutDocuflow = existing.replace(/\n?# DocuFlow[\s\S]*/, "").trimEnd();
      await fsp.writeFile(claudeMdPath, withoutDocuflow + "\n\n" + newSection, "utf8");
    } else {
      // Append to existing CLAUDE.md
      await fsp.appendFile(claudeMdPath, "\n\n" + newSection, "utf8");
    }
  } else {
    await fsp.writeFile(claudeMdPath, newSection, "utf8");
  }
}

export async function run(): Promise<void> {
  const configPath = getClaudeDesktopConfigPath();
  const serverBin = resolveServerBin();
  const nodeBin = process.execPath;

  // Read or initialise Claude Desktop config
  let config: Record<string, any> = {};
  try {
    const raw = await fsp.readFile(configPath, "utf8");
    config = JSON.parse(raw);
  } catch {
    // File doesn't exist yet — that's fine, we'll create it
  }

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.docuflow = { command: nodeBin, args: [serverBin] };

  await fsp.mkdir(path.dirname(configPath), { recursive: true });
  await fsp.writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

  // Create .docuflow/ directory structure
  const projectDir = process.cwd();
  const docuflowDir = path.join(projectDir, ".docuflow");
  const specsDir = path.join(docuflowDir, "specs");
  const wikiDir = path.join(docuflowDir, "wiki");
  const sourcesDir = path.join(docuflowDir, "sources");
  const entitiesDir = path.join(wikiDir, "entities");
  const conceptsDir = path.join(wikiDir, "concepts");
  const timelinesDir = path.join(wikiDir, "timelines");
  const synthesesDir = path.join(wikiDir, "syntheses");

  await fsp.mkdir(specsDir, { recursive: true });
  await fsp.mkdir(entitiesDir, { recursive: true });
  await fsp.mkdir(conceptsDir, { recursive: true });
  await fsp.mkdir(timelinesDir, { recursive: true });
  await fsp.mkdir(synthesesDir, { recursive: true });
  await fsp.mkdir(sourcesDir, { recursive: true });

  // Copy or create template files
  await copyTemplateFile("schema.md", path.join(docuflowDir, "schema.md"));
  await copyTemplateFile("index.md", path.join(docuflowDir, "index.md"));
  await copyTemplateFile("log.md", path.join(docuflowDir, "log.md"));

  // Generate CLAUDE.md so Claude Code picks up DocuFlow automatically
  await writeClaudeMd(projectDir);

  // Add .docuflow/ to .gitignore if present and not already listed
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignore = await fsp.readFile(gitignorePath, "utf8");
    if (!gitignore.includes(".docuflow/") && !gitignore.includes(".docuflow")) {
      await fsp.appendFile(gitignorePath, "\n# Docuflow\n.docuflow/\n");
    }
  }

  console.log("✓ Docuflow initialised successfully.");
  console.log("");
  console.log("📁 Structure created:");
  console.log(`  ${docuflowDir}/`);
  console.log(`  ├── specs/              (for legacy specs)`);
  console.log(`  ├── wiki/               (LLM-generated pages)`);
  console.log(`  │   ├── entities/`);
  console.log(`  │   ├── concepts/`);
  console.log(`  │   ├── timelines/`);
  console.log(`  │   └── syntheses/`);
  console.log(`  ├── sources/            (immutable raw files)`);
  console.log(`  ├── schema.md           (wiki configuration)`);
  console.log(`  ├── index.md            (auto-maintained catalog)`);
  console.log(`  └── log.md              (operation log)`);
  console.log("");
  console.log("📝 CLAUDE.md:");
  console.log(`  Generated at: ${path.join(projectDir, "CLAUDE.md")}`);
  console.log(`  Claude Code will automatically read DocuFlow tool instructions.`);
  console.log("");
  console.log("🔧 MCP Configuration:");
  console.log(`  MCP key:     mcpServers.docuflow`);
  console.log(`  Config file: ${configPath}`);
  console.log("");
  console.log("📖 Next steps:");
  console.log("  1. Edit .docuflow/schema.md to customize your wiki");
  console.log("  2. Add source files to .docuflow/sources/");
  console.log("  3. Use LLM Wiki tools to ingest, query, and maintain wiki");
  console.log("  4. Restart Claude Desktop to activate");
}
