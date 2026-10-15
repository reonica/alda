const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
// A complete build must not retain a removed article or a newly private draft.
// Only the generated output directory is deleted; source files are untouched.
fs.rmSync(path.join(root, '_site'), { recursive: true, force: true });
const cli = path.join(root, 'node_modules', '@11ty', 'eleventy', 'cmd.cjs');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdio: 'inherit'
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
