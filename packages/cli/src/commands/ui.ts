/**
 * docuflow ui / docuflow start
 *
 * Starts the DocuFlow web interface — a single Express server on port 48821 that serves:
 *   • All /api/* routes (projects, wiki, health, activity, ask, search)
 *   • Static Vite build from ui-dist/ (bundled with this CLI package)
 *   • SPA fallback — any non-API, non-asset route returns index.html
 *
 * The built UI targets http://localhost:48821 for all API calls, so API + UI
 * share the same origin with zero CORS friction.
 */

import { exec }   from 'node:child_process';
import path       from 'node:path';
import fs         from 'node:fs';
import fsp        from 'node:fs/promises';
import express    from 'express';
import cors       from 'cors';

// ── Tool loader ───────────────────────────────────────────────────────────────
// Server tools live in @doquflow/server/dist/tools/<name>.js (CommonJS).
// We load them at runtime to keep TypeScript declarations clean.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolFn = (args: Record<string, any>) => Promise<any>;

function loadTool(file: string, exportName: string): ToolFn {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require(`@doquflow/server/dist/tools/${file}`) as Record<string, ToolFn>)[exportName];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findDocuflowProjects(scanRoot: string): Promise<string[]> {
  const found: string[] = [];
  try {
    const entries = await fsp.readdir(scanRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(scanRoot, entry.name);
      if (fs.existsSync(path.join(candidate, '.docuflow'))) found.push(candidate);
    }
  } catch { /* dir may not exist */ }
  return found;
}

async function parseLastIngest(docuDir: string): Promise<string> {
  try {
    const log = await fsp.readFile(path.join(docuDir, 'log.md'), 'utf8');
    const match = log.match(/(\d{4}-\d{2}-\d{2}T[\d:.Z+-]+).*ingest/i);
    if (match) {
      const diffMs = Date.now() - new Date(match[1]).getTime();
      const diffH  = Math.floor(diffMs / 3_600_000);
      if (diffH < 1)  return 'just now';
      if (diffH < 24) return `${diffH}h ago`;
      return `${Math.floor(diffH / 24)}d ago`;
    }
  } catch { /* no log yet */ }
  return 'never';
}

async function countMdFiles(dir: string): Promise<number> {
  try {
    return (await fsp.readdir(dir)).filter(f => f.endsWith('.md')).length;
  } catch { return 0; }
}

interface ProjectStats {
  name: string; path: string; health: number; pages: number;
  sources: number; entities: number; specs: number;
  lastIngest: string; syncStatus: string;
}

async function getProjectStats(
  projectPath: string,
  lintWiki: ToolFn,
): Promise<ProjectStats> {
  const docuDir = path.join(projectPath, '.docuflow');
  const wikiDir = path.join(docuDir, 'wiki');

  const [entities, concepts, timelines, syntheses, specs, sources, lastIngest] =
    await Promise.all([
      countMdFiles(path.join(wikiDir, 'entities')),
      countMdFiles(path.join(wikiDir, 'concepts')),
      countMdFiles(path.join(wikiDir, 'timelines')),
      countMdFiles(path.join(wikiDir, 'syntheses')),
      countMdFiles(path.join(docuDir, 'specs')),
      countMdFiles(path.join(docuDir, 'sources')),
      parseLastIngest(docuDir),
    ]);

  const totalPages = entities + concepts + timelines + syntheses;
  let health = 0;
  try {
    const lint = await lintWiki({ project_path: projectPath }) as { health_score?: number };
    health = typeof lint.health_score === 'number' ? lint.health_score : 0;
  } catch { health = totalPages > 0 ? 70 : 0; }

  return {
    name: path.basename(projectPath),
    path: projectPath,
    health, pages: totalPages, sources, entities, specs, lastIngest,
    syncStatus: totalPages > 0 ? 'live' : 'not initialized',
  };
}

function parseActivityLog(logContent: string): Array<{
  t: string; tool: string; target: string; kind: string; delta: string;
}> {
  const activity: Array<{ t: string; tool: string; target: string; kind: string; delta: string }> = [];
  const headingRe = /^##\s+\[([^\]]+)\]\s+([^|]+?)(?:\s*\|\s*(.+))?$/;

  for (const line of logContent.split('\n')) {
    const trimmed = line.trim();

    // Format: ## [2026-05-07T05:13:30.675Z] tool | description
    const hMatch = trimmed.match(headingRe);
    if (hMatch) {
      const [, timestamp, toolRaw, descRaw] = hMatch;
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) continue;
      const diffH = Math.floor((Date.now() - d.getTime()) / 3_600_000);
      const t     = diffH < 1 ? '<1h' : diffH < 24 ? `${diffH}h` : `${Math.floor(diffH / 24)}d`;
      const tool  = toolRaw.trim();
      activity.push({
        t, tool, target: descRaw?.trim() ?? '', delta: '',
        kind: tool.includes('ingest') ? 'ingest'
          : tool.includes('query') || tool.includes('search') ? 'query'
          : tool.includes('lint') ? 'lint'
          : tool.includes('index') ? 'index'
          : 'read',
      });
      continue;
    }

    // Legacy format: timestamp | tool | target | delta
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
      const parts = trimmed.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        const d = new Date(parts[0]);
        if (isNaN(d.getTime())) continue;
        const diffH = Math.floor((Date.now() - d.getTime()) / 3_600_000);
        const t    = diffH < 1 ? '<1h' : diffH < 24 ? `${diffH}h` : `${Math.floor(diffH / 24)}d`;
        const tool = parts[1] ?? '';
        activity.push({
          t, tool, target: parts[2] ?? '', delta: parts[3] ?? '',
          kind: tool.includes('ingest') ? 'ingest'
            : tool.includes('query') || tool.includes('search') ? 'query'
            : tool.includes('lint') ? 'lint'
            : tool.includes('index') ? 'index'
            : 'read',
        });
      }
    }
  }

  return activity.slice(-10).reverse();
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32'  ? `start "" "${url}"` :
                                    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(`  (Could not auto-open browser — visit ${url} manually)`);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface UiOptions {
  /** HTTP port. Defaults to 48821 (matches the UI's hardcoded API_BASE). */
  port?: number;
  /** Skip auto-opening the browser. */
  noOpen?: boolean;
}

export async function run(opts: UiOptions = {}): Promise<void> {
  const port = opts.port ?? (
    process.env.DOCUFLOW_PORT ? parseInt(process.env.DOCUFLOW_PORT, 10) : 48821
  );

  // ── 1. Locate bundled UI ────────────────────────────────────────────────
  // Installed:  <prefix>/lib/node_modules/@doquflow/cli/dist/commands/ui.js
  //             → ui-dist is two levels up: @doquflow/cli/ui-dist/
  // Monorepo:   packages/cli/dist/commands/ui.js
  //             → ui-dist is two levels up: packages/cli/ui-dist/
  const uiDist = path.join(__dirname, '../../ui-dist');

  if (!fs.existsSync(path.join(uiDist, 'index.html'))) {
    console.error('');
    console.error('  ❌ DocuFlow Web UI bundle not found.');
    console.error('');
    console.error('  Expected: ' + uiDist);
    console.error('');
    console.error('  If you installed @doquflow/cli from npm, this is a packaging bug — please');
    console.error('  report it at https://github.com/doquflows/docuflow/issues');
    console.error('');
    console.error('  If you are running from source, build the UI first:');
    console.error('    npm run build:ui          # build packages/ui → packages/ui/dist/');
    console.error('    npm run build -w packages/cli   # copy dist + compile CLI');
    console.error('');
    process.exit(1);
  }

  // ── 2. Load server tools ────────────────────────────────────────────────
  const listWikiTool   = loadTool('list-wiki',   'listWiki');
  const lintWikiTool   = loadTool('lint-wiki',   'lintWiki');
  const queryWikiTool  = loadTool('query-wiki',  'queryWiki');
  const wikiSearchTool = loadTool('wiki-search', 'wikiSearch');

  // ── 3. Express app ──────────────────────────────────────────────────────
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── API routes ────────────────────────────────────────────────────────

  app.get('/api/ping', (_req, res) => { res.json({ ok: true }); });

  app.get('/api/projects', async (req, res) => {
    try {
      const home = process.env.HOME ?? process.env.USERPROFILE ?? '/';
      const scanRoots = [
        home,
        path.join(home, 'code'),  path.join(home, 'dev'),
        path.join(home, 'projects'), path.join(home, 'work'),
        path.join(home, 'src'),   path.join(home, 'Desktop'),
      ];

      if (typeof req.query.path === 'string') {
        const qp = req.query.path as string;
        if (fs.existsSync(path.join(qp, '.docuflow'))) {
          return res.json([await getProjectStats(qp, lintWikiTool)]);
        }
        scanRoots.push(qp);
      }

      const allPaths = new Set<string>();
      for (const root of scanRoots) {
        (await findDocuflowProjects(root)).forEach(p => allPaths.add(p));
      }
      const projects = await Promise.all([...allPaths].map(p => getProjectStats(p, lintWikiTool)));
      return res.json(projects.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: unknown) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/project', async (req, res) => {
    const projectPath = req.query.path as string;
    if (!projectPath) return res.status(400).json({ error: 'path required' });
    try {
      return res.json(await getProjectStats(projectPath, lintWikiTool));
    } catch (e: unknown) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/wiki', async (req, res) => {
    const projectPath = req.query.path as string;
    if (!projectPath) return res.status(400).json({ error: 'path required' });
    try {
      return res.json(await listWikiTool({ project_path: projectPath }));
    } catch (e: unknown) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/wiki/:pageId', async (req, res) => {
    const projectPath = req.query.path as string;
    if (!projectPath) return res.status(400).json({ error: 'path required' });
    const { pageId } = req.params;
    const wikiDir = path.join(projectPath, '.docuflow', 'wiki');
    for (const cat of ['entities', 'concepts', 'timelines', 'syntheses']) {
      const filePath = path.join(wikiDir, cat, `${pageId}.md`);
      if (fs.existsSync(filePath)) {
        try {
          const content = await fsp.readFile(filePath, 'utf8');
          return res.json({ id: pageId, category: cat.replace(/s$/, ''), content });
        } catch { break; }
      }
    }
    return res.status(404).json({ error: `Page not found: ${pageId}` });
  });

  app.get('/api/health', async (req, res) => {
    const projectPath = req.query.path as string;
    if (!projectPath) return res.status(400).json({ error: 'path required' });
    try {
      return res.json(await lintWikiTool({ project_path: projectPath }));
    } catch (e: unknown) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/activity', async (req, res) => {
    const projectPath = req.query.path as string;
    if (!projectPath) return res.status(400).json({ error: 'path required' });
    try {
      const logPath = path.join(projectPath, '.docuflow', 'log.md');
      let activity: ReturnType<typeof parseActivityLog> = [];
      try {
        activity = parseActivityLog(await fsp.readFile(logPath, 'utf8'));
      } catch { /* no log yet */ }
      return res.json(activity);
    } catch (e: unknown) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post('/api/ask', async (req, res) => {
    const { path: projectPath, question } = req.body as { path: string; question: string };
    if (!projectPath || !question) return res.status(400).json({ error: 'path and question required' });
    try {
      return res.json(await queryWikiTool({ project_path: projectPath, question }));
    } catch (e: unknown) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get('/api/search', async (req, res) => {
    const projectPath = req.query.path as string;
    const query = req.query.q as string;
    if (!projectPath || !query) return res.status(400).json({ error: 'path and q required' });
    try {
      return res.json(await wikiSearchTool({ project_path: projectPath, query }));
    } catch (e: unknown) {
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── Static UI (must come after all /api/* routes) ─────────────────────
  app.use(express.static(uiDist));

  // SPA fallback — any unmatched route returns index.html so React Router
  // can handle client-side navigation (e.g. /wiki, /graph, /health).
  app.get('*', (_req, res) => {
    res.sendFile(path.join(uiDist, 'index.html'));
  });

  // ── 4. Start ─────────────────────────────────────────────────────────────
  const server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('');
    console.log('  ✅ DocuFlow Web UI running');
    console.log(`  🌐 ${url}`);
    console.log('');
    console.log('  Auto-discovers projects in: ~/dev  ~/code  ~/projects  ~/work  ~/src  ~/Desktop');
    console.log('  Press Ctrl+C to stop.');
    console.log('');

    if (!opts.noOpen) {
      // Small delay so the HTTP server is fully bound before the browser hits it
      setTimeout(() => openBrowser(url), 400);
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  ❌ Port ${port} is already in use.`);
      console.error(`  Stop the other process or set DOCUFLOW_PORT=<port> to use a different port.`);
      console.error(`  Note: the built UI targets port 48821 — custom ports require a UI rebuild.\n`);
    } else {
      console.error(`\n  ❌ Server error: ${err.message}\n`);
    }
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n  Stopping DocuFlow UI (${signal})...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
