const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');

test('changing an asset changes its browser URL without changing the template', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aldahub-asset-version-'));
  try {
    fs.mkdirSync(path.join(temporary, 'lib'));
    fs.mkdirSync(path.join(temporary, 'assets'));
    const helper = path.join(temporary, 'lib', 'assets.cjs');
    const asset = path.join(temporary, 'assets', 'site.css');
    fs.copyFileSync(path.join(root, 'lib', 'assets.cjs'), helper);
    const { assetUrl } = require(helper);
    fs.writeFileSync(asset, '.nav-toggle { color: black; }');
    const before = assetUrl('/assets/site.css');
    assert.equal(assetUrl('/assets/site.css'), before, 'Unchanged content keeps a stable URL');
    fs.writeFileSync(asset, '.nav-toggle { color: green; display: inline-flex; }');
    const after = assetUrl('/assets/site.css');
    assert.notEqual(after, before, 'Changed CSS must bypass the previous browser cache entry');
    assert.equal(new URL(after, 'https://aldahub.com').pathname, '/assets/site.css');
    assert.match(new URL(after, 'https://aldahub.com').searchParams.get('v'), /^[\da-f]{12}$/);
    assert.equal(assetUrl('https://example.com/style.css'), 'https://example.com/style.css');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test('generated public pages reference the content version of every local stylesheet and script', () => {
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
  const checked = new Set();
  for (const file of walk(output).filter(file => file.endsWith('.html') && !file.includes(`${path.sep}admin${path.sep}`))) {
    const html = fs.readFileSync(file, 'utf8');
    const assets = [...html.matchAll(/(?:href|src)="(\/assets\/[^"\s]+\.(?:css|js)(?:\?[^"\s]*)?)"/g)];
    assert.ok(assets.length >= 2, `${file}: shared CSS and JavaScript are present`);
    for (const [, value] of assets) {
      const url = new URL(value.replace(/&amp;/g, '&'), 'https://aldahub.com');
      const contents = fs.readFileSync(path.join(output, url.pathname.slice(1)));
      const expected = crypto.createHash('sha256').update(contents).digest('hex').slice(0, 12);
      assert.equal(url.searchParams.get('v'), expected, `${file}: stale or missing content version for ${url.pathname}`);
      checked.add(url.pathname);
    }
  }
  for (const asset of ['/assets/site.css', '/assets/site.js', '/assets/roadmap.css', '/assets/roadmap.js']) assert.ok(checked.has(asset), `Missing versioned asset: ${asset}`);
});
