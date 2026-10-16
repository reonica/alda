const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');

async function buildEditor(output) {
  const directory = path.join(output, 'admin');
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: { editor: 'cms/editor-entry.js' },
    outdir: directory,
    bundle: true,
    minify: true,
    platform: 'browser',
    format: 'iife',
    target: ['safari16', 'chrome110', 'firefox115'],
    legalComments: 'external',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning',
  });
  const licenses = [];
  for (const name of ['suneditor', 'markdown-it', 'sanitize-html', 'turndown', 'turndown-plugin-gfm']) {
    const packageDirectory = path.dirname(require.resolve(`${name}/package.json`));
    const file = fs.readdirSync(packageDirectory).find(value => /^licen[cs]e(?:\.[a-z]+)?$/i.test(value));
    if (file) licenses.push(`${name}\n\n${fs.readFileSync(path.join(packageDirectory, file), 'utf8')}`);
  }
  fs.writeFileSync(path.join(directory, 'editor-licenses.txt'), licenses.join('\n\n--------\n\n'));
}

module.exports = { buildEditor };
