const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const yaml = createRequire(require.resolve('@11ty/eleventy'))('js-yaml');
const cmsConfig = () => yaml.load(fs.readFileSync(path.join(root, 'admin', 'config.yml'), 'utf8'));
const readJson = (directory, name) => JSON.parse(fs.readFileSync(path.join(directory, 'src', '_data', `${name}.json`), 'utf8'));
const writeJson = (directory, name, data) => fs.writeFileSync(path.join(directory, 'src', '_data', `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);

function decode(value) {
  return String(value).replace(/&(?:amp|lt|gt|quot|apos|#39|#x27);/gi, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#x27;': "'" })[entity.toLowerCase()]);
}

function text(value) {
  return decode(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, decode(value)]));
}

function pageAt(directory, route) {
  return fs.readFileSync(path.join(directory, '_site', route.replace(/^\//, ''), 'index.html'), 'utf8');
}

function makeFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aldahub-cms-test-'));
  for (const name of ['package.json', 'eleventy.config.js', 'scripts', 'lib', 'src', 'blog']) {
    fs.cpSync(path.join(root, name), path.join(directory, name), { recursive: true });
  }
  for (const name of ['assets', 'images', 'admin', 'uploads', 'node_modules']) {
    const source = path.join(root, name);
    if (fs.existsSync(source)) fs.symlinkSync(source, path.join(directory, name), 'dir');
  }
  return directory;
}

function buildFixture(directory) {
  return spawnSync(process.execPath, [path.join(directory, 'scripts', 'build.cjs'), '--quiet'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, CONTEXT: 'production', NETLIFY: 'true', VERCEL_ENV: '' },
  });
}

function assertForm(html, name, action) {
  const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].find(match => attributes(match[0].match(/^<form\b[^>]*>/i)[0]).name === name)?.[0];
  assert.ok(form, `${name}: content edits retain the form`);
  const attrs = attributes(form.match(/^<form\b[^>]*>/i)[0]);
  assert.equal(attrs.method, 'post');
  assert.equal(attrs.action, action);
  assert.equal(attrs['data-netlify'], 'true');
  assert.ok([...form.matchAll(/<input\b[^>]*>/gi)].some(match => {
    const input = attributes(match[0]);
    return input.name === 'form-name' && input.value === name;
  }), `${name}: backend identity remains intact`);
}

test('CMS manages existing Markdown safely and exposes the five data files used by page modules', () => {
  const config = cmsConfig();
  assert.equal(config.backend.name, 'git-gateway');
  assert.equal(config.backend.branch, 'main');
  assert.equal(config.media_folder, 'images/blog');
  assert.equal(config.public_folder, '/images/blog');
  const blog = config.collections.find(collection => collection.name === 'blog');
  assert.equal(blog.folder, 'blog');
  assert.equal(blog.slug, '{{slug}}');
  const fields = new Map(blog.fields.map(field => [field.name, field]));
  assert.equal(fields.get('draft').widget, 'boolean');
  assert.equal(fields.get('draft').default, true, 'New entries remain private until the editor publishes them');
  assert.equal(fields.get('modified').required, false);
  assert.equal(fields.get('modified').default, '', 'An edit must not fabricate a substantial update date');
  assert.equal(fields.get('body').widget, 'markdown');
  assert.equal(fields.get('featured_image_alt').required, false, 'Existing posts without image alt can still be edited');
  assert.equal(fields.get('tags').widget, 'list');
  assert.ok(!fields.get('tags').fields, 'Topic labels must stay a list of strings');
  assert.ok(!fields.has('permalink') && !fields.has('slug'), 'The editor cannot accidentally rename an existing public URL');
  for (const file of fs.readdirSync(path.join(root, 'blog')).filter(file => file.endsWith('.md'))) {
    const source = fs.readFileSync(path.join(root, 'blog', file), 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    assert.ok(frontmatter, `${file}: article front matter exists`);
    assert.equal(typeof yaml.load(frontmatter).draft, 'boolean', `${file}: explicit draft state keeps published articles visible in CMS status filters`);
  }

  const website = config.collections.find(collection => collection.name === 'website');
  assert.ok(website?.files, 'Page modules use a file collection rather than exposing templates or JavaScript');
  assert.deepEqual(website.files.map(file => file.name).sort(), ['auditCta', 'footer', 'home', 'navigation', 'settings']);
  for (const file of website.files) {
    assert.equal(file.file, `src/_data/${file.name}.json`);
    assert.ok(file.fields?.length, `${file.name}: editor fields are configured`);
    const data = readJson(root, file.name);
    assert.ok(data && !Array.isArray(data) && Object.keys(data).length, `${file.name}: a nonempty JSON object exists`);
  }
});

test('CMS module edits produce static pages, safe text, coherent metadata and unchanged form delivery', { timeout: 45000 }, () => {
  const directory = makeFixture();
  try {
    const settings = readJson(directory, 'settings');
    settings.name = 'AldaHub CMS & QA';
    settings.description = 'A clear "editorial" description & growth decisions.';
    settings.whatsapp = 'https://wa.me/84912345678';
    settings.logo = '/images/blog/alda-logo.jpg';
    writeJson(directory, 'settings', settings);

    const navigation = readJson(directory, 'navigation');
    navigation.menuLabel = 'Browse "Alda"';
    navigation.items.reverse();
    navigation.items[0].label = 'Contact <strong>CMS</strong> & Team';
    writeJson(directory, 'navigation', navigation);

    const footer = readJson(directory, 'footer');
    footer.newsletterDescription = 'Useful <script data-cms-inert="true">draft</script> & insights.';
    footer.newsletterButton = 'Join "Insights"';
    writeJson(directory, 'footer', footer);

    const home = readJson(directory, 'home');
    home.title = 'CMS <em>Home</em> & Growth';
    home.headline = 'CMS <em>Data</em> & Decisions.';
    home.headlineAccent = 'A measurable editorial outcome.';
    home.caption = 'A caption with "quotes", <strong>plain text</strong> & useful advice.';
    writeJson(directory, 'home', home);

    const cta = readJson(directory, 'auditCta');
    cta.heading = 'CMS <strong>Next</strong> & Priorities';
    cta.description = 'Choose one "clear" opportunity & review it.';
    cta.button.label = 'Review "My" Priorities';
    writeJson(directory, 'auditCta', cta);

    const imageAlt = 'Chart "quarter one" & <measured> growth';
    fs.writeFileSync(path.join(directory, 'blog', 'cms-authoring-fixture.md'), [
      '---',
      'title: CMS authoring fixture',
      'date: 2026-01-01T09:00:00+07:00',
      `author: ${JSON.stringify(settings.name)}`,
      'description: A real Markdown authoring fixture.',
      'featured_image: /images/blog/data-driven-seo-strategy.jpg',
      `featured_image_alt: ${JSON.stringify(imageAlt)}`,
      'draft: false',
      'tags:',
      '  - CMS editorial fixture',
      '---',
      '## A useful article section',
      'The article body remains available in the initial HTML.',
      '',
    ].join('\n'));

    const result = buildFixture(directory);
    assert.equal(result.status, 0, `CMS fixture build failed:\n${result.error || ''}\n${result.stdout}\n${result.stderr}`);
    const homepage = pageAt(directory, '/');
    const about = pageAt(directory, '/about/');
    const article = pageAt(directory, '/blog/cms-authoring-fixture/');
    const header = homepage.match(/<header\b[^>]*class="site-header"[^>]*>([\s\S]*?)<\/header>/i)?.[1];
    const nav = header?.match(/<nav\b[^>]*id="primary-nav"[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
    assert.ok(nav, 'Static HTML includes the CMS navigation');
    const navLabels = [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(match => text(match[1]));
    assert.deepEqual(navLabels.slice(0, navigation.items.length), navigation.items.map(item => item.label), 'Editor order and literal labels reach the navbar');
    assert.ok(text(header).includes(navigation.menuLabel));
    assert.equal(text(homepage.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)[1]), `${home.headline} ${home.headlineAccent}`);
    assert.ok(text(homepage).includes(home.caption));
    assert.equal(text(homepage.match(/<title>([\s\S]*?)<\/title>/i)[1]), `${home.title} | ${settings.name}`, 'Metadata must preserve edited text without double escaping');

    for (const html of [homepage, about, article]) {
      assert.ok(text(html).includes(footer.newsletterDescription));
      assert.ok(text(html).includes(footer.newsletterButton));
      assert.ok(text(html).includes(cta.heading), 'Shared CTA edits reach multiple page types');
      assert.ok(text(html).includes(cta.description));
      assert.ok(text(html).includes(cta.button.label));
      assert.ok(!html.includes('<script data-cms-inert='), 'Editor text must never become executable markup');
      assert.ok(!html.includes('<strong>CMS</strong>') && !html.includes('<em>Data</em>'), 'Module fields render literal text rather than authored HTML');
      const whatsappLinks = [...html.matchAll(/<a\b[^>]*\bdata-whatsapp\b[^>]*>/gi)].map(match => attributes(match[0]).href);
      assert.ok(whatsappLinks.length >= 2);
      assert.ok(whatsappLinks.every(url => url === settings.whatsapp), 'Shared contact setting reaches footer, CTA and floating button');
      const logo = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => attributes(match[0])).find(image => image.width === '54');
      assert.equal(logo.src, settings.logo);
      const graph = JSON.parse(html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)[1])['@graph'];
      const organization = graph.find(node => node['@type'] === 'Organization');
      assert.equal(organization.name, settings.name);
      assert.equal(organization.slogan, settings.slogan);
      assert.equal(organization.logo, `https://aldahub.com${settings.logo}`);
      const siteName = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0])).find(meta => meta.property === 'og:site_name');
      assert.equal(siteName.content, settings.name);
      assertForm(html, 'newsletter', '/thank-you/newsletter/');
    }
    const description = [...about.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0])).find(meta => meta.name === 'description');
    assert.ok(description.content, 'Page-specific metadata is retained');
    const defaultSocialImage = [...homepage.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0])).find(meta => meta.property === 'og:image');
    assert.equal(defaultSocialImage.content, `https://aldahub.com${settings.logo}`);
    const featuredImage = [...article.matchAll(/<img\b[^>]*>/gi)].map(match => attributes(match[0])).find(image => image.class === 'article-featured-image');
    assert.equal(featuredImage.alt, imageAlt, 'Image descriptions survive quotes and special characters');
    assert.ok(text(article).includes('The article body remains available in the initial HTML.'));
    assertForm(pageAt(directory, '/contact/'), 'contact', '/thank-you/contact/');
    assertForm(pageAt(directory, '/free-marketing-audit/'), 'audit', '/thank-you/audit/');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('an unsafe CMS link stops the deployment instead of publishing an executable URL', { timeout: 45000 }, () => {
  const directory = makeFixture();
  try {
    const navigation = readJson(directory, 'navigation');
    navigation.items[0].url = 'javascript:alert(1)';
    writeJson(directory, 'navigation', navigation);
    const result = buildFixture(directory);
    assert.notEqual(result.status, 0, 'Unsafe links must fail the build');
    assert.match(`${result.stdout}\n${result.stderr}`, /CMS:.*navigation.*(?:url|URL)/, 'Editors receive an actionable field error');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
