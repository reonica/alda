const fs = require('node:fs');
const path = require('node:path');

// Editors change content, not HTML, routing rules or the site's origin.
const INTERNAL_URL = /^\/(?:[a-z0-9_-]+\/)*(?:#[a-zA-Z][\w-]*)?$/;
const IMAGE_PATH = /^\/(?:images|uploads)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|avif|gif|svg)$/i;

function navActive(target, current) {
  if (!INTERNAL_URL.test(target) || target.includes('#')) return false;
  return current === target || (target !== '/' && String(current).startsWith(target));
}

function validateCmsSettings(root) {
  const read = name => JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', `${name}.json`), 'utf8'));
  const text = (value, field) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`CMS: ${field} must contain text.`);
  };
  const texts = (data, fields, name) => fields.forEach(field => text(data[field], `${name}.${field}`));
  const link = (item, field) => {
    text(item?.label, `${field}.label`);
    if (!INTERNAL_URL.test(item?.url)) throw new Error(`CMS: ${field}.url must be a clean internal URL such as /services/.`);
  };
  const links = (items, field) => {
    if (!Array.isArray(items) || !items.length) throw new Error(`CMS: ${field} needs at least one link.`);
    const seen = new Set();
    items.forEach((item, index) => {
      link(item, `${field}[${index}]`);
      if (seen.has(item.url)) throw new Error(`CMS: ${field} contains a duplicate URL: ${item.url}`);
      seen.add(item.url);
    });
  };
  const settings = read('settings');
  texts(settings, ['name', 'slogan', 'description'], 'settings');
  if (!/^https:\/\/wa\.me\/[1-9][0-9]{5,14}$/.test(settings.whatsapp)) throw new Error('CMS: settings.whatsapp must use https://wa.me/ followed by the international phone number.');
  if (!IMAGE_PATH.test(settings.logo) || settings.logo.includes('..') || !fs.existsSync(path.join(root, settings.logo.slice(1)))) throw new Error('CMS: settings.logo must reference an existing image in /images/ or /uploads/.');
  const navigation = read('navigation');
  texts(navigation, ['menuLabel'], 'navigation');
  links(navigation.items, 'navigation.items');
  link(navigation.cta, 'navigation.cta');
  const footer = read('footer');
  texts(footer, ['navigationTitle', 'whatsappLabel', 'newsletterTitle', 'newsletterDescription', 'newsletterButton', 'bottomText'], 'footer');
  links(footer.links, 'footer.links');
  const home = read('home');
  texts(home, ['title', 'headline', 'headlineAccent', 'caption', 'note'], 'home');
  link(home.primaryCta, 'home.primaryCta');
  link(home.secondaryCta, 'home.secondaryCta');
  const cta = read('auditCta');
  texts(cta, ['eyebrow', 'heading', 'description', 'whatsappLabel'], 'auditCta');
  link(cta.button, 'auditCta.button');
}

function validateCmsTargets(root, output) {
  for (const name of ['navigation', 'footer', 'home', 'auditCta']) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', `${name}.json`), 'utf8'));
    const check = value => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.url === 'string') {
        const route = value.url.split('#')[0];
        if (!fs.existsSync(path.join(output, route.slice(1), 'index.html'))) throw new Error(`CMS: ${name} links to a page that is not published: ${route}`);
      }
      Object.values(value).forEach(check);
    };
    check(data);
  }
}

module.exports = { validateCmsSettings, validateCmsTargets, navActive };
