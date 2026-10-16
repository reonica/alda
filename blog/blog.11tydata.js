module.exports = {
  layout: "layouts/article.njk",
  article: true,
  nav: "resources",
  extraStyles: ["/assets/article-content.css"],
  permalink: (data) => data.draft === true ? false : `/blog/${data.page.fileSlug}/`,
};
