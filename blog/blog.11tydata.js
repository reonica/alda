module.exports = {
  layout: "layouts/article.njk",
  article: true,
  nav: "resources",
  permalink: (data) => data.draft === true ? false : `/blog/${data.page.fileSlug}/`,
};
