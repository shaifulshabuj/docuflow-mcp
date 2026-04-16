# Release Guide

This document explains how to release new versions of Docuflow using the automated release script.

## Quick Start

```bash
npm run release
```

Follow the interactive prompts. The script handles everything automatically.

## What the Release Script Does

1. **Version Management**
   - Asks you to select bump type: `major`, `minor`, or `patch`
   - Uses semantic versioning: `major.minor.patch` (e.g., 0.1.1 → 0.1.2)
   - Updates both `packages/server/package.json` and `packages/cli/package.json`
   - Syncs the `@doquflow/server` dependency in the CLI package

2. **Changelog Updates**
   - Adds new version header with today's date to `CHANGELOG.md` (private)
   - Adds new version header with today's date to `release/CHANGELOG.md` (public)
   - Includes template sections (Added, Changed, Fixed) for your changes

3. **Validation**
   - Regenerates `package-lock.json`
   - Runs `bash scripts/pre-release-check.sh` to catch issues early
   - Verifies build succeeds, no secrets in code, required files exist

4. **Git Operations**
   - Creates a commit: `chore: bump to vX.Y.Z`
   - Creates a git tag: `vX.Y.Z`
   - Pushes main branch and tag to `origin`

5. **CI Automation** (handled by GitHub Actions)
   - Builds and verifies packages
   - Syncs to public repository (`doquflows/docuflow`)
   - Publishes to npm (`@doquflow/server`, `@doquflow/cli`)
   - Creates GitHub Release

## Version Bump Types

**Patch** (0.1.1 → 0.1.2)
- Bug fixes and small improvements
- No breaking changes, no new features

**Minor** (0.1.1 → 0.2.0)
- New features or enhancements
- Backward compatible
- Resets patch version to 0

**Major** (0.1.1 → 1.0.0)
- Breaking changes, major refactor
- Resets minor and patch to 0

## Pre-Release Checklist

Before running `npm run release`, ensure:

- [ ] You are on the `main` branch
- [ ] Git working directory is clean (no uncommitted changes)
- [ ] All desired changes are committed
- [ ] You have write access to the repository
- [ ] You have `.env` file properly gitignored (if any)

## Example Release Session

```bash
$ npm run release

🚀 Docuflow Release Script
==================================================

📋 Checking preconditions...
✓ Git status: clean
✓ Current version: 0.1.1

📝 Version selection:
Current: 0.1.1
? Select version bump (major/minor/patch): patch

Next version: 0.1.2 (patch)

📋 Release Summary:
  Version bump: 0.1.1 → 0.1.2
  Bump type: patch
  Actions:
    1. Update packages/server/package.json
    2. Update packages/cli/package.json (+ sync @doquflow/server dep)
    3. Update CHANGELOG.md (private)
    4. Update release/CHANGELOG.md (public)
    5. Run pre-release checks
    6. Create commit: chore: bump to v0.1.2
    7. Create tag: v0.1.2
    8. Push to origin (main + tag)

Continue with release? (yes/no): yes

📦 Updating package files...
✓ Updated packages/server/package.json
✓ Updated packages/cli/package.json

📝 Updating changelogs...
✓ Updated CHANGELOG.md
✓ Updated release/CHANGELOG.md

🔒 Regenerating lockfile...
✓ npm install --package-lock-only

✅ Running pre-release checks...
✓ Pre-release checks passed

📝 Creating git commit...
✓ Commit created: chore: bump to v0.1.2

🏷️  Creating git tag...
✓ Tag created: v0.1.2

🚀 Pushing to origin...
✓ Pushed main branch
✓ Pushed tag v0.1.2

==================================================
✅ Release v0.1.2 complete!
==================================================

CI will now:
  1. Build and verify packages
  2. Sync to doquflows/docuflow public repo
  3. Publish to npm (@doquflow/server, @doquflow/cli)
  4. Create GitHub Release

Monitor progress at: https://github.com/your-org/docuflow-mcp/actions
```

## Troubleshooting

### "Git working directory is dirty"

You have uncommitted changes. Commit or stash them:

```bash
git add .
git commit -m "Your message"
# or
git stash
```

### "Pre-release checks failed"

The script ran `bash scripts/pre-release-check.sh` and something failed. Common issues:

- Build errors: `npm run build --workspaces` to debug
- Secrets in code: Review the output and remove any API keys
- Missing files: Ensure `CHANGELOG.md`, `LICENSE`, etc. exist

### "Version mismatch: server=X, cli=Y"

The server and CLI packages have different versions. Manually sync them before running the script:

```bash
# Edit packages/server/package.json and packages/cli/package.json to match
# Then re-run
npm run release
```

### "Failed to check git status"

You may not be in a git repository or git is not installed. Ensure:
- You're in the repo root directory
- Git is installed and available in PATH

## Manual Operations (Not Recommended)

If the script fails partway through, you may need to clean up manually:

```bash
# Undo uncommitted changes
git reset --hard HEAD

# Delete a tag (if created)
git tag -d v0.1.2
git push origin :refs/tags/v0.1.2

# Delete a commit (if pushed)
git reset --hard HEAD~1
git push origin main --force-with-lease  # dangerous, use with caution
```

## Updating Changelogs

After the script creates the version entries in `CHANGELOG.md` and `release/CHANGELOG.md`, you should update the template sections:

**Example:**

```markdown
## [0.1.2] - 2026-04-17

### Added
- Support for Flask route detection
- New `config_refs` extraction for Python environ vars

### Changed
- Improved regex patterns for class detection

### Fixed
- Bug in binary file detection for WebP images
```

## CI/CD Pipeline

Once you push the tag, GitHub Actions automatically:

1. **[CI Workflow](../.github/workflows/ci.yml)** — Runs on main branch
   - Installs dependencies
   - Builds both packages
   - Scans for secrets

2. **[Release Workflow](../.github/workflows/release.yml)** — Triggered by tags
   - Builds packages
   - Syncs `release/` folder to public repo (`doquflows/docuflow`)
   - Publishes to npm
   - Creates GitHub Release

No further action needed — CI handles everything!

## Important Notes

- **Never tag without bumping versions first.** The CI publishes whatever `package.json` version exists at tag time.
- **Always run the script from the repo root.** The script auto-detects the correct paths.
- **Changelogs are templates.** After release, edit them to add your actual change descriptions.
- **Test before releasing.** Use `npm run build --workspaces` to verify the build first.
