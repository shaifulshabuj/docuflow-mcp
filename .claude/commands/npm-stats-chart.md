# npm Stats Chart Skill

Add a live npm download chart + shields.io badges to any GitHub project's README.
The chart auto-updates every 6 hours via GitHub Actions — no API keys required.

**Invoke this skill when asked to:**
- Add npm download stats to a README
- Set up an npm downloads chart or badge
- Add download tracking for npm packages
- Push chart/workflow to a GitHub repo via `gh api`

---

## What this skill does

1. Creates `scripts/generate-npm-chart.js` — fetches daily npm download data → generates a self-contained SVG chart
2. Creates `.github/workflows/npm-stats.yml` — scheduled runner (every 6h + manual trigger) commits the updated SVG
3. Generates `docs/npm-downloads.svg` — the initial chart committed to the repo
4. Updates `README.md` — adds shields.io badges + SVG chart embed

Everything runs inside GitHub Actions. No external services, no API keys, no npm dependencies (uses Node.js built-in `https` only).

---

## Step 1 — Identify the packages

Ask or infer:
- Which npm package name(s) to track (e.g. `@myorg/cli`, `@myorg/sdk`)
- The repo's `owner/repo` slug
- Output path (default: `docs/npm-downloads.svg`)

Assign a color pair per package. Good defaults:

| Slot | Line color | Fill color | Use for |
|------|-----------|-----------|---------|
| 0 | `#6366f1` (indigo) | `#818cf8` | primary package |
| 1 | `#10b981` (emerald) | `#34d399` | secondary package |
| 2 | `#f59e0b` (amber) | `#fbbf24` | third package |
| 3 | `#ef4444` (red) | `#f87171` | fourth package |

---

## Step 2 — Create the chart generator script

Create `scripts/generate-npm-chart.js`. Replace `PACKAGES` and `OUTPUT_PATH` for the target project:

```js
#!/usr/bin/env node
/**
 * generate-npm-chart.js
 * Fetches npm download stats and writes a self-contained SVG line chart.
 * No external dependencies — uses Node.js built-in https module only.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── CONFIGURE THESE ───────────────────────────────────────────────────────────
const PACKAGES    = ['@myorg/package-a', '@myorg/package-b'];   // ← edit
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'npm-downloads.svg'); // ← edit if needed
// ─────────────────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`JSON parse failed for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

async function fetchRange(pkg) {
  const url = `https://api.npmjs.org/downloads/range/last-month/${encodeURIComponent(pkg)}`;
  const data = await get(url);
  return (data.downloads || []).map(d => ({ date: d.day, count: d.downloads }));
}

function generateSVG(datasets, updatedAt) {
  const W = 860, H = 280;
  const PAD = { top: 48, right: 24, bottom: 56, left: 64 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allDates = [...new Set(datasets.flatMap(d => d.points.map(p => p.date)))].sort();

  const series = datasets.map(d => {
    const map = Object.fromEntries(d.points.map(p => [p.date, p.count]));
    return {
      label: d.label,
      color: d.color,
      fill: d.fill,
      values: allDates.map(date => map[date] ?? 0),
      total: d.points.reduce((s, p) => s + p.count, 0),
    };
  });

  const maxVal = Math.max(1, ...series.flatMap(s => s.values));
  const n = allDates.length;
  const scaleX = (i) => PAD.left + (i / Math.max(n - 1, 1)) * chartW;
  const scaleY = (v) => PAD.top + chartH - (v / maxVal) * chartH;

  function polyPoints(values) {
    return values.map((v, i) => `${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(' ');
  }
  function areaPoints(values) {
    const line = values.map((v, i) => `${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`);
    const base = [
      `${scaleX(n - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)}`,
      `${scaleX(0).toFixed(1)},${(PAD.top + chartH).toFixed(1)}`,
    ];
    return [...line, ...base].join(' ');
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));
  const labelStep = Math.max(1, Math.floor(n / 6));
  const xLabels = allDates.map((d, i) => ({ date: d, i })).filter(({ i }) => i % labelStep === 0 || i === n - 1);

  function fmtDate(s) {
    const [, m, d] = s.split('-');
    const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[+m]} ${+d}`;
  }

  const gradientDefs = series.map((s, idx) => `
    <linearGradient id="grad${idx}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${s.fill}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${s.fill}" stop-opacity="0.02"/>
    </linearGradient>`).join('');

  const areas   = series.map((s, idx) => `\n    <polygon points="${areaPoints(s.values)}" fill="url(#grad${idx})"/>`).join('');
  const lines   = series.map(s => `\n    <polyline points="${polyPoints(s.values)}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  const yGrid   = yTicks.map(v => {
    const y = scaleY(v).toFixed(1);
    return `\n    <line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
    <text x="${PAD.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle" font-size="11" fill="#6b7280">${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}</text>`;
  }).join('');
  const xAxis   = xLabels.map(({ date, i }) => `\n    <text x="${scaleX(i).toFixed(1)}" y="${PAD.top + chartH + 18}" text-anchor="middle" font-size="11" fill="#6b7280">${fmtDate(date)}</text>`).join('');
  const legend  = series.map((s, i) => {
    const x = PAD.left + i * 220;
    return `\n    <rect x="${x}" y="12" width="12" height="12" rx="3" fill="${s.color}"/>
    <text x="${x + 18}" y="22" font-size="13" fill="#374151" font-weight="600">${s.label}</text>
    <text x="${x + 18}" y="36" font-size="11" fill="#6b7280">${s.total.toLocaleString()} last 30 days</text>`;
  }).join('');
  const endDots = series.map(s => {
    const x = scaleX(n - 1), y = scaleY(s.values[n - 1] ?? 0);
    return `\n    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"><title>${s.values[n-1] ?? 0} downloads</title></circle>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#fff;border-radius:12px;font-family:system-ui,sans-serif">
  <defs>${gradientDefs}
  </defs>
  ${yGrid}
  ${areas}
  ${lines}
  ${xAxis}
  ${endDots}
  ${legend}
  <text x="${W - PAD.right}" y="${H - 8}" text-anchor="end" font-size="10" fill="#9ca3af">Updated ${updatedAt}</text>
  <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}" stroke="#d1d5db" stroke-width="1"/>
  <line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${W - PAD.right}" y2="${PAD.top + chartH}" stroke="#d1d5db" stroke-width="1"/>
</svg>`;
}

async function main() {
  console.log('📊 Fetching npm download stats...');
  const colorPalette = [
    { color: '#6366f1', fill: '#818cf8' },
    { color: '#10b981', fill: '#34d399' },
    { color: '#f59e0b', fill: '#fbbf24' },
    { color: '#ef4444', fill: '#f87171' },
  ];
  const datasets = await Promise.all(
    PACKAGES.map(async (pkg, i) => {
      const points = await fetchRange(pkg);
      const total = points.reduce((s, p) => s + p.count, 0);
      console.log(`  ${pkg}: ${total} downloads in last 30 days`);
      return { label: pkg, points, ...colorPalette[i % colorPalette.length] };
    })
  );
  const svg = generateSVG(datasets, new Date().toISOString().split('T')[0]);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, svg, 'utf8');
  console.log(`✅ Chart written to ${OUTPUT_PATH}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
```

---

## Step 3 — Create the GitHub Actions workflow

Create `.github/workflows/npm-stats.yml`:

```yaml
name: npm download stats

on:
  schedule:
    - cron: '0 */6 * * *'   # every 6 hours
  workflow_dispatch:          # allow manual trigger from GitHub UI
  push:
    paths:
      - 'scripts/generate-npm-chart.js'

permissions:
  contents: write   # needed to commit the generated SVG

jobs:
  update-stats:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate download chart
        run: node scripts/generate-npm-chart.js

      - name: Commit chart if changed
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/npm-downloads.svg
          if git diff --cached --quiet; then
            echo "No changes to chart — skipping commit."
          else
            git commit -m "chore: update npm download chart [skip ci]"
            git push
          fi
```

> **Key details:**
> - `permissions: contents: write` — without this the bot commit will fail with 403
> - `[skip ci]` in the commit message prevents the commit from re-triggering workflows
> - `git diff --cached --quiet` — only commits when the SVG actually changed (data-driven skip)

---

## Step 4 — Generate the initial SVG locally

```bash
node scripts/generate-npm-chart.js
```

This writes `docs/npm-downloads.svg`. Commit it so the README shows the chart immediately (before the first workflow run).

---

## Step 5 — Update README.md

Add badges (shields.io, always live) and embed the SVG chart:

```markdown
[![npm downloads](https://img.shields.io/npm/dm/@myorg/package-a?label=%40myorg%2Fpackage-a&style=flat-square&color=6366f1)](https://www.npmjs.com/package/@myorg/package-a)
[![npm downloads](https://img.shields.io/npm/dm/@myorg/package-b?label=%40myorg%2Fpackage-b&style=flat-square&color=10b981)](https://www.npmjs.com/package/@myorg/package-b)
[![npm version](https://img.shields.io/npm/v/@myorg/package-a?label=version&style=flat-square&color=374151)](https://www.npmjs.com/package/@myorg/package-a)

![npm download chart](./docs/npm-downloads.svg)

> Updated every 6 hours via GitHub Actions
```

**Badge URL formula** for a package `@scope/name`:
```
https://img.shields.io/npm/dm/@scope/name?label=%40scope%2Fname&style=flat-square&color=COLOR
```
- `%40` = `@`, `%2F` = `/` (URL-encoded)
- `dm` = monthly downloads; use `dw` for weekly

---

## Step 6 — Commit (own repo) or push via `gh api` (external repo)

### Option A — own repo (normal git commit)

```bash
git add scripts/generate-npm-chart.js .github/workflows/npm-stats.yml \
        docs/npm-downloads.svg README.md
git commit -m "feat: add npm download stats chart (GitHub Actions + SVG)"
git push
```

### Option B — external repo you don't have cloned (`gh api`)

Use when you need to push to a second repo (e.g. a public release mirror):

```bash
OWNER="target-org"
REPO="target-repo"

# Push new files (no SHA needed for creates)
gh api repos/$OWNER/$REPO/contents/scripts/generate-npm-chart.js \
  -X PUT \
  -f message="feat: add npm download stats chart generator" \
  -f content="$(base64 < scripts/generate-npm-chart.js)"

gh api repos/$OWNER/$REPO/contents/.github/workflows/npm-stats.yml \
  -X PUT \
  -f message="feat: add npm download stats workflow" \
  -f content="$(base64 < .github/workflows/npm-stats.yml)"

gh api repos/$OWNER/$REPO/contents/docs/npm-downloads.svg \
  -X PUT \
  -f message="feat: add initial npm download chart" \
  -f content="$(base64 < docs/npm-downloads.svg)"

# For updating an EXISTING file, get its SHA first:
FILE_SHA=$(gh api repos/$OWNER/$REPO/contents/README.md --jq '.sha')
gh api repos/$OWNER/$REPO/contents/README.md \
  -X PUT \
  -f message="feat: add npm download badges and chart to README" \
  -f sha="$FILE_SHA" \
  -f content="$(base64 < README.md)"
```

> **Critical**: When updating an existing file via the API, you MUST pass `-f sha="$CURRENT_SHA"` or the PUT will fail with 422. Creating new files does not require a SHA.

---

## Step 7 — Trigger the workflow manually

After pushing, trigger the first run immediately (don't wait 6 hours):

```
GitHub → Actions → "npm download stats" → Run workflow → Run workflow
```

Or via CLI:
```bash
gh workflow run npm-stats.yml --repo owner/repo
```

---

## Verification checklist

- [ ] `node scripts/generate-npm-chart.js` runs without errors locally
- [ ] `docs/npm-downloads.svg` is committed (README renders chart on GitHub immediately)
- [ ] Workflow appears under Actions tab in GitHub UI
- [ ] Badges show correct download counts on the README page
- [ ] SVG renders in README (GitHub renders SVGs inline from the repo)
- [ ] Manual workflow run succeeds and commits a `chore: update npm download chart [skip ci]` commit

---

## Gotchas & edge cases

| Problem | Cause | Fix |
|---------|-------|-----|
| Workflow fails with 403 on push step | Missing `permissions: contents: write` | Add it at workflow level (not job level) |
| Workflow loops — triggers itself | Missing `[skip ci]` in commit message | Add `[skip ci]` to the commit message string |
| `gh api PUT` fails with 422 | Updating existing file without SHA | Fetch current SHA first and pass `-f sha=…` |
| Chart looks blank / zero values | Package name not found on npm | Verify `encodeURIComponent(pkg)` and check npm API response manually |
| SVG doesn't render in README | README uses wrong relative path | Use `./docs/npm-downloads.svg` (leading `./` matters in some renderers) |
| `base64` command differs on macOS vs Linux | macOS `base64` wraps at 76 chars | Use `base64 < file` (not `base64 -w0`); GitHub API accepts wrapped base64 |
| Legend text overflows for long package names | Legend spaced at 220px intervals | Reduce to 200px or abbreviate labels |
| Only 1 package → single color chart | Works fine | Just set `PACKAGES = ['single-pkg']`; palette picks index 0 |

---

## npm API reference

```
GET https://api.npmjs.org/downloads/range/last-month/@scope/pkg
→ { start, end, package, downloads: [{ downloads, day }] }

GET https://api.npmjs.org/downloads/point/last-week/@scope/pkg
→ { downloads, start, end, package }
```

- No auth required
- Rate limit: generous (hundreds of requests/minute)
- `downloads/range/last-month` returns one entry per day for the last 30 days
- `day` field format: `YYYY-MM-DD`

---

## 🧠 Learning Log

### 2026-05-13 | First implementation (DocuFlow)
- npm API returns `data.downloads` array with `{ day, downloads }` entries — map to `{ date, count }` for internal use
- `base64 < file` on macOS wraps output at 76 chars but GitHub API accepts this fine — no need for `-w0` flag
- When pushing to an external repo: CREATE (new file) does NOT need SHA; UPDATE (existing file) requires the current SHA or you get 422
- `permissions: contents: write` must be at the **workflow level** (top of yml), not inside the job — putting it at job level still fails
- `[skip ci]` in the commit message is the correct way to prevent the bot's commit from re-triggering GitHub Actions
- `git diff --cached --quiet` after `git add` returns exit 0 when nothing changed, exit 1 when there are staged changes — use this to skip the commit step cleanly
- SVG renders inline on GitHub README as long as it's referenced with a relative path (`./docs/npm-downloads.svg`) — absolute URLs to raw GitHub content work too but are fragile when branches/repos change
- Legend columns: 220px spacing works for package names up to ~18 chars; longer names need adjustment
- `fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })` — always create the output directory to avoid ENOENT on first run in fresh CI environment
