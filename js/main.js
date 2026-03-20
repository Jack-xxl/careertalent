/* ============================
   TalentAI - main.js
   作用：语言切换 / 数字滚动 / 入场动画 / 光标光晕
   ============================ */

(function () {
  "use strict";

  // ---------- Utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Language ----------
  function applyLang(lang) {
    const zhEls = $$(".lang-zh");
    const enEls = $$(".lang-en");

    // 如果页面没有 lang-*，直接退出
    if (!zhEls.length && !enEls.length) return;

    // 显示/隐藏
    zhEls.forEach(el => (el.style.display = lang === "zh" ? "" : "none"));
    enEls.forEach(el => (el.style.display = lang === "en" ? "" : "none"));

    // 按钮状态
    const btnZh = $("#btn-zh");
    const btnEn = $("#btn-en");
    if (btnZh && btnEn) {
      if (lang === "zh") {
        btnZh.classList.add("bg-purple-600");
        btnZh.classList.remove("bg-gray-700");
        btnEn.classList.add("bg-gray-700");
        btnEn.classList.remove("bg-purple-600");
      } else {
        btnEn.classList.add("bg-purple-600");
        btnEn.classList.remove("bg-gray-700");
        btnZh.classList.add("bg-gray-700");
        btnZh.classList.remove("bg-purple-600");
      }
    }

    // 记住选择
    try {
      localStorage.setItem("talentai_lang", lang);
    } catch (_) {}
  }

  // 提供给 HTML onclick 调用
  window.switchLang = function (lang) {
    applyLang(lang);
  };

  function initLang() {
    let lang = "zh";
    try {
      lang = localStorage.getItem("talentai_lang") || "zh";
    } catch (_) {}
    applyLang(lang);
  }

  // ---------- Count Up ----------
  function animateCountUp(el) {
    const target = Number(el.getAttribute("data-target") || "0");
    const duration = 1200; // ms
    const start = performance.now();
    const from = 0;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const val = Math.floor(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      el.textContent = String(val);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCountUps() {
    const els = $$(".countup");
    if (!els.length) return;

    // 进入视口再滚动
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            animateCountUp(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.35 }
    );

    els.forEach(el => io.observe(el));
  }

  // ---------- Fade In ----------
  function initFadeIn() {
    const els = $$(".fade-in");
    if (!els.length) return;

    // 如果没有动画CSS也没事：至少确保可见
    els.forEach(el => el.classList.add("will-animate"));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    els.forEach(el => io.observe(el));
  }

  // ---------- Cursor Glow ----------
  function initCursorGlow() {
    const glow = $("#cursor-glow");
    if (!glow) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    window.addEventListener("mousemove", (e) => {
      x = e.clientX;
      y = e.clientY;
      glow.style.transform = `translate(${x - 150}px, ${y - 150}px)`;
      glow.style.opacity = "1";
    });

    window.addEventListener("mouseleave", () => {
      glow.style.opacity = "0";
    });
  }

  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    initLang();
    initCountUps();
    initFadeIn();
    initCursorGlow();
  });

})();
