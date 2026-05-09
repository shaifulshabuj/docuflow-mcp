#!/usr/bin/env node
// Shim: resolves Waymark MCP server from the installed @way_marks/cli package
// and forwards all process arguments unchanged.
// Run: chmod +x .waymark/server.js  (required for OpenCode to launch it directly)
'use strict';

const { execSync } = require('child_process');

let serverPath;
try {
  serverPath = execSync(
    'node -e "console.log(require.resolve(\'@way_marks/server/dist/mcp/server.js\'))"',
    { encoding: 'utf8' }
  ).trim();
} catch (err) {
  process.stderr.write(
    'Error: Could not resolve @way_marks/server. ' +
    'Please install it by running: npx @way_marks/cli start\n'
  );
  process.exit(1);
}

require(serverPath);
