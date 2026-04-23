#!/usr/bin/env node
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json') as { version: string };

const [,, cmd, flag] = process.argv;
if (cmd === '--version' || cmd === '-v') {
  console.log(version);
} else if (cmd === 'init') {
  if (flag === '--interactive' || flag === '-i') {
    import('./commands/init-interactive').then(m => m.runInteractive());
  } else {
    import('./commands/init').then(m => m.run());
  }
} else if (cmd === 'status') {
  import('./commands/status').then(m => m.run());
} else if (cmd === 'suggest') {
  import('./commands/suggest').then(m => m.run());
} else {
  console.log(`DocuFlow v${version}`);
  console.log('');
  console.log('Usage: docuflow <command>');
  console.log('');
  console.log('Commands:');
  console.log('  init              Register DocuFlow MCP and generate CLAUDE.md');
  console.log('  init --interactive  Interactive setup wizard (choose domain, project name)');
  console.log('  status            Show wiki health, page counts, and MCP status');
  console.log('  suggest           Show what to document first (domain-specific guidance)');
  console.log('');
  console.log('Options:');
  console.log('  --version, -v     Print version number');
}
