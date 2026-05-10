/**
 * docuflow recent
 *
 * Aggregates recent work by scanning .devloop/specs/TASK-*.md files,
 * correlating git commits by task ID, reading .docuflow/log.md for wiki
 * activity, and rendering a formatted dashboard in the terminal.
 */

import fsp from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

export interface RecentOptions {
  days: number;        // default 7
  format: "table" | "md"; // default "table"
}

interface TaskEntry {
  id: string;                   // TASK-20260511-082835
  title: string;                // Short title from H1
  feature: string;              // **Feature**: value
  status: string;               // approved | needs-work | pending | rejected
  score: string | null;         // "8/10" from review file, null if none
  reviewVerdict: string | null; // APPROVED | NEEDS_WORK | REJECTED | null
  commits: string[];            // git log --oneline lines containing task ID
  specMtime: Date;
}

interface WikiEntry {
  date: string;
  operation: string;
  file: string;
}

// ── ANSI helpers ────────────────────────────────────────────────────────────
const c = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function colourStatus(status: string, text: string): string {
  if (status === "approved")   return c.green(text);
  if (status === "needs-work") return c.yellow(text);
  if (status === "rejected")   return c.red(text);
  return c.dim(text);
}

function normaliseStatus(raw: string): string {
  // Strip emojis (✅ ⚠️ ⏳ ❌) and other non-printable/non-ASCII characters
  const stripped = raw.replace(/[^\x20-\x7E]/g, " ").trim().toLowerCase();
  if (stripped.includes("approved"))   return "approved";
  if (stripped.includes("needs-work") || stripped.includes("needs_work")) return "needs-work";
  if (stripped.includes("rejected"))   return "rejected";
  if (stripped.includes("pending"))    return "pending";
  return stripped.split(/\s+/)[0] || "pending";
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function formatDateYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Git helper ───────────────────────────────────────────────────────────────
function gitLog(taskId: string): string[] {
  try {
    const out = execSync(
      `git log --oneline --all --grep="${taskId}"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
    );
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// ── Spec parser ───────────────────────────────────────────────────────────────
async function parseSpec(specPath: string): Promise<Partial<TaskEntry>> {
  let content: string;
  try {
    content = await fsp.readFile(specPath, "utf8");
  } catch {
    return {};
  }

  let title = "";
  let feature = "";
  let status = "pending";

  for (const line of content.split("\n")) {
    // First H1 heading: "# TASK-YYYYMMDD-HHMMSS: <title>"
    if (!title && line.startsWith("# TASK-")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx !== -1) {
        title = line.slice(colonIdx + 1).trim();
      }
    }

    // **Feature**: value
    if (!feature && line.startsWith("**Feature**:")) {
      feature = line.slice("**Feature**:".length).trim().slice(0, 120).trimEnd();
    }

    // **Status**: value
    if (line.startsWith("**Status**:")) {
      const raw = line.slice("**Status**:".length).trim();
      status = normaliseStatus(raw);
    }
  }

  return { title, feature, status };
}

// ── Review parser ────────────────────────────────────────────────────────────
async function parseReview(
  reviewPath: string
): Promise<{ score: string | null; reviewVerdict: string | null }> {
  let content: string;
  try {
    content = await fsp.readFile(reviewPath, "utf8");
  } catch {
    return { score: null, reviewVerdict: null };
  }

  let score: string | null = null;
  let reviewVerdict: string | null = null;

  const scoreMatch = content.match(/Score:\s*(\d+\/\d+)/);
  if (scoreMatch) score = scoreMatch[1];

  const verdictMatch = content.match(/Verdict:\s*(APPROVED|NEEDS[\s_]WORK|REJECTED)/i);
  if (verdictMatch) {
    reviewVerdict = verdictMatch[1].toUpperCase().replace(/[\s-]+/g, "_");
  }

  return { score, reviewVerdict };
}

// ── Wiki log parser ──────────────────────────────────────────────────────────
// log.md format: ## [2026-05-01T13:49:38.141Z] operation | description
async function parseWikiLog(logPath: string, since: Date): Promise<WikiEntry[]> {
  let content: string;
  try {
    content = await fsp.readFile(logPath, "utf8");
  } catch {
    return [];
  }

  const entries: WikiEntry[] = [];
  const headingRe = /^##\s+\[([^\]]+)\]\s+([^|]+)\|\s*(.+)$/;

  for (const line of content.split("\n")) {
    const m = line.match(headingRe);
    if (!m) continue;

    const rawDate = m[1].trim();
    const operation = m[2].trim();
    const file = m[3].trim();

    const dateVal = new Date(rawDate);
    if (!isNaN(dateVal.getTime()) && dateVal >= since) {
      entries.push({ date: rawDate.slice(0, 10), operation, file });
    }
  }

  return entries;
}

// ── Renderers ────────────────────────────────────────────────────────────────
function renderTable(
  tasks: TaskEntry[],
  allCommits: string[],
  wikiEntries: WikiEntry[],
  days: number,
  fromDate: string,
  toDate: string,
): void {
  const SEP = "─".repeat(72);
  console.log(c.bold(`Recent Work — last ${days} days (${fromDate} → ${toDate})`));
  console.log(SEP);
  console.log(` ${"TASK".padEnd(24)} ${"TITLE".padEnd(40)} ${"STATUS".padEnd(12)} SCORE`);
  console.log(SEP);

  for (const t of tasks) {
    const title  = truncate(t.title || t.feature, 40).padEnd(40);
    const status = t.status.padEnd(12);
    const score  = t.score ?? "—";
    const row    = ` ${t.id.padEnd(24)} ${title} ${status} ${score}`;
    console.log(colourStatus(t.status, row));
  }

  console.log(SEP);

  if (allCommits.length > 0) {
    console.log("");
    console.log(c.bold(`Git Commits (${allCommits.length} matching)`));
    for (const line of allCommits) {
      console.log(`  ${line}`);
    }
  }

  if (wikiEntries.length > 0) {
    console.log("");
    console.log(c.bold(`Wiki Activity (last ${days} days)`));
    for (const e of wikiEntries) {
      console.log(`  ${e.date}  ${e.operation}  ${e.file}`);
    }
  }
}

function renderMarkdown(
  tasks: TaskEntry[],
  allCommits: string[],
  wikiEntries: WikiEntry[],
  days: number,
  fromDate: string,
  toDate: string,
): void {
  console.log(`# Recent Work — last ${days} days (${fromDate} → ${toDate})`);
  console.log("");
  console.log("| TASK | TITLE | STATUS | SCORE |");
  console.log("|------|-------|--------|-------|");
  for (const t of tasks) {
    const title = truncate(t.title || t.feature, 40);
    const score = t.score ?? "—";
    console.log(`| ${t.id} | ${title} | ${t.status} | ${score} |`);
  }

  if (allCommits.length > 0) {
    console.log("");
    console.log(`## Git Commits (${allCommits.length} matching)`);
    console.log("");
    for (const line of allCommits) {
      console.log(`- ${line}`);
    }
  }

  if (wikiEntries.length > 0) {
    console.log("");
    console.log(`## Wiki Activity (last ${days} days)`);
    console.log("");
    console.log("| Date | Operation | File |");
    console.log("|------|-----------|------|");
    for (const e of wikiEntries) {
      console.log(`| ${e.date} | ${e.operation} | ${e.file} |`);
    }
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────
export async function run(opts: RecentOptions = { days: 7, format: "table" }): Promise<void> {
  const days   = Math.max(1, isNaN(opts.days) ? 7 : opts.days);
  const format = opts.format ?? "table";
  const isMd   = format === "md";

  const cwd      = process.cwd();
  const specsDir = path.join(cwd, ".devloop", "specs");
  const logPath  = path.join(cwd, ".docuflow", "log.md");

  const now   = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Collect spec files
  let specFiles: string[] = [];
  try {
    const entries = await fsp.readdir(specsDir);
    specFiles = entries
      .filter(f => /^TASK-\d{8}-\d{6}\.md$/.test(f))
      .map(f => path.join(specsDir, f));
  } catch {
    console.log(`No tasks found in the last ${days} days.`);
    return;
  }

  // Filter by mtime and parse each spec
  const tasks: TaskEntry[] = [];
  for (const specPath of specFiles) {
    let stat;
    try {
      stat = await fsp.stat(specPath);
    } catch {
      continue;
    }
    if (stat.mtime < since) continue;

    const stem = path.basename(specPath, ".md"); // TASK-YYYYMMDD-HHMMSS
    const specFields = await parseSpec(specPath);
    if (!specFields.title && !specFields.feature) continue; // unreadable

    const reviewPath = path.join(specsDir, `${stem}-review.md`);
    const { score, reviewVerdict } = await parseReview(reviewPath);

    // Override status from review verdict if present
    let status = specFields.status ?? "pending";
    if (reviewVerdict === "APPROVED")   status = "approved";
    else if (reviewVerdict === "NEEDS_WORK") status = "needs-work";
    else if (reviewVerdict === "REJECTED")   status = "rejected";

    const commits = gitLog(stem);

    tasks.push({
      id:            stem,
      title:         specFields.title   ?? "",
      feature:       specFields.feature ?? "",
      status,
      score,
      reviewVerdict,
      commits,
      specMtime:     stat.mtime,
    });
  }

  // Sort newest first
  tasks.sort((a, b) => b.specMtime.getTime() - a.specMtime.getTime());

  if (tasks.length === 0) {
    console.log(`No tasks found in the last ${days} days.`);
    return;
  }

  const fromDate    = formatDateYMD(since);
  const toDate      = formatDateYMD(now);
  const allCommits  = tasks.flatMap(t => t.commits);
  const wikiEntries = await parseWikiLog(logPath, since);

  if (isMd) {
    renderMarkdown(tasks, allCommits, wikiEntries, days, fromDate, toDate);
  } else {
    renderTable(tasks, allCommits, wikiEntries, days, fromDate, toDate);
  }
}
