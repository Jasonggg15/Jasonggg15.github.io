/* ============================================================
   main.js — 全站共用的一点点交互
   1. 页脚自动年份
   2. 移动端顶部导航折叠
   3. 首页滚动时导航高亮 (scrollspy)
   4. 回到顶部悬浮按钮 (JS 创建,各页面免改 HTML)
   5. Projects 媒体带 justified 成行(每行撑满、边缘对齐、不裁切)
   (Publications 页的搜索脚本内联在 publications/index.html 里)
   均为渐进增强:JS 失效时页面功能不受损
   ============================================================ */

(function () {
  "use strict";

  /* 1. 页脚年份:<span data-year></span> */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* 2. 移动端导航折叠 */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close" : "Menu";
    });
    /* 点完链接收起菜单 */
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
      }
    });
  }

  /* 3. Scrollspy:仅首页生效(blog 页的导航指向 index.html#…,此处自然不匹配) */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.masthead nav a[href^="#"]')
  );
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (a) {
            a.classList.toggle(
              "active",
              a.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach(function (s) { observer.observe(s); });
  }

  /* 4. 回到顶部:滚动超过一屏后出现。
     (曾经的"滚动渐入"已拆除:进视口才浮现会让首屏显得内容很少) */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.textContent = "↑";
  document.body.appendChild(toTop);
  var onScroll = function () {
    toTop.classList.toggle("show", window.scrollY > 600);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* 5. Projects 媒体带 justified 成行:每行精确撑满容器、行内同高、左右边缘对齐,
     素材保持原始比例不裁切(Flickr/Google Photos 式)。
     宽高比来源:img 用 naturalWidth(未加载完先按 4:3 占位,load 后自动重算);
     video 用 HTML 上的 width/height 属性(preload=none 也立即可得)。
     行高上限:普通带 280px 的 1.35 倍,.single 带固定 400px;末行单件不放大。
     无 JS 时退回 CSS 里的固定行高版本(见 style.css 媒体带注释)。 */
  var MEDIA_SEL = ".proj-photos, .proj-videos, .proj-media";

  function aspectOf(el) {
    if (el.tagName === "VIDEO") {
      var w = parseFloat(el.getAttribute("width"));
      var h = parseFloat(el.getAttribute("height"));
      return w && h ? w / h : 16 / 9;
    }
    return el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : 0;
  }

  function justifyBand(band) {
    var gap = 10;
    var W = band.clientWidth;
    if (!W) return;
    var single = band.classList.contains("single");
    var target = single ? 400 : (W <= 640 ? 190 : 280);
    var row = [];
    var rowAr = 0;

    function flush(isLast) {
      if (!row.length) return;
      var exact = (W - gap * (row.length - 1)) / rowAr;
      var cap = single ? target : target * 1.35;
      if (isLast && row.length === 1) cap = target; // 末行孤儿不放大
      var h = Math.min(exact, cap);
      row.forEach(function (el) {
        el.style.height = h + "px";
        el.style.width = h * aspectOf(el) + "px";
      });
      row = [];
      rowAr = 0;
    }

    Array.prototype.forEach.call(band.children, function (el) {
      var a = aspectOf(el);
      if (!a) {
        if (!el.dataset.justifyWaiting) {
          el.dataset.justifyWaiting = "1";
          el.addEventListener("load", function () { justifyBand(band); }, { once: true });
        }
        a = 4 / 3;
      }
      row.push(el);
      rowAr += a;
      /* 装入直到超宽再整行缩放到精确撑满(justified 算法:行永远在"溢出"后收缩成形) */
      if (rowAr * target + gap * (row.length - 1) >= W) flush(false);
    });
    flush(true);
    band.classList.add("justified");
  }

  function justifyAll() {
    document.querySelectorAll(MEDIA_SEL).forEach(justifyBand);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", justifyAll);
  } else {
    justifyAll();
  }
  var justifyTimer;
  window.addEventListener("resize", function () {
    clearTimeout(justifyTimer);
    justifyTimer = setTimeout(justifyAll, 150);
  });
})();
