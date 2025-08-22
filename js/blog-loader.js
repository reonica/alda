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
        this.isIOS = this.detectIOS();
    }

    detectIOS() {
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

            // Sử dụng cache buster để tránh cache trên iOS
            const cacheBuster = this.isIOS ? `?t=${new Date().getTime()}` : '';
            const response = await fetch(apiUrl + cacheBuster, { headers });
            
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
                        const fileResponse = await fetch(file.download_url + (this.isIOS ? `?t=${new Date().getTime()}` : ''));
                        
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

    // ... (phần còn lại giữ nguyên cho đến renderBlogPosts)

    renderBlogPosts(posts) {
        if (!this.blogContainer) return;

        // Xóa nội dung cũ hoàn toàn trước khi render mới (quan trọng cho iOS)
        this.blogContainer.innerHTML = '';

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

        // Sử dụng requestAnimationFrame để đảm bảo render đúng trên iOS
        requestAnimationFrame(() => {
            this.blogContainer.innerHTML = postsHTML;
            
            // Kích hoạt lại các thành phần trên iOS nếu cần
            if (this.isIOS) {
                this.forceIOSRedraw();
            }
        });
    }

    forceIOSRedraw() {
        // Kỹ thuật ép buộc iOS redraw các phần tử
        const containers = document.querySelectorAll('#blog-posts, .blog-post-card');
        containers.forEach(container => {
            container.style.display = 'none';
            void container.offsetHeight; // Trigger reflow
            container.style.display = '';
        });
    }

    // ... (phần còn lại giữ nguyên)
}

// Global functions
window.loadSinglePost = function(slug) {
    const loader = new BlogLoader();
    loader.loadSinglePost(slug);
};

// Khởi tạo với xử lý lỗi cho iOS
document.addEventListener('DOMContentLoaded', function() {
    // Thêm lớp CSS cho iOS nếu cần
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        document.documentElement.classList.add('ios-device');
    }
    
    const blogLoader = new BlogLoader();
    
    if (document.getElementById('blog-posts')) {
        // Thêm delay nhỏ cho iOS để đảm bảo DOM đã sẵn sàng
        if (blogLoader.isIOS) {
            setTimeout(() => blogLoader.loadBlogPosts(), 100);
        } else {
            blogLoader.loadBlogPosts();
        }
    }
});
