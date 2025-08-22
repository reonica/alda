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
    }

    async fetchBlogIndex() {
        try {
            console.log('Fetching blog index from GitHub...');
            
            const apiUrl = `https://api.github.com/repos/${this.githubConfig.owner}/${this.githubConfig.repo}/contents/${this.githubConfig.blogPath}`;
            
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            
            if (this.githubConfig.token) {
                headers['Authorization'] = `Bearer ${this.githubConfig.token}`;
            }

            const response = await fetch(apiUrl, { headers });
            
            if (!response.ok) {
                console.error('GitHub API response not OK:', response.status, response.statusText);
                return this.getFallbackPosts();
            }

            const files = await response.json();
            
            const markdownFiles = files.filter(file => 
                file.name.endsWith('.md') && file.type === 'file'
            );

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
                title: "Welcome to Alda Hub Blog",
                slug: "welcome-to-alda-hub-blog",
                date: "2024-08-21T10:00:00Z",
                author: "Alda Hub Team",
                description: "Welcome to our data-driven marketing blog. Stay tuned for insights and strategies.",
                tags: ["welcome", "introduction"],
                body: "# Welcome to Alda Hub Blog\n\nThis is our first blog post. More content coming soon!",
                featured_image: "images/alda/blog-data-driven-marketing.jpg"
            },
            {
                title: "Data-Driven Marketing Strategies",
                slug: "data-driven-marketing-strategies",
                date: "2024-08-20T10:00:00Z",
                author: "Alda Hub Team",
                description: "Learn how data-driven decisions can transform your marketing approach.",
                tags: ["marketing", "data analysis"],
                body: "# Data-Driven Marketing Strategies\n\nLeverage data to improve your marketing ROI.",
                featured_image: "images/alda/blog-customer-data-analysis.jpg"
            }
        ];
    }

    async loadBlogPosts() {
        try {
            if (this.blogContainer) {
                this.blogContainer.innerHTML = `
                    <div class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading blog posts...</p>
                    </div>
                `;
            }

            const posts = await this.fetchBlogIndex();
            this.renderBlogPosts(posts);
        } catch (error) {
            console.error('Error loading blog posts:', error);
            if (this.blogContainer) {
                this.blogContainer.innerHTML = `
                    <div class="alert alert-info text-center">
                        <h5>No posts available yet</h5>
                        <p>Check back soon for new content!</p>
                        <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
                    </div>
                `;
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
        
        const metadata = {};
        frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"') || 
                    value.startsWith("'") && value.endsWith("'")) {
                    value = value.substring(1, value.length - 1);
                }
                
                // Handle tags as array or string
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

        return {
            ...metadata,
            body: body
        };
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
                        ${(Array.isArray(post.tags) ? post.tags : post.tags.split(',').map(tag => tag.trim())).map(tag => `<span class="badge bg-light text-dark me-2">${tag}</span>`).join('')}
                    </div>` : ''}
                    <a href="/blog-post.html?post=${post.slug}" class="btn btn-outline-primary">
                        Read More <iconify-icon icon="bi:arrow-right" class="ms-1"></iconify-icon>
                    </a>
                </div>
            </article>
        `).join('');

        this.blogContainer.innerHTML = postsHTML;
        
        // Gọi hàm xử lý riêng cho iOS sau khi render
        if (this.isIOS()) {
            this.applyIOSFixes();
        }
    }

    isIOS() {
        return [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod'
        ].includes(navigator.platform) || 
        (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    }

    applyIOSFixes() {
        console.log("Applying iOS-specific fixes");
        
        // Đảm bảo các phần tử hiển thị đúng cách trên iOS
        const blogPosts = document.getElementById('blog-posts');
        if (blogPosts) {
            blogPosts.style.display = 'none';
            // Kích hoạt reflow
            void blogPosts.offsetHeight;
            blogPosts.style.display = 'block';
        }
        
        // Thêm lớp CSS cho iOS
        document.documentElement.classList.add('ios-device');
    }

    formatDate(dateString) {
        try {
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
            };
            return new Date(dateString).toLocaleDateString('en-US', options);
        } catch (error) {
            console.error('Error formatting date:', error, dateString);
            return 'Invalid date';
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
    
    if (document.getElementById('blog-posts')) {
        blogLoader.loadBlogPosts();
    }
});
