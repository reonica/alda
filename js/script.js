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
  console.log('Initializing social buttons...');
  
  const $socialContainer = $('.social-buttons-container');
  const $socialMain = $('.social-main');
  const $socialDropdown = $('.social-dropdown');
  let isMobile = window.matchMedia("(max-width: 768px)").matches;
  console.log('Is mobile:', isMobile);

  // Btn always display
  $socialContainer.css({
    'display': 'flex',
    'opacity': '1',
    'visibility': 'visible'
  });

/ On mobile, only show WhatsApp and back-to-top buttons
  if (isMobile) {
    // Hide main social button and other social buttons
    $socialMain.hide();
    $socialDropdown.hide();
    
    // Only show WhatsApp button and back-to-top
    $('.whatsapp').show().css({
      'position': 'fixed',
      'right': '20px',
      'bottom': '80px', // Position above back-to-top button
      'z-index': '9999'
    });
    
    $('.back-to-top').css({
      'position': 'fixed',
      'right': '20px',
      'bottom': '20px',
      'z-index': '9999'
    });
  }
  
  // Back to top behavior
  $(window).on('scroll', function() {
    $('.back-to-top').toggleClass('visible', $(this).scrollTop() > 300);
    
    // Close on scroll - Mobile only
    if (isMobile && $socialDropdown.hasClass('expanded')) {
      isScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function() {
        if (isScrolling) {
          $socialDropdown.removeClass('expanded');
          $socialMain.removeClass('active');
        }
      }, 300);
    }
  });
  
  $('.back-to-top').on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({ scrollTop: 0 }, 'smooth');
  });

  // Social buttons toggle
  $socialMain.on('click touchstart', function(e) {
    e.stopPropagation();
    e.preventDefault();
    $socialDropdown.toggleClass('expanded');
    $socialMain.toggleClass('active');
  });

  // Close when clicking outside
  $(document).on('click touchstart', function(e) {
    if (!$(e.target).closest('.social-buttons-container').length) {
      $socialDropdown.removeClass('expanded');
      $socialMain.removeClass('active');
    }
  });

  // Prevent closing when clicking inside dropdown
  $socialDropdown.on('click touchstart', function(e) {
    e.stopPropagation();
  });

  // Reset scroll flag
  $(window).on('scrollend', function() {
    isScrolling = false;
  });
  
  // Mobile optimization
  if (isMobile) {
    $socialMain.css('cursor', 'pointer');
    $socialDropdown.on('touchmove', function(e) {
      if ($socialDropdown.hasClass('expanded')) {
        e.preventDefault();
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
