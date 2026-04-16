import path from "node:path";
import fsp from "node:fs/promises";

interface GenerationPreview {
  tool_name: string;
  tool_description: string;
  input_provided: Record<string, any>;
  predicted_actions: string[];
  predicted_outputs: Array<{
    type: string;
    description: string;
    example: string;
  }>;
  data_modified: boolean;
  files_affected: string[];
  estimated_impact: "low" | "medium" | "high";
  proceed_recommendation: string;
}

/**
 * preview_generation
 *
 * Shows what a tool will generate before it actually runs.
 * Removes black-box feeling by providing transparency.
 *
 * Input:
 * - tool_name: string (the tool you want to run)
 * - project_path: string
 * - params: Record<string, any> (the parameters you'd pass to the tool)
 *
 * Output:
 * - Predicted actions and outputs
 * - Files that will be affected
 * - Impact level (low/medium/high)
 * - Recommendation on whether to proceed
 */
export async function previewGeneration(input: {
  tool_name: string;
  project_path: string;
  params: Record<string, any>;
}): Promise<GenerationPreview> {
  const projectPath = path.resolve(input.project_path);
  const toolName = input.tool_name;
  const params = input.params;

  // Define preview for each tool
  const previews: Record<string, (p: string, params: any) => GenerationPreview> =
    {
      ingest_source: (projectPath: string, params: any) => ({
        tool_name: "ingest_source",
        tool_description: "Process a new source and integrate it into the wiki",
        input_provided: params,
        predicted_actions: [
          "✓ Read the source file(s)",
          "✓ Extract entities and concepts",
          "✓ Generate or update wiki pages",
          "✓ Create cross-references",
          "✓ Update index.md with new entities",
          "✓ Append entry to log.md",
        ],
        predicted_outputs: [
          {
            type: "Wiki Pages",
            description: "5-20 new or updated wiki pages depending on source size",
            example: "entities/ServiceName.md, concepts/Pattern.md, syntheses/Integration.md",
          },
          {
            type: "Index Update",
            description: "Updated index.md with new pages and metadata",
            example: "index.md entry with source, date, page count",
          },
          {
            type: "Log Entry",
            description: "New line in log.md documenting the ingest",
            example:
              "[2026-04-17 14:23] ingest | source_name.md → 12 pages created, 5 updated",
          },
        ],
        data_modified: true,
        files_affected: [
          ".docuflow/wiki/entities/*.md",
          ".docuflow/wiki/concepts/*.md",
          ".docuflow/wiki/syntheses/*.md",
          ".docuflow/index.md",
          ".docuflow/log.md",
        ],
        estimated_impact: "high",
        proceed_recommendation:
          "✓ Safe to proceed. Source will be integrated and wiki will grow. This is expected behavior.",
      }),

      query_wiki: (projectPath: string, params: any) => ({
        tool_name: "query_wiki",
        tool_description: "Search and synthesize answers from the wiki",
        input_provided: params,
        predicted_actions: [
          "✓ Search index.md for relevant pages",
          "✓ Read matching wiki pages",
          "✓ Synthesize answer with citations",
          "✓ Return answer with source pages",
        ],
        predicted_outputs: [
          {
            type: "Answer",
            description: "Synthesized answer to your question",
            example: 'The system uses MCP protocol to communicate with tools...',
          },
          {
            type: "Source Pages",
            description: "Wiki pages used to create the answer",
            example: "concepts/MCP_Protocol.md, entities/Server.md",
          },
          {
            type: "Confidence",
            description: "How well the question was answered (0-100)",
            example: "85 (good coverage, some gaps possible)",
          },
        ],
        data_modified: false,
        files_affected: [],
        estimated_impact: "low",
        proceed_recommendation:
          "✓ Safe to proceed. This is a read-only operation. No wiki data will be changed.",
      }),

      lint_wiki: (projectPath: string, params: any) => ({
        tool_name: "lint_wiki",
        tool_description: "Health check the wiki for issues",
        input_provided: params,
        predicted_actions: [
          "✓ Scan for orphan pages (no incoming links)",
          "✓ Find stale pages (30+ days old)",
          "✓ Check for broken cross-references",
          "✓ Detect contradictions in content",
          "✓ Look for metadata gaps",
          "✓ Calculate overall health score",
        ],
        predicted_outputs: [
          {
            type: "Issues",
            description: "Potential problems found in the wiki",
            example:
              "5 orphan pages, 2 stale (>30 days), 3 broken references",
          },
          {
            type: "Health Score",
            description: "Overall wiki health (0-100)",
            example: "78/100 (Good, some maintenance recommended)",
          },
          {
            type: "Recommendations",
            description: "Actionable suggestions to improve wiki",
            example:
              "Delete orphans, update stale pages, add missing cross-refs",
          },
        ],
        data_modified: false,
        files_affected: [],
        estimated_impact: "low",
        proceed_recommendation:
          "✓ Safe to proceed. This is a read-only diagnostic. It will report issues but not fix them.",
      }),

      save_answer_as_page: (projectPath: string, params: any) => ({
        tool_name: "save_answer_as_page",
        tool_description: "Save an answer as a new wiki page (enables knowledge compounding)",
        input_provided: params,
        predicted_actions: [
          "✓ Extract the answer from conversation",
          "✓ Create markdown file with frontmatter metadata",
          "✓ Place in appropriate category (synthesis or concept)",
          "✓ Update index.md with new page",
          "✓ Add log entry",
        ],
        predicted_outputs: [
          {
            type: "New Wiki Page",
            description: "New markdown file in wiki/syntheses/ or wiki/concepts/",
            example:
              ".docuflow/wiki/syntheses/query_result_20260417.md",
          },
          {
            type: "Metadata",
            description: "YAML frontmatter with creation date, tags, sources",
            example:
              "created_at: 2026-04-17, sources: [5 pages], tags: [architecture]",
          },
        ],
        data_modified: true,
        files_affected: [
          ".docuflow/wiki/syntheses/*.md or concepts/*.md",
          ".docuflow/index.md",
          ".docuflow/log.md",
        ],
        estimated_impact: "medium",
        proceed_recommendation:
          "✓ This compounds knowledge in your wiki! Proceed to file interesting discoveries.",
      }),

      lint_wiki_with_check: (projectPath: string, params: any) => ({
        tool_name: "lint_wiki",
        tool_description: "Run specific lint check on the wiki",
        input_provided: params,
        predicted_actions: [
          `✓ Run ${params.check_type || "all"} lint checks`,
          "✓ Analyze wiki for specific issues",
          "✓ Generate targeted recommendations",
        ],
        predicted_outputs: [
          {
            type: "Check Results",
            description: `Results for ${params.check_type || "all checks"}`,
            example: "5 issues found of this type",
          },
          {
            type: "Recommendations",
            description: "How to fix the issues",
            example: "Delete orphan pages, add missing references",
          },
        ],
        data_modified: false,
        files_affected: [],
        estimated_impact: "low",
        proceed_recommendation:
          "✓ Safe to proceed. This is diagnostic and won't modify wiki data.",
      }),
    };

  // Get preview based on tool name
  const previewFn = previews[toolName];
  if (!previewFn) {
    return {
      tool_name: toolName,
      tool_description: "Unknown tool",
      input_provided: params,
      predicted_actions: ["❌ Tool not found"],
      predicted_outputs: [],
      data_modified: false,
      files_affected: [],
      estimated_impact: "low",
      proceed_recommendation:
        "❌ Unknown tool. Check tool name and try again.",
    };
  }

  return previewFn(projectPath, params);
}
