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
            console.log('Fetching blog index from GitHub...');
            const apiUrl = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contents/${this.githubConfig.blogPath}`;
            const headers = { 'Accept': 'application/vnd.github.v3+json' };
            if (this.githubConfig.token) headers['Authorization'] = `Bearer ${this.githubConfig.token}`;

            const response = await fetch(apiUrl + '?t=' + Date.now(), {
                headers,
                mode: 'cors',
                cache: 'no-store'
            });

            if (!response.ok) {
                console.error('GitHub API response not OK:', response.status, response.statusText);
                console.warn('Full response:', response);
                console.warn('User Agent:', navigator.userAgent);
                console.warn('This may be a CORS or cache issue (especially on Safari iOS).');
                return this.getFallbackPosts();
            }


            const files = await response.json();
            const markdownFiles = files.filter(file => file.name.endsWith('.md') && file.type === 'file');
            console.log(`Found ${markdownFiles.length} markdown files`);

            const posts = await Promise.all(
                markdownFiles.map(async (file) => {
                    try {
                        const fileResponse = await fetch(file.download_url);
                        if (!fileResponse.ok) {
                            console.error(`Failed to fetch ${file.name}: ${fileResponse.status}`);
                            return null;
                        }
                        const content = await fileResponse.text();
                        const post = this.parseFrontmatter(content);
                        return {
                            ...post,
                            slug: file.name.replace('.md', ''),
                            filename: file.name,
                            githubUrl: file.html_url
                        };
                    } catch (error) {
                        console.error(`Error loading ${file.name}:`, error);
                        return null;
                    }
                })
            );

            return posts
                .filter(post => post !== null)
                .sort((a, b) => new Date(b.date || '1970-01-01') - new Date(a.date || '1970-01-01'));
        } catch (error) {
            console.error('Error fetching blog index:', error);
            return this.getFallbackPosts();
        }
    }

    getFallbackPosts() {
        console.log('Using fallback posts');
        return [
            {
                title: "Unlocking Data-Driven Digital Marketing with ALDA Framework",
                slug: "unlocking-data-driven-digital-marketing-with-alda-framework",
                date: "2025-09-06T10:00:00Z",
                author: "Côme",
                description: "ALDA, which stands for Analyze, Learn, Design, and Act/Alchemy, is the heartbeat of Alda Hub's approach...",
                tags: ["ALDA", "Data-driven Digital Marketing"],
                body: "# Welcome to Alda Hub Blog\n\nThis is our first blog post. More content coming soon!",
                featured_image: "images/blog/unlocking-data-driven-digital-marketing-with-alda-framework.jpg"
            },
            {
                title: "How to Build a Data-Driven Marketing Strategy in 7 Steps",
                slug: "how-to-build-a-data-driven-marketing-strategy-in-7-steps",
                date: "2025-08-28T10:00:00Z",
                author: "Côme",
                description: "This guide will walk you through the essential steps to not only build a robust data-driven marketing strategy...",
                tags: ["Data-driven Marketing", "Data Analysis"],
                body: "# Data-Driven Marketing Strategies\n\nLeverage data to improve your marketing ROI.",
                featured_image: "images/blog/data-driven-marketing-strategy.jpg"
            }
        ];
    }

    async loadBlogPosts() {
        if (!this.blogContainer) return;

        this.blogContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading blog posts...</p>
            </div>
        `;

        try {
            const posts = await this.fetchBlogIndex();
            this.renderBlogPosts(posts);
        } catch (error) {
            console.error('Error loading blog posts:', error);
            this.blogContainer.innerHTML = `
                <div class="alert alert-info text-center">
                    <h5>No posts available yet</h5>
                    <p>Check back soon for new content!</p>
                    <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    async loadSinglePost(slugInput) {
        if (!this.postContainer) return;

        const slug = this.normalizeSlug(slugInput);
        const candidates = slug.endsWith('.md') ? [slug] : [`${slug}.md`, slug];

        this.postContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading post...</p>
            </div>
        `;

        const tryFetch = async (filename) => {
            const url = `https://raw.githubusercontent.com/${this.githubConfig.owner}/${this.githubConfig.repo}/${this.githubConfig.branch}/${this.githubConfig.blogPath}/${filename}`;
            console.log('Loading post from:', url);
            const response = await fetch(url);
            if (!response.ok) return null;
            const markdownContent = await response.text();
            return { markdownContent, filename };
        };

        let loaded = null;
        for (const name of candidates) {
            const res = await tryFetch(name);
            if (res) {
                loaded = res;
                break;
            }
        }

        if (!loaded) {
            console.error('Error loading blog post: Post not found');
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
                if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
                    value = value.substring(1, value.length - 1);
                }
                if (key === 'tags') {
                    try {
                        value = JSON.parse(value);
                    } catch {
                        value = value.split(',').map(tag => tag.trim()).filter(tag => tag);
                    }
                }
                metadata[key] = value;
            }
        });
        return { ...metadata, body };
    }

    renderBlogPosts(posts) {
        if (!this.blogContainer) return;
        if (posts.length === 0) {
            this.blogContainer.innerHTML = `
                <div class="alert alert-info text-center">
                    <h5>No blog posts yet</h5>
                    <p>Check back soon for new content!</p>
                </div>
            `;
            return;
        }

        const postsHTML = posts.map(post => `
            <article class="card mb-4 border-0 shadow-sm">
                ${post.featured_image ? `
                    <div class="card-img-top overflow-hidden" style="height: 250px;">
                        <img src="${post.featured_image}" alt="${post.title}" class="img-fluid w-100 h-100" style="object-fit: cover;">
                    </div>
                ` : ''}
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
                        <a href="/${post.slug}" class="text-decoration-none text-dark">${post.title || 'Untitled'}</a>
                    </h3>
                    <p class="card-text text-muted mb-3">${post.description || ''}</p>
                    ${post.tags && post.tags.length ? `
                        <div class="mb-3">
                            ${(Array.isArray(post.tags) ? post.tags : post.tags.split(',').map(tag => tag.trim()))
                                .map(tag => `<span class="badge bg-light text-dark me-2">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <a href="/${post.slug}" class="btn btn-outline-primary">
                        Read More <iconify-icon icon="bi:arrow-right" class="ms-1"></iconify-icon>
                    </a>
                </div>
            </article>
        `).join('');

        this.blogContainer.innerHTML = postsHTML;
    }

        // Schema
        detectSchemaFromMarkdown(content, metadata) {
          const schemas = [];
          
          // --- BlogPosting ( Person + Organization) ---
          const blogPosting = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": metadata.title,
            "description": metadata.description,
            "datePublished": metadata.date ? new Date(metadata.date).toISOString() : new Date().toISOString(),
            "dateModified": metadata.updated || metadata.date ? new Date(metadata.updated || metadata.date).toISOString() : new Date().toISOString(),
            "author": { "@type": "Person", "name": metadata.author || "Alda Hub Team" },
            "image": metadata.featured_image ? {
              "@type": "ImageObject",
              "url": metadata.featured_image,
              "width": 1200,
              "height": 630
            } : metadata.featured_image || "",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": window.location.href
            },
            "publisher": {
              "@type": "Organization",
              "name": "Alda Hub",
              "logo": {
                "@type": "ImageObject",
                "url": "https://aldahub.com/images/logo.png",
                "width": 512,
                "height": 512
              }
            },
            "keywords": metadata.tags || []
          };
          schemas.push(blogPosting);
          
          // --- BreadcrumbList ---
          const breadcrumb = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://aldahub.com/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://aldahub.com/blog.html"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": metadata.title,
                "item": window.location.href
              }
            ]
          };
          schemas.push(breadcrumb);
          
          // --- Detect FAQPage ---
          if (/##\s*FAQ/i.test(content)) {
            const faqItems = [];
            const faqRegex = /###\s*(.+?)\n([\s\S]*?)(?=###|$)/g;
            let match;
            while ((match = faqRegex.exec(content)) !== null) {
              const question = match[1].trim();
              const answer = match[2].trim();
              if (question && answer) {
                faqItems.push({
                  "@type": "Question",
                  "name": question,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": answer
                  }
                });
              }
            }
            if (faqItems.length > 0) {
              schemas.push({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": faqItems
              });
            }
          }
          
          // --- Detect HowTo ---
          if (/##\s*(How to|How-to)/i.test(content)) {
            const steps = [];
            const stepRegex = /(?:^|\n)(?:\d+\.|-|\*)\s+(.+)/g;
            let stepMatch;
            while ((stepMatch = stepRegex.exec(content)) !== null) {
              const stepText = stepMatch[1].trim();
              if (stepText.length > 5) { // Only meaningful steps
                steps.push({
                  "@type": "HowToStep",
                  "text": stepText
                });
              }
            }
            if (steps.length > 0) {
              schemas.push({
                "@context": "https://schema.org",
                "@type": "HowTo",
                "name": metadata.title,
                "description": metadata.description,
                "step": steps
              });
            }
          }
          
          // --- Render all schema to <head> with error handling ---
          schemas.forEach((schema, index) => {
            try {
              const script = document.createElement("script");
              script.type = "application/ld+json";
              script.text = JSON.stringify(schema, null, 2);
              document.head.appendChild(script);
            } catch (error) {
              console.warn('Error rendering schema:', error);
            }
          });
        }
    
    renderSinglePost(post) {
        if (!this.postContainer) return;

        document.title = `${post.title || 'Untitled'} - ${this.siteConfig.name}`;
        const titleEl = document.getElementById('post-title');
        const descriptionEl = document.getElementById('post-description');
        const breadcrumbEl = document.getElementById('breadcrumb-title');
        if (titleEl) titleEl.textContent = post.title || 'Untitled';
        if (descriptionEl) descriptionEl.setAttribute('content', post.description || '');
        if (breadcrumbEl) breadcrumbEl.textContent = post.title || 'Untitled';

        const htmlContent = window.marked ? window.marked.parse(post.body || '') : post.body;

        this.postContainer.innerHTML = `
            <div class="mb-4">
                <div class="mb-4" style="display: flex; justify-content: justify;">
                    <h1 class="display-4 fw-bold text-dark mb-3">${post.title || 'Untitled'}</h1>
                </div>
                ${post.featured_image ? `
                    <div class="mb-4" style="display: flex; justify-content: center;">
                        <img src="${post.featured_image}" alt="${post.title || 'Untitled'}" class="img-fluid rounded shadow" style="width: 100%; max-width: 100%; height: auto;">
                    </div>
                ` : ''}
                <div class="d-flex align-items-center text-muted mb-4">
                    <small class="me-4">
                        <iconify-icon icon="bi:calendar3" class="me-1"></iconify-icon>
                        ${this.formatDate(post.date || '1970-01-01')}
                    </small>
                    <small class="me-4">
                        <iconify-icon icon="bi:person" class="me-1"></iconify-icon>
                        ${post.author || this.siteConfig.defaultAuthor}
                    </small>
                    ${post.tags && post.tags.length ? `
                        <small>
                            <iconify-icon icon="bi:tags" class="me-1"></iconify-icon>
                            ${(Array.isArray(post.tags) ? post.tags : post.tags.split(',').map(tag => tag.trim())).slice(0, 2).join(', ')}
                        </small>
                    ` : ''}
                </div>
                <div id="toc-container" class="toc-wrapper mb-5">
                    <div class="toc-header d-flex align-items-center justify-content-between">
                        <h6 class="toc-title mb-0">Contents</h6>
                        <button id="toc-toggle" class="toc-toggle-btn">
                            <iconify-icon icon="mi:chevron-up"></iconify-icon>
                        </button>
                    </div>
                    <nav id="table-of-contents" class="toc-content"></nav>
                </div>
                <div class="blog-content post-content fs-5 lh-lg" id="post-content">
                    ${htmlContent}
                </div>
                ${post.tags && post.tags.length ? `
                    <div class="mt-5 pt-4 border-top">
                        <h6 class="text-muted mb-3">Tags:</h6>
                        <div>
                            ${(Array.isArray(post.tags) ? post.tags : post.tags.split(',').map(tag => tag.trim()))
                                .map(tag => `<a href="#" class="badge bg-light text-dark text-decoration-none me-2 mb-2 p-2">${tag}</a>`).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="mt-5 pt-4 border-top">
                    <h6 class="text-muted mb-3">Share this post:</h6>
                    <div class="d-flex gap-2">
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" class="social-share-btn facebook">
                            <iconify-icon icon="ri:facebook-fill"></iconify-icon>
                        </a>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title || 'Check this out!')}" target="_blank" class="social-share-btn twitter">
                            <iconify-icon icon="ri:twitter-fill"></iconify-icon>
                        </a>
                        <a href="https://wa.me/?text=${encodeURIComponent(post.title + ' ' + window.location.href)}" target="_blank" class="social-share-btn whatsapp">
                            <iconify-icon icon="ri:whatsapp-fill"></iconify-icon>
                        </a>
                    </div>
                </div>
            </div>
        `;

        this.detectSchemaFromMarkdown(post.body || '', post);
        
        setTimeout(() => {
            requestAnimationFrame(() => {
                if (typeof initTOC === 'function') {
                    initTOC();
                }
            });
        }, 300);
        
        const tocToggle = document.getElementById('toc-toggle');
        const tocContainer = document.getElementById('toc-container');
        if (tocToggle && tocContainer) {
            tocToggle.addEventListener('click', () => {
                tocContainer.classList.toggle('collapsed');
            });
        }
    }

    formatDate(dateString) {
        try {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString('en-US', options);
        } catch (error) {
            console.error('Error formatting date:', error, dateString);
            return 'Invalid date';
        }
    }

    normalizeSlug(input) {
        if (!input) return '';
        let slug = decodeURIComponent(String(input)).trim();
        slug = slug.replace(/^\//, '').replace(/\/$/, '').replace(/\.html?$/i, '');
        if (slug.startsWith('blog/')) slug = slug.slice(5);
        return slug;
    }

    slugToTitle(slug) {
        return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    }

    initialize() {
        if (this.blogContainer) {
            this.loadBlogPosts();
            return;
        }
        if (this.postContainer) {
            const params = new URLSearchParams(window.location.search);
            let slug = params.get('post') || window.location.pathname.split('/').filter(Boolean).pop();
            if (slug && !/\.html?$/i.test(slug)) {
                this.loadSinglePost(slug);
            } else {
                this.postContainer.innerHTML = `
                    <div class="alert alert-warning text-center">
                        <h5>Missing slug</h5>
                        <p>We couldn't detect the post slug from this URL.</p>
                        <a href="/blog.html" class="btn btn-outline-primary">← Back to Blog</a>
                    </div>
                `;
            }
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
    blogLoader.initialize();
});
