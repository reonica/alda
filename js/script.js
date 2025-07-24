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

// Back to Top & Social Buttons Functionality - OPTIMIZED VERSION
var initScrollButtons = function() {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  
  // Back to top
  $(window).on('scroll', function() {
    $('.back-to-top').toggleClass('visible', $(this).scrollTop() > 300);
  });
  
  $('.back-to-top').on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({ scrollTop: 0 }, 'smooth');
  });

  // Social buttons handling (only for desktop)
  if (!isMobile) {
    $('.social-main').on('click', function(e) {
      e.preventDefault();
      $('.social-dropdown').toggleClass('expanded');
      $(this).toggleClass('active');
    });

    $(document).on('click', function(e) {
      if (!$(e.target).closest('.social-buttons-container').length) {
        $('.social-dropdown').removeClass('expanded');
        $('.social-main').removeClass('active');
      }
    });
  }
};
  
  // Document ready
  $(document).ready(function () {
    // Testimonial Swiper
    var testimonialSwiper = new Swiper(".testimonial-swiper", {
      slidesPerView: 1,
      spaceBetween: 20,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
    });

    // Product Swipers
    var thumbSlider = new Swiper(".product-thumbnail-slider", {
      loop: true,
      slidesPerView: 3,
      autoplay: true,
      direction: "vertical",
      spaceBetween: 30,
    });

    var largeSlider = new Swiper(".product-large-slider", {
      loop: true,
      slidesPerView: 1,
      autoplay: true,
      effect: 'fade',
      thumbs: {
        swiper: thumbSlider,
      },
    });

    // Service Mobile Pagination
    var serviceSwiper = new Swiper("#service .swiper", {
      slidesPerView: 1,
      spaceBetween: 20,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      breakpoints: {
        768: {
          slidesPerView: 3,
          spaceBetween: 30,
          pagination: false
        }
      }
    });

    // Brand Swiper
    if ($('.brandSwiper').length) {
      var brandSwiper = new Swiper(".brandSwiper", {
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
          1024: { slidesPerView: 5, spaceBetween: 30 }
        }
      });
    }

    // Portfolio Swiper No Pagination
    if (document.querySelector('.portfolioSwiper')) {
      const portfolioSwiper = new Swiper('.portfolioSwiper', {
        slidesPerView: 1.2,
        spaceBetween: 15,
        centeredSlides: true,
        loop: true,
        grabCursor: true,
        breakpoints: {
          400: { slidesPerView: 1.3 },
          500: { slidesPerView: 1.5 },
          576: { 
            slidesPerView: 1.8,
            spaceBetween: 20 
          }
        }
      });
    }
    
    // Isotope
    window.addEventListener("load", function () {
      if ($('.entry-container').length) {
        var $grid = $('.entry-container').isotope({
          itemSelector: '.entry-item',
          layoutMode: 'masonry'
        });
      }
    });

    // Colorbox
    if ($(".youtube").length) {
      $(".youtube").colorbox({
        iframe: true,
        innerWidth: 960,
        innerHeight: 585
      });
    }

    initPreloader();
    initChocolat();
    initScrollButtons(); 
    $(window).scroll(initScrollNav);
  });

})(jQuery);
