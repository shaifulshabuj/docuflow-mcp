/**
 * docuflow watch
 *
 * Auto-sync daemon — watches for changes and drives Claude / Copilot / Codex
 * to keep the wiki in sync without human intervention.
 *
 * ┌─── TRIGGER LAYER ──────────────────────────────────────────────────────┐
 * │  ① SOURCE WATCHER  .docuflow/sources/ changed → direct ingest          │
 * │  ② CODE WATCHER    project .ts/.py/etc changed → AI drives MCP tools   │
 * │  ③ LINT SCHEDULER  every N hours → AI runs lint_wiki, reports issues    │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─── AI BRIDGE (--ai flag) ──────────────────────────────────────────────┐
 * │  Priority 1: copilot CLI  (@github/copilot) — DIRECTLY calls MCP tools │
 * │  Priority 2: claude CLI   (Claude Code)     — DIRECTLY calls MCP tools  │
 * │  Priority 3: codex CLI    (OpenAI Codex)    — generates doc, then ingest│
 * │  Priority 4: Anthropic API (ANTHROPIC_API_KEY) — generates doc + ingest │
 * │  None: sources-only mode (no AI, direct ingest only)                    │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * KEY DIFFERENCE — Copilot & Claude bridge:
 *   They DON'T just generate text. They directly call DocuFlow MCP tools
 *   (ingest_source, update_index, lint_wiki) because DocuFlow is already
 *   registered in ~/.copilot/mcp-config.json and Claude's MCP config.
 *   Result: richer, autonomous wiki maintenance with zero extra steps.
 *
 * Usage:
 *   docuflow watch                     # sources/ only, no AI
 *   docuflow watch --ai                # full: auto-detect best AI bridge
 *   docuflow watch --ai --copilot      # force copilot CLI (gh @github/copilot)
 *   docuflow watch --ai --claude       # force Claude Code CLI
 *   docuflow watch --ai --codex        # force Codex CLI
 *   docuflow watch --lint-interval 6   # lint every 6h (default: 24)
 *   docuflow watch --code-ext ts,py    # watch only these extensions
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";

// ─── Dynamic server tool loader ────────────────────────────────────────────────
function loadServerTool(toolFile: string): any {
  const candidates = [
    () => require(`@doquflow/core/dist/tools/${toolFile}`),
    () => require(path.resolve(__dirname, "../../../core/dist/tools", toolFile)),
    () => require(path.resolve(__dirname, "../../core/dist/tools", toolFile)),
    () => require(`@doquflow/studio/dist/tools/${toolFile}`),
    () => require(path.resolve(__dirname, "../../../studio/dist/tools", toolFile)),
    () => require(path.resolve(__dirname, "../../studio/dist/tools", toolFile)),
  ];
  for (const attempt of candidates) {
    try { return attempt(); } catch {}
  }
  throw new Error(`Cannot load server tool "${toolFile}". Run "npm run build" first.`);
}

// ─── Colour helpers ─────────────────────────────────────────────────────────
const c = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
};
const ts = () => c.dim(new Date().toLocaleTimeString());
const log = (icon: string, msg: string) => console.log(`${ts()} ${icon}  ${msg}`);

// ─── AI bridge detection ─────────────────────────────────────────────────────

export type AIBridge = "copilot" | "claude" | "codex" | "api" | "none";

function isInPath(cmd: string): boolean {
  return spawnSync("which", [cmd], { encoding: "utf8" }).status === 0;
}

export function detectBridge(opts: {
  useAI: boolean;
  forceCopilot?: boolean;
  forceClaude?: boolean;
  forceCodex?: boolean;
}): AIBridge {
  if (!opts.useAI) return "none";

  if (opts.forceCopilot) {
    if (isInPath("copilot")) return "copilot";
    console.warn(c.yellow("  ⚠  copilot not found — checking other bridges"));
  }
  if (opts.forceClaude) {
    if (isInPath("claude")) return "claude";
    console.warn(c.yellow("  ⚠  claude not found — checking other bridges"));
  }
  if (opts.forceCodex) {
    if (isInPath("codex")) return "codex";
    console.warn(c.yellow("  ⚠  codex not found — checking other bridges"));
  }

  // Auto-detect priority: copilot > claude > codex > api
  if (isInPath("copilot")) return "copilot";
  if (isInPath("claude"))  return "claude";
  if (isInPath("codex"))   return "codex";
  if (process.env.ANTHROPIC_API_KEY) return "api";

  console.warn(
    c.yellow(
      "  ⚠  No AI bridge detected.\n" +
      "     Install @github/copilot, Claude Code CLI, Codex CLI,\n" +
      "     or set ANTHROPIC_API_KEY.\n" +
      "     Running in sources-only mode."
    )
  );
  return "none";
}

// ─── Copilot bridge (DIRECT MCP tool calling) ────────────────────────────────
//
// Since docuflow is already registered in ~/.copilot/mcp-config.json,
// Copilot CLI can directly call list_wiki, ingest_source, update_index,
// lint_wiki etc. without any intermediate step.
//

function buildCopilotSyncPrompt(projectPath: string, changedFiles: string[]): string {
  const fileList = changedFiles.length > 0
    ? changedFiles.slice(0, 10).map(f => `- ${path.relative(projectPath, f)}`).join("\n")
    : "(triggered by schedule or manual run)";

  return [
    `You are the DocuFlow wiki maintainer for the project at: ${projectPath}`,
    ``,
    `The following source files recently changed:`,
    fileList,
    ``,
    `Use the docuflow MCP tools to perform these tasks IN ORDER:`,
    `1. Call list_wiki({ project_path: "${projectPath}" }) — note current page count`,
    `2. For each file in .docuflow/sources/ that relates to the changed files above,`,
    `   call ingest_source({ project_path: "${projectPath}", source_filename: "<file>" })`,
    `   If no sources relate to the changes, ingest all source files.`,
    `3. Call update_index({ project_path: "${projectPath}" }) — rebuild the catalog`,
    `4. Call lint_wiki({ project_path: "${projectPath}", check_type: "all" }) — health check`,
    `5. Report: pages before/after, health score, and any HIGH severity issues found.`,
    ``,
    `Be concise. Do not explain each step — just do it and report results.`,
  ].join("\n");
}

function buildCopilotLintPrompt(projectPath: string): string {
  return [
    `You are the DocuFlow wiki maintainer for the project at: ${projectPath}`,
    ``,
    `Run a scheduled wiki health check using docuflow MCP tools:`,
    `1. Call lint_wiki({ project_path: "${projectPath}", check_type: "all" })`,
    `2. If health_score < 80, call lint_wiki with check_type="orphans" and "stale"`,
    `3. Report: health score, issue counts by type, top 3 recommendations`,
    ``,
    `Keep it brief.`,
  ].join("\n");
}

/**
 * Run Copilot CLI non-interactively.
 * Copilot directly calls DocuFlow MCP tools — no intermediate doc generation needed.
 * Returns the assistant's final text response, or null on failure.
 */
function runCopilotCLI(prompt: string, timeoutMs = 120_000): string | null {
  const result = spawnSync(
    "copilot",
    [
      "--prompt", prompt,
      "--allow-all-tools",
      "--allow-all-paths",
      "--no-ask-user",
      "--output-format", "json",
    ],
    { encoding: "utf8", timeout: timeoutMs }
  );

  if (result.error || result.status !== 0) {
    const err = result.stderr?.slice(0, 200) ?? String(result.error ?? "unknown");
    log("❌", c.red(`Copilot error: ${err}`));
    return null;
  }

  // Parse JSONL stream — extract the final assistant.message content
  let lastMessage: string | null = null;
  for (const line of (result.stdout ?? "").split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === "assistant.message" && obj.data?.content) {
        lastMessage = obj.data.content;
      }
    } catch {}
  }
  return lastMessage;
}

// ─── Claude bridge (DIRECT MCP tool calling) ─────────────────────────────────
//
// Since docuflow is registered in Claude's MCP config (via claude_desktop_config.json
// or CLAUDE.md), Claude Code CLI can also directly call DocuFlow MCP tools.
//

function buildClaudeSyncPrompt(projectPath: string, changedFiles: string[]): string {
  // Same intent as Copilot but Claude uses its own MCP config
  return buildCopilotSyncPrompt(projectPath, changedFiles);
}

// Module-level flag: set once in run() before any watchers fire.
// Controls whether --dangerously-skip-permissions is passed to Claude CLI.
// Requires explicit --allow-dangerous-permissions opt-in from the user.
let _allowDangerousPermissions = false;

function runClaudeCLI(prompt: string, timeoutMs = 120_000): string | null {
  let serverBin: string;
  try {
    serverBin = require.resolve("@doquflow/studio/dist/mcp/index.js");
  } catch {
    serverBin = path.resolve(__dirname, "../../studio/dist/mcp/index.js");
  }
  const mcpConfig = JSON.stringify({
    mcpServers: { docuflow: { type: "stdio", command: process.execPath, args: [serverBin] } }
  });

  const claudeArgs = ["--print", "--mcp-config", mcpConfig];
  if (_allowDangerousPermissions) {
    claudeArgs.splice(1, 0, "--dangerously-skip-permissions");
  }

  const result = spawnSync(
    "claude",
    claudeArgs,
    { input: prompt, encoding: "utf8", timeout: timeoutMs, env: { ...process.env as any } }
  );

  if (result.error || result.status !== 0) {
    log("❌", c.red(`Claude CLI error: ${result.stderr?.slice(0, 200) ?? "unknown"}`));
    return null;
  }
  const out = result.stdout?.trim() ?? "";
  if (!out || out.includes("Invalid API key") || out.includes("authentication")) return null;
  return out || null;
}

// ─── Codex / API bridges (generate doc → save → ingest fallback) ─────────────

async function runCodexCLI(prompt: string, timeoutMs = 90_000): Promise<string | null> {
  const result = spawnSync("codex", [prompt], { encoding: "utf8", timeout: timeoutMs });
  return result.status === 0 ? result.stdout?.trim() ?? null : null;
}

async function callAnthropicAPI(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const https = require("https");
  const body = JSON.stringify({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res: any) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)?.content?.[0]?.text ?? null); }
          catch { resolve(null); }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(90_000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// ─── Doc-generation prompt (for codex/api fallback that can't call MCP tools) ─

function buildDocGenPrompt(projectPath: string, changedFiles: string[]): string {
  return [
    `You are maintaining documentation for a software project.`,
    `These files just changed:`,
    changedFiles.slice(0, 5).map(f => `- ${path.relative(projectPath, f)}`).join("\n"),
    ``,
    `Write a concise markdown document (200-500 words) capturing:`,
    `1. What these files do / what changed`,
    `2. Key classes, functions, or concepts`,
    `3. Dependencies or config references`,
    ``,
    `Markdown only. Start with a # heading. No preamble.`,
  ].join("\n");
}

// ─── Core sync dispatcher ─────────────────────────────────────────────────────

async function syncWithAI(
  projectPath: string,
  changedFiles: string[],
  bridge: AIBridge,
  depth: number = 0
): Promise<void> {
  if (bridge === "none" || depth >= 4) {
    await directIngestAll(projectPath);
    return;
  }

  const bridgeLabel = bridge === "copilot" ? "Copilot" : bridge === "claude" ? "Claude" : bridge === "codex" ? "Codex" : "API";
  log("🤖", `${changedFiles.length} file(s) changed — asking ${c.cyan(bridgeLabel)} to update wiki...`);

  // Copilot and Claude: DIRECT MCP tool calling
  if (bridge === "copilot") {
    const prompt = buildCopilotSyncPrompt(projectPath, changedFiles);
    const result = runCopilotCLI(prompt);
    if (result) {
      log("✅", c.green(`Copilot updated wiki directly via MCP tools`));
      console.log(c.dim(`     ${result.replace(/\n/g, "\n     ")}`));
    } else {
      const next = getNextBridge(bridge);
      await recordFailover(projectPath, bridge, next, "no output");
      log("⚠️ ", c.yellow(`Copilot failed — falling over to ${next}`));
      await syncWithAI(projectPath, changedFiles, next, depth + 1);
    }
    return;
  }

  if (bridge === "claude") {
    const prompt = buildClaudeSyncPrompt(projectPath, changedFiles);
    const result = runClaudeCLI(prompt);
    if (result) {
      log("✅", c.green(`Claude updated wiki directly via MCP tools`));
      console.log(c.dim(`     ${result.replace(/\n/g, "\n     ")}`));
    } else {
      const next = getNextBridge(bridge);
      await recordFailover(projectPath, bridge, next, "no output");
      log("⚠️ ", c.yellow(`Claude failed — falling over to ${next}`));
      await syncWithAI(projectPath, changedFiles, next, depth + 1);
    }
    return;
  }

  // Codex and API: generate doc text → save as source → ingest
  let docContent: string | null = null;
  const docPrompt = buildDocGenPrompt(projectPath, changedFiles);

  if (bridge === "codex") {
    docContent = await runCodexCLI(docPrompt);
  } else if (bridge === "api") {
    docContent = await callAnthropicAPI(docPrompt);
  }

  if (!docContent) {
    const next = getNextBridge(bridge);
    await recordFailover(projectPath, bridge, next, "no output");
    log("⚠️ ", c.yellow(`${bridgeLabel} failed — falling over to ${next}`));
    await syncWithAI(projectPath, changedFiles, next, depth + 1);
    return;
  }

  // Save AI-generated doc to sources/
  const sourcesDir = path.join(projectPath, ".docuflow", "sources");
  await fsp.mkdir(sourcesDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const autoFilename = `auto_sync_${timestamp}.md`;
  await fsp.writeFile(path.join(sourcesDir, autoFilename), docContent, "utf8");
  log("💾", `AI doc saved → ${c.cyan(autoFilename)}`);

  await directIngest(projectPath, autoFilename);
}

async function scheduledLintWithAI(projectPath: string, bridge: AIBridge, depth: number = 0): Promise<void> {
  if (bridge === "none" || depth >= 4) {
    // Lint is best-effort — silent return at terminal level (no directIngestAll)
    return;
  }

  if (bridge === "copilot") {
    log("🔍", `Running scheduled lint via ${c.cyan("Copilot")} (direct MCP call)...`);
    const result = runCopilotCLI(buildCopilotLintPrompt(projectPath));
    if (result) {
      console.log(c.dim(`     ${result.replace(/\n/g, "\n     ")}`));
    } else {
      const next = getNextBridge(bridge);
      await recordFailover(projectPath, bridge, next, "no output during lint");
      log("⚠️ ", c.yellow(`Copilot lint failed — falling over to ${next}`));
      await scheduledLintWithAI(projectPath, next, depth + 1);
    }
    return;
  }

  if (bridge === "claude") {
    log("🔍", `Running scheduled lint via ${c.cyan("Claude")} (direct MCP call)...`);
    const result = runClaudeCLI(buildCopilotLintPrompt(projectPath));
    if (result) {
      console.log(c.dim(`     ${result.replace(/\n/g, "\n     ")}`));
    } else {
      const next = getNextBridge(bridge);
      await recordFailover(projectPath, bridge, next, "no output during lint");
      log("⚠️ ", c.yellow(`Claude lint failed — falling over to ${next}`));
      await scheduledLintWithAI(projectPath, next, depth + 1);
    }
    return;
  }

  const next = getNextBridge(bridge);
  log("ℹ️ ", c.dim(`${bridge} cannot perform MCP lint — escalating to ${next}`));
  await scheduledLintWithAI(projectPath, next, depth + 1);
}

// ─── Direct tool calls (no AI) ───────────────────────────────────────────────

async function directIngest(projectPath: string, filename: string): Promise<void> {
  const { ingestSource } = loadServerTool("ingest-source");
  const { updateIndex }  = loadServerTool("update-index");
  log("📥", `Ingesting ${c.cyan(filename)}...`);
  const result = await ingestSource({ project_path: projectPath, source_filename: filename });
  const created = result.pages_created?.length ?? 0;
  log(created > 0 ? "✅" : "⚠️ ", created > 0
    ? c.green(`${created} wiki pages created/updated`)
    : c.yellow("No pages created — check source content"));
  await updateIndex({ project_path: projectPath });
  log("📋", "Index rebuilt");
}

async function directIngestAll(projectPath: string): Promise<void> {
  const sourcesDir = path.join(projectPath, ".docuflow", "sources");
  try {
    const files = (await fsp.readdir(sourcesDir)).filter(f => f.endsWith(".md") && !f.startsWith("auto_sync_"));
    for (const f of files) {
      await directIngest(projectPath, f);
    }
  } catch {}
}

// ─── Debounce helper ─────────────────────────────────────────────────────────

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// ─── File extension filter ───────────────────────────────────────────────────

const DEFAULT_CODE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs",
  ".py", ".go", ".rb", ".java", ".cs",
  ".php", ".rs", ".kt", ".swift", ".vue",
]);

// ─── Main watch daemon ───────────────────────────────────────────────────────

export interface WatchOptions {
  projectPath?: string;
  ai?: boolean;
  forceCopilot?: boolean;
  forceClaude?: boolean;
  forceCodex?: boolean;
  lintIntervalHours?: number;
  codeExtensions?: string[];
  allowDangerousPermissions?: boolean;  // pass --dangerously-skip-permissions to Claude CLI
}

// ─── PID file helpers (shared with watch-stop / watch-status) ────────────────

export interface FailoverRecord {
  count: number;           // total failovers since daemon started
  last_at: string | null;  // ISO-8601 timestamp of most recent failover
  from: AIBridge | null;   // bridge that failed
  to: AIBridge | null;     // bridge chosen as replacement
  reason: string | null;   // "no output" or trimmed error message (≤120 chars)
}

export interface WatchPidData {
  pid: number;
  started_at: string;
  bridge: AIBridge;         // originally selected bridge at daemon start
  active_bridge: AIBridge;  // currently effective bridge (may differ after failovers)
  project_path: string;
  options: {
    ai: boolean;
    forceCopilot: boolean;
    forceClaude: boolean;
    forceCodex: boolean;
    lintIntervalHours: number;
    codeExtensions?: string[];
  };
  failover: FailoverRecord;
}

export function getNextBridge(current: AIBridge): AIBridge {
  const chain: AIBridge[] = ["copilot", "claude", "codex", "api", "none"];
  const idx = chain.indexOf(current);
  return (idx !== -1 && idx + 1 < chain.length) ? chain[idx + 1] : "none";
}

export async function recordFailover(
  projectPath: string,
  from: AIBridge,
  to: AIBridge,
  reason: string
): Promise<void> {
  try {
    const data = await readPidFile(projectPath);
    if (!data) return;
    if (!data.failover) {
      data.failover = { count: 0, last_at: null, from: null, to: null, reason: null };
    }
    data.failover.count += 1;
    data.failover.last_at = new Date().toISOString();
    data.failover.from = from;
    data.failover.to = to;
    data.failover.reason = reason.slice(0, 120);
    data.active_bridge = to;
    try { await writePidFile(projectPath, data); } catch {}
  } catch {}
}

export function getPidFilePath(projectPath: string): string {
  return path.join(projectPath, ".docuflow", "watch.pid");
}

export async function writePidFile(projectPath: string, data: WatchPidData): Promise<void> {
  const pidFile = getPidFilePath(projectPath);
  await fsp.writeFile(pidFile, JSON.stringify(data, null, 2), "utf8");
}

export async function removePidFile(projectPath: string): Promise<void> {
  try { await fsp.unlink(getPidFilePath(projectPath)); } catch {}
}

export async function readPidFile(projectPath: string): Promise<WatchPidData | null> {
  try {
    const content = await fsp.readFile(getPidFilePath(projectPath), "utf8");
    return JSON.parse(content) as WatchPidData;
  } catch {
    return null;
  }
}

/** Returns true if the process in the PID file is still alive. */
export function isProcessAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch { return false; }
}

export async function run(options: WatchOptions = {}): Promise<void> {
  const projectPath = path.resolve(options.projectPath ?? process.cwd());
  const docuDir     = path.join(projectPath, ".docuflow");
  const sourcesDir  = path.join(docuDir, "sources");

  if (!fs.existsSync(docuDir)) {
    console.error(c.red(`  ✗ .docuflow/ not found at ${projectPath}`));
    console.error(`    Run "docuflow init" first.`);
    process.exit(1);
  }

  // Set module-level flag before any watchers or timers are created
  _allowDangerousPermissions = !!options.allowDangerousPermissions;
  if (_allowDangerousPermissions) {
    console.warn(c.yellow("  ⚠  --allow-dangerous-permissions: Claude CLI will skip all permission prompts."));
    console.warn(c.yellow("     Ensure file content in this project is trusted — injected instructions will execute without safeguards."));
  }

  await fsp.mkdir(sourcesDir, { recursive: true });

  // ── Check for already-running daemon ───────────────────────────────────
  const existing = await readPidFile(projectPath);
  if (existing && isProcessAlive(existing.pid)) {
    console.error(c.yellow(`  ⚠  Watch daemon already running for this project`));
    console.error(`     PID: ${existing.pid}  Bridge: ${existing.bridge}`);
    console.error(`     Started: ${new Date(existing.started_at).toLocaleString()}`);
    console.error(`     Run ${c.cyan("docuflow watch stop")} to stop it first.`);
    process.exit(1);
  }
  // Stale PID file (process died without cleanup)
  if (existing) await removePidFile(projectPath);

  const bridge = detectBridge({
    useAI:        !!options.ai,
    forceCopilot: !!options.forceCopilot,
    forceClaude:  !!options.forceClaude,
    forceCodex:   !!options.forceCodex,
  });

  // Cap at Node.js max safe setInterval value (24.8 days = 2^31-1 ms)
  const MAX_INTERVAL_MS = 2_147_483_647;
  const lintMs = Math.min((options.lintIntervalHours ?? 24) * 3_600_000, MAX_INTERVAL_MS);
  const customExts = options.codeExtensions
    ? new Set(options.codeExtensions.map(e => e.startsWith(".") ? e : `.${e}`))
    : undefined;

  const bridgeLabel = bridge === "none" ? c.dim("off (sources-only)")
    : bridge === "copilot" ? c.green("copilot — direct MCP calling ⚡")
    : bridge === "claude"  ? c.green("claude  — direct MCP calling ⚡")
    : bridge === "codex"   ? c.yellow("codex   — doc generation + ingest")
    : c.yellow("api     — doc generation + ingest");

  console.log();
  console.log(c.bold("  🔄 DocuFlow Watch Daemon"));
  console.log("  ─────────────────────────────────────────────────");
  console.log(`  Project:       ${projectPath}`);
  console.log(`  AI bridge:     ${bridgeLabel}`);
  console.log(`  Lint every:    ${options.lintIntervalHours ?? 24}h`);
  if (bridge === "copilot" || bridge === "claude") {
    console.log(`  ${c.cyan("⚡ AI drives DocuFlow MCP tools directly (no intermediate step)")}`);
  }
  console.log("  ─────────────────────────────────────────────────");
  console.log(c.dim("  Press Ctrl+C to stop  |  docuflow watch stop  to stop from another terminal\n"));

  // ── Write PID file so other terminals can stop/status this daemon ────────
  await writePidFile(projectPath, {
    pid:         process.pid,
    started_at:  new Date().toISOString(),
    bridge,
    active_bridge: bridge,
    project_path: projectPath,
    options: {
      ai:               !!options.ai,
      forceCopilot:     !!options.forceCopilot,
      forceClaude:      !!options.forceClaude,
      forceCodex:       !!options.forceCodex,
      lintIntervalHours: options.lintIntervalHours ?? 24,
      codeExtensions:   options.codeExtensions,
    },
    failover: {
      count: 0,
      last_at: null,
      from: null,
      to: null,
      reason: null,
    },
  });
  log("💾", `PID ${process.pid} written to ${c.dim(".docuflow/watch.pid")}`);

  // ── Watch 1: .docuflow/sources/ ─────────────────────────────────────────
  const pendingCodeFiles = new Set<string>();

  const debouncedCodeSync = debounce(async () => {
    const files = Array.from(pendingCodeFiles);
    pendingCodeFiles.clear();
    if (files.length > 0) {
      await syncWithAI(projectPath, files, bridge).catch(e =>
        log("❌", c.red(`Sync error: ${e.message}`))
      );
    }
  }, 3000);

  // Debounced sources ingest — prevents double-fire on macOS (fs.watch fires 'rename' twice)
  const pendingSourceFiles = new Set<string>();
  const debouncedSourceSync = debounce(async () => {
    const files = Array.from(pendingSourceFiles);
    pendingSourceFiles.clear();
    for (const filename of files) {
      await directIngest(projectPath, filename).catch(e =>
        log("❌", c.red(`Ingest error: ${e.message}`))
      );
    }
  }, 500); // 500ms debounce catches macOS double-fire

  const sourcesWatcher = fs.watch(sourcesDir, { persistent: true }, (event, filename) => {
    if (!filename || !filename.endsWith(".md")) return;
    if (filename.startsWith("auto_sync_")) return; // prevent loop
    log("📄", `Source changed: ${c.cyan(filename)} (${event})`);
    pendingSourceFiles.add(filename);
    debouncedSourceSync();
  });
  log("👁 ", `Watching ${c.cyan(".docuflow/sources/")} → direct ingest on change`);

  // Declare outside if-block so shutdown() can reference it
  let codeWatcher: fs.FSWatcher | null = null;

  // ── Watch 2: project code files (AI bridge only) ─────────────────────────
  if (bridge !== "none") {
    codeWatcher = fs.watch(
      projectPath,
      { persistent: true, recursive: true },
      (event, filename) => {
        if (!filename) return;
        if (/^(\.docuflow|node_modules|dist|build|\.git)/.test(filename)) return;
        const ext = path.extname(filename).toLowerCase();
        if (!(customExts ?? DEFAULT_CODE_EXTS).has(ext)) return;
        pendingCodeFiles.add(path.join(projectPath, filename));
        debouncedCodeSync();
      }
    );
    const extList = customExts ? [...customExts].join(",") : "ts,js,py,go,rb,java,cs,...";
    log("👁 ", `Watching project code [${c.cyan(extList)}] → ${bridge === "copilot" || bridge === "claude" ? "AI calls MCP tools directly" : "AI generates doc → ingest"}`);
  }

  // ── Scheduled lint ───────────────────────────────────────────────────────
  const lintTimer = setInterval(async () => {
    await scheduledLintWithAI(projectPath, bridge).catch(e =>
      log("❌", c.red(`Lint error: ${e.message}`))
    );
  }, lintMs);

  // Initial lint after 5s startup delay
  setTimeout(() => {
    scheduledLintWithAI(projectPath, bridge).catch(() => {});
  }, 5000);

  log("⏰", `Lint schedule: every ${options.lintIntervalHours ?? 24}h`);

  // ── Graceful shutdown (single handler — covers both watchers) ───────────
  const shutdown = async (signal: string) => {
    if (signal === "SIGINT") console.log();
    log("🛑", `Stopping watch daemon (${signal})...`);
    sourcesWatcher.close();
    if (codeWatcher) codeWatcher.close();
    clearInterval(lintTimer);
    await removePidFile(projectPath);
    log("✅", c.green("Watch daemon stopped. PID file removed."));
    process.exit(0);
  };
  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGHUP",  () => shutdown("SIGHUP"));

  await new Promise(() => {}); // keep alive
}
