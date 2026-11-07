/* ============================================================
   Nuomi 官网 · 鼠标特效引擎
   单个 pointermove + 单个 rAF 循环驱动所有效果；
   触屏、减少动效、手动关闭时全部静止。
   ============================================================ */
(function () {
  'use strict';

  var body = document.body;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)');
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)');
  if (!fine.matches || reduce.matches) return;   /* 手机 / 无障碍：完全不初始化 */

  /* ---------- 开关状态（记住用户选择） ---------- */
  var KEY = 'nuomi-fx';
  function load() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* 忽略 */ } }
  var on = load() !== 'off';

  function mk(tag, id) {
    var e = document.createElement(tag);
    e.id = id;
    e.setAttribute('aria-hidden', 'true');
    body.appendChild(e);
    return e;
  }
  var glow = mk('div', 'fxGlow');
  var dot = mk('div', 'fxDot');
  var ring = mk('div', 'fxRing');

  var toggle = document.createElement('button');
  toggle.id = 'fxToggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', '切换鼠标特效');
  body.appendChild(toggle);

  function apply(state) {
    on = !!state;
    body.classList.toggle('fx-on', on);
    body.classList.toggle('fx-off', !on);
    toggle.textContent = on ? '✨' : '✧';
    toggle.title = on ? '鼠标特效：开（点击关闭）' : '鼠标特效：关（点击开启）';
    toggle.setAttribute('aria-pressed', String(on));
    if (!on) resetTilt();
  }
  apply(on);
  toggle.addEventListener('click', function () {
    apply(!on);
    save(on ? 'on' : 'off');
  });

  /* ---------- 参与特效的元素 ---------- */
  var tilts = [].slice.call(document.querySelectorAll('.card,.prod,.doc,.step'));
  tilts.forEach(function (el) {
    el.classList.add('fx-tilt');
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var shine = document.createElement('span');
    shine.className = 'fx-shine';
    shine.setAttribute('aria-hidden', 'true');
    el.insertBefore(shine, el.firstChild);
  });

  var btns = [].slice.call(document.querySelectorAll('.btn,.tab'));
  btns.forEach(function (el) { el.classList.add('fx-btn'); });

  var pars = [].slice.call(document.querySelectorAll('.badge-row,.hero-t,.mascot,.stats'));
  pars.forEach(function (el) { el.classList.add('fx-par'); });

  /* 关键：等 reveal 淡入（0~180ms 延迟 + 650ms 动画）结束后才接管 transform，
     否则两套 transform 列表不兼容会瞬间跳变，破坏进场动画。 */
  function ready(el) { el.classList.add('fx-ready'); }
  var pending = tilts.filter(function (el) { return el.classList.contains('reveal'); });
  tilts.forEach(function (el) { if (!el.classList.contains('reveal')) ready(el); });
  if ('IntersectionObserver' in window && pending.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        setTimeout(function () { ready(e.target); }, 900);
      });
    }, { threshold: 0.08 });
    pending.forEach(function (el) { io.observe(el); });
  } else {
    pending.forEach(ready);
  }

  /* ---------- 单一鼠标监听 + 单一动画循环 ---------- */
  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var gx = mx, gy = my, rx = mx, ry = my;
  var target = null, curTilt = null, curBtn = null, hovering = false;
  var awake = false, lastPop = 0;
  var lastX = -1, lastY = -1, lastTarget = null;
  var COLORS = ['#8b6cff', '#4c9aff', '#45d6c0', '#ff7aa8', '#ffc46b'];

  function closest(sel) {
    return (target && target.closest) ? target.closest(sel) : null;
  }
  function resetTilt() {
    if (!curTilt) return;
    curTilt.style.setProperty('--rx', '0deg');
    curTilt.style.setProperty('--ry', '0deg');
    curTilt = null;
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY; target = e.target;
    if (!awake) { awake = true; body.classList.add('fx-awake'); }
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', function () {
    body.classList.remove('fx-awake');
    resetTilt();
  });
  document.documentElement.addEventListener('mouseenter', function () {
    if (awake) body.classList.add('fx-awake');
  });

  function updateTarget() {
    var t = closest('.fx-tilt');
    if (t !== curTilt) { resetTilt(); curTilt = t; }
    if (curTilt) {
      var r = curTilt.getBoundingClientRect();
      if (r.width && r.height) {
        var px = (mx - r.left) / r.width, py = (my - r.top) / r.height;
        curTilt.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        curTilt.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        curTilt.style.setProperty('--ry', ((px - .5) * 7).toFixed(2) + 'deg');
        curTilt.style.setProperty('--rx', ((.5 - py) * 7).toFixed(2) + 'deg');
      }
    }
    var b = closest('.fx-btn');
    if (b !== curBtn) curBtn = b;
    if (curBtn) {
      var br = curBtn.getBoundingClientRect();
      if (br.width && br.height) {
        curBtn.style.setProperty('--mx', ((mx - br.left) / br.width * 100).toFixed(1) + '%');
        curBtn.style.setProperty('--my', ((my - br.top) / br.height * 100).toFixed(1) + '%');
      }
    }
    var h = !!closest('a,button,[role="button"],input,textarea');
    if (h !== hovering) { hovering = h; body.classList.toggle('fx-hover', h); }
  }

  function frame() {
    if (document.hidden || !fine.matches || reduce.matches) {
      requestAnimationFrame(frame); return;
    }
    if (on) {
      /* 柔光慢跟随、外圈中速、小点即时 —— 三层速度差产生层次感 */
      gx += (mx - gx) * .09; gy += (my - gy) * .09;
      rx += (mx - rx) * .20; ry += (my - ry) * .20;
      glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';

      /* 鼠标静止或目标未变时跳过 DOM 写入，避免空转 */
      var moved = (mx !== lastX || my !== lastY || target !== lastTarget);
      if (moved) {
        lastX = mx; lastY = my; lastTarget = target;
        if (target) updateTarget();

        var nx = mx / window.innerWidth - .5, ny = my / window.innerHeight - .5;
        var force = [4, 7, 11, 5];
        pars.forEach(function (el, i) {
          var f = force[i % force.length];
          el.style.setProperty('--px', (-nx * f).toFixed(1) + 'px');
          el.style.setProperty('--py', (-ny * f).toFixed(1) + 'px');
        });
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- 点击：按钮涟漪 / 空白处撒团子 ---------- */
  document.addEventListener('pointerdown', function (e) {
    if (!on || reduce.matches) return;
    var el = e.target;
    var b = (el && el.closest) ? el.closest('.fx-btn') : null;
    if (b) {
      var r = b.getBoundingClientRect();
      var d = Math.max(r.width, r.height) * 2.2;
      var ripple = document.createElement('span');
      ripple.className = 'fx-ripple';
      ripple.style.width = d + 'px';
      ripple.style.height = d + 'px';
      ripple.style.left = (e.clientX - r.left) + 'px';
      ripple.style.top = (e.clientY - r.top) + 'px';
      b.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 650);
      return;
    }
    /* 点链接、输入框、代码块时不打扰 */
    if (el && el.closest && el.closest('a,button,input,textarea,code,pre,.codewrap,[data-copy]')) return;
    var now = Date.now();
    if (now - lastPop < 320) return;
    lastPop = now;
    for (var i = 0; i < 6; i++) {
      (function (i) {
        var p = document.createElement('span');
        var isTxt = (i === 0 && Math.random() < .45);
        p.className = 'fx-pop' + (isTxt ? ' txt' : '');
        p.style.left = e.clientX + 'px';
        p.style.top = e.clientY + 'px';
        if (isTxt) {
          p.textContent = '🍡';
        } else {
          p.style.background = COLORS[i % COLORS.length];
          p.style.boxShadow = '0 0 9px ' + COLORS[i % COLORS.length];
        }
        var a = Math.random() * Math.PI * 2, dist = 34 + Math.random() * 58;
        p.style.setProperty('--dx', (Math.cos(a) * dist).toFixed(1) + 'px');
        p.style.setProperty('--dy', (Math.sin(a) * dist - 18).toFixed(1) + 'px');
        body.appendChild(p);
        setTimeout(function () { p.remove(); }, 820);
      })(i);
    }
  }, { passive: true });
})();
