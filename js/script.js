(function ($) {
  "use strict";

  // Initialize Preloader
  var initPreloader = function () {
    $(document).ready(function ($) {
      var Body = $('body');
      Body.addClass('preloader-site');
    });
    $(window).on('load', function () {
      $('.preloader-wrapper').fadeOut();
      $('body').removeClass('preloader-site');
    });
  }

  // Background color on scroll
  var initScrollNav = function () {
    var scroll = $(window).scrollTop();
    if (scroll >= 200) {
      $('.navbar.fixed-top').addClass("bg-scrolled");
    } else {
      $('.navbar.fixed-top').removeClass("bg-scrolled");
    }
  }

  // Initialize Lightbox
  var initChocolat = function () {
    Chocolat(document.querySelectorAll('.image-link'), {
      imageSize: 'contain',
      loop: true,
    })
  }

  // Back to Top & Social Buttons Functionality
  var initScrollButtons = function () {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    // Back to top
    $(window).on('scroll', function () {
      $('.back-to-top').toggleClass('visible', $(this).scrollTop() > 300);
    });

    $('.back-to-top').on('click', function (e) {
      e.preventDefault();
      $('html, body').animate({ scrollTop: 0 }, 'smooth');
    });

    // Social buttons handling (only for desktop)
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
  };

  // Swiper Initializations
  $(document).ready(function () {
    // Service Swiper (Mobile only)
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

    // Portfolio Swiper (Mobile only)
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

    // Isotope
    if ($('.entry-container').length) {
      var $grid = $('.entry-container').isotope({
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

    initPreloader();
    initChocolat();
    initScrollButtons();
    $(window).scroll(initScrollNav);
  });
})(jQuery);
