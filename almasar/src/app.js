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

  /* ---------- light / night switch ---------- */
  const meta = $('meta[name="theme-color"]');
  const paint = () => meta && meta.setAttribute('content', h.classList.contains('theme-dark') ? '#060a18' : '#f6f8fc');
  paint();
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    const dark = h.classList.toggle('theme-dark');
    try { localStorage.setItem('masar-theme', dark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    paint();
  }));

  /* ---------- header + scroll progress ---------- */
  const mh = $('#mh'), burger = $('#mhBurger'), sp = $('#sp');
  let lastY = 0;
  const onScroll = () => {
    const y = w.scrollY;
    if (sp) sp.style.transform = `scaleX(${Math.min(1, y / Math.max(1, d.documentElement.scrollHeight - innerHeight))})`;
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
  if (!hero) $$('.ph .split, .ch .split, .art-h .split, .ph .reveal, .ch .reveal, .art-h .reveal, .ph .reveal-img, .ch .reveal-img, .art-h .reveal-img').forEach((el) => requestAnimationFrame(() => el.classList.add('is-in')));
  watch();

  /* ---------- courses: filter + search (Arabic-aware: أ/إ/آ=ا، ة=ه، ى=ي) ---------- */
  const norm = (t) => String(t || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
  const grid = $('#cgrid');
  if (grid && $('.fbar')) {
    const chips = $$('.chip[data-filter]'), q = $('#courseSearch'), empty = $('#cEmpty'), cnt = $('#cCount');
    const cards = $$('.cc', grid).map((c) => ({ c, cat: c.dataset.cat, q: norm(c.dataset.q) }));
    const params = new URLSearchParams(location.search);
    let cat = params.get('category') || '';
    if (params.get('q')) q.value = params.get('q');
    const apply = () => {
      const words = norm(q.value).split(' ').filter(Boolean);
      let shown = 0;
      cards.forEach(({ c, cat: cc, q: hay }) => {
        const ok = (!cat || cc === cat) && words.every((wd) => hay.includes(wd));
        c.classList.toggle('is-hidden', !ok);
        if (ok) { shown++; c.classList.add('is-in'); }
      });
      chips.forEach((b) => b.classList.toggle('is-on', b.dataset.filter === cat));
      empty.hidden = shown > 0;
      const n = shown === 1 ? 'كورس <b>واحد</b>' : shown === 2 ? '<b>كورسين</b>' : `<b>${shown}</b> ${shown < 11 ? 'كورسات' : 'كورس'}`;
      cnt.innerHTML = shown ? `عم نعرضلك ${n}${cat ? ` في «${cat}»` : ''}${words.length ? ` عن «${q.value.trim().replace(/[<>&"]/g, '')}»` : ''}` : '';
    };
    chips.forEach((b) => b.addEventListener('click', () => {
      cat = b.dataset.filter;
      const u = new URL(location.href);
      cat ? u.searchParams.set('category', cat) : u.searchParams.delete('category');
      history.replaceState(null, '', u);
      apply();
    }));
    $$('[data-try]').forEach((b) => b.addEventListener('click', () => { q.value = b.dataset.try; cat = ''; apply(); q.focus(); }));
    q.addEventListener('input', apply);
    apply();
  }

  /* ---------- one-click start: enrol (account) or open a free guest seat, then go straight to the course ---------- */
  const API = '__API__';
  const guestId = () => {
    let g = null;
    try { g = localStorage.getItem('masar_guest_id'); } catch (e) { /* ignore */ }
    if (!g) {
      g = (w.crypto && crypto.randomUUID ? crypto.randomUUID() : 'g' + Date.now() + Math.random()).replace(/-/g, '').substring(0, 24);
      try { localStorage.setItem('masar_guest_id', g); } catch (e) { /* ignore */ }
    }
    return g;
  };
  d.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-start]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (a.classList.contains('is-busy')) return;
    const id = +a.dataset.start, go = () => { location.href = `/course?id=${id}`; };
    $$(`[data-start="${id}"]`).forEach((b) => { b.classList.add('is-busy'); b.innerHTML = '<span class="spin" aria-hidden="true"></span> عم نجهّزلك الكورس…'; });
    const t = setTimeout(go, 6000);
    try {
      const tok = localStorage.getItem('auth_token');
      if (tok) await fetch(`${API}/courses/${id}/enroll`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` } });
      else await fetch(`${API}/grants/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guest_id: guestId(), course_id: id, full_name: 'ضيف مسار', goal: 'تعلم مجاني' }) });
    } catch (err) { /* the course page offers its own start button as a fallback */ }
    clearTimeout(t);
    go();
  });
  // phones: a sticky start bar once the main button scrolls away
  const sbar = $('#sbar'), sbox = $('#startBox'), ctaEl = $('.cta');
  if (sbar && sbox && 'IntersectionObserver' in w) {
    const vis = new Map();
    const so = new IntersectionObserver((ents) => {
      ents.forEach((en) => vis.set(en.target, en.isIntersecting));
      const past = sbox.getBoundingClientRect().bottom < 0;
      sbar.classList.toggle('is-on', past && !vis.get(sbox) && !vis.get(ctaEl));
    });
    so.observe(sbox); ctaEl && so.observe(ctaEl);
  }

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
    // hero: framed photo drifts, floating badges move at their own pace, golden path draws itself
    if (hero) {
      gsap.to('.hero-frame img', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      $$('.hero-float').forEach((f, i) => gsap.to(f, { y: -60 - i * 40, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } }));
      gsap.to('.hero-in', { y: -60, opacity: .3, ease: 'none', scrollTrigger: { trigger: hero, start: '40% top', end: 'bottom top', scrub: true } });
      gsap.to('.hero-path path', { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut', delay: h.classList.contains('intro-on') ? 4.8 : 0.6 });
    }
    // topic ribbons slide in opposite directions with the scroll
    $$('[data-mq]').forEach((r) => {
      const dir = +r.dataset.mq;
      gsap.fromTo(r, { xPercent: dir > 0 ? -30 : 0 }, { xPercent: dir > 0 ? 0 : -30, ease: 'none', scrollTrigger: { trigger: r.parentElement, start: 'top bottom', end: 'bottom top', scrub: .5 } });
    });
    // dark sections open up from a rounded card to full width as they arrive
    $$('.dk-x').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(0% 4% 0% 4% round 48px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 25%', scrub: true } });
    });
    // enrolment steps: the dotted line fills in
    if ($('#stepsOn')) gsap.to('#stepsOn', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 60%', scrub: .6 } });
    $$('.cta-bg, .ph-fig img, .art-cover img').forEach((el) => {
      gsap.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el.closest('section, header'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  };
  motion();
  // without GSAP (reduced motion) light the journey stations via IntersectionObserver
  if (reduce) $$('.st').forEach((st) => st.classList.add('is-lit'));
})();
