document.addEventListener('DOMContentLoaded', () => {
  const postsPerPage = 6;
  let currentPage = 1;
  let allPosts = [];

  async function fetchPosts() {
    try {
      const response = await fetch('/posts.json');
      allPosts = await response.json();
      renderPosts();
    } catch (error) {
      console.error('Lỗi khi lấy bài viết:', error);
    }
  }

  function renderPosts() {
    const mobileContainer = document.getElementById('blog-posts-mobile');
    const desktopContainer = document.getElementById('blog-posts-desktop');
    const start = (currentPage - 1) * postsPerPage;
    const end = start + postsPerPage;
    const postsToShow = allPosts.slice(0, end);

    mobileContainer.innerHTML = '';
    desktopContainer.innerHTML = '';

    postsToShow.forEach(post => {
      const slide = `
        <div class="swiper-slide">
          <div class="image-holder zoom-effect">
            <a href="/posts/${post.slug}">
              <img src="/images/alda/blog/${post.image}" class="post-image img-fluid" alt="${post.title}">
            </a>
          </div>
          <a href="/posts/${post.slug}">
            <h5 class="mt-4">${post.title}</h5>
          </a>
          <p class="post-date">${new Date(post.date).toLocaleDateString()}</p>
        </div>
      `;
      mobileContainer.insertAdjacentHTML('beforeend', slide);

      const gridItem = `
        <div class="col-md-6 my-3">
          <div class="image-holder zoom-effect">
            <a href="/posts/${post.slug}">
              <img src="/images/alda/blog/${post.image}" class="post-image img-fluid" alt="${post.title}">
            </a>
          </div>
          <a href="/posts/${post.slug}" class="post-title">
            <h5 class="mt-4">${post.title}</h5>
          </a>
          <p class="post-date">${new Date(post.date).toLocaleDateString()}</p>
        </div>
      `;
      desktopContainer.insertAdjacentHTML('beforeend', gridItem);
    });

    new Swiper('.blogSwiper', {
      slidesPerView: 1,
      spaceBetween: 20,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
    });

    if (end >= allPosts.length) {
      document.getElementById('load-more').style.display = 'none';
    }
  }

  document.getElementById('load-more').addEventListener('click', () => {
    currentPage++;
    renderPosts();
  });

  fetchPosts();
});
