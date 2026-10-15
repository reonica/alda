const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const assetsDirectory = path.resolve(__dirname, '..', 'assets');

function assetUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/assets/')) return value;
  const url = new URL(value, 'https://aldahub.com');
  const file = path.resolve(assetsDirectory, url.pathname.slice('/assets/'.length));
  if (!file.startsWith(`${assetsDirectory}${path.sep}`)) throw new Error(`Invalid asset path: ${value}`);
  const version = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
  url.searchParams.set('v', version);
  return `${url.pathname}${url.search}${url.hash}`;
}

module.exports = { assetUrl };
