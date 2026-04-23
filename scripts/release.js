#!/usr/bin/env node

/**
 * Automated Release Script for Docuflow MCP
 * 
 * Interactive script that handles:
 * - Version bumping (major/minor/patch)
 * - Package.json updates (server + cli)
 * - Changelog generation
 * - Pre-release validation
 * - Git commit + tag + push
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVER_PKG = path.join(PROJECT_ROOT, 'packages/server/package.json');
const CLI_PKG = path.join(PROJECT_ROOT, 'packages/cli/package.json');
const CHANGELOG_PRIVATE = path.join(PROJECT_ROOT, 'CHANGELOG.md');
const CHANGELOG_PUBLIC = path.join(PROJECT_ROOT, 'release/CHANGELOG.md');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
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
    case 'major':
      v.major += 1;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor += 1;
      v.patch = 0;
      break;
    case 'patch':
      v.patch += 1;
      break;
    default:
      exit(`❌ Invalid bump type: ${bumpType}. Use major, minor, or patch.`);
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
 * Get current commit SHA (short)
 */
function getCurrentCommitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
  } catch (err) {
    exit(`❌ Failed to get current commit SHA: ${err.message}`);
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
    
    // Insert new version section after "# Changelog" or at the top
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the first empty line or the line after the main header
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#') && !lines[i].startsWith('##')) {
        insertIndex = i + 1;
        break;
      }
    }
    
    // Insert blank line + header + changelog template
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
  log('=' .repeat(50), 'cyan');
  
  // Check preconditions
  log('\n📋 Checking preconditions...', 'bright');
  checkGitStatus();
  log('✓ Git status: clean', 'green');
  
  // Get current versions
  const serverPkg = readJSON(SERVER_PKG);
  const cliPkg = readJSON(CLI_PKG);
  const currentVersion = serverPkg.version;
  
  if (cliPkg.version !== currentVersion) {
    exit(`❌ Version mismatch: server=${currentVersion}, cli=${cliPkg.version}. Both must match before release.`);
  }
  
  log(`✓ Current version: ${currentVersion}`, 'green');
  
  // Interactive: ask for bump type
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
  
  // Summary and confirmation
  log('\n📋 Release Summary:', 'bright');
  log(`  Version bump: ${currentVersion} → ${nextVersion}`);
  log(`  Bump type: ${bumpType}`);
  log(`  Actions:`);
  log(`    1. Update packages/server/package.json`);
  log(`    2. Update packages/cli/package.json (+ sync @doquflow/server dep)`);
  log(`    3. Update CHANGELOG.md (private)`);
  log(`    4. Update release/CHANGELOG.md (public)`);
  log(`    5. Run pre-release checks`);
  log(`    6. Create commit: chore: bump to v${nextVersion}`);
  log(`    7. Create tag: v${nextVersion}`);
  log(`    8. Push to origin (main + tag)`);
  
  const confirm = await prompt('\nContinue with release? (yes/no):');
  if (confirm !== 'yes' && confirm !== 'y') {
    exit('❌ Release cancelled.', 0);
  }
  
  // Update package.json files
  log('\n📦 Updating package files...', 'bright');
  serverPkg.version = nextVersion;
  writeJSON(SERVER_PKG, serverPkg);
  log(`✓ Updated ${SERVER_PKG}`, 'green');
  
  cliPkg.version = nextVersion;
  cliPkg.dependencies['@doquflow/server'] = nextVersion;
  writeJSON(CLI_PKG, cliPkg);
  log(`✓ Updated ${CLI_PKG}`, 'green');
  
  // Update changelogs
  log('\n📝 Updating changelogs...', 'bright');
  updateChangelog(CHANGELOG_PRIVATE, nextVersion);
  log(`✓ Updated ${CHANGELOG_PRIVATE}`, 'green');
  
  updateChangelog(CHANGELOG_PUBLIC, nextVersion);
  log(`✓ Updated ${CHANGELOG_PUBLIC}`, 'green');
  
  // Regenerate lockfile
  log('\n🔒 Regenerating lockfile...', 'bright');
  run('npm install --package-lock-only');
  
  // Run pre-release checks
  log('\n✅ Running pre-release checks...', 'bright');
  const preReleaseOutput = run('bash scripts/pre-release-check.sh', true);
  
  // Check if pre-release passed
  if (!preReleaseOutput.includes('RESULT: PASSED')) {
    log('\n' + preReleaseOutput);
    exit('❌ Pre-release checks failed. Fix issues before retrying.');
  }
  log('✓ Pre-release checks passed', 'green');
  
  // Create git commit
  log('\n📝 Creating git commit...', 'bright');
  run('git add -A');
  run(`git commit -m "chore: bump to v${nextVersion}"`);
  log(`✓ Commit created: chore: bump to v${nextVersion}`, 'green');
  
  // Create git tag
  log('\n🏷️  Creating git tag...', 'bright');
  run(`git tag v${nextVersion}`);
  log(`✓ Tag created: v${nextVersion}`, 'green');
  
  // Push to origin
  log('\n🚀 Pushing to origin...', 'bright');
  run('git push origin main');
  log('✓ Pushed main branch', 'green');
  
  run(`git push origin v${nextVersion}`);
  log(`✓ Pushed tag v${nextVersion}`, 'green');
  
  // Success!
  log('\n' + '='.repeat(50), 'green');
  log(`✅ Release v${nextVersion} complete!`, 'green');
  log('=' .repeat(50), 'green');
  log('\nCI will now:');
  log('  1. Build and verify packages');
  log('  2. Sync to doquflows/docuflow public repo');
  log('  3. Publish to npm (@doquflow/server, @doquflow/cli)');
  log('  4. Create GitHub Release');
  log('\nMonitor progress at: https://github.com/shaifulshabuj/docuflow-mcp/actions\n');
}

// Run
main().catch((err) => {
  exit(`❌ Unexpected error: ${err.message}`);
});
