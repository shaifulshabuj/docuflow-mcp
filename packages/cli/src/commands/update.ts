import { execSync, spawnSync } from 'child_process';
import * as net from 'net';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: currentVersion } = require('../../package.json') as { version: string };

const PKG = '@doquflow/cli';
const DEFAULT_PORT = 48821;

interface UpdateOptions {
  check?: boolean;
  force?: boolean;
}

function fetchLatestVersion(): string {
  try {
    const out = execSync(`npm view ${PKG} version`, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
    if (!/^\d+\.\d+\.\d+/.test(out)) throw new Error(`unexpected npm output: ${out}`);
    return out;
  } catch (e: unknown) {
    throw new Error(`Could not fetch latest version from npm registry: ${(e as Error).message}`);
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10));
  const pb = b.split('.').map(n => parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const sock = net.createConnection({ port, host: '127.0.0.1' });
    sock.once('connect', () => { sock.end(); resolve(true); });
    sock.once('error', () => resolve(false));
  });
}

export async function run(opts: UpdateOptions = {}): Promise<void> {
  console.log(`DocuFlow update`);
  console.log(`  Current: ${currentVersion}`);

  let latest: string;
  try {
    latest = fetchLatestVersion();
  } catch (e: unknown) {
    console.error(`✗ ${(e as Error).message}`);
    process.exit(1);
  }
  console.log(`  Latest:  ${latest}`);

  const cmp = compareSemver(latest, currentVersion);

  if (opts.check) {
    if (cmp > 0) console.log(`\n→ Update available. Run \`docuflow update\` to install.`);
    else         console.log(`\n✓ You are on the latest version.`);
    return;
  }

  if (cmp <= 0 && !opts.force) {
    console.log(`\n✓ Already on the latest version. Use --force to reinstall.`);
    return;
  }

  console.log(`\nInstalling ${PKG}@${latest} globally…`);
  const result = spawnSync('npm', ['install', '-g', `${PKG}@latest`], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`✗ npm install failed (exit ${result.status}). Try with sudo if this is a permissions issue.`);
    process.exit(result.status ?? 1);
  }

  console.log(`\n✓ Updated to ${latest}.`);
  console.log(`  This refreshed the CLI, bundled UI (ui-dist), and the @doquflow/server dependency.`);

  const stale = await isPortInUse(DEFAULT_PORT);
  if (stale) {
    console.log('');
    console.log(`⚠  A DocuFlow server is still running on port ${DEFAULT_PORT} — it is the OLD version.`);
    console.log(`   Stop and restart it to use the new code:`);
    console.log(`     lsof -ti:${DEFAULT_PORT} | xargs kill`);
    console.log(`     docuflow ui`);
  }
}
