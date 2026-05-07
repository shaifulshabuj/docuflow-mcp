import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

// Import server tool functions directly
import { listWiki } from '../../server/src/tools/list-wiki';
import { lintWiki } from '../../server/src/tools/lint-wiki';
import { queryWiki } from '../../server/src/tools/query-wiki';
import { wikiSearch } from '../../server/src/tools/wiki-search';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 48821;

app.use(cors());
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Scan a directory (non-recursively) for subdirs that contain .docuflow/ */
async function findDocuflowProjects(scanRoot: string): Promise<string[]> {
  const found: string[] = [];
  try {
    const entries = await fsp.readdir(scanRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(scanRoot, entry.name);
      if (fs.existsSync(path.join(candidate, '.docuflow'))) {
        found.push(candidate);
      }
    }
  } catch { /* dir may not exist */ }
  return found;
}

async function parseLastIngest(docuDir: string): Promise<string> {
  try {
    const log = await fsp.readFile(path.join(docuDir, 'log.md'), 'utf8');
    const match = log.match(/(\d{4}-\d{2}-\d{2}T[\d:.Z+-]+).*ingest/i);
    if (match) {
      const d = new Date(match[1]);
      const diffMs = Date.now() - d.getTime();
      const diffH = Math.floor(diffMs / 3_600_000);
      const diffD = Math.floor(diffMs / 86_400_000);
      if (diffH < 1) return 'just now';
      if (diffH < 24) return `${diffH}h ago`;
      return `${diffD}d ago`;
    }
  } catch { /* no log */ }
  return 'never';
}

async function countMdFiles(dir: string): Promise<number> {
  try {
    const files = await fsp.readdir(dir);
    return files.filter(f => f.endsWith('.md')).length;
  } catch { return 0; }
}

interface ProjectStats {
  name: string;
  path: string;
  health: number;
  pages: number;
  sources: number;
  entities: number;
  specs: number;
  lastIngest: string;
  syncStatus: string;
}

async function getProjectStats(projectPath: string): Promise<ProjectStats> {
  const docuDir = path.join(projectPath, '.docuflow');
  const wikiDir = path.join(docuDir, 'wiki');

  const [entities, concepts, timelines, syntheses, specs, sources, lastIngest] = await Promise.all([
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
    const lint = await lintWiki({ project_path: projectPath });
    health = typeof (lint as any).health_score === 'number' ? (lint as any).health_score : 0;
  } catch { health = totalPages > 0 ? 70 : 0; }

  return {
    name: path.basename(projectPath),
    path: projectPath,
    health,
    pages: totalPages,
    sources,
    entities,
    specs,
    lastIngest,
    syncStatus: totalPages > 0 ? 'live' : 'not initialized',
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/projects — scan common dev dirs for .docuflow projects */
app.get('/api/projects', async (req, res) => {
  try {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '/';
    const scanRoots = [
      home,
      path.join(home, 'code'),
      path.join(home, 'dev'),
      path.join(home, 'projects'),
      path.join(home, 'work'),
      path.join(home, 'src'),
      path.join(home, 'Desktop'),
    ];

    if (typeof req.query.path === 'string') {
      const qp = req.query.path as string;
      if (fs.existsSync(path.join(qp, '.docuflow'))) {
        const stats = await getProjectStats(qp);
        return res.json([stats]);
      }
      scanRoots.push(qp);
    }

    const allPaths = new Set<string>();
    for (const root of scanRoots) {
      const found = await findDocuflowProjects(root);
      found.forEach(p => allPaths.add(p));
    }

    const projects = await Promise.all([...allPaths].map(getProjectStats));
    return res.json(projects.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /api/project?path=<project_path> — stats for one project */
app.get('/api/project', async (req, res) => {
  const projectPath = req.query.path as string;
  if (!projectPath) return res.status(400).json({ error: 'path required' });
  try {
    const stats = await getProjectStats(projectPath);
    return res.json(stats);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /api/wiki?path=<project_path> — list wiki pages */
app.get('/api/wiki', async (req, res) => {
  const projectPath = req.query.path as string;
  if (!projectPath) return res.status(400).json({ error: 'path required' });
  try {
    const result = await listWiki({ project_path: projectPath });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /api/wiki/:pageId?path=<project_path> — read one wiki page */
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

/** GET /api/health?path=<project_path> — wiki lint / health */
app.get('/api/health', async (req, res) => {
  const projectPath = req.query.path as string;
  if (!projectPath) return res.status(400).json({ error: 'path required' });
  try {
    const result = await lintWiki({ project_path: projectPath });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /api/activity?path=<project_path> — recent log entries */
app.get('/api/activity', async (req, res) => {
  const projectPath = req.query.path as string;
  if (!projectPath) return res.status(400).json({ error: 'path required' });
  try {
    const logPath = path.join(projectPath, '.docuflow', 'log.md');
    type ActivityItem = { t: string; tool: string; target: string; kind: string; delta: string };
    const activity: ActivityItem[] = [];
    try {
      const log = await fsp.readFile(logPath, 'utf8');

      // Parse format: ## [2026-05-07T05:13:30.675Z] tool | description
      // Also parse older format: timestamp | tool | target | delta
      const headingRe = /^##\s+\[([^\]]+)\]\s+([^|]+?)(?:\s*\|\s*(.+))?$/;

      const lines = log.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();

        // New format: ## [timestamp] tool | description
        const hMatch = trimmed.match(headingRe);
        if (hMatch) {
          const [, timestamp, toolRaw, descRaw] = hMatch;
          const d = new Date(timestamp);
          if (isNaN(d.getTime())) continue;
          const diffH = Math.floor((Date.now() - d.getTime()) / 3_600_000);
          const t = diffH < 1 ? '<1h' : diffH < 24 ? `${diffH}h` : `${Math.floor(diffH / 24)}d`;
          const tool = toolRaw.trim();
          const target = descRaw?.trim() ?? '';
          activity.push({
            t,
            tool,
            target,
            kind: tool.includes('ingest') ? 'ingest'
              : tool.includes('query') || tool.includes('search') ? 'query'
              : tool.includes('lint') ? 'lint'
              : tool.includes('index') ? 'index'
              : 'read',
            delta: '',
          });
          continue;
        }

        // Legacy pipe-delimited format: timestamp | tool | target | delta
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
          const parts = trimmed.split('|').map(p => p.trim());
          if (parts.length >= 3) {
            const d = new Date(parts[0]);
            if (isNaN(d.getTime())) continue;
            const diffH = Math.floor((Date.now() - d.getTime()) / 3_600_000);
            const t = diffH < 1 ? '<1h' : diffH < 24 ? `${diffH}h` : `${Math.floor(diffH / 24)}d`;
            const tool = parts[1] ?? '';
            activity.push({
              t,
              tool,
              target: parts[2] ?? '',
              kind: tool.includes('ingest') ? 'ingest'
                : tool.includes('query') || tool.includes('search') ? 'query'
                : tool.includes('lint') ? 'lint'
                : tool.includes('index') ? 'index'
                : 'read',
              delta: parts[3] ?? '',
            });
          }
        }
      }
    } catch { /* no log yet */ }

    // Return most recent 10 entries
    return res.json(activity.slice(-10).reverse());
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/** POST /api/ask — body: { path, question } */
app.post('/api/ask', async (req, res) => {
  const { path: projectPath, question } = req.body as { path: string; question: string };
  if (!projectPath || !question) return res.status(400).json({ error: 'path and question required' });
  try {
    const result = await queryWiki({ project_path: projectPath, question });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

/** GET /api/search?path=<project_path>&q=<query> */
app.get('/api/search', async (req, res) => {
  const projectPath = req.query.path as string;
  const query = req.query.q as string;
  if (!projectPath || !query) return res.status(400).json({ error: 'path and q required' });
  try {
    const result = await wikiSearch({ project_path: projectPath, query });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/ping', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`DocuFlow API bridge running on http://localhost:${PORT}`);
});
