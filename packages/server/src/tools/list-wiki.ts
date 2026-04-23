import path from "node:path";
import fsp from "node:fs/promises";
import { safeReadFile } from "../filesystem";

const PLURAL_TO_SINGULAR: Record<string, string> = {
  entities: "entity",
  concepts: "concept",
  timelines: "timeline",
  syntheses: "synthesis",
};

const SINGULAR_TO_PLURAL: Record<string, string> = {
  entity: "entities",
  concept: "concepts",
  timeline: "timelines",
  synthesis: "syntheses",
};

const STALE_DAYS = 30;

interface WikiPageMetadata {
  id: string;
  title: string;
  category: string;
  path: string;
  created_at: string;
  updated_at: string;
  sources: string[];
  tags: string[];
  stale: boolean;
}

/**
 * Parse frontmatter from markdown
 */
function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, any> = {};

  for (const line of yaml.split("\n")) {
    if (!line.trim()) continue;
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();

    try {
      if (value.startsWith("[") || value.startsWith("{")) {
        result[key.trim()] = JSON.parse(value);
      } else {
        result[key.trim()] = value;
      }
    } catch {
      result[key.trim()] = value;
    }
  }

  return result;
}

/**
 * Extract title from markdown
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+?)$/m);
  return match ? match[1].trim() : "Untitled";
}

export async function listWiki(input: {
  project_path: string;
  category?: "entity" | "concept" | "timeline" | "synthesis";
}): Promise<{
  total_pages: number;
  stale_pages: number;
  pages: WikiPageMetadata[];
  categories: Record<string, number>;
  error?: string;
}> {
  try {
    const projectPath = path.resolve(input.project_path);
    const docuDir = path.join(projectPath, ".docuflow");
    const wikiDir = path.join(docuDir, "wiki");

    const pages: WikiPageMetadata[] = [];
    const categories: Record<string, number> = {};
    const now = Date.now();

    // Build list of categories to scan — always use correct plural directory names
    let categoriesToScan = ["entities", "concepts", "timelines", "syntheses"];
    if (input.category) {
      const pluralDir = SINGULAR_TO_PLURAL[input.category] ?? `${input.category}s`;
      categoriesToScan = [pluralDir];
    }

    // Scan each category
    for (const categoryDir of categoriesToScan) {
      const fullCategoryPath = path.join(wikiDir, categoryDir);
      const category = PLURAL_TO_SINGULAR[categoryDir] ?? categoryDir;

      try {
        const files = await fsp.readdir(fullCategoryPath);
        let categoryCount = 0;

        for (const file of files) {
          if (!file.endsWith(".md")) continue;

          const filePath = path.join(fullCategoryPath, file);
          const read = await safeReadFile(filePath);

          if (read.error || read.binary || !read.content) continue;

          const fm = parseFrontmatter(read.content);
          const title = extractTitle(read.content);
          const pageId = file.replace(".md", "");

          const updatedAt = fm.updated_at ?? new Date().toISOString();
          const updatedMs = new Date(updatedAt).getTime();
          const stale = !isNaN(updatedMs) && (now - updatedMs) > STALE_DAYS * 86_400_000;

          pages.push({
            id: pageId,
            title,
            category,
            path: path.relative(docuDir, filePath),
            created_at: fm.created_at ?? new Date().toISOString(),
            updated_at: updatedAt,
            sources: fm.sources ?? [],
            tags: fm.tags ?? [],
            stale,
          });

          categoryCount++;
        }

        if (categoryCount > 0) {
          categories[category] = categoryCount;
        }
      } catch (e) {
        // Category directory may not exist yet
      }
    }

    return {
      total_pages: pages.length,
      stale_pages: pages.filter((p) => p.stale).length,
      pages: pages.sort((a, b) => a.title.localeCompare(b.title)),
      categories,
    };
  } catch (e: any) {
    return {
      total_pages: 0,
      stale_pages: 0,
      pages: [],
      categories: {},
      error: e?.message ?? String(e),
    };
  }
}
