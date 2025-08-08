// netlify/functions/get-posts.js
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

exports.handler = async () => {
  const postsDir = path.join(process.cwd(), 'src/posts');

  try {
    const files = await fs.readdir(postsDir);
    const posts = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async file => {
          const filePath = path.join(postsDir, file);
          const fileContent = await fs.readFile(filePath, 'utf8');
          const { data } = matter(fileContent);

          return {
            title: data.title || 'Untitled Post',
            slug: data.slug || path.parse(file).name,
            date: data.date ? new Date(data.date).toISOString() : (await fs.stat(filePath)).mtime.toISOString(),
            image: data.image || '/images/alda/Team-alda-hub.jpg',
            excerpt: data.excerpt || 'No excerpt available',
          };
        })
    );

    // Sắp xếp bài viết theo ngày (mới nhất trước)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      statusCode: 200,
      body: JSON.stringify(posts),
    };
  } catch (error) {
    console.error('Error loading posts:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load posts' }),
    };
  }
};
