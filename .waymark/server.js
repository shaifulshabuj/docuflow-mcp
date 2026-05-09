#!/usr/bin/env node
// Shim: resolves Waymark MCP server from the installed @way_marks/cli package
// and forwards all process arguments unchanged.
// Run: chmod +x .waymark/server.js  (required for OpenCode to launch it directly)
'use strict';

const { execSync } = require('child_process');

const serverPath = execSync(
  'node -e "console.log(require.resolve(\'@way_marks/server/dist/mcp/server.js\'))"',
  { encoding: 'utf8' }
).trim();

require(serverPath);
