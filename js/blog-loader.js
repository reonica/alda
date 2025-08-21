// Blog Loader for Static HTML Website
class BlogLoader {
    constructor() {
        this.blogContainer = document.getElementById('blog-posts');
        this.blogFolder = '/blog/';
    }

    async loadBlogPosts() {
        try {
            // Fetch blog index (bạn cần tạo file này)
            const response = await fetch('/blog/index.json');
            const blogIndex = await response.json();
            
            this.renderBlogPosts(blogIndex.posts);
        } catch (error) {
            console.error('Error loading blog posts:', error);
        }
    }

    async loadSinglePost(slug) {
        try {
            const response = await fetch(`/blog/${slug}.json`);
            const post = await response.json();
            
            this.renderSinglePost(post);
        } catch (error) {
            console.error('Error loading blog post:', error);
        }
    }

    renderBlogPosts(posts) {
        if (!this.blogContainer) return;

        const postsHTML = posts.map(post => `
            <article class="blog-post-preview">
                <h2><a href="/blog/${post.slug}.html">${post.title}</a></h2>
                <p class="post-meta">
                    <span class="date">${this.formatDate(post.date)}</span>
                    <span class="author">by ${post.author}</span>
                </p>
                ${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title}" class="featured-image">` : ''}
                <p class="description">${post.description}</p>
                <div class="tags">
                    ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <a href="/blog/${post.slug}.html" class="read-more">Đọc tiếp →</a>
            </article>
        `).join('');

        this.blogContainer.innerHTML = postsHTML;
    }

    renderSinglePost(post) {
        const postContainer = document.getElementById('blog-post');
        if (!postContainer) return;

        postContainer.innerHTML = `
            <article class="blog-post-full">
                <h1>${post.title}</h1>
                <p class="post-meta">
                    <span class="date">${this.formatDate(post.date)}</span>
                    <span class="author">by ${post.author}</span>
                </p>
                ${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title}" class="featured-image">` : ''}
                <div class="post-content">
                    ${this.markdownToHTML(post.body)}
                </div>
                <div class="tags">
                    ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </article>
        `;
    }

    formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh'
        };
        return new Date(dateString).toLocaleDateString('vi-VN', options);
    }

    // Simple markdown to HTML converter (hoặc dùng thư viện marked.js)
    markdownToHTML(markdown) {
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/!\[([^\]]*)\]\(([^\)]*)\)/gim, '<img alt="$1" src="$2" />')
            .replace(/\[([^\]]*)\]\(([^\)]*)\)/gim, '<a href="$2">$1</a>')
            .replace(/\n$/gim, '<br />');
    }
}

// Initialize khi DOM ready
document.addEventListener('DOMContentLoaded', function() {
    const blogLoader = new BlogLoader();
    
    // Load blog posts trên trang blog
    if (document.getElementById('blog-posts')) {
        blogLoader.loadBlogPosts();
    }
    
    // Load single post nếu có slug trong URL
    const urlPath = window.location.pathname;
    const blogPostMatch = urlPath.match(/\/blog\/(.+)\.html/);
    if (blogPostMatch && document.getElementById('blog-post')) {
        const slug = blogPostMatch[1];
        blogLoader.loadSinglePost(slug);
    }
});
