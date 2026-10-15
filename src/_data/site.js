module.exports = {
  name: 'AldaHub',
  url: 'https://aldahub.com',
  description: 'Data-led decisions. Sustainable growth through SEO, AI search, social performance marketing and conversion optimization.',
  whatsapp: 'https://wa.me/84916882795',
  year: new Date().getFullYear(),
  preview: Boolean(process.env.CONTEXT && process.env.CONTEXT !== 'production') || Boolean(process.env.VERCEL_ENV),
  netlifyForms: Boolean(process.env.NETLIFY),
  navigation: [
    { label: 'Services', url: '/services/', key: 'services' },
    { label: 'Our Approach', url: '/approach/', key: 'approach' },
    { label: 'About', url: '/about/', key: 'about' },
    { label: 'Resources', url: '/blog/', key: 'resources' },
    { label: 'Contact', url: '/contact/', key: 'contact' }
  ]
};
