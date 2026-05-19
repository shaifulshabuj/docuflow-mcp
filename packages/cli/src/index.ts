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

// ── query — ask the wiki ──────────────────────────────────────────────────────
} else if (cmd === 'query') {
  const question = rest[0] ?? '';
  const maxSourcesFlag = getFlagValue('--max-sources');
  import('./commands/query').then(m =>
    m.run({
      question,
      maxSources: maxSourcesFlag ? parseInt(maxSourcesFlag, 10) : 5,
      json:       hasFlag('--json'),
      noCite:     hasFlag('--no-cite'),
      saveAs:     getFlagValue('--save-as'),
      quiet:      hasFlag('--quiet', '-q'),
    })
  );

} else if (cmd === 'suggest') {
  import('./commands/suggest').then(m => m.run());

// ── ui / start — web interface ───────────────────────────────────────────────
} else if (cmd === 'ui' || cmd === 'start') {
  const portFlag = getFlagValue('--port');
  import('./commands/ui').then(m =>
    m.run({
      port:   portFlag ? parseInt(portFlag, 10) : undefined,
      noOpen: hasFlag('--no-open'),
    })
  );

// ── watch — auto-sync daemon ─────────────────────────────────────────────────
} else if (cmd === 'watch') {
  const subCmd = rest[0];

  if (subCmd === 'stop') {
    import('./commands/watch-stop').then(m => m.runStop(process.cwd()));

  } else if (subCmd === 'status') {
    import('./commands/watch-stop').then(m => m.runStatus(process.cwd()));

  } else if (subCmd === 'restart') {
    import('./commands/watch-stop').then(m => m.runRestart(process.cwd()));

  } else {
    const lintHours = getFlagValue('--lint-interval');
    const codeExt   = getFlagValue('--code-ext');
    import('./commands/watch').then(m =>
      m.run({
        ai:                         hasFlag('--ai'),
        forceCopilot:               hasFlag('--copilot'),
        forceClaude:                hasFlag('--claude'),
        forceCodex:                 hasFlag('--codex'),
        lintIntervalHours:          lintHours ? Number(lintHours) : 24,
        codeExtensions:             codeExt ? codeExt.split(',') : undefined,
        allowDangerousPermissions:  hasFlag('--allow-dangerous-permissions'),
      })
    );
  }

// ── sync — one-shot sync for CI/CD and git hooks ─────────────────────────────
} else if (cmd === 'sync') {
  const sinceCommit = getFlagValue('--since-commit');
  const sourceFile  = getFlagValue('--source');
  const failScore   = getFlagValue('--fail-on-score');
  import('./commands/sync').then(m =>
    m.run({
      ai:                         hasFlag('--ai'),
      forceCopilot:               hasFlag('--copilot'),
      forceClaude:                hasFlag('--claude'),
      forceCodex:                 hasFlag('--codex'),
      sinceCommit,
      sourceFile,
      noLint:                     hasFlag('--no-lint'),
      failOnScore:                failScore ? Number(failScore) : 70,
      quiet:                      hasFlag('--quiet', '-q'),
      allowDangerousPermissions:  hasFlag('--allow-dangerous-permissions'),
    })
  );

// ── review — git change review & improvement suggestions ───────────────────────
} else if (cmd === 'review') {
  import('./commands/review').then(m =>
    m.run({
      staged: hasFlag('--staged'),
      sinceCommit: getFlagValue('--since-commit'),
      ai: hasFlag('--ai'),
      failOnCritical: hasFlag('--fail-on-critical'),
      quiet: hasFlag('--quiet', '-q'),
    })
  );

// ── update — reinstall latest @doquflow/cli globally ─────────────────────────
} else if (cmd === 'update' || cmd === 'upgrade') {
  import('./commands/update').then(m =>
    m.run({
      check: hasFlag('--check'),
      force: hasFlag('--force'),
    })
  );

// ── recent — show recent DevLoop task activity ────────────────────────────────
} else if (cmd === 'recent') {
  const daysFlag = getFlagValue('--days');
  const fmt = getFlagValue('--format') as 'table' | 'md' | undefined;
  import('./commands/recent').then(m =>
    m.run({
      days:   daysFlag ? (isNaN(parseInt(daysFlag, 10)) ? 7 : parseInt(daysFlag, 10)) : 7,
      format: fmt ?? 'table',
    })
  );

// ── rewiki — re-ingest all sources with new extractor rules ──────────────────
} else if (cmd === 'rewiki') {
  import('./commands/rewiki').then(m =>
    m.run({
      dryRun:   hasFlag('--dry-run'),
      noBackup: hasFlag('--no-backup'),
      quiet:    hasFlag('--quiet', '-q'),
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
  console.log('  ui                      Start the DocuFlow web interface (API + UI on port 48821)');
  console.log('  start                   Alias for "ui" — same web interface');
  console.log('  ui --port <n>           Use a custom port (default: 48821)');
  console.log('  ui --no-open            Start server without auto-opening the browser');
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
  console.log('  review                  Review current git changes and suggest improvements');
  console.log('  review --staged         Review staged changes only');
  console.log('  review --since-commit REF Review changes since git ref (e.g. HEAD~1)');
  console.log('  review --ai             Append Copilot AI review to deterministic findings');
  console.log('  review --fail-on-critical Exit 1 if critical findings are detected');
  console.log('  review --quiet          Compact output for CI/scripting');
  console.log('  update                  Reinstall latest @doquflow/cli globally (refreshes UI + server)');
  console.log('  update --check          Check whether a newer version is published (no install)');
  console.log('  update --force          Reinstall even when already on the latest version');
  console.log('  upgrade                 Alias for "update"');
  console.log('  recent [--days N] [--format table|md]   Show recent DevLoop task activity');
  console.log('  rewiki                  Re-ingest all sources with current extractor rules (migration)');
  console.log('  rewiki --dry-run        Preview what would change without writing anything');
  console.log('  rewiki --no-backup      Skip wiki backup (faster, irreversible)');
  console.log('  rewiki --quiet          Suppress output (CI mode)');
  console.log('');
  console.log('Options:');
  console.log('  --version, -v                    Print version number');
  console.log('  --allow-dangerous-permissions    Pass --dangerously-skip-permissions to Claude CLI');
  console.log('                                   Required for Claude bridge in non-interactive use.');
  console.log('                                   Only use when file content in this project is trusted.');
  console.log('');
  console.log('AI bridge priority (for --ai flag):');
  console.log('  1. copilot  (@github/copilot) — calls DocuFlow MCP tools directly ⚡');
  console.log('  2. claude   (Claude Code CLI) — calls DocuFlow MCP tools directly ⚡');
  console.log('  3. codex    (OpenAI Codex CLI) — generates doc text, then ingests');
  console.log('  4. api      (ANTHROPIC_API_KEY env) — generates doc text, then ingests');
  console.log('  Use --copilot / --claude / --codex to override auto-detection.');
}
