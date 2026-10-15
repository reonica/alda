const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { structuredData, breadcrumbsFor } = require('../lib/structured-data.cjs');
const site = require('../src/_data/site.js')();

const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
const origin = 'https://aldahub.com';
const organizationId = `${origin}/#organization`;
const websiteId = `${origin}/#website`;
const serviceSlugs = ['analytics-growth-strategy', 'seo-aio', 'social-performance-marketing', 'conversion-optimization'];

function decode(value) {
  return String(value).replace(/&(?:amp|lt|gt|quot|apos|#39|#x27);/gi, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#x27;': "'" })[entity.toLowerCase()]);
}

function text(value) {
  return decode(value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function readPage(route) {
  const file = path.join(output, route.replace(/^\//, ''), route.endsWith('/') ? 'index.html' : '');
  assert.ok(fs.existsSync(file), `Build the site before testing: ${route}`);
  const html = fs.readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1, `${route}: one linked structured-data graph`);
  const data = JSON.parse(scripts[0][1]);
  assert.equal(data['@context'], 'https://schema.org');
  assert.ok(Array.isArray(data['@graph']), `${route}: schema graph is present`);
  const canonical = decode(html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1] || '');
  assert.equal(canonical, `${origin}${route}`);
  return { html, graph: data['@graph'], canonical };
}

function scalar(source, key) {
  const value = source.match(new RegExp(`^${key}:\\s*([^\\r\\n]*)`, 'm'))?.[1];
  return value?.replace(/^(['"])(.*)\1$/, '$2');
}

function byType(graph, type) {
  return graph.filter(node => node['@type'] === type);
}

function assertBreadcrumbs(page, route, middle) {
  const breadcrumbs = byType(page.graph, 'BreadcrumbList');
  assert.equal(breadcrumbs.length, 1, `${route}: breadcrumb schema`);
  const nav = page.html.match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
  assert.ok(nav, `${route}: visible breadcrumb navigation`);
  const visibleItems = [...nav.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(match => text(match[1]));
  const items = breadcrumbs[0].itemListElement;
  assert.deepEqual(items.map(item => item.name), visibleItems, `${route}: schema matches the visible trail`);
  assert.deepEqual(items.map(item => item.position), [1, 2, 3]);
  assert.deepEqual(items.slice(0, 2).map(item => ({ name: item.name, item: item.item })), [
    { name: 'Home', item: `${origin}/` },
    { name: middle, item: `${origin}/${middle.toLowerCase()}/` },
  ]);
  assert.equal(items.at(-1).item, page.canonical);
  assert.match(nav, /aria-current="page"/, `${route}: current breadcrumb is identified accessibly`);
}

test('homepage identifies the actual organization and website with stable graph references', () => {
  const { graph, html } = readPage('/');
  const organization = byType(graph, 'Organization');
  const website = byType(graph, 'WebSite');
  assert.equal(organization.length, 1);
  assert.equal(website.length, 1);
  assert.equal(organization[0]['@id'], organizationId);
  assert.equal(organization[0].name, site.name);
  assert.equal(organization[0].slogan, site.slogan);
  assert.equal(organization[0].url, `${origin}/`);
  assert.equal(organization[0].logo, `${origin}/images/alda/alda-logo.png`);
  assert.ok(text(html).includes(site.slogan), 'The schema slogan is also visible');
  assert.equal(website[0]['@id'], websiteId);
  assert.equal(website[0].name, site.name);
  assert.equal(website[0].url, `${origin}/`);
  assert.deepEqual(website[0].publisher, { '@id': organizationId });
  assert.equal(byType(graph, 'BreadcrumbList').length, 0, 'Homepage has no invented hierarchy');
});

test('each published Markdown article exposes factual BlogPosting data and matching visible breadcrumbs', () => {
  for (const file of fs.readdirSync(path.join(root, 'blog')).filter(file => file.endsWith('.md'))) {
    const source = fs.readFileSync(path.join(root, 'blog', file), 'utf8').split('---')[1];
    if (/^draft:\s*true\s*$/m.test(source)) continue;
    const route = `/blog/${file.slice(0, -3)}/`;
    const page = readPage(route);
    const posts = byType(page.graph, 'BlogPosting');
    assert.equal(posts.length, 1, `${route}: BlogPosting data is present`);
    const post = posts[0];
    assert.equal(post['@id'], `${page.canonical}#article`);
    assert.equal(post.url, page.canonical);
    assert.equal(post.mainEntityOfPage, page.canonical);
    assert.equal(post.headline, scalar(source, 'title'));
    assert.equal(post.headline, text(page.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)[1]));
    const author = scalar(source, 'author');
    if (author && author.replace(/\s+/g, '').toLowerCase() !== site.name.replace(/\s+/g, '').toLowerCase()) {
      assert.deepEqual(post.author, { '@type': 'Person', name: author }, `${route}: no invented author biography or profile`);
      assert.ok(text(page.html).includes(`By ${author}`));
    } else assert.deepEqual(post.author, { '@id': organizationId });
    assert.equal(post.datePublished, new Date(scalar(source, 'date')).toISOString());
    assert.ok(page.html.includes(`datetime="${post.datePublished}"`), `${route}: publication date is visible`);
    const modified = scalar(source, 'modified');
    if (modified) {
      assert.equal(post.dateModified, new Date(modified).toISOString());
      assert.match(page.html, /Updated\s*<time/, `${route}: actual modification date is visible`);
      assert.ok(page.html.includes(`datetime="${post.dateModified}"`));
    } else assert.ok(!Object.hasOwn(post, 'dateModified'), `${route}: no fabricated modification date`);
    const image = scalar(source, 'featured_image');
    if (image) {
      assert.equal(post.image, new URL(image, origin).href);
      assert.ok(page.html.includes(`src="${image}"`), `${route}: schema image is shown in article`);
    } else assert.ok(!Object.hasOwn(post, 'image'), `${route}: a logo must not substitute for an article image`);
    assert.deepEqual(post.publisher, { '@id': organizationId });
    assert.deepEqual(post.isPartOf, { '@id': websiteId });
    assertBreadcrumbs(page, route, 'Blog');
  }
});

test('four service detail pages describe the visible service and actual provider without invented offers', () => {
  for (const slug of serviceSlugs) {
    const route = `/services/${slug}/`;
    const source = fs.readFileSync(path.join(root, 'src', 'services', `${slug}.njk`), 'utf8').split('---')[1];
    const page = readPage(route);
    const services = byType(page.graph, 'Service');
    assert.equal(services.length, 1, `${route}: service schema`);
    const service = services[0];
    assert.equal(service.name, scalar(source, 'title'));
    assert.ok(text(page.html).includes(service.name), `${route}: service name is visible`);
    assert.equal(service.serviceType, service.name);
    assert.equal(service.description, scalar(source, 'description'));
    assert.equal(service.url, page.canonical);
    assert.deepEqual(service.provider, { '@id': organizationId });
    for (const key of ['offers', 'price', 'address', 'aggregateRating', 'review']) assert.ok(!Object.hasOwn(service, key), `${route}: no invented ${key}`);
    assertBreadcrumbs(page, route, 'Services');
  }
  assert.equal(byType(readPage('/services/').graph, 'Service').length, 0, 'Service directory must not impersonate one service');
});

test('schema graph references resolve and contain no invented reviews, ratings, or company details', () => {
  for (const route of ['/', '/about/', ...serviceSlugs.map(slug => `/services/${slug}/`), '/blog/how-to-build-a-data-driven-seo-strategy/']) {
    const { graph } = readPage(route);
    const ids = new Set(graph.map(node => node['@id']));
    assert.equal(ids.size, graph.length, `${route}: unique graph identifiers`);
    for (const node of graph) {
      for (const key of ['publisher', 'provider', 'isPartOf']) {
        if (node[key]?.['@id']) assert.ok(ids.has(node[key]['@id']), `${route}: ${key} reference resolves in this graph`);
      }
      assert.ok(!['Review', 'AggregateRating'].includes(node['@type']), `${route}: no fabricated reputation data`);
      for (const key of ['review', 'aggregateRating', 'address', 'foundingDate', 'numberOfEmployees', 'sameAs']) assert.ok(!Object.hasOwn(node, key), `${route}: no unverified ${key}`);
    }
  }
});

test('schema helper uses only an explicit editorial modification date and shares its breadcrumb model', () => {
  const data = { site, page: { url: '/blog/example/', date: new Date('2025-01-02T10:00:00+07:00') }, title: 'A "quoted" <example>', description: 'A factual example.', article: true, author: 'Example Author' };
  const original = structuredData(data)['@graph'].find(node => node['@type'] === 'BlogPosting');
  assert.ok(!Object.hasOwn(original, 'dateModified'));
  assert.ok(!Object.hasOwn(original, 'image'));
  const modified = '2026-03-04T15:00:00+07:00';
  const graph = structuredData({ ...data, modified })['@graph'];
  assert.equal(graph.find(node => node['@type'] === 'BlogPosting').dateModified, new Date(modified).toISOString());
  assert.deepEqual(graph.find(node => node['@type'] === 'BreadcrumbList').itemListElement.map(item => ({ name: item.name, url: new URL(item.item).pathname })), breadcrumbsFor(data));
  assert.deepEqual(breadcrumbsFor({ ...data, article: false }), []);
  for (const author of ['Aldahub', 'Alda Hub', 'AldaHub', '']) {
    const post = structuredData({ ...data, author })['@graph'].find(node => node['@type'] === 'BlogPosting');
    assert.deepEqual(post.author, { '@id': organizationId }, 'Company bylines must identify the organization rather than invent a person');
  }
});

test('the registered JSON-LD serializer preserves content without allowing a script element to close', () => {
  const filters = new Map();
  const config = new Proxy({ addFilter: (name, filter) => filters.set(name, filter), ignores: { add() {} } }, { get: (target, key) => target[key] || (() => {}) });
  require('../eleventy.config.js')(config);
  const headline = 'A "quoted" </script><script>example</script> & title';
  const graph = structuredData({ site, page: { url: '/blog/escaping/', date: new Date('2026-01-01') }, title: headline, article: true });
  const serialized = filters.get('jsonLd')(graph);
  assert.ok(!serialized.includes('<'), 'Inline JSON-LD must escape HTML delimiters');
  assert.equal(JSON.parse(serialized)['@graph'].find(node => node['@type'] === 'BlogPosting').headline, headline);
});
