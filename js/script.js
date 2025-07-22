(function ($) {
  "use strict";

  // Khởi tạo Preloader
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

  // Màu nền khi scroll
  var initScrollNav = function () {
    var scroll = $(window).scrollTop();
    if (scroll >= 200) {
      $('.navbar.fixed-top').addClass("bg-scrolled");
    } else {
      $('.navbar.fixed-top').removeClass("bg-scrolled");
    }
  }

  // Khởi tạo lightbox
  var initChocolat = function () {
    Chocolat(document.querySelectorAll('.image-link'), {
      imageSize: 'contain',
      loop: true,
    })
  }

  // Xử lý số lượng sản phẩm
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
    // Brand Swiper - ĐÃ ĐƯA VÀO TRONG READY VÀ THÊM KIỂM TRA TỒN TẠI
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

// Initialize Portfolio Swiper - Fixed Pagination Version
if (document.querySelector('.portfolioSwiper')) {
  const portfolioSwiper = new Swiper('.portfolioSwiper', {
    slidesPerView: 1.2,
    spaceBetween: 15,
    centeredSlides: true,
    loop: false, // 🔄 Tắt loop để pagination chính xác
    grabCursor: true,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      dynamicBullets: true, // 💫 Hiệu ứng bullet mượt mà
      dynamicMainBullets: 3 // 🔢 Chỉ hiển thị 3 bullet quanh active
    },
    breakpoints: {
      400: { slidesPerView: 1.3 },
      500: { slidesPerView: 1.5 },
      576: { 
        slidesPerView: 1.8,
        spaceBetween: 20 
      },
      768: {
        slidesPerView: 2,
        spaceBetween: 25,
        pagination: false // 🖥️ Ẩn pagination trên desktop
      }
    },
    observer: true, // 👀 Tự động cập nhật khi DOM thay đổi
    observeParents: true,
    observeSlideChildren: true
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
    $(window).scroll(initScrollNav);
  });

})(jQuery);
