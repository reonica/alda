const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
const origin = 'https://aldahub.com';
const migratedPosts = [
  '16-proven-restaurant-marketing-strategies-to-drive-sales',
  '5-essential-principles-for-mastering-professional-service-branding',
  'a-complete-guide-to-data-driven-digital-marketing',
  'building-a-relentlessly-relevant-brand-in-financial-services',
  'crisis-management-how-to-protect-your-brand-in-viral-moments',
  'how-to-build-a-data-driven-marketing-strategy-in-7-steps',
  'how-to-build-a-data-driven-seo-strategy',
  'how-to-create-a-customer-journey-map',
  'the-complete-guide-to-building-your-first-marketing-strategy',
  'the-power-of-long-copy-ads-in-modern-marketing',
  'unlocking-data-driven-digital-marketing-with-alda-framework',
  'what-is-a-hand-raiser-the-key-to-high-intent-sales',
  'what-is-cro-conversion-rate-optimization-guide',
  'what-is-media-buying',
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function decode(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
  return String(value).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name.startsWith('#x')) return String.fromCodePoint(parseInt(name.slice(2), 16));
    if (name.startsWith('#')) return String.fromCodePoint(parseInt(name.slice(1), 10));
    return named[name.toLowerCase()] ?? entity;
  });
}

function normalize(value) {
  return decode(value).normalize('NFC').replace(/\s+/g, ' ').replace(/\s+([),.!?;:\]}])/g, '$1').replace(/([([{])\s+/g, '$1').trim();
}

function text(html) {
  return normalize(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' '));
}

function markdownText(markdown) {
  return normalize(markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\\([\p{P}\p{S}])/gu, '$1'));
}

function attributes(tag) {
  const result = {};
  const body = tag.replace(/^<\/?[\w:-]+\b/, '').replace(/\/?\s*>$/, '');
  for (const match of body.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attributes(match[0]));
}

function htmlAt(route, directory = output) {
  const file = path.join(directory, route.replace(/^\//, ''), route.endsWith('/') ? 'index.html' : '');
  assert.ok(fs.existsSync(file), `Missing generated page: ${route}. Run the build before testing.`);
  return fs.readFileSync(file, 'utf8');
}

function routeOf(file) {
  const relative = path.relative(output, file).split(path.sep).join('/');
  return relative === 'index.html' ? '/' : `/${relative.replace(/index\.html$/, '')}`;
}

function canonical(html) {
  return tags(html, 'link').filter(link => (link.rel || '').split(/\s+/).includes('canonical'));
}

function frontMatterScalar(frontMatter, key) {
  const lines = frontMatter.split(/\r?\n/);
  const index = lines.findIndex(line => line.startsWith(`${key}:`));
  if (index < 0) return undefined;
  let value = lines[index].slice(key.length + 1).trim();
  for (let next = index + 1; next < lines.length && /^[ \t]+\S/.test(lines[next]); next++) value += ` ${lines[next].trim()}`;
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

function postSources() {
  return fs.readdirSync(path.join(root, 'blog')).filter(file => file.endsWith('.md')).map(file => {
    const source = fs.readFileSync(path.join(root, 'blog', file), 'utf8');
    const frontMatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    assert.ok(frontMatter, `${file} must have front matter`);
    return {
      slug: file.slice(0, -3),
      body: source.slice(frontMatter[0].length),
      title: frontMatterScalar(frontMatter[1], 'title'),
      author: frontMatterScalar(frontMatter[1], 'author'),
      description: frontMatterScalar(frontMatter[1], 'description'),
      modified: frontMatterScalar(frontMatter[1], 'modified'),
      tags: [...(frontMatter[1].match(/^tags:\s*\r?\n((?:[ \t]+-[^\r\n]*(?:\r?\n|$))+)/m)?.[1] || '').matchAll(/^[ \t]+-\s*(.+)$/gm)].map(match => match[1].replace(/^(['"])(.*)\1$/, '$2')),
      draft: /^draft:\s*true\s*$/m.test(frontMatter[1]),
    };
  });
}

function localTarget(value, fromRoute) {
  if (!value || /^(?:mailto:|tel:|data:|javascript:)/i.test(value)) return null;
  const url = new URL(value, `${origin}${fromRoute}`);
  if (!['aldahub.com', 'www.aldahub.com'].includes(url.hostname)) return null;
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return null;
  const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
  const candidate = path.join(output, relative);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return path.join(candidate, 'index.html');
}

function configuredRedirects() {
  const source = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  return source.split(/^\[\[redirects\]\]\s*$/m).slice(1).map(block => {
    const string = key => JSON.parse(block.match(new RegExp(`^\\s*${key}\\s*=\\s*("(?:\\\\.|[^"\\\\])*")`, 'm'))?.[1] || '""');
    const query = block.match(/^\s*query\s*=\s*\{([^}]+)\}/m)?.[1] || '';
    return {
      from: string('from'), to: string('to'),
      status: Number(block.match(/^\s*status\s*=\s*(\d+)/m)?.[1] || 301),
      force: /^\s*force\s*=\s*true\s*$/m.test(block),
      query: Object.fromEntries([...query.matchAll(/(\w+)\s*=\s*("(?:\\.|[^"\\])*")/g)].map(match => [match[1], JSON.parse(match[2])])),
    };
  });
}

function assertPreviewForms(directory) {
  for (const [route, name] of [['/free-marketing-audit/', 'audit'], ['/contact/', 'contact'], ['/', 'newsletter']]) {
    const html = htmlAt(route, directory);
    assert.ok(Object.hasOwn(tags(html, 'body')[0], 'data-form-preview'), `${route}: preview output must identify unavailable form delivery`);
    const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form\s*>/gi)].find(match => attributes(match[0].match(/^<form\b[^>]*>/i)[0]).name === name);
    assert.ok(form, `${route}: ${name} form is present`);
    const submitButtons = tags(form[1], 'button').filter(button => !button.type || button.type === 'submit');
    assert.ok(submitButtons.length > 0, `${name}: a submit control exists`);
    for (const button of submitButtons) assert.ok(Object.hasOwn(button, 'disabled'), `${name}: preview submit is disabled in initial HTML`);
    const notice = [...form[1].matchAll(/<([a-z]+)\b[^>]*role="status"[^>]*>([\s\S]*?)<\/\1\s*>/gi)].find(match => /preview|not (?:send|sent)|unavailable|disabled/i.test(text(match[2])));
    assert.ok(notice, `${name}: delivery notice must be readable without JavaScript`);
    const noticeAttrs = attributes(notice[0].match(/^<[a-z]+\b[^>]*>/i)[0]);
    assert.ok(!Object.hasOwn(noticeAttrs, 'hidden') && !/display\s*:\s*none/i.test(noticeAttrs.style || ''), `${name}: preview notice is visible`);
  }
}

test('the generated site exists', () => {
  assert.ok(fs.existsSync(path.join(output, 'index.html')), 'Run npm run build before npm test.');
});

test('all migrated articles contain their full content, title, author, and canonical without JavaScript', () => {
  const sources = postSources();
  for (const slug of migratedPosts) assert.ok(sources.some(post => post.slug === slug), `Lost Markdown source: ${slug}`);
  for (const post of sources.filter(item => !item.draft)) {
    const route = `/blog/${post.slug}/`;
    const html = htmlAt(route);
    const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)?.[1];
    assert.ok(article, `${route}: article content must be in the initial HTML`);
    const articleText = text(article);
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${route}: one H1`);
    assert.equal(text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1] || ''), normalize(post.title), `${route}: source title`);
    assert.ok(post.author && articleText.includes(`By ${post.author}`), `${route}: source author`);
    assert.equal(canonical(html)[0]?.href, `${origin}${route}`, `${route}: production canonical`);
    for (const meta of tags(html, 'meta').filter(meta => meta.name === 'description' || meta.property === 'og:description')) {
      assert.equal(meta.content, post.description, `${route}: complete description, including quoted text`);
    }
    const expectedText = markdownText(post.body);
    assert.ok(articleText.length >= expectedText.length * 0.85, `${route}: content was truncated (${articleText.length}/${expectedText.length} characters)`);
    const paragraphs = post.body.split(/\r?\n\s*\r?\n/).filter(paragraph => /^[\p{L}"“]/u.test(paragraph.trim()) && markdownText(paragraph).length > 100);
    for (const paragraph of [paragraphs[0], paragraphs.at(-1)].filter(Boolean)) {
      const phrase = markdownText(paragraph).split(' ').slice(0, 18).join(' ');
      assert.ok(articleText.includes(phrase), `${route}: missing opening or closing article text: ${phrase}`);
    }
    for (const heading of post.body.matchAll(/^#{2,6}\s+(.+)$/gm)) {
      assert.ok(articleText.includes(markdownText(heading[1])), `${route}: missing section ${heading[1]}`);
    }
  }
});

test('public pages have one H1 and unique, complete production metadata even in preview builds', () => {
  const titles = new Map();
  const canonicals = new Map();
  for (const file of walk(output).filter(file => file.endsWith('.html'))) {
    const route = routeOf(file);
    if (route.startsWith('/admin/') || route.startsWith('/thank-you/') || route === '/404.html') continue;
    const html = fs.readFileSync(file, 'utf8');
    assert.equal((html.match(/<h1\b/gi) || []).length, 1, `${route}: one H1`);
    const titleElements = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
    assert.equal(titleElements.length, 1, `${route}: one title`);
    const title = text(titleElements[0][1]);
    assert.ok(title.length > 0, `${route}: title is empty`);
    assert.ok(!titles.has(title), `${route}: duplicate title with ${titles.get(title)}`);
    titles.set(title, route);
    const descriptions = tags(html, 'meta').filter(meta => meta.name?.toLowerCase() === 'description');
    assert.equal(descriptions.length, 1, `${route}: one description`);
    assert.ok(descriptions[0].content?.trim(), `${route}: nonempty description`);
    const socialImages = tags(html, 'meta').filter(meta => meta.property === 'og:image');
    assert.equal(socialImages.length, 1, `${route}: one Open Graph image`);
    assert.match(socialImages[0].content || '', /^https?:\/\//, `${route}: Open Graph image is an absolute URL`);
    const links = canonical(html);
    assert.equal(links.length, 1, `${route}: one canonical`);
    assert.equal(links[0].href, `${origin}${route}`, `${route}: canonical uses the production clean URL`);
    assert.ok(!canonicals.has(links[0].href), `${route}: duplicate canonical`);
    canonicals.set(links[0].href, route);
  }
});

test('all local link and media targets exist in the deployed output', () => {
  const missing = [];
  for (const file of walk(output).filter(file => file.endsWith('.html') && !file.includes(`${path.sep}admin${path.sep}`))) {
    const route = routeOf(file);
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<[a-z][^>]*>/gi)) {
      const attrs = attributes(match[0]);
      for (const attribute of ['href', 'src']) {
        const target = localTarget(attrs[attribute], route);
        if (target && !fs.existsSync(target)) missing.push(`${route}: ${attribute}="${attrs[attribute]}"`);
      }
    }
  }
  assert.deepEqual(missing, [], `Broken local links or assets:\n${missing.join('\n')}`);
});

test('sitemap contains the public journey and posts, with no drafts, utility pages, or admin', () => {
  const xml = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
  assert.equal(new Set(urls).size, urls.length, 'Sitemap has duplicate URLs');
  const required = ['/', '/services/', '/services/analytics-growth-strategy/', '/services/seo-aio/', '/services/social-performance-marketing/', '/services/conversion-optimization/', '/approach/', '/about/', '/blog/', '/seo-roadmap/', '/free-marketing-audit/', '/contact/', '/privacy/'];
  for (const route of required) assert.ok(urls.includes(`${origin}${route}`), `Sitemap missing ${route}`);
  for (const post of postSources()) {
    const url = `${origin}/blog/${post.slug}/`;
    assert.equal(urls.includes(url), !post.draft, `Sitemap visibility for ${post.slug}`);
    const entry = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].find(match => match[1].includes(`<loc>${url}</loc>`))?.[1];
    if (entry) {
      if (post.modified) assert.ok(entry.includes(`<lastmod>${new Date(post.modified).toISOString()}</lastmod>`), `${post.slug}: real editorial update date`);
      else assert.ok(!entry.includes('<lastmod>'), `${post.slug}: do not label the publication or build date as an update`);
    }
  }
  for (const url of urls) {
    assert.ok(url.startsWith(`${origin}/`), `Noncanonical sitemap URL: ${url}`);
    assert.ok(!/\/(?:thank-you|admin|drafts)(?:\/|$)|\/404(?:\.html|\/)/.test(url), `Nonpublic URL in sitemap: ${url}`);
    assert.ok(fs.existsSync(localTarget(url, '/')), `Sitemap URL has no generated page: ${url}`);
  }
  for (const route of ['/404.html', '/thank-you/audit/', '/thank-you/contact/', '/thank-you/newsletter/']) {
    const robots = tags(htmlAt(route), 'meta').find(meta => meta.name === 'robots')?.content || '';
    assert.match(robots, /\bnoindex\b/i, `${route}: utility page should be noindex`);
  }
});

test('audit, contact, and newsletter submissions use separate backend names and success destinations', () => {
  const expected = [
    { page: '/free-marketing-audit/', name: 'audit', action: '/thank-you/audit/' },
    { page: '/contact/', name: 'contact', action: '/thank-you/contact/' },
    { page: '/', name: 'newsletter', action: '/thank-you/newsletter/' },
  ];
  for (const item of expected) {
    const forms = [...htmlAt(item.page).matchAll(/<form\b[^>]*>([\s\S]*?)<\/form\s*>/gi)];
    const form = forms.find(match => attributes(match[0].match(/^<form\b[^>]*>/i)[0]).name === item.name);
    assert.ok(form, `${item.page}: ${item.name} form is present in static HTML`);
    const attrs = attributes(form[0].match(/^<form\b[^>]*>/i)[0]);
    assert.equal(attrs.method?.toLowerCase(), 'post', `${item.name}: POST method`);
    assert.equal(attrs.action, item.action, `${item.name}: separate success destination`);
    const identity = tags(form[1], 'input').find(input => input.name === 'form-name');
    assert.equal(identity?.type, 'hidden', `${item.name}: hidden backend form identity`);
    assert.equal(identity?.value, item.name, `${item.name}: backend form identity matches`);
    const email = tags(form[1], 'input').find(input => input.name === 'email');
    assert.equal(email?.type, 'email', `${item.name}: email input`);
    assert.ok(Object.hasOwn(email, 'required'), `${item.name}: email is required`);
  }
  const contact = text(htmlAt('/thank-you/contact/'));
  const newsletter = text(htmlAt('/thank-you/newsletter/'));
  assert.ok(!/thank you for subscribing/i.test(contact), 'Contact confirmation must not describe a newsletter subscription');
  assert.notEqual(contact, newsletter, 'Contact and newsletter confirmations must differ');
});

test('public pages render without runtime GitHub content loading or removed script libraries', () => {
  const forbidden = /api\.github\.com|raw\.githubusercontent\.com|\bjquery\b|\bbootstrap\b|(?:\/|\b)marked(?:[\/.@-]|\s*\()|blog-loader\.js|(?:^|\/)include\.js/i;
  const checked = new Set();
  for (const file of walk(output).filter(file => file.endsWith('.html') && !file.includes(`${path.sep}admin${path.sep}`))) {
    const route = routeOf(file);
    const html = fs.readFileSync(file, 'utf8');
    for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
      const attrs = attributes(script[0].match(/^<script\b[^>]*>/i)[0]);
      if (attrs.type === 'application/ld+json') continue;
      assert.doesNotMatch(attrs.src || script[1], forbidden, `${route}: removed runtime dependency`);
      const target = localTarget(attrs.src, route);
      if (target && !checked.has(target)) {
        checked.add(target);
        assert.doesNotMatch(fs.readFileSync(target, 'utf8'), forbidden, `${attrs.src}: removed runtime content loader or library`);
      }
    }
  }
});

test('legacy routes redirect permanently and unknown URLs have no homepage 200 fallback', () => {
  const redirects = fs.readFileSync(path.join(output, '_redirects'), 'utf8').split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).map(line => {
    const parts = line.trim().split(/\s+/);
    return { from: parts[0], to: parts.at(-2), status: Number(parts.at(-1).replace('!', '')) };
  }).concat(configuredRedirects());
  for (const redirect of redirects) {
    assert.ok(!(redirect.status === 200 && (redirect.from === '/*' || redirect.from === '/:slug')), `Soft 404 rewrite: ${JSON.stringify(redirect)}`);
  }
  for (const [from, to] of Object.entries({ '/index.html': '/', '/about-us.html': '/about/', '/services.html': '/services/', '/contact-us.html': '/contact/', '/blog.html': '/blog/', '/seo-roadmap.html': '/seo-roadmap/' })) {
    assert.ok(redirects.some(rule => rule.from === from && rule.to === to && rule.status === 301), `Missing permanent legacy redirect: ${from} → ${to}`);
  }
  for (const slug of migratedPosts) {
    assert.ok(redirects.some(rule => rule.from === `/${slug}` && rule.to === `/blog/${slug}/` && rule.status === 301), `Missing article redirect: ${slug}`);
  }
  const netlify = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  for (const block of netlify.split(/\[\[redirects\]\]/).slice(1)) {
    const from = block.match(/^\s*from\s*=\s*["']([^"']+)["']/m)?.[1];
    if (from === '/*' || from === '/:slug') assert.ok(!/^\s*status\s*=\s*200\s*$/m.test(block), `Soft 404 rewrite remains in netlify.toml: ${from}`);
  }
  assert.ok(fs.existsSync(path.join(output, '404.html')), 'Deployment must provide the static 404 page');
});

test('legacy blog queries use decoded values without redirecting page one to itself', () => {
  const lines = fs.readFileSync(path.join(output, '_redirects'), 'utf8').split(/\r?\n/).map(line => line.trim());
  assert.ok(!lines.some(line => /^\/blog(?:\/|\.html)?\s+(?:page|tag)=/.test(line)), 'Decoded query migrations belong in TOML, where spaces are valid values');
  const rules = configuredRedirects();
  const normalizePath = value => value.replace(/\/$/, '') || '/';
  // Model the observed CDN behavior: decoded query matching, slash normalization,
  // and forwarding the original query when the destination supplies none.
  const resolve = route => {
    let url = new URL(route, origin);
    const visited = new Set();
    for (let hops = 0; hops < 5; hops++) {
      const identity = normalizePath(url.pathname) + url.search;
      assert.ok(!visited.has(identity), `Redirect loop for ${route}: ${url}`);
      visited.add(identity);
      const match = rules.find(rule => normalizePath(rule.from) === normalizePath(url.pathname) && (!Object.keys(rule.query).length || (Object.keys(rule.query).length === [...url.searchParams].length && Object.entries(rule.query).every(([key, value]) => url.searchParams.get(key) === value))));
      if (!match) return url;
      assert.equal(match.status, 301, `${route}: permanent migration`);
      if (Object.keys(match.query).length) assert.ok(match.force, `${route}: query migration overrides a real page`);
      const next = new URL(match.to, origin);
      if (!next.search) next.search = url.search;
      url = next;
    }
    assert.fail(`Too many redirects for ${route}`);
  };
  const published = postSources().filter(post => !post.draft);
  const pageCount = Math.ceil(published.length / 6);
  for (let number = 1; number <= pageCount; number++) {
    const destination = number === 1 ? '/blog/' : `/blog/page/${number}/`;
    for (const from of ['/blog', '/blog/', '/blog.html']) {
      assert.equal(normalizePath(resolve(`${from}?page=${number}`).pathname), normalizePath(destination), `Legacy page ${number}: ${from}`);
    }
    assert.ok(fs.existsSync(localTarget(destination, '/')), `Pagination redirect must resolve: ${destination}`);
  }
  const tagRules = rules.filter(rule => Object.hasOwn(rule.query, 'tag'));
  assert.ok(tagRules.some(rule => rule.query.tag === 'data analysis'), 'Multiword legacy label must match its decoded value');
  assert.ok(tagRules.some(rule => rule.query.tag === 'cro'), 'Single-word legacy label must remain supported');
  for (const rule of tagRules) {
    const label = rule.query.tag;
    assert.ok(!/%[0-9a-f]{2}/i.test(label), `TOML query values must be decoded: ${label}`);
    for (const from of ['/blog', '/blog/', '/blog.html']) {
      for (const query of [encodeURIComponent(label), new URLSearchParams({ tag: label }).toString().slice(4)]) {
        assert.equal(resolve(`${from}?tag=${query}`).pathname, rule.to, `Legacy topic must resolve for percent/plus encoding: ${from}?tag=${query}`);
      }
    }
    assert.ok(fs.existsSync(localTarget(rule.to, '/')), `Topic redirect must resolve: ${rule.to}`);
  }
  assert.equal(resolve('/blog/?tag=data%20analysis&utm_source=test').pathname, '/blog/', 'Unrecognized query combinations stay on the listing');
});

test('preview forms have disabled submit controls and a static delivery notice', context => {
  const body = tags(htmlAt('/'), 'body')[0];
  if (!Object.hasOwn(body, 'data-form-preview')) return context.skip('Main output is production; the isolated repeat-build fixture also verifies deploy-preview HTML.');
  assertPreviewForms(output);
});

test('SEO roadmap preserves 724 usable outbound resources in static HTML', () => {
  const html = htmlAt('/seo-roadmap/');
  const section = html.match(/<section\b[^>]*aria-label="SEO resource library"[^>]*>([\s\S]*?)<\/section\s*>/i)?.[1];
  assert.ok(section, 'The resource library must be an accessible section');
  const resources = [...section.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi)].filter(link => /^https?:\/\//.test(attributes(link[0].match(/^<a\b[^>]*>/i)[0]).href || ''));
  assert.equal(resources.length, 724, 'All original roadmap resources must be available without JavaScript');
  for (const resource of resources) assert.ok(text(resource[1]), 'Each resource link needs a visible accessible label');
});

test('repeat builds remove published posts changed to draft or deleted, and preview forms work without JavaScript', { timeout: 45000 }, () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aldahub-draft-test-'));
  try {
    for (const entry of ['package.json', 'eleventy.config.js', 'scripts', 'lib', 'src', 'blog', 'cms']) {
      const source = path.join(root, entry);
      if (fs.existsSync(source)) fs.cpSync(source, path.join(temporary, entry), { recursive: true });
    }
    for (const entry of ['assets', 'images', 'admin', 'uploads', 'node_modules']) {
      const source = path.join(root, entry);
      if (fs.existsSync(source)) fs.symlinkSync(source, path.join(temporary, entry), 'dir');
    }
    const slug = 'integration-draft-must-stay-private';
    const title = 'Integration Draft Must Stay Private';
    const deletedSlug = 'integration-deleted-post';
    const deletedTitle = 'Integration Deleted Post';
    const description = 'A "quoted" description & useful metadata must survive rendering.';
    const draftFile = path.join(temporary, 'blog', `${slug}.md`);
    const deletedFile = path.join(temporary, 'blog', `${deletedSlug}.md`);
    const fixturePost = (postTitle, topic, draft) => `---\ntitle: ${postTitle}\ndate: 2026-01-01\nauthor: Test Author\ndescription: '${description}'\ndraft: ${draft}\ntags:\n  - ${topic}\n---\nThis integration fixture verifies published content can be removed safely.\n`;
    fs.writeFileSync(draftFile, fixturePost(title, 'Integration Private Topic', false));
    fs.writeFileSync(deletedFile, fixturePost(deletedTitle, 'Integration Deleted Topic', false));
    const runBuild = context => {
      const build = spawnSync(process.execPath, [path.join(temporary, 'scripts', 'build.cjs')], { cwd: temporary, encoding: 'utf8', timeout: 20000, env: { ...process.env, CONTEXT: context, NETLIFY: 'true', VERCEL_ENV: '' } });
      assert.equal(build.status, 0, `Repeat-build fixture failed (${context}):\n${build.error || ''}\n${build.stdout}\n${build.stderr}`);
    };
    runBuild('production');
    const fixtureOutput = path.join(temporary, '_site');
    for (const fixtureSlug of [slug, deletedSlug]) assert.ok(fs.existsSync(path.join(fixtureOutput, 'blog', fixtureSlug, 'index.html')), `Published fixture must be emitted before removal: ${fixtureSlug}`);
    const publishedHtml = htmlAt(`/blog/${slug}/`, fixtureOutput);
    for (const meta of tags(publishedHtml, 'meta').filter(meta => meta.name === 'description' || meta.property === 'og:description')) assert.equal(meta.content, description, 'Quoted metadata must not split into broken attributes');
    assert.equal(tags(publishedHtml, 'meta').find(meta => meta.property === 'og:image')?.content, `${origin}/images/alda/alda-logo.png`, 'Default Open Graph image must be absolute');
    fs.writeFileSync(draftFile, fixturePost(title, 'Integration Private Topic', true));
    fs.unlinkSync(deletedFile);
    runBuild('deploy-preview');
    for (const fixtureSlug of [slug, deletedSlug, 'tag/integration-private-topic', 'tag/integration-deleted-topic']) assert.ok(!fs.existsSync(path.join(fixtureOutput, 'blog', fixtureSlug, 'index.html')), `Repeat build must remove stale article or topic HTML: ${fixtureSlug}`);
    for (const file of walk(fixtureOutput).filter(file => /\.(?:html|xml)$/.test(file) && !file.includes(`${path.sep}admin${path.sep}`))) {
      const generated = fs.readFileSync(file, 'utf8');
      for (const removedTitle of [title, deletedTitle]) assert.ok(!generated.includes(removedTitle), `Removed article leaked into ${path.relative(fixtureOutput, file)}: ${removedTitle}`);
    }
    for (const artifact of ['sitemap.xml', '_redirects']) {
      const generated = fs.readFileSync(path.join(fixtureOutput, artifact), 'utf8');
      for (const removedSlug of [slug, deletedSlug]) assert.ok(!generated.includes(removedSlug), `Removed article URL leaked into ${artifact}: ${removedSlug}`);
    }
    assertPreviewForms(fixtureOutput);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
