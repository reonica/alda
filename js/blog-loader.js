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
            if (this.githubConfig.token) headers['Authorization'] = `Bearer ${this.githubConfig.token}`;

            const response = await fetch(apiUrl, { headers });
            if (!response.ok) return this.getFallbackPosts();

            const files = await response.json();
            const markdownFiles = files.filter(f => f.name.endsWith('.md') && f.type === 'file');

            const posts = await Promise.all(
                markdownFiles.map(async (file) => {
                    try {
                        const fileResp = await fetch(file.download_url);
                        if (!fileResp.ok) return null;
                        const content = await fileResp.text();
                        const post = this.parseFrontmatter(content);
                        return { ...post, slug: file.name.replace('.md', ''), filename: file.name, githubUrl: file.html_url };
                    } catch { return null; }
                })
            );

            return posts.filter(p => p).sort((a, b) => new Date(b.date || '1970-01-01') - new Date(a.date || '1970-01-01'));
        } catch {
            return this.getFallbackPosts();
        }
    }

    getFallbackPosts() {
        return [{
            title: "Welcome to Alda Hub Blog",
            slug: "welcome-to-alda-hub-blog",
            date: "2024-08-21T10:00:00Z",
            author: "Alda Hub Team",
            description: "Welcome to our data-driven marketing blog. Stay tuned for insights and strategies.",
            tags: ["welcome", "introduction"],
            body: "# Welcome to Alda Hub Blog\n\nThis is our first blog post. More content coming soon!",
            featured_image: "images/alda/blog-data-driven-marketing.jpg"
        }];
    }

    async loadBlogPosts() {
        if (!this.blogContainer) return;

        this.blogContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
                <p class="mt-3">Loading blog posts...</p>
            </div>
        `;

        const posts = await this.fetchBlogIndex();
        this.renderBlogPosts(posts);
    }

    async loadSinglePost(slugInput) {
        if (!this.postContainer) return;

        const slug = this.normalizeSlug(slugInput);
        const candidates = slug.endsWith('.md') ? [slug] : [`${slug}.md`, slug];

        const tryFetch = async (filename) => {
            const url = `https://raw.githubusercontent.com/${this.githubConfig.owner}/${this.githubConfig.repo}/${this.githubConfig.branch}/${this.githubConfig.blogPath}/${filename}`;
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const markdownContent = await resp.text();
            return { markdownContent, filename };
        };

        this.postContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
                <p class="mt-3">Loading post...</p>
            </div>
        `;

        let loaded = null;
        for (const name of candidates) {
            // eslint-disable-next-line no-await-in-loop
            const res = await tryFetch(name);
            if (res) { loaded = res; break; }
        }

        if (!loaded) {
            this.postContainer.innerHTML = `
                <div class="alert alert-danger text-center">
                    <h5>Post not found</h5>
                    <p>The requested blog post could not be loaded.</p>
                    <a href="/blog.html" class="btn btn-primary">← Back to Blog</a>
                </div>
            `;
            return;
        }

        const post = this.parseFrontmatter(loaded.markdownContent);
        post.slug = slug;
        if (!post.title) post.title = this.slugToTitle(slug);

        this.renderSinglePost(post);
    }

    parseFrontmatter(content) {
        const regex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(regex);
        if (!match) return { body: content };

        const front = match[1], body = match[2];
        const metadata = {};
        front.split('\n').forEach(line => {
            const idx = line.indexOf(':');
            if (idx > 0) {
                let key = line.substring(0, idx).trim();
                let value = line.substring(idx + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
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
        if (!posts || posts.length === 0) {
            this.blogContainer.innerHTML = `<div class="alert alert-info text-center">No blog posts yet</div>`;
            return;
        }

        const html = posts.map(post => `
            <article class="card mb-4 border-0 shadow-sm">
                ${post.featured_image ? `
                <div class="card-img-top overflow-hidden" style="height: 250px;">
                    <img src="${post.featured_image}" alt="${post.title}" class="img-fluid w-100 h-100" style="object-fit: cover;">
                </div>` : ''}
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-3">
                        <small class="text-muted me-3">
                            <iconify-icon icon="bi:calendar3" class="me-1"></iconify-icon>
                            ${this.formatDate(post.date || '1970-01-01')}
                        </small>
                        <small class="text-muted">
                            <iconify-icon icon="bi:person" class="me-1"></iconify-icon>
                            ${post.author || this.siteConfig.defaultAuthor}
                        </small>
                    </div>
                    <h3 class="card-title h4 mb-3">
                        <a href="/blog-post.html?post=${post.slug}" class="text-decoration-none text-dark">${post.title || 'Untitled'}</a>
                    </h3>
                    <p class="card-text text-muted mb-3">${post.description || ''}</p>
                    ${post.tags && post.tags.length ? `
                    <div class="mb-3">
                        ${(Array.isArray(post.tags) ? post.tags : post.tags.split(',').map(t => t.trim()))
                          .map(tag => `<span class="badge bg-light text-dark me-2">${tag}</span>`).join('')}
                    </div>` : ''}
                    <a href="/blog-post.html?post=${post.slug}" class="btn btn-outline-primary">
                        Read More <iconify-icon icon="bi:arrow-right" class="ms-1"></iconify-icon>
                    </a>
                </div>
            </article>
        `).join('');

        this.blogContainer.innerHTML = html;
    }

    renderSinglePost(post) {
        if (!this.postContainer) return;

        document.title = `${post.title} - ${this.siteConfig.name}`;
        const htmlContent = window.marked ? window.marked.parse(post.body || '') : post.body;

        this.postContainer.innerHTML = `
            <div class="mb-4">
                <h1 class="display-4 fw-bold text-dark mb-3">${post.title || 'Untitled'}</h1>
                ${post.featured_image ? `<div class="mb-4 text-center"><img src="${post.featured_image}" alt="${post.title}" class="img-fluid rounded shadow" style="width: 66.67%; max-width: 100%;"></div>` : ''}
                <div class="d-flex align-items-center text-muted mb-4">
                    <small class="me-4"><iconify-icon icon="bi:calendar3" class="me-1"></iconify-icon>${this.formatDate(post.date || '1970-01-01')}</small>
                    <small class="me-4"><iconify-icon icon="bi:person" class="me-1"></iconify-icon>${post.author || this.siteConfig.defaultAuthor}</small>
                    ${post.tags && post.tags.length ? `<small><iconify-icon icon="bi:tags" class="me-1"></iconify-icon>${(Array.isArray(post.tags)?post.tags:post.tags.split(',').map(t=>t.trim())).slice(0,2).join(', ')}</small>` : ''}
                </div>
                <div id="toc-container" class="toc-wrapper mb-5">
                    <div class="toc-header d-flex align-items-center justify-content-between">
                        <h6 class="toc-title mb-0">Contents</h6>
                        <button id="toc-toggle" class="toc-toggle-btn"><iconify-icon icon="mi:chevron-up"></iconify-icon></button>
                    </div>
                    <nav id="table-of-contents" class="toc-content"></nav>
                </div>
                <div class="blog-content post-content fs-5 lh-lg" id="post-content">${htmlContent}</div>
                ${post.tags && post.tags.length ? `
                <div class="mt-5 pt-4 border-top">
                    <h6 class="text-muted mb-3">Tags:</h6>
                    <div>${(Array.isArray(post.tags)?post.tags:post.tags.split(',').map(t=>t.trim()))
                      .map(tag=>`<a href="#" class="badge bg-light text-dark text-decoration-none me-2 mb-2 p-2">${tag}</a>`).join('')}</div>
                </div>` : ''}
                <div class="mt-5 pt-4 border-top">
                    <h6 class="text-muted mb-3">Share this post:</h6>
                    <div class="d-flex gap-2">
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="social-share-btn facebook"><iconify-icon icon="ri:facebook-fill"></iconify-icon></a>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title || 'Check this out!')}" target="_blank" class="social-share-btn twitter"><iconify-icon icon="ri:twitter-fill"></iconify-icon></a>
                        <a href="https://wa.me/?text=${encodeURIComponent(post.title + ' ' + window.location.href)}" target="_blank" class="social-share-btn whatsapp"><iconify-icon icon="ri:whatsapp-fill"></iconify-icon></a>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            if (typeof initTOC === 'function') initTOC();
        }, 300);

        const tocToggle = document.getElementById('toc-toggle');
        const tocContainer = document.getElementById('toc-container');
        if (tocToggle && tocContainer) tocToggle.addEventListener('click', () => tocContainer.classList.toggle('collapsed'));
    }

    formatDate(dateString) {
        try { return new Date(dateString).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }); } 
        catch { return ''; }
    }

    normalizeSlug(input) {
        if (!input) return '';
        let s = decodeURIComponent(String(input)).trim();
        s = s.replace(/^\//,'').replace(/\/$/,'').replace(/\.html?$/i,'');
        if (s.startsWith('blog/')) s = s.slice(5);
        return s;
    }

    slugToTitle(slug) {
        return slug.replace(/[-_]+/g,' ').replace(/\b\w/g,ch => ch.toUpperCase());
    }

    initialize() {
        if (this.blogContainer) { this.loadBlogPosts(); return; }
        if (this.postContainer) {
            const params = new URLSearchParams(window.location.search);
            let slug = params.get('post') || window.location.pathname.split('/').filter(Boolean).pop();
            if (slug && !/\.html?$/i.test(slug)) this.loadSinglePost(slug);
            else this.postContainer.innerHTML = `<div class="alert alert-warning text-center">
                <h5>Missing slug</h5>
                <p>We couldn't detect the post slug from this URL.</p>
                <a href="/blog.html" class="btn btn-outline-primary">← Back to Blog</a>
            </div>`;
        }
    }
}

window.loadSinglePost = (slug) => new BlogLoader().loadSinglePost(slug);

document.addEventListener('DOMContentLoaded', () => new BlogLoader().initialize());
