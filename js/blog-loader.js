// Blog Loader for Static HTML Website with Markdown Support
class BlogLoader {
    constructor() {
        this.blogContainer = document.getElementById('blog-posts');
        this.postContainer = document.getElementById('blog-post');
        this.blogFolder = '/blog/';
    }

    async loadBlogPosts() {
        try {
            // Fetch từ GitHub API hoặc tạo index file
            const posts = await this.fetchBlogIndex();
            this.renderBlogPosts(posts);
        } catch (error) {
            console.error('Error loading blog posts:', error);
            if (this.blogContainer) {
                this.blogContainer.innerHTML = '<p>Unable to load blog posts at this time.</p>';
            }
        }
    }

    async fetchBlogIndex() {
        // Bạn cần tạo file index.json hoặc fetch từ GitHub API
        // Tạm thời return mock data để test
        return [
            {
                title: "Test Blog Post",
                slug: "test",
                date: "2024-01-15T10:00:00Z",
                author: "Aldahub",
                description: "This is a test blog post description",
                tags: ["test", "example"]
            }
        ];
    }

    async loadSinglePost(slug) {
        try {
            // Fetch markdown file trực tiếp
            const response = await fetch(`/blog/${slug}.md`);
            const markdownContent = await response.text();
            
            // Parse frontmatter và content
            const post = this.parseFrontmatter(markdownContent);
            post.slug = slug;
            
            this.renderSinglePost(post);
        } catch (error) {
            console.error('Error loading blog post:', error);
            if (this.postContainer) {
                this.postContainer.innerHTML = '<p>Post not found.</p>';
            }
        }
    }

    parseFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);
        
        if (!match) {
            return { body: content };
        }

        const frontmatter = match[1];
        const body = match[2];
        
        // Parse YAML-like frontmatter
        const metadata = {};
        frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
                metadata[key] = value;
            }
        });

        return {
            ...metadata,
            body: body
        };
    }

    renderBlogPosts(posts) {
        if (!this.blogContainer) return;

        const postsHTML = posts.map(post => `
            <article class="card mb-4 border-0 shadow-sm">
                ${post.featured_image ? `
                <div class="card-img-top overflow-hidden" style="height: 250px;">
                    <img src="${post.featured_image}" alt="${post.title}" class="img-fluid w-100 h-100" style="object-fit: cover;">
                </div>` : ''}
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-3">
                        <small class="text-muted me-3">
                            <iconify-icon icon="bi:calendar3" class="me-1"></iconify-icon>
                            ${this.formatDate(post.date)}
                        </small>
                        <small class="text-muted">
                            <iconify-icon icon="bi:person" class="me-1"></iconify-icon>
                            ${post.author}
                        </small>
                    </div>
                    <h3 class="card-title h4 mb-3">
                        <a href="/blog-post.html?post=${post.slug}" class="text-decoration-none text-dark">${post.title}</a>
                    </h3>
                    <p class="card-text text-muted mb-3">${post.description}</p>
                    ${post.tags ? `
                    <div class="mb-3">
                        ${post.tags.map(tag => `<span class="badge bg-light text-dark me-2">${tag}</span>`).join('')}
                    </div>` : ''}
                    <a href="/blog-post.html?post=${post.slug}" class="btn btn-outline-primary">
                        Read More <iconify-icon icon="bi:arrow-right" class="ms-1"></iconify-icon>
                    </a>
                </div>
            </article>
        `).join('');

        this.blogContainer.innerHTML = postsHTML;
    }

    renderSinglePost(post) {
        if (!this.postContainer) return;

        // Update page title và breadcrumb
        document.title = `${post.title} - Alda Hub`;
        
        const titleEl = document.getElementById('post-title');
        const descriptionEl = document.getElementById('post-description');
        const breadcrumbEl = document.getElementById('breadcrumb-title');
        
        if (titleEl) titleEl.textContent = `${post.title} - Alda Hub`;
        if (descriptionEl) descriptionEl.setAttribute('content', post.description || '');
        if (breadcrumbEl) breadcrumbEl.textContent = post.title;

        // Convert markdown to HTML
        const htmlContent = marked.parse(post.body || '');

        this.postContainer.innerHTML = `
            <div class="mb-4">
                ${post.featured_image ? `
                <div class="mb-4">
                    <img src="${post.featured_image}" alt="${post.title}" class="img-fluid w-100 rounded shadow">
                </div>` : ''}
                
                <div class="mb-4">
                    <h1 class="display-4 fw-bold text-dark mb-3">${post.title}</h1>
                    <div class="d-flex align-items-center text-muted mb-4">
                        <small class="me-4">
                            <iconify-icon icon="bi:calendar3" class="me-1"></iconify-icon>
                            ${this.formatDate(post.date)}
                        </small>
                        <small class="me-4">
                            <iconify-icon icon="bi:person" class="me-1"></iconify-icon>
                            ${post.author}
                        </small>
                        ${post.tags ? `<small>
                            <iconify-icon icon="bi:tags" class="me-1"></iconify-icon>
                            ${post.tags.split(',').slice(0, 2).map(tag => tag.trim()).join(', ')}
                        </small>` : ''}
                    </div>
                </div>
                
                <div class="post-content fs-5 lh-lg">
                    ${htmlContent}
                </div>
                
                ${post.tags ? `
                <div class="mt-5 pt-4 border-top">
                    <h6 class="text-muted mb-3">Tags:</h6>
                    <div>
                        ${post.tags.split(',').map(tag => `
                        <a href="#" class="badge bg-light text-dark text-decoration-none me-2 mb-2 p-2">
                            ${tag.trim()}
                        </a>`).join('')}
                    </div>
                </div>` : ''}
                
                <!-- Share Buttons -->
                <div class="mt-5 pt-4 border-top">
                    <h6 class="text-muted mb-3">Share this post:</h6>
                    <div class="d-flex gap-2">
                        <a href="#" class="btn btn-outline-primary btn-sm">
                            <iconify-icon icon="bi:facebook"></iconify-icon> Facebook
                        </a>
                        <a href="#" class="btn btn-outline-info btn-sm">
                            <iconify-icon icon="bi:twitter"></iconify-icon> Twitter
                        </a>
                        <a href="#" class="btn btn-outline-success btn-sm">
                            <iconify-icon icon="bi:whatsapp"></iconify-icon> WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh'
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }
}

// Global functions
window.loadSinglePost = function(slug) {
    const loader = new BlogLoader();
    loader.loadSinglePost(slug);
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const blogLoader = new BlogLoader();
    
    // Load blog posts list
    if (document.getElementById('blog-posts')) {
        blogLoader.loadBlogPosts();
    }
});
