/* abdalgani.com — interactions: smooth scroll, intro, scroll animations, page transitions. */
(function () {
  'use strict';
  var d = document, h = d.documentElement, w = window;
  var RM = h.classList.contains('rm');
  var gsap = w.gsap, ST = w.ScrollTrigger;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  if (!gsap || !ST) { h.classList.remove('js'); h.classList.add('ready'); return; }
  gsap.registerPlugin(ST);
  h.classList.add('booted');

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!RM && w.Lenis) {
    lenis = new w.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -90 });
    else (typeof target === 'number' ? w.scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));
  }

  /* ---------- header / progress / to-top ---------- */
  var hd = $('header.site'), bar = $('.progress'), top = $('.totop'), lastY = 0;
  function onScroll() {
    var y = w.scrollY, max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    if (hd) {
      hd.classList.toggle('solid', y > 30);
      hd.classList.toggle('hide', y > 400 && y > lastY && !h.classList.contains('menu-open'));
    }
    if (top) top.classList.toggle('show', y > 900);
    lastY = y;
  }
  w.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (top) top.addEventListener('click', function () { scrollTo(0); });

  /* ---------- mobile menu ---------- */
  var mb = $('.menu-btn');
  if (mb) mb.addEventListener('click', function () {
    var open = h.classList.toggle('menu-open');
    mb.setAttribute('aria-expanded', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  });

  /* ---------- cursor + glow ---------- */
  var cur = $('.cursor'), glow = $('.glow');
  if (cur && w.matchMedia('(pointer:fine)').matches && !RM) {
    var cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    var gx = glow && gsap.quickTo(glow, 'x', { duration: 1.2, ease: 'power3' }), gy = glow && gsap.quickTo(glow, 'y', { duration: 1.2, ease: 'power3' });
    w.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); if (gx) { gx(e.clientX); gy(e.clientY); } }, { passive: true });
    $$('a,button,[data-cursor]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { cur.classList.add('big'); var l = el.getAttribute('data-cursor'); $('b', cur).textContent = l || ''; });
      el.addEventListener('pointerleave', function () { cur.classList.remove('big'); });
    });
  } else if (cur) { cur.remove(); if (glow) glow.remove(); }

  /* ---------- magnetic buttons ---------- */
  if (!RM && w.matchMedia('(pointer:fine)').matches) $$('.btn,.share a,.socials a').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .4, ease: 'power3' });
    });
    b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.4)' }); });
  });

  /* ---------- spotlight + tilt on cards ---------- */
  $$('.svc,.panel,.work').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', px * 100 + '%'); c.style.setProperty('--my', py * 100 + '%');
      if (!RM) gsap.to(c, { rotateY: (px - .5) * 8, rotateX: (.5 - py) * 8, transformPerspective: 900, duration: .5, ease: 'power2' });
    });
    c.addEventListener('pointerleave', function () { if (!RM) gsap.to(c, { rotateY: 0, rotateX: 0, duration: .8, ease: 'power3' }); });
  });

  /* ---------- text splitting (words, keeps Arabic shaping intact) ---------- */
  function splitWords(el) {
    if (el.dataset.split) return $$('.w>span', el);
    el.dataset.split = '1';
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
            var o = d.createElement('span'); o.className = 'w';
            var i = d.createElement('span'); i.textContent = part; o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el); el.classList.add('split-words');
    return $$('.w>span', el);
  }

  /* ---------- page enter (curtain lifts) + intro ---------- */
  var curtain = $('.curtain');
  function revealPage() {
    h.classList.add('ready');
    var tl = gsap.timeline();
    if (h.classList.contains('entering') && curtain) {
      tl.set($$('i', curtain), { scaleY: 1, transformOrigin: 'top' })
        .call(function () { h.classList.remove('entering'); })
        .to($$('i', curtain), { scaleY: 0, duration: .7, ease: 'power4.inOut', stagger: .06 });
    }
    heroIn(tl);
  }

  function heroIn(tl) {
    if (RM) return;
    var hero = $('.hero');
    if (hero) {
      var words = $$('.hero h1 .ln>span');
      tl.from('header.site', { yPercent: -100, opacity: 0, duration: .9, ease: 'power3.out' }, '<')
        .from($('.hero-bg img'), { scale: 1.35, opacity: 0, duration: 2.2, ease: 'power3.out' }, '<')
        .from('.hero .eyebrow', { y: 30, opacity: 0, duration: .8, ease: 'power3.out' }, '<.2')
        .from(words, { yPercent: 115, rotate: 4, duration: 1.2, ease: 'power4.out', stagger: .09 }, '<.1')
        .from('.hero .lead', { y: 30, opacity: 0, duration: .9, ease: 'power3.out' }, '-=.8')
        .from('.hero .ctas>*', { y: 24, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out' }, '-=.7')
        .from('.hero-meta>div', { y: 24, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' }, '-=.6')
        .from('.scroll-cue', { opacity: 0, duration: .8 }, '-=.4');
      return;
    }
    var ph = $('.page-head,.art-hero');
    if (ph) {
      var t = $('h1', ph);
      tl.from($('.bgimg img', ph), { scale: 1.25, opacity: 0, duration: 1.8, ease: 'power3.out' }, '<')
        .from(splitWords(t), { yPercent: 110, opacity: 0, duration: 1, stagger: .045, ease: 'power4.out' }, '<.15')
        .from($$('.crumb,.sub,.chips,.meta', ph), { y: 20, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' }, '-=.8');
    }
  }

  var intro = $('.intro');
  if (intro && !h.classList.contains('no-loader') && !RM && w.AGIntro) {
    if (lenis) lenis.stop();
    w.AGIntro(intro, {
      onOpen: revealPage,
      onDone: function () { if (lenis) lenis.start(); try { sessionStorage.setItem('ag-intro', '1'); } catch (e) {} }
    });
  } else {
    if (intro) intro.remove();
    revealPage();
  }

  /* ---------- page leave transition ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !curtain || RM || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var url = new URL(a.href, location.href);
    if (a.target === '_blank' || a.hasAttribute('download') || url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) {
      var t = d.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (t) { e.preventDefault(); scrollTo(t); }
      return;
    }
    e.preventDefault();
    h.classList.remove('menu-open');
    try { sessionStorage.setItem('ag-nav', '1'); } catch (err) {}
    gsap.set($$('i', curtain), { transformOrigin: 'bottom' });
    gsap.to($$('i', curtain), { scaleY: 1, duration: .55, ease: 'power4.inOut', stagger: .05, onComplete: function () { location.href = a.href; } });
  });
  // Back/forward cache: make sure the curtain is lifted.
  w.addEventListener('pageshow', function (e) { if (e.persisted && curtain) gsap.set($$('i', curtain), { scaleY: 0 }); });

  if (RM) { h.classList.add('ready'); wireStatic(); return; }

  /* ---------- generic scroll reveals ---------- */
  ST.batch('[data-rv]', {
    start: 'top 88%', once: true,
    onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: .1, overwrite: true }); }
  });
  $$('[data-clip]').forEach(function (el) {
    gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    var img = $('img', el);
    if (img) gsap.from(img, { scale: 1.3, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  // headings: word-by-word rise
  $$('[data-split]').forEach(function (el) {
    gsap.from(splitWords(el), { yPercent: 110, opacity: 0, rotate: 3, duration: 1.1, ease: 'power4.out', stagger: .05,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  // parallax images
  $$('[data-parallax]').forEach(function (el) {
    var amt = parseFloat(el.getAttribute('data-parallax')) || 15;
    gsap.fromTo(el, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // hero: content drifts and fades as you scroll away
  if ($('.hero')) {
    gsap.to('.hero .wrap', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-bg img', { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  $$('.page-head,.art-hero').forEach(function (ph) {
    gsap.to($('.wrap', ph), { yPercent: -20, opacity: .2, ease: 'none', scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true } });
    var im = $('.bgimg img', ph);
    if (im) gsap.to(im, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true } });
  });

  /* ---------- marquee driven by scroll velocity ---------- */
  $$('.marquee .track').forEach(function (track, i) {
    var dir = i % 2 ? 1 : -1, x = 0, speed = 0.6, half = track.scrollWidth / 2;
    w.addEventListener('resize', function () { half = track.scrollWidth / 2; });
    gsap.ticker.add(function () {
      var v = lenis ? Math.abs(lenis.velocity) : 0;
      x += dir * (speed + Math.min(v, 60) * 0.25);
      if (x <= -half) x += half; if (x >= 0) x -= half;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
    });
    if (dir > 0) x = -half;
  });

  /* ---------- horizontal showcase (pinned) ---------- */
  var sc = $('.showcase');
  if (sc) ST.matchMedia({
    '(min-width: 761px)': function () {
      var rail = $('.rail', sc), pb = $('.bar i', sc);
      var dist = function () { return Math.max(0, rail.scrollWidth - w.innerWidth); };
      var tw = gsap.to(rail, { x: function () { return dist(); }, ease: 'none',
        scrollTrigger: { trigger: sc, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (s) { if (pb) pb.style.transform = 'scaleX(' + s.progress + ')'; } } });
      $$('.scard .im img', sc).forEach(function (img) {
        gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('.scard'), containerAnimation: tw, start: 'right left', end: 'left right', scrub: true } });
      });
    }
  });

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(function (el) {
    var to = parseInt(el.getAttribute('data-count'), 10) || 0, o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString('en-US'); } });
  });

  /* ---------- process line ---------- */
  $$('.steps').forEach(function (s) {
    var l = $('.line', s);
    if (l) gsap.to(l, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: s, start: 'top 75%', end: 'bottom 55%', scrub: true } });
    gsap.from($$('.dot', s), { scale: 0, duration: .8, ease: 'back.out(2)', stagger: .15, scrollTrigger: { trigger: s, start: 'top 80%', once: true } });
  });

  /* ---------- footer name ---------- */
  var fn = $('footer .big-name');
  if (fn) gsap.from(fn, { yPercent: 40, opacity: 0, letterSpacing: '.2em', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: fn, start: 'top 95%', once: true } });

  /* ---------- hero canvas: circuit network ---------- */
  var cv = $('.hero canvas');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), pts = [], W, H, DPR = Math.min(2, w.devicePixelRatio || 1), mouse = { x: -999, y: -999 }, running = true;
    var size = function () {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.min(90, Math.round(W * H / 16000)); pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 });
    };
    size(); w.addEventListener('resize', size);
    cv.parentElement.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    ST.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onToggle: function (s) { running = s.isActive; } });
    gsap.ticker.add(function () {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
        var dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dm < 160) { p.x += (p.x - mouse.x) / dm * .8; p.y += (p.y - mouse.y) / dm * .8; }
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], dd = Math.hypot(p.x - q.x, p.y - q.y);
          if (dd < 130) {
            ctx.strokeStyle = 'rgba(53,182,255,' + (1 - dd / 130) * .35 + ')'; ctx.lineWidth = 1;
            // right-angle "PCB trace" segments
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        ctx.fillStyle = dm < 160 ? '#19e0c8' : 'rgba(25,224,200,.7)';
        ctx.beginPath(); ctx.arc(p.x, p.y, dm < 160 ? 2.6 : 1.6, 0, 6.283); ctx.fill();
      }
    });
  }

  wireStatic();

  /* ---------- non-animation wiring (runs with reduced motion too) ---------- */
  function wireStatic() {
    // project filters
    var fb = $$('.filters [data-f]');
    fb.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        fb.forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
        var shown = [];
        $$('.grid .card').forEach(function (c) {
          var ok = f === 'all' || (' ' + c.getAttribute('data-cats') + ' ').indexOf(' ' + f + ' ') > -1;
          c.classList.toggle('hide', !ok); if (ok) shown.push(c);
        });
        if (!RM) gsap.fromTo(shown, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .7, stagger: .05, ease: 'power3.out', overwrite: true });
        ST.refresh();
      });
    });
    // toc highlight
    var toc = $$('.toc a');
    if (toc.length) {
      var heads = toc.map(function (a) { return d.getElementById(decodeURIComponent(a.hash.slice(1))); });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var k = heads.indexOf(e.target); toc.forEach(function (a, i) { a.classList.toggle('on', i === k); }); } });
      }, { rootMargin: '-20% 0px -70% 0px' });
      heads.forEach(function (x) { if (x) io.observe(x); });
    }
    // share
    $$('[data-share]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var u = encodeURIComponent(location.href), t = encodeURIComponent(d.title), k = a.getAttribute('data-share');
        if (k === 'cp') { e.preventDefault(); if (navigator.clipboard) navigator.clipboard.writeText(location.href); a.setAttribute('aria-label', 'تم النسخ'); return; }
        var m = { wa: 'https://wa.me/?text=' + t + '%20' + u, tg: 'https://t.me/share/url?url=' + u + '&text=' + t, x: 'https://x.com/intent/post?url=' + u + '&text=' + t };
        a.href = m[k];
      });
    });
    // consultation form → WhatsApp
    var form = $('#consult-form');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, nl = '%0A';
      var msg = 'طلب استشارة جديد من الموقع' + nl + '————————' + nl +
        '👤 الاسم: ' + encodeURIComponent(f.name.value) + nl + '📞 الهاتف: ' + encodeURIComponent(f.phone.value) + nl +
        '📁 النوع: ' + encodeURIComponent(f.topic.value) + nl + '📝 التفاصيل: ' + encodeURIComponent(f.details.value || '—');
      w.open('https://wa.me/' + form.getAttribute('data-wa') + '?text=' + msg, '_blank', 'noopener');
    });
    w.addEventListener('load', function () { ST.refresh(); });
  }
})();
