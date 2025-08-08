// src/scripts/blog.js
document.addEventListener('DOMContentLoaded', () => {
  const postsPerPage = 6;
  let currentPage = 1;
  let allPosts = [];

  async function fetchPosts() {
    try {
      const response = await fetch('/.netlify/functions/get-posts');
      allPosts = await response.json();
      renderPosts();
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback to local posts.json
      const backupResponse = await fetch('/posts.json');
      if (backupResponse.ok) {
        allPosts = await backupResponse.json();
        renderPosts();
      }
    }
  }

  function renderPosts() {
    const start = (currentPage - 1) * postsPerPage;
    const end = start + postsPerPage;
    const postsToShow = allPosts.slice(0, end);

    // Cập nhật đường dẫn chuẩn
    const renderPostHTML = (post) => `
      <div class="swiper-slide">
        <div class="image-holder zoom-effect">
          <a href="/blog/${post.slug}">
            <img src="${post.image}" class="post-image img-fluid" alt="${post.title}">
          </a>
        </div>
        <a href="/blog/${post.slug}">
          <h5 class="mt-4">${post.title}</h5>
        </a>
        <p class="post-date">${new Date(post.date).toLocaleDateString()}</p>
      </div>
    `;

    // Render cho mobile và desktop
    document.getElementById('blog-posts-mobile').innerHTML = 
      postsToShow.map(renderPostHTML).join('');
    
    document.getElementById('blog-posts-desktop').innerHTML = 
      postsToShow.map(post => `
        <div class="col-md-6 my-3">
          ${renderPostHTML(post).replace('swiper-slide', '')}
        </div>
      `).join('');

    // Ẩn nút load more nếu đã hiển thị hết
    document.getElementById('load-more').style.display = 
      end >= allPosts.length ? 'none' : 'block';
  }

  document.getElementById('load-more').addEventListener('click', () => {
    currentPage++;
    renderPosts();
  });

  fetchPosts();
});
