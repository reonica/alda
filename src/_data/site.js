const fs = require('node:fs');
const path = require('node:path');

// Read on each build, including Eleventy watch rebuilds after a CMS data edit.
module.exports = () => ({
  ...JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8')),
  url: 'https://aldahub.com',
  year: new Date().getFullYear(),
  preview: Boolean(process.env.CONTEXT && process.env.CONTEXT !== 'production') || Boolean(process.env.VERCEL_ENV),
  netlifyForms: Boolean(process.env.NETLIFY)
});
