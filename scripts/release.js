#!/usr/bin/env node

/**
 * Automated Release Script for Docuflow MCP
 *
 * Interactive script that handles:
 * - Version bumping (major/minor/patch) across ALL four packages
 * - Package.json updates (server + cli + ui + api)
 * - Changelog generation
 * - Pre-release validation
 * - Git commit + tag + push
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVER_PKG    = path.join(PROJECT_ROOT, 'packages/server/package.json');
const CLI_PKG       = path.join(PROJECT_ROOT, 'packages/cli/package.json');
const UI_PKG        = path.join(PROJECT_ROOT, 'packages/ui/package.json');
const API_PKG       = path.join(PROJECT_ROOT, 'packages/api/package.json');
const CHANGELOG_PRIVATE = path.join(PROJECT_ROOT, 'CHANGELOG.md');
const CHANGELOG_PUBLIC  = path.join(PROJECT_ROOT, 'release/CHANGELOG.md');

// Colors for terminal output
const colors = {
  reset:  '\x1b[0m',
  bright: '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
};

function log(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

function prompt(question) {
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}? ${question}${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function exit(message, code = 1) {
  log(message, code === 0 ? 'green' : 'red');
  process.exit(code);
}

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    exit(`❌ Failed to read ${filePath}: ${err.message}`);
  }
}

function writeJSON(filePath, obj) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
  } catch (err) {
    exit(`❌ Failed to write ${filePath}: ${err.message}`);
  }
}

/**
 * Parse version string "major.minor.patch" into object
 */
function parseVersion(version) {
  const parts = version.split('.');
  if (parts.length !== 3) {
    exit(`❌ Invalid version format: ${version}. Expected major.minor.patch`);
  }
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10),
  };
}

/**
 * Calculate next version based on bump type
 */
function bumpVersion(currentVersion, bumpType) {
  const v = parseVersion(currentVersion);
  switch (bumpType) {
    case 'major': v.major += 1; v.minor = 0; v.patch = 0; break;
    case 'minor': v.minor += 1; v.patch = 0; break;
    case 'patch': v.patch += 1; break;
    default: exit(`❌ Invalid bump type: ${bumpType}. Use major, minor, or patch.`);
  }
  return `${v.major}.${v.minor}.${v.patch}`;
}

/**
 * Run shell command and return output
 */
function run(cmd, silent = false) {
  try {
    const output = execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf-8' });
    if (!silent) log(`✓ ${cmd}`, 'green');
    return output;
  } catch (err) {
    exit(`❌ Command failed: ${cmd}\n${err.message}`);
  }
}

/**
 * Check git status — must be clean
 */
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
    if (status.trim()) {
      exit(`❌ Git working directory is dirty. Commit or stash changes before releasing.`);
    }
  } catch (err) {
    exit(`❌ Failed to check git status: ${err.message}`);
  }
}

/**
 * Generate changelog entry header with date
 */
function getChangelogHeader(version) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `## [${version}] - ${today}`;
}

/**
 * Update changelog file with new version entry
 */
function updateChangelog(filePath, version) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const header = getChangelogHeader(version);
    const lines = content.split('\n');
    let insertIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#') && !lines[i].startsWith('##')) {
        insertIndex = i + 1;
        break;
      }
    }

    const newEntry = [
      '',
      header,
      '',
      '### Added',
      '- (Add your changes here)',
      '',
      '### Changed',
      '- (Add your changes here)',
      '',
      '### Fixed',
      '- (Add your changes here)',
      '',
    ];

    lines.splice(insertIndex, 0, ...newEntry);
    fs.writeFileSync(filePath, lines.join('\n'));
  } catch (err) {
    exit(`❌ Failed to update changelog ${filePath}: ${err.message}`);
  }
}

/**
 * Main release flow
 */
async function main() {
  log('\n🚀 Docuflow Release Script', 'cyan');
  log('='.repeat(50), 'cyan');

  // ── Preconditions ────────────────────────────────────────────────────────
  log('\n📋 Checking preconditions...', 'bright');
  checkGitStatus();
  log('✓ Git status: clean', 'green');

  // ── Read all four package versions ───────────────────────────────────────
  const serverPkg = readJSON(SERVER_PKG);
  const cliPkg    = readJSON(CLI_PKG);
  const uiPkg     = readJSON(UI_PKG);
  const apiPkg    = readJSON(API_PKG);

  const currentVersion = serverPkg.version;
  const mismatches = [];
  if (cliPkg.version !== currentVersion) mismatches.push(`cli=${cliPkg.version}`);
  if (uiPkg.version  !== currentVersion) mismatches.push(`ui=${uiPkg.version}`);
  if (apiPkg.version !== currentVersion) mismatches.push(`api=${apiPkg.version}`);

  if (mismatches.length > 0) {
    exit(
      `❌ Version mismatch — server=${currentVersion}, ${mismatches.join(', ')}.\n` +
      `   Sync all four packages to the same version before releasing.`
    );
  }

  log(`✓ Current version: ${currentVersion} (server + cli + ui + api in sync)`, 'green');

  // ── Version bump selection ───────────────────────────────────────────────
  log('\n📝 Version selection:', 'bright');
  log(`Current: ${currentVersion}`);

  let bumpType = null;
  while (!['major', 'minor', 'patch'].includes(bumpType)) {
    bumpType = await prompt('Select version bump (major/minor/patch):');
    if (!['major', 'minor', 'patch'].includes(bumpType)) {
      log('❌ Invalid choice. Please select major, minor, or patch.', 'red');
    }
  }

  const nextVersion = bumpVersion(currentVersion, bumpType);
  log(`Next version: ${colors.yellow}${nextVersion}${colors.reset} (${bumpType})`, 'bright');

  // ── Summary ──────────────────────────────────────────────────────────────
  log('\n📋 Release Summary:', 'bright');
  log(`  Version bump: ${currentVersion} → ${nextVersion}`);
  log(`  Bump type:    ${bumpType}`);
  log(`  Actions:`);
  log(`    1. Update packages/server/package.json`);
  log(`    2. Update packages/cli/package.json   (+ sync @doquflow/server dep)`);
  log(`    3. Update packages/ui/package.json`);
  log(`    4. Update packages/api/package.json`);
  log(`    5. Update CHANGELOG.md (private)`);
  log(`    6. Update release/CHANGELOG.md (public)`);
  log(`    7. Run pre-release checks (build + UI/API)`);
  log(`    8. Create commit: chore: bump to v${nextVersion}`);
  log(`    9. Create tag: v${nextVersion}`);
  log(`   10. Push to origin (main + tag)`);

  const confirm = await prompt('\nContinue with release? (yes/no):');
  if (confirm !== 'yes' && confirm !== 'y') {
    exit('❌ Release cancelled.', 0);
  }

  // ── Update package.json files ────────────────────────────────────────────
  log('\n📦 Updating package files...', 'bright');

  serverPkg.version = nextVersion;
  writeJSON(SERVER_PKG, serverPkg);
  log(`✓ Updated packages/server/package.json → ${nextVersion}`, 'green');

  cliPkg.version = nextVersion;
  cliPkg.dependencies['@doquflow/server'] = nextVersion;
  writeJSON(CLI_PKG, cliPkg);
  log(`✓ Updated packages/cli/package.json    → ${nextVersion}`, 'green');

  uiPkg.version = nextVersion;
  writeJSON(UI_PKG, uiPkg);
  log(`✓ Updated packages/ui/package.json     → ${nextVersion}`, 'green');

  apiPkg.version = nextVersion;
  writeJSON(API_PKG, apiPkg);
  log(`✓ Updated packages/api/package.json    → ${nextVersion}`, 'green');

  // ── Update changelogs ────────────────────────────────────────────────────
  log('\n📝 Updating changelogs...', 'bright');
  updateChangelog(CHANGELOG_PRIVATE, nextVersion);
  log(`✓ Updated CHANGELOG.md`, 'green');
  updateChangelog(CHANGELOG_PUBLIC, nextVersion);
  log(`✓ Updated release/CHANGELOG.md`, 'green');

  // ── Regenerate lockfile ──────────────────────────────────────────────────
  log('\n🔒 Regenerating lockfile...', 'bright');
  run('npm install --package-lock-only');

  // ── Pre-release checks ───────────────────────────────────────────────────
  log('\n✅ Running pre-release checks...', 'bright');
  const preReleaseOutput = run('bash scripts/pre-release-check.sh', true);

  if (!preReleaseOutput.includes('RESULT: PASSED')) {
    log('\n' + preReleaseOutput);
    exit('❌ Pre-release checks failed. Fix issues before retrying.');
  }
  log('✓ Pre-release checks passed', 'green');

  // ── Git commit + tag + push ──────────────────────────────────────────────
  log('\n📝 Creating git commit...', 'bright');
  run('git add -A');
  run(`git commit -m "chore: bump to v${nextVersion}"`);
  log(`✓ Commit created: chore: bump to v${nextVersion}`, 'green');

  log('\n🏷️  Creating git tag...', 'bright');
  run(`git tag v${nextVersion}`);
  log(`✓ Tag created: v${nextVersion}`, 'green');

  log('\n🚀 Pushing to origin...', 'bright');
  run('git push origin main');
  log('✓ Pushed main branch', 'green');
  run(`git push origin v${nextVersion}`);
  log(`✓ Pushed tag v${nextVersion}`, 'green');

  // ── Done ─────────────────────────────────────────────────────────────────
  log('\n' + '='.repeat(50), 'green');
  log(`✅ Release v${nextVersion} complete!`, 'green');
  log('='.repeat(50), 'green');
  log('\nCI will now:');
  log('  1. Build and verify all four packages');
  log('  2. Sync to doquflows/docuflow public repo');
  log('  3. Publish to npm (@doquflow/server, @doquflow/cli)');
  log('  4. Create GitHub Release');
  log('\nMonitor progress at: https://github.com/shaifulshabuj/docuflow-mcp/actions\n');
}

main().catch((err) => {
  exit(`❌ Unexpected error: ${err.message}`);
});
