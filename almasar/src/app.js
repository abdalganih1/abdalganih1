/* منصة مسار · site interactions (header, auth state, smooth scroll, reveals, scroll story, filters) */
(() => {
  const d = document, h = d.documentElement, w = window;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];

  /* ---------- auth-aware header (same storage keys as the platform's js/api.js) ---------- */
  let user = null;
  try { if (localStorage.getItem('auth_token')) user = JSON.parse(localStorage.getItem('user_data') || 'null'); } catch (e) { /* storage blocked */ }
  if (user && (location.pathname === '/' || location.pathname === '/index.html')) {
    if (user.role === 'admin') { location.replace('/admin/index.html'); return; }
    if (user.role === 'teacher') { location.replace('/teacher/index.html'); return; }
  }
  if (user) {
    const dash = user.role === 'admin' ? '<a href="/admin/index.html" class="btn btn-g btn-sm">لوحة التحكم</a>'
      : user.role === 'teacher' ? '<a href="/teacher/index.html" class="btn btn-g btn-sm">لوحة المعلم</a>'
      : '<a href="/courses" class="btn btn-p btn-sm">كورساتي</a>';
    $$('[data-auth]').forEach((el) => {
      el.innerHTML = `<span class="mh-user">مرحباً، ${String(user.name || '').replace(/[<>&"]/g, '') || 'بك'}</span>${dash}<button type="button" class="btn btn-g btn-sm" data-logout>خروج</button>`;
    });
    d.addEventListener('click', (e) => {
      if (!e.target.closest('[data-logout]')) return;
      try { localStorage.removeItem('auth_token'); localStorage.removeItem('user_data'); } catch (err) { /* ignore */ }
      location.href = '/';
    });
  }

  /* ---------- header ---------- */
  const mh = $('#mh'), burger = $('#mhBurger');
  let lastY = 0;
  const onScroll = () => {
    const y = w.scrollY;
    if (mh) {
      mh.classList.toggle('is-solid', y > 30);
      mh.classList.toggle('is-hidden', y > 400 && y > lastY + 4 && !d.body.classList.contains('nav-open'));
      if (y < lastY - 4) mh.classList.remove('is-hidden');
    }
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  burger && burger.addEventListener('click', () => {
    const open = d.body.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    if (w.__lenis) open ? w.__lenis.stop() : w.__lenis.start();
  });
  $$('.mh-nav a').forEach((a) => a.addEventListener('click', () => { d.body.classList.remove('nav-open'); burger && burger.setAttribute('aria-expanded', 'false'); w.__lenis && w.__lenis.start(); }));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && d.body.classList.contains('nav-open')) burger.click(); });

  /* ---------- word split for headings ---------- */
  $$('.split').forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
            const s = d.createElement('span');
            s.className = 'wd'; s.style.setProperty('--i', i++); s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('i')) walk(n);
      });
    };
    walk(el);
  });

  /* ---------- reveals + counters ---------- */
  const count = (el) => {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1600;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * e).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    el.classList.add('is-in');
    if (el.dataset.count && !reduce) count(el);
    io.unobserve(el);
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  const watch = () => $$('.reveal, .reveal-img, .split, [data-count]').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });

  /* ---------- hero entrance (waits for the intro when it plays) ---------- */
  const hero = $('.hero');
  const heroIn = () => {
    if (!hero || hero.classList.contains('is-in')) return;
    hero.classList.add('is-in');
    if (!reduce) $$('[data-count]', hero).forEach((el) => setTimeout(() => count(el), 900));
  };
  if (h.classList.contains('intro-on')) addEventListener('masar:intro-done', heroIn, { once: true });
  else requestAnimationFrame(heroIn);
  if (!hero) $$('.ph .split, .ch .split, .art-h .split').forEach((el) => requestAnimationFrame(() => el.classList.add('is-in')));
  watch();

  /* ---------- courses: filter + search ---------- */
  const grid = $('#cgrid');
  if (grid && $('.filters')) {
    const chips = $$('.chip[data-filter]'), q = $('#courseSearch'), empty = $('#cEmpty');
    const params = new URLSearchParams(location.search);
    let cat = params.get('category') || '';
    if (params.get('q')) q.value = params.get('q');
    const apply = () => {
      const term = q.value.trim().toLowerCase();
      let shown = 0;
      $$('.cc', grid).forEach((c) => {
        const ok = (!cat || c.dataset.cat === cat) && (!term || c.dataset.title.toLowerCase().includes(term));
        c.classList.toggle('is-hidden', !ok);
        if (ok) { shown++; c.classList.add('is-in'); }
      });
      chips.forEach((b) => b.classList.toggle('is-on', b.dataset.filter === cat));
      empty.hidden = shown > 0;
    };
    chips.forEach((b) => b.addEventListener('click', () => {
      cat = b.dataset.filter;
      const u = new URL(location.href);
      cat ? u.searchParams.set('category', cat) : u.searchParams.delete('category');
      history.replaceState(null, '', u);
      apply();
    }));
    q.addEventListener('input', apply);
    apply();
  }

  /* ---------- course rail ---------- */
  $$('[data-rail]').forEach((rail) => {
    const box = rail.parentElement;
    const by = (dir) => { const card = $('.cc', rail); rail.scrollBy({ left: dir * ((card ? card.offsetWidth : 300) + 22), behavior: 'smooth' }); };
    // RTL: "next" moves toward the left
    $('[data-rail-next]', box) && $('[data-rail-next]', box).addEventListener('click', () => by(-1));
    $('[data-rail-prev]', box) && $('[data-rail-prev]', box).addEventListener('click', () => by(1));
  });

  /* ---------- lite YouTube ---------- */
  d.addEventListener('click', (e) => {
    const yt = e.target.closest('.yt');
    if (!yt || yt.querySelector('iframe')) return;
    const f = d.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${yt.dataset.yt}?autoplay=1&rel=0`;
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true; f.title = 'فيديو';
    yt.appendChild(f);
  });

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduce) $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .28}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------- smooth scroll + scroll-driven story (GSAP, loaded with defer) ---------- */
  const motion = () => {
    if (reduce || !w.gsap) return;
    const { gsap } = w;
    if (w.ScrollTrigger) gsap.registerPlugin(w.ScrollTrigger);
    if (w.Lenis && fine) {
      const lenis = new w.Lenis({ duration: 1.15, smoothWheel: true });
      w.__lenis = lenis;
      lenis.on('scroll', () => w.ScrollTrigger && w.ScrollTrigger.update());
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      if (h.classList.contains('intro-on')) { lenis.stop(); addEventListener('masar:intro-done', () => lenis.start(), { once: true }); }
      $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
        const t = a.getAttribute('href');
        if (t.length > 1 && $(t)) { e.preventDefault(); lenis.scrollTo(t, { offset: -80 }); }
      }));
    }
    if (!w.ScrollTrigger) return;
    // hero: background drifts, golden path draws itself, content lifts away
    if (hero) {
      gsap.to('.hero-bg', { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-in', { y: -80, opacity: .2, ease: 'none', scrollTrigger: { trigger: hero, start: '30% top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-path path', { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', delay: h.classList.contains('intro-on') ? 4.8 : 0.6 });
    }
    // journey: the path fills as you scroll and each station lights up
    const jr = $('#jr');
    if (jr) {
      gsap.to('#jrGlow', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: jr, start: 'top 65%', end: 'bottom 65%', scrub: .6 } });
      $$('.st', jr).forEach((st) => {
        w.ScrollTrigger.create({ trigger: st, start: 'top 60%', onEnter: () => st.classList.add('is-lit'), onLeaveBack: () => st.classList.remove('is-lit') });
        const im = $('img', st);
        gsap.fromTo(im, { scale: 1.18, yPercent: -4 }, { scale: 1.02, yPercent: 4, ease: 'none', scrollTrigger: { trigger: st, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }
    $$('.cta-bg, .ph-bg img, .art-bg img').forEach((el) => {
      gsap.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el.closest('section, header'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.cat img').forEach((el) => gsap.fromTo(el, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  };
  motion();
  // without GSAP (reduced motion) light the journey stations via IntersectionObserver
  if (reduce) $$('.st').forEach((st) => st.classList.add('is-lit'));
})();
