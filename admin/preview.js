(() => {
  'use strict';
  const CMS = window.CMS;
  const h = window.h;
  const component = render => window.createClass({ render() { return render(this.props); } });
  const dataOf = props => props.entry.get('data').toJS();
  const notice = () => h('p', { className: 'preview-notice' }, 'Xem trước nội dung · bố cục sẽ theo website khi triển khai');
  const button = value => h('span', { className: 'preview-button' }, value?.label || 'Nhãn nút');
  const linkList = items => h('ul', { className: 'preview-links' }, (items || []).map((item, i) => h('li', { key: i }, h('strong', null, item.label), h('small', null, item.url))));
  const image = (props, source, alt = '') => {
    if (!source) return null;
    const asset = props.getAsset(source);
    return h('img', { src: asset ? asset.toString() : source, alt });
  };
  const frame = (...children) => h('div', { className: 'cms-preview' }, notice(), ...children);

  CMS.registerPreviewStyle('/admin/preview.css');
  CMS.registerPreviewStyle('/assets/article-content.css');
  CMS.registerPreviewTemplate('blog', component(props => {
    const data = dataOf(props);
    let date = '';
    if (data.date && !Number.isNaN(new Date(data.date).getTime())) date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(data.date));
    return frame(
      data.draft && h('p', { className: 'preview-draft' }, 'BẢN NHÁP — chưa có trang công khai'),
      h('p', { className: 'preview-eyebrow' }, 'Marketing insights'),
      h('h1', null, data.title || 'Tiêu đề bài viết'),
      h('p', { className: 'preview-lead' }, data.description),
      h('p', { className: 'preview-meta' }, `By ${data.author || 'AldaHub'}${date ? ` · ${date}` : ''}`),
      image(props, data.featured_image, data.featured_image_alt || ''),
      h('div', { className: 'preview-prose' }, props.widgetFor('body')),
      h('p', { className: 'preview-meta' }, (data.tags || []).join(' · '))
    );
  }));
  CMS.registerPreviewTemplate('settings', component(props => {
    const data = dataOf(props);
    return frame(image(props, data.logo), h('h1', null, data.name), h('p', { className: 'preview-lead' }, data.slogan), h('p', null, data.description), h('p', { className: 'preview-meta' }, data.whatsapp));
  }));
  CMS.registerPreviewTemplate('navigation', component(props => {
    const data = dataOf(props);
    return frame(h('p', { className: 'preview-eyebrow' }, 'Navbar / menu'), h('h1', null, data.menuLabel), linkList(data.items), button(data.cta));
  }));
  CMS.registerPreviewTemplate('footer', component(props => {
    const data = dataOf(props);
    return frame(h('section', { className: 'preview-footer' }, h('h2', null, data.navigationTitle), linkList(data.links), h('p', null, data.whatsappLabel), h('h2', null, data.newsletterTitle), h('p', null, data.newsletterDescription), button({ label: data.newsletterButton }), h('p', null, data.bottomText)));
  }));
  CMS.registerPreviewTemplate('home', component(props => {
    const data = dataOf(props);
    return frame(h('p', { className: 'preview-eyebrow' }, `SEO title: ${data.title || ''}`), h('h1', null, data.headline, ' ', h('span', { className: 'preview-accent' }, data.headlineAccent)), h('p', { className: 'preview-lead' }, data.caption), h('div', { className: 'preview-actions' }, button(data.primaryCta), button(data.secondaryCta)), h('p', { className: 'preview-meta' }, data.note));
  }));
  CMS.registerPreviewTemplate('auditCta', component(props => {
    const data = dataOf(props);
    return frame(h('p', { className: 'preview-eyebrow' }, data.eyebrow), h('h1', null, data.heading), h('p', { className: 'preview-lead' }, data.description), button(data.button), h('p', null, data.whatsappLabel));
  }));

  CMS.registerEventListener({ name: 'preSave', handler: ({ entry }) => {
    if (entry.get('collection') !== 'website') return;
    const data = entry.get('data').toJS();
    const check = value => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.url === 'string' && !/^\/(?:[a-z0-9_-]+\/)*(?:#[a-zA-Z][\w-]*)?$/.test(value.url)) throw new Error('Dùng đường dẫn nội bộ có dấu / cuối, ví dụ /services/.');
      if (Array.isArray(value)) {
        const urls = value.map(item => item?.url).filter(Boolean);
        if (new Set(urls).size !== urls.length) throw new Error('Mỗi đường dẫn chỉ nên xuất hiện một lần trong cùng menu.');
      }
      Object.values(value).forEach(check);
    };
    check(data);
  } });
})();
