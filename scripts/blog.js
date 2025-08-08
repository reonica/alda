// scripts/blog.js
document.addEventListener('DOMContentLoaded', () => {
  const postsPerPage = 6;
  let currentPage = 1;
  let allPosts = [];

  async function fetchPosts() {
    try {
      const response = await fetch('/.netlify/functions/get-posts');
      if (!response.ok) throw new Error('API request failed');
      allPosts = await response.json();
      renderPosts();
      initializeSwiper();
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback to local posts.json
      try {
        const backupResponse = await fetch('/posts.json');
        if (backupResponse.ok) {
          allPosts = await backupResponse.json();
          renderPosts();
          initializeSwiper();
        } else {
          throw new Error('Failed to load posts.json');
        }
      } catch (backupError) {
        console.error('Error loading backup posts:', backupError);
        document.getElementById('blog-posts-mobile').innerHTML = '<p>Không thể tải bài viết.</p>';
        document.getElementById('blog-posts-desktop').innerHTML = '<p>Không thể tải bài viết.</p>';
      }
    }
  }

  function initializeSwiper() {
    new Swiper('.blogSwiper', {
      slidesPerView: 1,
      spaceBetween: 10,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        576: {
          slidesPerView: 2,
          spaceBetween: 15,
        },
      },
    });
  }

  function renderPosts() {
    const start = (currentPage - 1) * postsPerPage;
    const end = start + postsPerPage;
    const postsToShow = allPosts.slice(0, end);

    // Cập nhật đường dẫn chuẩn và hình ảnh dự phòng
    const renderPostHTML = (post) => `
      <div class="swiper-slide">
        <div class="image-holder zoom-effect">
          <a href="/blog/${post.slug}">
            <img src="${post.image || '/images/alda/Team-alda-hub.jpg'}" class="post-image img-fluid" alt="${post.title}" loading="lazy">
          </a>
        </div>
        <a href="/blog/${post.slug}" class="post-title" aria-label="Đọc thêm về ${post.title}">${post.title}</a>
        <p class="post-date">${new Date(post.date).toLocaleDateString()}</p>
      </div>
    `;

    // Render cho mobile
    document.getElementById('blog-posts-mobile').innerHTML = 
      postsToShow.length > 0 
        ? postsToShow.map(renderPostHTML).join('')
        : '<p>Không có bài viết nào.</p>';
    
    // Render cho desktop (3 cột)
    document.getElementById('blog-posts-desktop').innerHTML = 
      postsToShow.length > 0 
        ? postsToShow.map(post => `
            <div class="col-md-4 my-3">
              ${renderPostHTML(post).replace('swiper-slide', '')}
            </div>
          `).join('')
        : '<p>Không có bài viết nào.</p>';

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
