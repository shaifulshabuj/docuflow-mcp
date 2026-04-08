import path from "node:path";
import { ensureDir, writeFileAtomic, readJsonIfExists } from "../filesystem.js";
import fsp from "node:fs/promises";
import { SpecIndex } from "../types.js";

export async function writeSpec(input: { project_path: string; filename: string; content: string }) {
  const projectPath = path.resolve(input.project_path);
  const docuDir = path.join(projectPath, ".docuflow");
  const specsDir = path.join(docuDir, "specs");
  await ensureDir(specsDir);

  const cleanName = input.filename.replace(/\.md$/i, "");
  const targetFile = path.join(specsDir, `${cleanName}.md`);
  const bytes = await writeFileAtomic(targetFile, input.content);

  const indexPath = path.join(docuDir, "index.json");
  const existing = (await readJsonIfExists<SpecIndex>(indexPath)) ?? { specs: [] };
  const now = new Date().toISOString();
  const idx = existing.specs.findIndex((s) => s.filename === `${cleanName}.md`);
  if (idx >= 0) existing.specs[idx].written_at = now;
  else existing.specs.push({ filename: `${cleanName}.md`, written_at: now });
  await fsp.writeFile(indexPath, JSON.stringify(existing, null, 2), "utf8");

  return { written_to: targetFile, bytes_written: bytes, index_updated: true };
}
