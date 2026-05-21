#!/usr/bin/env node

/**
 * Automated Release Script for Docuflow MCP (v2.0+)
 *
 * Interactive script that handles:
 * - Version bumping (major/minor/patch) across the 4 v2.0 packages
 *     core → studio → server → cli  (topological order)
 * - package.json updates for each package
 * - Cross-package internal dep sync (cli depends on core+studio,
 *   studio depends on core, server depends on studio)
 * - Changelog generation (CHANGELOG.md + release/CHANGELOG.md mirrored)
 * - Pre-release validation
 * - Git commit + tag + push
 *
 * Run with `npm run release` (defined in root package.json).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── v2.0 four-package layout ────────────────────────────────────────────────
// Order matters: topological. core has no internal deps; studio depends on
// core; server depends on studio; cli depends on core + studio.
//
// `internalDeps` lists the @doquflow/* packages this one declares in its
// dependencies (NOT devDependencies). The release script rewrites these
// to match the new version automatically.
const PACKAGES = [
  {
    key:          'core',
    pkgPath:      path.join(PROJECT_ROOT, 'packages/core/package.json'),
    internalDeps: [],
  },
  {
    key:          'studio',
    pkgPath:      path.join(PROJECT_ROOT, 'packages/studio/package.json'),
    internalDeps: ['@doquflow/core'],
  },
  {
    key:          'server',
    pkgPath:      path.join(PROJECT_ROOT, 'packages/server/package.json'),
    internalDeps: ['@doquflow/studio'],
  },
  {
    key:          'cli',
    pkgPath:      path.join(PROJECT_ROOT, 'packages/cli/package.json'),
    internalDeps: ['@doquflow/core', '@doquflow/studio'],
  },
];

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
 * Parse version string "major.minor.patch" into object.
 * Pre-release suffixes (e.g. "-alpha.1") are stripped for arithmetic.
 */
function parseVersion(version) {
  const core = version.split('-')[0];
  const parts = core.split('.');
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
 * Calculate next version based on bump type.
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
 * Run shell command and return output.
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
 * Check git status — must be clean.
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
 * Generate changelog entry header with date.
 */
function getChangelogHeader(version) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `## [${version}] - ${today}`;
}

/**
 * Update changelog file: promote [Unreleased] block to versioned entry.
 * If no [Unreleased] block exists, insert a blank versioned block after the title.
 */
function updateChangelog(filePath, version) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const header = getChangelogHeader(version);
    const lines = content.split('\n');

    const unreleasedIdx = lines.findIndex(l => /^## \[Unreleased\]/i.test(l));
    if (unreleasedIdx >= 0) {
      lines[unreleasedIdx] = header;
      for (let i = unreleasedIdx + 1; i < lines.length; i++) {
        if (/^## /.test(lines[i])) break;
        if (/^- \(Add your changes here\)/.test(lines[i].trim())) {
          lines.splice(i, 1);
          i--;
        }
      }
    } else {
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#') && !lines[i].startsWith('##')) {
          insertIndex = i + 1;
          break;
        }
      }
      lines.splice(insertIndex, 0, '', header, '');
    }

    fs.writeFileSync(filePath, lines.join('\n'));
  } catch (err) {
    exit(`❌ Failed to update changelog ${filePath}: ${err.message}`);
  }
}

/**
 * Main release flow.
 */
async function main() {
  log('\n🚀 Docuflow Release Script (v2.0+ four-package layout)', 'cyan');
  log('='.repeat(60), 'cyan');

  // ── Preconditions ────────────────────────────────────────────────────────
  log('\n📋 Checking preconditions...', 'bright');
  checkGitStatus();
  log('✓ Git status: clean', 'green');

  // ── Read all four package manifests and verify version sync ──────────────
  const manifests = {};
  for (const p of PACKAGES) {
    manifests[p.key] = readJSON(p.pkgPath);
  }

  const baseVersion = manifests.core.version;
  const mismatches = [];
  for (const p of PACKAGES) {
    if (manifests[p.key].version !== baseVersion) {
      mismatches.push(`${p.key}=${manifests[p.key].version}`);
    }
  }
  if (mismatches.length > 0) {
    exit(
      `❌ Version mismatch — core=${baseVersion}, ${mismatches.join(', ')}.\n` +
      `   Sync all 4 packages to the same version before releasing.`
    );
  }

  log(`✓ Current version: ${baseVersion}`, 'green');
  log(`  (core + studio + server + cli all in sync)`, 'green');

  // ── Verify internal dep versions match the package version too ───────────
  // Catches the case where someone bumped a package version but forgot to
  // update its consumers' declared dependency on it.
  const depMismatches = [];
  for (const p of PACKAGES) {
    const deps = manifests[p.key].dependencies || {};
    for (const internalDep of p.internalDeps) {
      const declared = deps[internalDep];
      if (declared && declared !== baseVersion) {
        depMismatches.push(`${p.key} → ${internalDep}@${declared} (expected ${baseVersion})`);
      }
    }
  }
  if (depMismatches.length > 0) {
    exit(
      `❌ Internal dep version mismatch:\n` +
      depMismatches.map(m => `   ${m}`).join('\n') + '\n' +
      `   Sync internal dep versions before releasing.`
    );
  }
  log(`✓ Internal deps in sync (server → studio, studio → core, cli → core + studio)`, 'green');

  // ── Version bump selection ───────────────────────────────────────────────
  log('\n📝 Version selection:', 'bright');
  log(`Current: ${baseVersion}`);

  let bumpType = null;
  while (!['major', 'minor', 'patch'].includes(bumpType)) {
    bumpType = await prompt('Select version bump (major/minor/patch):');
    if (!['major', 'minor', 'patch'].includes(bumpType)) {
      log('❌ Invalid choice. Please select major, minor, or patch.', 'red');
    }
  }

  const nextVersion = bumpVersion(baseVersion, bumpType);
  log(`Next version: ${colors.yellow}${nextVersion}${colors.reset} (${bumpType})`, 'bright');

  // ── Summary ──────────────────────────────────────────────────────────────
  log('\n📋 Release Summary:', 'bright');
  log(`  Version bump: ${baseVersion} → ${nextVersion}`);
  log(`  Bump type:    ${bumpType}`);
  log(`  Actions:`);
  log(`    1. Update packages/core/package.json`);
  log(`    2. Update packages/studio/package.json   (+ sync @doquflow/core dep)`);
  log(`    3. Update packages/server/package.json   (+ sync @doquflow/studio dep)`);
  log(`    4. Update packages/cli/package.json      (+ sync @doquflow/core + @doquflow/studio deps)`);
  log(`    5. Update CHANGELOG.md (private)`);
  log(`    6. Update release/CHANGELOG.md (public)`);
  log(`    7. Regenerate package-lock.json`);
  log(`    8. Run pre-release checks (build + UI/API + smoke tests)`);
  log(`    9. Create commit: chore: release v${nextVersion}`);
  log(`   10. Create tag: v${nextVersion}`);
  log(`   11. Push to origin (main + tag)`);

  const confirm = await prompt('\nContinue with release? (yes/no):');
  if (confirm !== 'yes' && confirm !== 'y') {
    exit('❌ Release cancelled.', 0);
  }

  // ── Update package.json files (versions + internal deps) ─────────────────
  log('\n📦 Updating package files...', 'bright');
  for (const p of PACKAGES) {
    const pkg = manifests[p.key];
    pkg.version = nextVersion;
    if (p.internalDeps.length > 0) {
      pkg.dependencies = pkg.dependencies || {};
      for (const internalDep of p.internalDeps) {
        if (pkg.dependencies[internalDep] !== undefined) {
          pkg.dependencies[internalDep] = nextVersion;
        }
      }
    }
    writeJSON(p.pkgPath, pkg);
    const depNote = p.internalDeps.length > 0
      ? ` (deps: ${p.internalDeps.map(d => `${d}@${nextVersion}`).join(', ')})`
      : '';
    log(`✓ Updated packages/${p.key}/package.json → ${nextVersion}${depNote}`, 'green');
  }

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
  run(`git commit -m "chore: release v${nextVersion}"`);
  log(`✓ Commit created: chore: release v${nextVersion}`, 'green');

  log('\n🏷️  Creating git tag...', 'bright');
  run(`git tag -a v${nextVersion} -m "DocuFlow v${nextVersion}"`);
  log(`✓ Tag created: v${nextVersion}`, 'green');

  log('\n🚀 Pushing to origin...', 'bright');
  run('git push origin main');
  log('✓ Pushed main branch', 'green');
  run(`git push origin v${nextVersion}`);
  log(`✓ Pushed tag v${nextVersion}`, 'green');

  // ── Done ─────────────────────────────────────────────────────────────────
  log('\n' + '='.repeat(60), 'green');
  log(`✅ Release v${nextVersion} initiated!`, 'green');
  log('='.repeat(60), 'green');
  log('\nCI will now:');
  log('  1. Build and verify all four packages');
  log('  2. Sync to doquflows/docuflow public repo');
  log('  3. Publish to npm in topological order:');
  log('       @doquflow/core   → @doquflow/studio');
  log('     → @doquflow/server → @doquflow/cli');
  log('  4. Create GitHub Release');
  log('\nMonitor progress at: https://github.com/shaifulshabuj/docuflow-mcp/actions\n');
}

main().catch((err) => {
  exit(`❌ Unexpected error: ${err.message}`);
});
