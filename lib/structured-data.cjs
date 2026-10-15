const ORIGIN = 'https://aldahub.com';

function absolute(value) {
  return new URL(value, ORIGIN).href;
}

function breadcrumbsFor(data) {
  if ((!data.article && !data.service) || !data.page?.url) return [];
  return [
    { name: 'Home', url: '/' },
    data.article ? { name: 'Blog', url: '/blog/' } : { name: 'Services', url: '/services/' },
    { name: data.title, url: data.page.url },
  ];
}

function dateISO(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function structuredData(data) {
  const site = data.site;
  const home = absolute('/');
  const organizationId = `${home}#organization`;
  const websiteId = `${home}#website`;
  const graph = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: site.name,
      slogan: site.slogan,
      url: home,
      logo: absolute(site.logo || '/images/alda/alda-logo.png'),
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      name: site.name,
      url: home,
      publisher: { '@id': organizationId },
    },
  ];
  if (!data.page?.url) return { '@context': 'https://schema.org', '@graph': graph };

  const url = absolute(data.page.url);
  if (data.article) {
    const authorName = String(data.author || '').trim();
    const organizationAuthor = !authorName || authorName.replace(/\s+/g, '').toLowerCase() === site.name.replace(/\s+/g, '').toLowerCase();
    const post = {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      url,
      mainEntityOfPage: url,
      headline: data.title,
      description: data.description,
      datePublished: dateISO(data.page.date),
      author: organizationAuthor ? { '@id': organizationId } : { '@type': 'Person', name: authorName },
      publisher: { '@id': organizationId },
      isPartOf: { '@id': websiteId },
    };
    if (data.featured_image) post.image = absolute(data.featured_image);
    if (dateISO(data.modified)) post.dateModified = dateISO(data.modified);
    graph.push(post);
  }
  if (data.service) {
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: data.title,
      serviceType: data.title,
      description: data.description,
      url,
      mainEntityOfPage: url,
      provider: { '@id': organizationId },
    });
  }
  const breadcrumbs = breadcrumbsFor(data);
  if (breadcrumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumbs`,
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absolute(item.url),
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

module.exports = { breadcrumbsFor, structuredData };
