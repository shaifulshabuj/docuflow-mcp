import path from "node:path";
import fsp from "node:fs/promises";
import { ensureDir, safeReadFile, writeFileAtomic } from "../filesystem";
import { IngestResult, WikiPage, WikiPageFrontmatter } from "../types";

interface EntityReference {
  name: string;
  type: "entity" | "concept" | "person" | "tool" | "pattern";
}

interface ExtractionOutput {
  summary: string;
  entities: EntityReference[];
  concepts: string[];
  relationships: Array<{ from: string; to: string; relation: string }>;
}

/**
 * Find the first paragraph in the source that mentions the given name.
 * Returns cleaned text (stripped of markdown syntax), up to 400 chars.
 */
function findContextParagraph(content: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  const paragraphs = content.split(/\n{2,}/);
  for (const para of paragraphs) {
    if (!re.test(para)) continue;
    const clean = para
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*?([^*]+)\*\*?/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
    if (clean.length > 20) return clean.substring(0, 400);
  }
  return null;
}

/**
 * Simple markdown-based entity extraction.
 * Looks for patterns like:
 * - **Entity:** or ### Entity Headers
 * - Lists of concepts
 * - Tool/component mentions
 */
function extractFromMarkdown(content: string): ExtractionOutput {
  const lines = content.split("\n");
  const entities: EntityReference[] = [];
  const concepts: Set<string> = new Set();
  const relationships: Array<{ from: string; to: string; relation: string }> = [];

  // Extract first 500 chars as summary (non-empty)
  const summary = content
    .split("\n")
    .filter((l) => l.trim().length > 0 && !l.startsWith("#") && !l.startsWith("```") && !l.startsWith("["))
    .slice(0, 3)
    .join(" ")
    .substring(0, 500);

  // Find headers (entities/concepts)
  for (const line of lines) {
    // ### Header → entity/concept
    if (line.match(/^###\s+/)) {
      const header = line.replace(/^###\s+/, "").trim();
      if (header && !header.startsWith("[") && !header.startsWith("{")) {
        entities.push({ name: header, type: "concept" });
      }
    }
    // **bold text** → potential entity (but not arrays or JSON)
    const boldMatches = line.matchAll(/\*\*([^*]+)\*\*/g);
    for (const match of boldMatches) {
      const text = match[1].trim();
      // Skip if it looks like JSON or code
      if (
        text.length > 2 &&
        text.length < 100 &&
        !text.includes("[") &&
        !text.includes("{") &&
        !text.includes('"') &&
        !text.includes("`")
      ) {
        entities.push({ name: text, type: "entity" });
      }
    }
  }

  // Find relationship patterns like "X integrates Y" or "X depends on Y"
  const relWords = [
    { word: "integrates", rel: "integrates" },
    { word: "depends on", rel: "depends_on" },
    { word: "extends", rel: "extends" },
    { word: "uses", rel: "uses" },
    { word: "manages", rel: "manages" },
  ];
  for (const line of lines) {
    for (const { word, rel } of relWords) {
      const regex = new RegExp(`([A-Z][A-Za-z0-9_]+)\\s+${word}\\s+([A-Z][A-Za-z0-9_]+)`, "gi");
      const matches = line.matchAll(regex);
      for (const match of matches) {
        relationships.push({ from: match[1], to: match[2], relation: rel });
      }
    }
  }

  // Collect concepts from lines containing "concept:", "pattern:", etc (skip arrays)
  const conceptLines = lines.filter(
    (l) => /concept|pattern|principle|approach/i.test(l) && !l.startsWith("[") && !l.startsWith("{")
  );
  for (const line of conceptLines) {
    const conceptMatch = line.match(/:\s*([^[\]{}"`.]+?)(?:\.|$)/);
    if (conceptMatch) {
      const concept = conceptMatch[1].trim();
      if (concept && concept.length < 100) {
        concepts.add(concept);
      }
    }
  }

  return {
    summary,
    entities: Array.from(new Set(entities.map((e) => JSON.stringify(e)))).map((s) => JSON.parse(s)),
    concepts: Array.from(concepts),
    relationships,
  };
}

/**
 * Convert a source document into a collection of wiki pages.
 * For each distinct entity/concept, create a page.
 */
function generateWikiPages(
  sourceId: string,
  sourceTitle: string,
  extracted: ExtractionOutput,
  sourceContent: string
): WikiPage[] {
  const now = new Date().toISOString();
  const pages: WikiPage[] = [];

  // Create summary page (synthesis)
  const summaryId = `source_${sourceId.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
  const summaryPage: WikiPage = {
    id: summaryId,
    title: `Source: ${sourceTitle}`,
    category: "synthesis",
    content: `# ${sourceTitle}\n\n${extracted.summary}\n\n## Key Entities\n\n${extracted.entities.map((e) => `- **${e.name}** (${e.type})`).join("\n")}`,
    frontmatter: {
      created_at: now,
      updated_at: now,
      sources: [sourceId],
      tags: ["source", "ingested"],
      inbound_links: [],
      outbound_links: extracted.entities.map((e) =>
        `entity_${e.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`
      ),
    },
  };
  pages.push(summaryPage);

  // Create entity pages
  for (const entity of extracted.entities) {
    const entityId = `entity_${entity.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
    const contextPara = findContextParagraph(sourceContent, entity.name);
    const overview = contextPara
      ? `${contextPara}\n\n*Introduced in: ${sourceTitle}*`
      : `Introduced in: ${sourceTitle}`;
    const entityPage: WikiPage = {
      id: entityId,
      title: entity.name,
      category: "entity",
      content: `# ${entity.name}\n\n**Type:** ${entity.type}\n\n## Overview\n\n${overview}`,
      frontmatter: {
        created_at: now,
        updated_at: now,
        sources: [sourceId],
        tags: [entity.type],
        inbound_links: [summaryId],
        outbound_links: [],
      },
    };
    pages.push(entityPage);
  }

  // Create concept pages
  for (const concept of extracted.concepts) {
    const conceptId = `concept_${concept.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
    const contextPara = findContextParagraph(sourceContent, concept);
    const definition = contextPara
      ? `${contextPara}\n\n*Introduced in: ${sourceTitle}*`
      : `To be expanded with additional sources.\n\n*Introduced in: ${sourceTitle}*`;
    const conceptPage: WikiPage = {
      id: conceptId,
      title: concept,
      category: "concept",
      content: `# ${concept}\n\n## Definition\n\n${definition}`,
      frontmatter: {
        created_at: now,
        updated_at: now,
        sources: [sourceId],
        tags: ["concept"],
        inbound_links: [summaryId],
        outbound_links: [],
      },
    };
    pages.push(conceptPage);
  }

  return pages;
}

export async function ingestSource(input: {
  project_path: string;
  source_filename: string;
}): Promise<IngestResult> {
  try {
    const projectPath = path.resolve(input.project_path);
    const docuDir = path.join(projectPath, ".docuflow");
    const sourcesDir = path.join(docuDir, "sources");
    const wikiDir = path.join(docuDir, "wiki");

    // Read source file
    const sourceFile = path.join(sourcesDir, input.source_filename);
    const fileRead = await safeReadFile(sourceFile);

    if (fileRead.error) {
      return {
        source_id: input.source_filename,
        summary: `Error reading source: ${fileRead.error}`,
        pages_created: [],
        pages_updated: [],
        entities_discovered: [],
        contradictions: [],
      };
    }

    const sourceContent = fileRead.content ?? "";
    const sourceTitle = input.source_filename.replace(".md", "");

    // Extract information
    const extracted = extractFromMarkdown(sourceContent);

    // Generate wiki pages
    const wikiPages = generateWikiPages(sourceTitle, sourceTitle, extracted, sourceContent);

    // Write all pages
    const pagesCreated: string[] = [];
    for (const page of wikiPages) {
      // Determine category subdirectory - use correct plural forms
      const pluralMap: Record<string, string> = {
        entity: "entities",
        concept: "concepts",
        timeline: "timelines",
        synthesis: "syntheses",
      };
      const categoryDir = path.join(wikiDir, pluralMap[page.category] || page.category + "s");
      await ensureDir(categoryDir);

      // Create page file with frontmatter
      const frontmatterYaml = `---
created_at: ${page.frontmatter.created_at}
updated_at: ${page.frontmatter.updated_at}
sources: ${JSON.stringify(page.frontmatter.sources)}
tags: ${JSON.stringify(page.frontmatter.tags)}
inbound_links: ${JSON.stringify(page.frontmatter.inbound_links)}
outbound_links: ${JSON.stringify(page.frontmatter.outbound_links)}
---
`;

      const pageContent = frontmatterYaml + "\n" + page.content;
      const pageFile = path.join(categoryDir, `${page.id}.md`);
      await writeFileAtomic(pageFile, pageContent);
      pagesCreated.push(page.id);
    }

    return {
      source_id: sourceTitle,
      summary: extracted.summary,
      pages_created: pagesCreated,
      pages_updated: [],
      entities_discovered: extracted.entities.map((e) => e.name),
      contradictions: [],
    };
  } catch (e: any) {
    return {
      source_id: input.source_filename,
      summary: `Ingest failed: ${e?.message ?? String(e)}`,
      pages_created: [],
      pages_updated: [],
      entities_discovered: [],
      contradictions: [],
    };
  }
}
