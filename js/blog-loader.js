// Blog Loader for Static HTML Website with GitHub API
class BlogLoader {
    constructor() {
        this.blogContainer = document.getElementById('blog-posts');
        this.postContainer = document.getElementById('blog-post');

        this.githubConfig = window.BLOG_CONFIG?.github || {
            owner: 'reonica',
            repo: 'alda',
            token: '',
            blogPath: 'blog',
            branch: 'main'
        };

        this.siteConfig = window.BLOG_CONFIG?.site || {
            name: 'Alda Hub',
            defaultAuthor: 'Alda Hub Team'
        };

        this.isMobile = window.innerWidth <= 768;
    }

    async fetchBlogIndex() {
        try {
            const apiUrl = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contents/${this.githubConfig.blogPath}`;
            const headers = { 'Accept': 'application/vnd.github.v3+json' };
            if (this.githubConfig.token) {
                headers['Authorization'] = `Bearer ${this.githubConfig.token}`;
            }

            const response = await fetch(apiUrl, { headers });
            if (!response.ok) return this.getFallbackPosts();

            const files = await response.json();
            const markdownFiles = files.filter(file =>
                file.name.endsWith('.md') && file.type === 'file'
            );

            const posts = await Promise.all(
                markdownFiles.map(async (file) => {
                    try {
                        const fileResponse = await fetch(file.download_url);
                        if (!fileResponse.ok) return null;

                        const content = await fileResponse.text();
                        const post = this.parseFrontmatter(content);

                        return {
                            ...post,
                            slug: file.name.replace('.md', ''),
                            filename: file.name,
                            githubUrl: file.html_url
                        };
                    } catch {
                        return null;
                    }
                })
            );

            return posts
                .filter(post => post !== null)
                .sort((a, b) => new Date(b.date || '1970-01-01') - new Date(a.date || '1970-01-01'));
        } catch {
            return this.getFallbackPosts();
        }
    }

    getFallbackPosts() {
        return [
            {
                title: "Welcome to Alda Hub Blog",
                slug: "welcome-to-alda-hub-blog",
                date: "2024-08-21T10:00:00Z",
                author: "Alda Hub Team",
                description: "Welcome to our data-driven marketing blog. Stay tuned for insights and strategies.",
                tags: ["welcome", "introduction"],
                body: "# Welcome to Alda Hub Blog\n\nThis is our first blog post. More content coming soon!",
                featured_image: "images/alda/blog-data-driven-marketing.jpg"
            }
        ];
    }

    async loadBlogPosts() {
        try {
            const posts = await this.fetchBlogIndex();
            this.renderBlogPosts(posts);
        } catch {
            if (this.blogContainer) {
                this.blogContainer.innerHTML = `<div class="alert alert-info text-center">No posts available yet</div>`;
            }
        }
    }

    async loadSinglePost(slug) {
        try {
            const fileUrl = `https://raw.githubusercontent.com/${this.githubConfig.owner}/${this.githubConfig.repo}/${this.githubConfig.branch}/${this.githubConfig.blogPath}/${slug}.md`;
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error("Post not found");

            const markdownContent = await response.text();
            const post = this.parseFrontmatter(markdownContent);
            post.slug = slug;

            this.renderSinglePost(post);
        } catch {
            if (this.postContainer) {
                this.postContainer.innerHTML = `
                    <div class="alert alert-danger text-center">
                        <h5>Post not found</h5>
                        <a href="/blog.html" class="btn btn-primary">← Back to Blog</a>
                    </div>
                `;
            }
        }
    }

    parseFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);

        if (!match) return { body: content };

        const frontmatter = match[1];
        const body = match[2];
        const metadata = {};

        frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                if (key === 'tags') {
                    try { value = JSON.parse(value); }
                    catch { value = value.split(',').map(t => t.trim()); }
                }
                metadata[key] = value;
            }
        });

        return { ...metadata, body };
    }

    renderBlogPosts(posts) {
        if (!this.blogContainer) return;
        if (posts.length === 0) {
            this.blogContainer.innerHTML = `<div class="alert alert-info text-center">No blog posts yet</div>`;
            return;
        }

        this.blogContainer.innerHTML = posts.map(post => `
            <article class="card mb-4 border-0 shadow-sm">
                ${post.featured_image ? `
                <div class="card-img-top overflow-hidden" style="height: 250px;">
                    <img src="${post.featured_image}" alt="${post.title}" class="img-fluid w-100 h-100" style="object-fit: cover;">
                </div>` : ''}
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-3">
                        <small class="text-muted me-3">${this.formatDate(post.date || '')}</small>
                        <small class="text-muted">${post.author || this.siteConfig.defaultAuthor}</small>
                    </div>
                    <h3 class="card-title h4 mb-3">
                        <a href="/${post.slug}/" class="text-decoration-none text-dark">${post.title || 'Untitled'}</a>
                    </h3>
                    <p class="card-text text-muted mb-3">${post.description || ''}</p>
                    <a href="/${post.slug}/" class="btn btn-outline-primary">Read More</a>
                </div>
            </article>
        `).join('');
    }

    renderSinglePost(post) {
        if (!this.postContainer) return;

        document.title = `${post.title} - ${this.siteConfig.name}`;
        const htmlContent = window.marked ? window.marked.parse(post.body || '') : post.body;

        this.postContainer.innerHTML = `
            <h1 class="display-4 fw-bold">${post.title}</h1>
            ${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title}" class="img-fluid mb-4">` : ''}
            <div class="text-muted mb-4">
                <small>${this.formatDate(post.date || '')}</small> • 
                <small>${post.author || this.siteConfig.defaultAuthor}</small>
            </div>
            <div class="blog-content">${htmlContent}</div>
        `;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return '';
        }
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
    if (document.getElementById('blog-posts')) blogLoader.loadBlogPosts();
    if (document.getElementById('blog-post')) {
        let path = window.location.pathname.replace(/^\/|\/$/g, '');
        if (path && path !== 'blog') blogLoader.loadSinglePost(path);
    }
});
