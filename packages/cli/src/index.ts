#!/usr/bin/env node
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json') as { version: string };

const args = process.argv.slice(2);
const [cmd, ...rest] = args;

// ── Simple arg parser ────────────────────────────────────────────────────────
function hasFlag(...flags: string[]): boolean {
  return flags.some(f => rest.includes(f));
}
function getFlagValue(flag: string): string | undefined {
  const idx = rest.indexOf(flag);
  return idx !== -1 ? rest[idx + 1] : undefined;
}

if (cmd === '--version' || cmd === '-v') {
  console.log(version);
} else if (cmd === 'init') {
  if (hasFlag('--interactive', '-i')) {
    import('./commands/init-interactive').then(m => m.runInteractive());
  } else {
    import('./commands/init').then(m => m.run());
  }
} else if (cmd === 'status') {
  import('./commands/status').then(m => m.run());
} else if (cmd === 'suggest') {
  import('./commands/suggest').then(m => m.run());

// ── NEW: watch — auto-sync daemon ───────────────────────────────────────────
} else if (cmd === 'watch') {
  const subCmd = rest[0];

  if (subCmd === 'stop') {
    import('./commands/watch-stop').then(m => m.runStop(process.cwd()));

  } else if (subCmd === 'status') {
    import('./commands/watch-stop').then(m => m.runStatus(process.cwd()));

  } else if (subCmd === 'restart') {
    import('./commands/watch-stop').then(m => m.runRestart(process.cwd()));

  } else {
    // Normal watch start
    const lintHours = getFlagValue('--lint-interval');
    const codeExt   = getFlagValue('--code-ext');
    import('./commands/watch').then(m =>
      m.run({
        ai:                hasFlag('--ai'),
        forceCopilot:      hasFlag('--copilot'),
        forceClaude:       hasFlag('--claude'),
        forceCodex:        hasFlag('--codex'),
        lintIntervalHours: lintHours ? Number(lintHours) : 24,
        codeExtensions:    codeExt ? codeExt.split(',') : undefined,
      })
    );
  }

// ── NEW: sync — one-shot sync for CI/CD and git hooks ───────────────────────
} else if (cmd === 'sync') {
  const sinceCommit = getFlagValue('--since-commit');
  const sourceFile  = getFlagValue('--source');
  const failScore   = getFlagValue('--fail-on-score');
  import('./commands/sync').then(m =>
    m.run({
      ai:           hasFlag('--ai'),
      forceCopilot: hasFlag('--copilot'),
      forceClaude:  hasFlag('--claude'),
      forceCodex:   hasFlag('--codex'),
      sinceCommit,
      sourceFile,
      noLint:       hasFlag('--no-lint'),
      failOnScore:  failScore ? Number(failScore) : 70,
      quiet:        hasFlag('--quiet', '-q'),
    })
  );

} else {
  console.log(`DocuFlow v${version}`);
  console.log('');
  console.log('Usage: docuflow <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  init                    Register DocuFlow MCP and generate CLAUDE.md');
  console.log('  init --interactive      Interactive setup wizard');
  console.log('  status                  Show wiki health, page counts, and MCP status');
  console.log('  suggest                 Show what to document first (domain-specific)');
  console.log('  watch                   Start auto-sync daemon (watches for changes)');
  console.log('  watch --ai              Auto-detect best AI bridge (copilot > claude > codex > api)');
  console.log('  watch --ai --copilot    Force @github/copilot CLI (direct MCP tool calling ⚡)');
  console.log('  watch --ai --claude     Force Claude Code CLI    (direct MCP tool calling ⚡)');
  console.log('  watch --ai --codex      Force Codex CLI          (generates doc → ingest)');
  console.log('  watch --lint-interval N Run lint every N hours (default: 24)');
  console.log('  watch --code-ext ts,py  Watch only these file extensions');
  console.log('  watch stop              Stop the running watch daemon for this project');
  console.log('  watch status            Show daemon state: running/stopped, PID, uptime, bridge');
  console.log('  watch restart           Stop current daemon and restart with same options');
  console.log('  sync                    One-shot sync: ingest all sources + rebuild index');
  console.log('  sync --ai               AI-powered sync (auto-detects bridge)');
  console.log('  sync --ai --copilot     Copilot drives DocuFlow MCP tools directly ⚡');
  console.log('  sync --ai --claude      Claude drives DocuFlow MCP tools directly ⚡');
  console.log('  sync --ai --codex       Codex generates doc → ingest');
  console.log('  sync --since-commit REF Diff code changes since git ref (e.g. HEAD~1)');
  console.log('  sync --source FILE      Sync a single source file');
  console.log('  sync --no-lint          Skip health check (faster)');
  console.log('  sync --fail-on-score N  Exit 1 if health score < N (default: 70)');
  console.log('  sync --quiet            Suppress output (CI mode)');
  console.log('');
  console.log('Options:');
  console.log('  --version, -v           Print version number');
  console.log('');
  console.log('AI bridge priority (for --ai flag):');
  console.log('  1. copilot  (@github/copilot) — calls DocuFlow MCP tools directly ⚡');
  console.log('  2. claude   (Claude Code CLI) — calls DocuFlow MCP tools directly ⚡');
  console.log('  3. codex    (OpenAI Codex CLI) — generates doc text, then ingests');
  console.log('  4. api      (ANTHROPIC_API_KEY env) — generates doc text, then ingests');
  console.log('  Use --copilot / --claude / --codex to override auto-detection.');
}
