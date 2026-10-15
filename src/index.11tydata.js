// Return editor text unchanged; the shared layout escapes it once for HTML.
module.exports = { eleventyComputed: { title: data => data.home.title } };
