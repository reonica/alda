const fs = require('node:fs');
const path = require('node:path');
const { legacyRoutes, canonicalPath, postSlugs, topicSlug } = require('./lib/routes.cjs');
const { breadcrumbsFor, structuredData } = require('./lib/structured-data.cjs');
const { icon } = require('./lib/icons.cjs');

module.exports = function (config) {
  config.addNunjucksShortcode('icon', icon);
  let topics = [];
  let publishedSlugs = [];
  config.on('eleventy.before', () => { publishedSlugs = postSlugs(); });
  config.setNunjucksEnvironmentOptions({ autoescape: true });
  for (const pattern of ['README.md', 'docs/**', 'tests/**', 'content/**', 'node_modules/**']) config.ignores.add(pattern);
  config.addPassthroughCopy('assets');
  config.addPassthroughCopy('images');
  config.addPassthroughCopy('admin');
  config.addPassthroughCopy('uploads');
  config.addWatchTarget('blog');
  config.addCollection('posts', collection => collection.getFilteredByGlob('./blog/*.md').filter(post => post.data.draft !== true).sort((a, b) => b.date - a.date));
  config.addCollection('topics', collection => {
    const groups = new Map();
    for (const post of collection.getFilteredByGlob('./blog/*.md').filter(post => post.data.draft !== true).sort((a, b) => b.date - a.date)) {
      for (const label of post.data.tags || []) {
        const slug = topicSlug(label);
        if (!groups.has(slug)) groups.set(slug, { label, slug, posts: [] });
        groups.get(slug).posts.push(post);
      }
    }
    topics = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
    return topics;
  });
  config.addFilter('topicSlug', topicSlug);
  config.addFilter('breadcrumbsFor', breadcrumbsFor);
  config.addFilter('structuredData', structuredData);
  config.addCollection('indexable', collection => collection.getAll().filter(item => item.url && !item.data.noindex && item.url !== '/404.html' && !item.url.endsWith('.xml') && !item.url.endsWith('.txt')));
  config.addFilter('absoluteUrl', value => new URL(value || '/', 'https://aldahub.com').href);
  config.addFilter('dateDisplay', value => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)));
  config.addFilter('dateISO', value => new Date(value).toISOString());
  config.addFilter('readingTime', value => Math.max(1, Math.ceil(String(value || '').replace(/<[^>]*>/g, ' ').split(/\s+/).length / 220)));
  config.addFilter('summary', (value, length = 160) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, length));
  config.addFilter('jsonLd', value => JSON.stringify(value).replace(/</g, '\\u003c'));
  config.addFilter('xmlEscape', value => String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]));
  config.amendLibrary('md', md => md.set({ html: false }));
  config.addTransform('canonical-internal-links', function (html) {
    if (typeof this.page.outputPath !== 'string' || !this.page.outputPath.endsWith('.html')) return html;
    return html.replace(/href="((?:https:\/\/aldahub\.com)?\/[^"\s]*)"/g, (match, href) => {
      const url = new URL(href, 'https://aldahub.com');
      const target = canonicalPath(url.pathname, publishedSlugs);
      return target ? `href="${target}${url.search}${url.hash}"` : match;
    });
  });
  config.on('eleventy.after', ({ dir }) => {
    const output = path.resolve(dir.output);
    fs.writeFileSync(path.join(output, '_redirects'), legacyRoutes(topics).map(route => `${route.from} ${route.to} ${route.status || 301}${route.force ? '!' : ''}`).join('\n') + '\n');
  });
  return { dir: { input: '.', includes: 'src/_includes', data: 'src/_data', output: '_site' }, templateFormats: ['njk', 'md'], markdownTemplateEngine: false, htmlTemplateEngine: 'njk' };
};
