const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const postsDir = path.join(__dirname, '../src/posts');
const outputFile = path.join(__dirname, '../posts.json');

const posts = fs.readdirSync(postsDir)
  .filter(file => file.endsWith('.md'))
  .map(file => {
    const filePath = path.join(postsDir, file);
    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    return {
      title: data.title,
      slug: data.slug || path.parse(file).name,
      date: data.date || new Date().toISOString(),
      image: data.image || '/images/default-blog.jpg',
      excerpt: data.excerpt || ''
    };
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(outputFile, JSON.stringify(posts, null, 2));
console.log('Generated posts.json with', posts.length, 'posts');
