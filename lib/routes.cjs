const fs = require('node:fs');
const path = require('node:path');

const postSlugs = () => fs.readdirSync(path.join(__dirname, '..', 'blog')).filter(file => file.endsWith('.md') && !/^draft:\s*true\s*$/m.test(fs.readFileSync(path.join(__dirname, '..', 'blog', file), 'utf8').split('---')[1] || '')).map(file => file.slice(0, -3));
const pages = { '/index.html': '/', '/about-us.html': '/about/', '/about-us': '/about/', '/services.html': '/services/', '/services': '/services/', '/contact-us.html': '/contact/', '/contact-us': '/contact/', '/blog.html': '/blog/', '/blog': '/blog/', '/seo-roadmap.html': '/seo-roadmap/', '/seo-roadmap': '/seo-roadmap/', '/success': '/thank-you/newsletter/', '/success.html': '/thank-you/newsletter/' };

function canonicalPath(value, publishedSlugs = postSlugs()) {
  if (pages[value]) return pages[value];
  const slug = value.replace(/^\//, '').replace(/\/$/, '');
  return publishedSlugs.includes(slug) ? `/blog/${slug}/` : null;
}

const topicSlug = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function legacyRoutes(topics = []) {
  return [
    { from: 'https://aldahub.netlify.app/*', to: 'https://aldahub.com/:splat', force: true },
    { from: 'https://www.aldahub.com/*', to: 'https://aldahub.com/:splat', force: true },
    // Specific legacy blog routes precede generic page normalization.
    { from: '/blog-post.html slug=:slug', to: '/blog/:slug/' },
    { from: '/blog-post.html post=:slug', to: '/blog/:slug/' },
    { from: '/blog-post.html', to: '/blog/' },
    { from: '/blog page=1', to: '/blog/', force: true },
    { from: '/blog/ page=1', to: '/blog/', force: true },
    { from: '/blog.html page=1', to: '/blog/', force: true },
    ...Array.from({ length: Math.max(0, Math.ceil(postSlugs().length / 6) - 1) }, (_, index) => index + 2).flatMap(number => ['/blog', '/blog/', '/blog.html'].map(from => ({ from: `${from} page=${number}`, to: `/blog/page/${number}/`, force: true }))),
    ...topics.flatMap(topic => [
      ...['/blog', '/blog/', '/blog.html'].map(from => ({ from: `${from} tag=${encodeURIComponent(topic.label.toLowerCase())}`, to: `/blog/tag/${topic.slug}/`, force: true })),
      ...(encodeURIComponent(topic.label.toLowerCase()) !== topic.slug ? [{ from: `/blog/tag/${encodeURIComponent(topic.label.toLowerCase())}`, to: `/blog/tag/${topic.slug}/` }] : [])
    ]),
    ...Object.entries(pages).map(([from, to]) => ({ from, to })),
    ...postSlugs().flatMap(slug => [{ from: `/${slug}`, to: `/blog/${slug}/` }, { from: `/${slug}/`, to: `/blog/${slug}/` }])
  ];
}

module.exports = { legacyRoutes, canonicalPath, postSlugs, topicSlug };
