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

  // Product quantity handling
  var initProductQty = function () {
    $('.product-qty').each(function () {
      var $el_product = $(this);
      $el_product.find('.quantity-right-plus').click(function (e) {
        e.preventDefault();
        var quantity = parseInt($el_product.find('#quantity').val());
        $el_product.find('#quantity').val(quantity + 1);
      });
      $el_product.find('.quantity-left-minus').click(function (e) {
        e.preventDefault();
        var quantity = parseInt($el_product.find('#quantity').val());
        if (quantity > 0) {
          $el_product.find('#quantity').val(quantity - 1);
        }
      });
    });
  }

  // Back to Top & Social Buttons Functionality
  var initScrollButtons = function() {
    const backToTopButton = $('.back-to-top');
    
  $(window).on('scroll', function() {
    $('.back-to-top').toggleClass('visible', $(this).scrollTop() > 300);
  });
  
  $('.back-to-top').on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({ scrollTop: 0 }, 'smooth');
  });

  // Social Dropdown Toggle
  $('.social-main').on('click', function(e) {
    e.stopPropagation();
    $('.social-dropdown').toggleClass('expanded');
  });

  // Close dropdown when clicking outside.
  $(document).on('click', function() {
    $('.social-dropdown').removeClass('expanded');
  });
}

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
    initProductQty();
    initScrollButtons(); 
    $(window).scroll(initScrollNav);
  });

})(jQuery);
