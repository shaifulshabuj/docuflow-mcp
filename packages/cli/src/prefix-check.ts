/**
 * DEF-4: On CLI startup, warn (once per day) if a newer @doquflow/cli is installed
 * in a different npm prefix than the currently-running binary.
 *
 * npm 7+ suppresses postinstall stdout/stderr, so a postinstall-script warning
 * can never reach the user. This module moves the check into the CLI itself so
 * it is seen on first actual use after a mismatched install.
 *
 * The check is:
 *   1. Parse the current binary's prefix from process.argv[1]
 *   2. Scan known alternative prefix paths for a @doquflow/cli with a higher version
 *   3. If found, print a one-line stderr warning with the fix command
 *   4. Cache the result to ~/.docuflow/.prefix-check.json for 24h (avoids slowdown)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { findInstallsSync, semverGt, getMcpEntryPrefix } from "./prefix-utils";

const CACHE_FILE = path.join(os.homedir(), ".docuflow", ".prefix-check.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface PrefixCache {
  checkedAt: number;
  currentVersion: string;
  warn: boolean;
  warnMsg?: string;
}

/** Derive the install prefix from the currently-running CLI entry point. */
function currentCliPrefix(): string | null {
  return getMcpEntryPrefix(process.argv[1] ?? "");
}

/**
 * Run the dual-prefix check if the cache is stale or missing.
 * Never throws — startup must never be blocked.
 *
 * @param currentVersion  The version string from the running CLI's package.json
 */
export function runPrefixCheckIfStale(currentVersion: string): void {
  // Skip in non-interactive contexts (CI, pipes) — warning would be noise.
  // DOCUFLOW_CHECK_NOW=1 bypasses this for tests and explicit manual runs.
  if (!process.stdout.isTTY && !process.env.DOCUFLOW_CHECK_NOW) return;

  try {
    // Read cache — if fresh and version matches, replay the stored warning (or skip)
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as PrefixCache;
      if (
        cache.currentVersion === currentVersion &&
        Date.now() - cache.checkedAt < CACHE_TTL_MS
      ) {
        if (cache.warn && cache.warnMsg) process.stderr.write(cache.warnMsg + "\n");
        return;
      }
    }

    // Determine which prefix the active binary came from
    const myPrefix = currentCliPrefix() ?? path.dirname(path.dirname(process.execPath));

    // Accept extra prefixes from env var so tests can inject fake installs
    const extras = process.env.DOCUFLOW_EXTRA_PREFIXES
      ? process.env.DOCUFLOW_EXTRA_PREFIXES.split(path.delimiter)
      : [];

    const allInstalls = findInstallsSync(extras);
    let warnMsg: string | undefined;

    for (const install of allInstalls) {
      if (path.resolve(install.prefix) === path.resolve(myPrefix)) continue;
      if (semverGt(install.version, currentVersion)) {
        const shortPrefix = install.prefix.replace(os.homedir(), "~");
        warnMsg =
          `⚠️  docuflow ${install.version} is installed at ${shortPrefix}` +
          ` but you are running ${currentVersion}.` +
          `  Fix: npm install -g @doquflow/cli@latest`;
        break;
      }
    }

    // Persist cache
    try {
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      const cache: PrefixCache = {
        checkedAt: Date.now(),
        currentVersion,
        warn: !!warnMsg,
        warnMsg,
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf8");
    } catch { /* non-fatal */ }

    if (warnMsg) process.stderr.write(warnMsg + "\n");
  } catch { /* never block startup */ }
}
