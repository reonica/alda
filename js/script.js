(function ($) {
  "use strict";

  /* ======================
     INITIALIZATION FUNCTIONS
     ====================== */
  function initPreloader() {
    $(document).ready(function ($) {
      $('body').addClass('preloader-site');
    });
    $(window).on('load', function () {
      $('.preloader-wrapper').fadeOut();
      $('body').removeClass('preloader-site');
    });
  }

  function initScrollNav() {
    var scroll = $(window).scrollTop();
    $('.navbar.fixed-top').toggleClass("bg-scrolled", scroll >= 50);
  }

  function initChocolat() {
    Chocolat(document.querySelectorAll('.image-link'), {
      imageSize: 'contain',
      loop: true,
    });
  }

  function initScrollButtons() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    // Back to top
    $(window).on('scroll', function () {
      $('.back-to-top').toggleClass('visible', $(this).scrollTop() > 300);
    });

    $('.back-to-top').on('click', function (e) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: 0 }, 'smooth');
    });

    // Social buttons (desktop only)
    if (!isMobile) {
      $('.social-main').on('click', function (e) {
        e.preventDefault();
        $('.social-dropdown').toggleClass('expanded');
        $(this).toggleClass('active');
      });

      $(document).on('click', function (e) {
        if (!$(e.target).closest('.social-buttons-container').length) {
          $('.social-dropdown').removeClass('expanded');
          $('.social-main').removeClass('active');
        }
      });
    }
  }

  /* ======================
     SWIPER INITIALIZATIONS
     ====================== */
  function initSwipers() {
    // Service Swiper
    if (document.querySelector('.serviceSwiper')) {
      new Swiper('.serviceSwiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      });
    }

    // Portfolio Swiper
    if (document.querySelector('.portfolioSwiper')) {
      new Swiper('.portfolioSwiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        breakpoints: {
          576: {
            slidesPerView: 1.5,
            centeredSlides: true,
          },
        },
      });
    }

    // Testimonial Swiper
    if (document.querySelector('.testimonial-swiper')) {
      new Swiper('.testimonial-swiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      });
    }

    // Brand Swiper
    if ($('.brandSwiper').length) {
      new Swiper('.brandSwiper', {
        slidesPerView: 2,
        spaceBetween: 20,
        centeredSlides: true,
        loop: true,
        autoplay: {
          delay: 2500,
          disableOnInteraction: false,
        },
        breakpoints: {
          640: { slidesPerView: 3 },
          768: { slidesPerView: 4 },
          1024: { slidesPerView: 5, spaceBetween: 30 },
        },
      });
    }
  }

  /* ======================
     OTHER PLUGIN INITIALIZATIONS
     ====================== */
  function initPlugins() {
    // Isotope
    if ($('.entry-container').length) {
      $('.entry-container').isotope({
        itemSelector: '.entry-item',
        layoutMode: 'masonry',
      });
    }

    // Colorbox
    if ($('.youtube').length) {
      $('.youtube').colorbox({
        iframe: true,
        innerWidth: 960,
        innerHeight: 585,
      });
    }
  }

  /* ======================
     BLOG POST META FUNCTIONS
     ====================== */
  function initBlogPostMeta() {
    if (!document.getElementById('blog-post')) {
      return;
    }
    
    const postDateElement = document.getElementById('post-date');
    const postAuthorElement = document.getElementById('post-author');
    
    if (!postDateElement || !postAuthorElement) {
      return;
    }
    
    if (typeof window.loadSinglePost === 'function') {
      return;
    }
    
    try {
      const metaDate = document.querySelector('meta[property="article:published_time"]');
      const metaAuthor = document.querySelector('meta[property="article:author"]');
      
      if (metaDate) {
        const date = new Date(metaDate.content);
        postDateElement.textContent = date.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      
      if (metaAuthor) {
        postAuthorElement.textContent = metaAuthor.content;
      }
    } catch (error) {
      console.error("Error loading blog post meta:", error);
    }
  }

  /* ======================
     UTILITY FUNCTIONS
     ====================== */
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  /* ======================
     TOC FUNCTIONS - FIXED VERSION
     ====================== */
  function smoothScroll(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
      const headerOffset = 100;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      if (window.innerWidth < 992) {
        const tocContainer = document.getElementById('toc-container');
        if (tocContainer) {
          tocContainer.classList.remove('active');
        }
      }
    }
  }

  function highlightActiveSection() {
    const blogContent = document.querySelector('.blog-content.post-content');
    if (!blogContent) return;
    
    const sections = blogContent.querySelectorAll('h2, h3, h4');
    const tocLinks = document.querySelectorAll('.toc-content a');
    
    if (sections.length === 0 || tocLinks.length === 0) return;
    
    let currentSection = '';
    let closestSection = null;
    let smallestDistance = Infinity;
    
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const distance = Math.abs(rect.top);
      
      if (distance < smallestDistance && rect.top <= 150) {
        smallestDistance = distance;
        closestSection = section;
      }
    });
    
    if (closestSection) {
      currentSection = '#' + closestSection.id;
    }
    
    tocLinks.forEach(link => {
      link.classList.remove('active');
      link.parentElement.classList.remove('active');
      
      if (link.getAttribute('href') === currentSection) {
        link.classList.add('active');
        link.parentElement.classList.add('active');
      }
    });
  }

  const throttledHighlight = throttle(highlightActiveSection, 100);

  function initTOC() {
    console.log('Initializing TOC...');
    
    let retryCount = 0;
    const maxRetries = 10;
    
    function tryInitTOC() {
      const blogContent = document.querySelector('.blog-content.post-content');
      const tocContainer = document.getElementById('toc-container');
      
      console.log('TOC Init attempt:', retryCount + 1);
      console.log('Blog content found:', !!blogContent);
      console.log('TOC container found:', !!tocContainer);
      
      if (!blogContent) {
        console.log('Blog content not found');
        if (tocContainer) {
          tocContainer.style.display = 'none';
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(tryInitTOC, 100);
          return;
        }
        return;
      }
      
      const headings = blogContent.querySelectorAll('h2, h3, h4, h5, h6');
      console.log('Headings found:', headings.length);
      
      if (headings.length === 0) {
        console.log('No headings found');
        if (tocContainer) {
          tocContainer.style.display = 'none';
        }
        return;
      }

      if (tocContainer) {
        tocContainer.classList.remove('d-none');
        tocContainer.style.display = 'block';
        console.log('TOC container shown');
      }
      
      const toc = document.getElementById('table-of-contents');
      if (!toc) {
        console.log('TOC element not found');
        return;
      }
      
      console.log('Building TOC...');
      toc.innerHTML = '';
      const tocList = document.createElement('ul');
      
      headings.forEach((heading, index) => {
        if (!heading.id) {
          heading.id = 'section-' + index + '-' + heading.tagName.toLowerCase();
        }
        
        const listItem = document.createElement('li');
        listItem.classList.add(`${heading.tagName.toLowerCase()}-item`);
        
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent;
        link.addEventListener('click', smoothScroll);
        
        listItem.appendChild(link);
        tocList.appendChild(listItem);
      });
      
      toc.appendChild(tocList);
      console.log('TOC built successfully with', headings.length, 'items');
      
      setupTOCToggle();
      
      window.removeEventListener('scroll', throttledHighlight);
      window.addEventListener('scroll', throttledHighlight);
      highlightActiveSection();
      
      console.log('TOC initialization complete');
    }
    
    // Start the initialization process
    tryInitTOC();
  }

  function setupTOCToggle() {
    const toggleBtn = document.getElementById('toc-toggle');
    const tocContainer = document.getElementById('toc-container');
    
    console.log('Setting up TOC toggle...');
    console.log('Toggle button found:', !!toggleBtn);
    console.log('TOC container found:', !!tocContainer);
    
    if (toggleBtn && tocContainer) {
        // Remove ALL existing listeners
        const newToggleBtn = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
        
        // Add fresh event listener
        newToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('TOC toggle clicked');
            const container = document.getElementById('toc-container');
            
            if (container) {
                const isCollapsed = container.classList.contains('collapsed');
                
                if (isCollapsed) {
                    container.classList.remove('collapsed');
                    console.log('TOC expanded');
                } else {
                    container.classList.add('collapsed');
                    console.log('TOC collapsed');
                }
                
                // Update toggle icon
                const icon = newToggleBtn.querySelector('iconify-icon');
                if (icon) {
                    if (container.classList.contains('collapsed')) {
                        icon.setAttribute('icon', 'mi:chevron-down');
                    } else {
                        icon.setAttribute('icon', 'mi:chevron-up');
                    }
                }
            }
        });
        
        console.log('TOC toggle button set up successfully');
    } else {
        console.log('TOC toggle setup failed - missing elements');
    }
  }
  
  window.initTOC = initTOC;

  /* ======================
     DOCUMENT READY
     ====================== */
  $(document).ready(function () {
    initSwipers();
    initPlugins();
    initPreloader();
    initChocolat();
    initScrollButtons();
    initBlogPostMeta();
    $(window).scroll(initScrollNav);
    
    $(window).on('load', function() {
      setTimeout(initTOC, 500);
    });
  });

})(jQuery);
