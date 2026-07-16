import path from "node:path";
import { safeReadFile, writeFileAtomic } from "../filesystem";

export type RewriteDocument = (docContent: string, codeContent: string) => Promise<string> | string;

export interface RegenerateDocDependencies {
  /**
   * Local-only or injected LLM adapter to rewrite the document.
   */
  rewriteDocument?: RewriteDocument;
}

export interface RegenerateDocInput {
  project_path: string;
  doc_path: string;
  code_paths: string[];
}

/**
 * Safe offline fallback used when no local LLM adapter is configured.
 */
function localRewriteStub(docContent: string, codeContent: string): string {
  return [
    "---",
    "updated_by: docuflow-doc-regeneration",
    "---",
    docContent,
    "",
    "## Auto-Generated Updates",
    "This document was regenerated to match the following code:",
    "```",
    codeContent.substring(0, 200) + (codeContent.length > 200 ? "..." : ""),
    "```"
  ].join("\n");
}

export async function regenerateDoc(input: RegenerateDocInput, dependencies: RegenerateDocDependencies = {}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const projectPath = path.resolve(input.project_path);
    const docFile = path.join(projectPath, input.doc_path);
    const docRead = await safeReadFile(docFile);

    if (docRead.error) {
      return { success: false, message: `Failed to read doc: ${docRead.error}` };
    }

    const docContent = docRead.content ?? "";

    const codeContents: string[] = [];
    for (const codePath of input.code_paths) {
      const codeFile = path.join(projectPath, codePath);
      const codeRead = await safeReadFile(codeFile);
      if (codeRead.error) {
        return { success: false, message: `Failed to read code file ${codePath}: ${codeRead.error}` };
      }
      codeContents.push(`// File: ${codePath}\n${codeRead.content ?? ""}`);
    }

    const combinedCodeContent = codeContents.join("\n\n");

    const rewriteDocument = dependencies.rewriteDocument ?? localRewriteStub;
    const newDocContent = await rewriteDocument(docContent, combinedCodeContent);

    await writeFileAtomic(docFile, newDocContent);

    return { success: true, message: `Successfully regenerated ${input.doc_path}` };
  } catch (e: any) {
    return { success: false, message: `Regeneration failed: ${e?.message ?? String(e)}` };
  }
}
