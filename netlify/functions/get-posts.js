// netlify/functions/get-posts.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async () => {
  const postsDir = path.join(process.cwd(), 'src/posts');
  
  try {
    const files = fs.readdirSync(postsDir);
    const posts = files.filter(file => file.endsWith('.md')).map(file => {
      const filePath = path.join(postsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);
      
      return {
        title: data.title,
        slug: data.slug || path.parse(file).name,
        date: data.date || fs.statSync(filePath).mtime,
        image: data.image || '/images/default-blog.jpg',
        excerpt: data.excerpt || ''
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      body: JSON.stringify(posts)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load posts' })
    };
  }
};
