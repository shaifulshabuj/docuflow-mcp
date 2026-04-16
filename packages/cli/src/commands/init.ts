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
  const docuflowDir = path.join(process.cwd(), ".docuflow");
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
