#!/usr/bin/env node
// Shim: resolves Waymark MCP server from the globally-installed @way_marks/cli package.
// @way_marks/server is a nested dep under @way_marks/cli, not a top-level global package.
'use strict';

const path = require('path');
const { execSync } = require('child_process');

let serverPath;
try {
  const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  serverPath = path.join(
    globalRoot,
    '@way_marks', 'cli', 'node_modules',
    '@way_marks', 'server', 'dist', 'mcp', 'server.js'
  );
  require('fs').accessSync(serverPath);
} catch (err) {
  process.stderr.write(
    'Error: Could not locate @way_marks/server under global npm root.\n' +
    'Please run: npx @way_marks/cli start\n'
  );
  process.exit(1);
}

require(serverPath);
