/* ============================================================
   Nuomi 官网 · 全站交互
   首页 / 启动器页共用；所有功能都做特性检测，缺元素时静默跳过。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 滚动进度条 ---------- */
  const progress = document.getElementById('progress');
  const topBtn = document.getElementById('top');
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (topBtn) topBtn.classList.toggle('show', h.scrollTop > 420);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (topBtn) {
    topBtn.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: 'smooth' })
    );
  }

  /* ---------- 移动端汉堡菜单 ---------- */
  const burger = document.getElementById('burger');
  const navlinks = document.getElementById('navlinks');
  if (burger && navlinks) {
    burger.setAttribute('aria-label', '打开导航菜单');
    burger.setAttribute('aria-expanded', 'false');
    burger.addEventListener('click', () => {
      const open = navlinks.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    navlinks.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        navlinks.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* ---------- 滚动淡入 ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el, i) => {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 60) + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ---------- 导航活跃高亮 ---------- */
  const navAnchors = Array.from(document.querySelectorAll('.navlinks a[href^="#"]'));
  const sections = navAnchors
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navAnchors.forEach(a => a.classList.toggle('active',
          a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    sections.forEach(s => so.observe(s));
  }

  /* ---------- Nuomi 代码语法高亮 ---------- */
  const KEYWORDS = new Set([
    'define','if','while','let','let*','letrec','lambda','begin','set!',
    'quote','and','or','not','cond','else','map','filter','reduce',
    'range','list','car','cdr','cons'
  ]);
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function hlLine(line) {
    if (/^\s*(nuomi>|=>)/.test(line)) return '<span class="out">' + esc(line) + '</span>';
    let out = '', i = 0;
    const n = line.length;
    while (i < n) {
      const c = line[i];
      if (c === ';' && line[i + 1] === ';') {
        out += '<span class="cm">' + esc(line.slice(i)) + '</span>';
        break;
      }
      if (c === '"') {
        let e = i + 1;
        while (e < n && line[e] !== '"') e++;
        e = Math.min(e + 1, n);
        out += '<span class="st">' + esc(line.slice(i, e)) + '</span>';
        i = e; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(line[i + 1] || ''))) {
        let e = i + 1;
        while (e < n && /[0-9.]/.test(line[e])) e++;
        out += '<span class="num">' + esc(line.slice(i, e)) + '</span>';
        i = e; continue;
      }
      if (/[A-Za-z_!*+\-<>/=?]/.test(c)) {
        let e = i + 1;
        while (e < n && /[A-Za-z0-9_!*+\-<>/=?.]/.test(line[e])) e++;
        const w = line.slice(i, e);
        out += KEYWORDS.has(w)
          ? '<span class="kw">' + esc(w) + '</span>'
          : '<span class="sym">' + esc(w) + '</span>';
        i = e; continue;
      }
      out += esc(c); i++;
    }
    return out;
  }
  const codes = document.querySelectorAll('code.lang-nuomi');
  codes.forEach(el => {
    const raw = el.textContent.replace(/^\n/, '').replace(/\n$/, '');
    el.dataset.raw = raw;
    el.innerHTML = raw.split('\n').map(hlLine).join('\n');
  });

  /* ---------- 代码示例 tabs ---------- */
  const tabsBox = document.getElementById('tabs');
  if (tabsBox) {
    const tabs = Array.from(tabsBox.querySelectorAll('.tab'));
    const pres = Array.from(document.querySelectorAll('.codewrap pre'));
    const codename = document.getElementById('codename');
    tabs.forEach(t => t.addEventListener('click', () => {
      const idx = +t.dataset.t;
      tabs.forEach(x => {
        x.classList.toggle('active', x === t);
        x.setAttribute('aria-selected', String(x === t));
      });
      pres.forEach((p, i) => { p.style.display = i === idx ? 'block' : 'none'; });
      if (codename && pres[idx]) {
        const c = pres[idx].querySelector('code');
        if (c) codename.textContent = c.dataset.name || '';
      }
    }));
  }

  /* ---------- 复制代码 ---------- */
  const copyBtn = document.getElementById('copybtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const active = document.querySelector('.codewrap pre:not([style*="none"]) code')
        || document.querySelector('.codewrap pre code');
      if (!active) return;
      const text = active.dataset.raw || active.textContent;
      const done = () => {
        copyBtn.textContent = '已复制 ✓';
        setTimeout(() => { copyBtn.textContent = '复制'; }, 1400);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
      } else {
        fallbackCopy(text, done);
      }
    });
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }

  /* ---------- 任意 [data-copy] 一键复制 ---------- */
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      const old = btn.textContent;
      const ok = () => {
        btn.textContent = '已复制 ✓';
        setTimeout(() => { btn.textContent = old; }, 1400);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(ok).catch(() => fallbackCopy(text, ok));
      } else {
        fallbackCopy(text, ok);
      }
    });
  });
})();
