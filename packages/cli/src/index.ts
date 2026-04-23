#!/usr/bin/env node
const [,, cmd, flag] = process.argv;
if (cmd === 'init') {
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
  console.log('Usage: npx @doquflow/cli <command>');
  console.log('');
  console.log('  init              Register Docuflow MCP and generate CLAUDE.md');
  console.log('  init --interactive  Interactive setup wizard (choose domain, project name)');
  console.log('  status            Show wiki health, page counts, and MCP status');
  console.log('  suggest           Show what to document first (domain-specific guidance)');
}
