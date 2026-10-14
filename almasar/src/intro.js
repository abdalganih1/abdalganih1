/* منصة مسار · opening scene: a path of light winds up the screen, lights three stations
   (اكتشف · حدّد · أبدع), becomes the logo, then the site opens. Plays once per session; ?intro replays it. */
(() => {
  const d = document, h = d.documentElement, w = window;
  const el = d.getElementById('intro');
  if (!el || !h.classList.contains('intro-on')) return;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem('masar-intro', '1'); } catch (e) { /* ignore */ }
    w.dispatchEvent(new Event('masar:intro-done'));
  };
  const remove = () => { h.classList.remove('intro-on'); el.remove(); stars.stop(); };
  if (!w.gsap) { done(); remove(); return; }
  const { gsap } = w;

  /* ---------- star dust ---------- */
  const stars = (() => {
    const c = d.getElementById('introStars'), x = c.getContext('2d');
    const dpr = Math.min(2, w.devicePixelRatio || 1);
    let W, H, pts, raf;
    const size = () => {
      W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr;
      pts = Array.from({ length: Math.round((innerWidth * innerHeight) / 7000) }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.3 + .3) * dpr, a: Math.random(), s: Math.random() * .02 + .004, v: (Math.random() * .25 + .05) * dpr,
      }));
    };
    size();
    const tick = () => {
      x.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.a += p.s; p.y -= p.v; if (p.y < 0) p.y = H;
        x.globalAlpha = .25 + Math.abs(Math.sin(p.a)) * .75;
        x.fillStyle = p.r > 1.2 * dpr ? '#f7d9a0' : '#bfefff';
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return { stop: () => cancelAnimationFrame(raf) };
  })();

  /* ---------- geometry: a winding path from the bottom to where the logo sits ---------- */
  const W = innerWidth, H = innerHeight, narrow = W < 640;
  const svg = el.querySelector('.intro-svg'), path = d.getElementById('introPath'), head = d.getElementById('introHead');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const logo = el.querySelector('.intro-logo');
  const lr = logo.getBoundingClientRect();
  const end = [lr.left + lr.width / 2, lr.top + lr.height / 2];
  const pts = narrow
    ? [[W * .8, H + 40], [W * .22, H * .86], [W * .78, H * .74], [W * .2, H * .6], end]
    : [[W * .86, H + 40], [W * .28, H * .84], [W * .74, H * .66], [W * .3, H * .5], end];
  // Catmull-Rom → cubic Bézier
  let dStr = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    dStr += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  path.setAttribute('d', dStr);
  path.setAttribute('stroke-width', narrow ? 4 : 5);
  const L = path.getTotalLength();
  path.style.strokeDasharray = L;
  path.style.strokeDashoffset = L;
  const at = (f) => path.getPointAtLength(f * L);

  const stations = [...el.querySelectorAll('.intro-st')].map((g, i) => {
    const f = +g.dataset.at, p = at(f);
    g.setAttribute('transform', `translate(${p.x} ${p.y})`);
    const word = el.querySelectorAll('.intro-words span')[i];
    const ww = word.offsetWidth;
    let lx = p.x + (p.x > W / 2 ? -1 : 1) * (ww / 2 + 34), ly = p.y;
    if (narrow) { lx = W / 2; ly = p.y - 46; }
    lx = Math.max(ww / 2 + 14, Math.min(W - ww / 2 - 14, lx));
    word.style.left = lx + 'px'; word.style.top = ly + 'px';
    return { f, g, word, lit: false };
  });

  /* ---------- timeline ---------- */
  const prog = { p: 0 };
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  tl.to(prog, {
    p: 1, duration: 2.9, ease: 'power1.inOut',
    onUpdate() {
      path.style.strokeDashoffset = L * (1 - prog.p);
      const q = at(prog.p);
      head.setAttribute('cx', q.x); head.setAttribute('cy', q.y);
      for (const s of stations) {
        if (!s.lit && prog.p >= s.f) {
          s.lit = true;
          const [dot, ring] = s.g.querySelectorAll('circle');
          gsap.fromTo(dot, { opacity: 0, scale: 0, transformOrigin: 'center' }, { opacity: 1, scale: 1, duration: .5, ease: 'back.out(3)' });
          gsap.fromTo(ring, { opacity: .9, scale: 1, transformOrigin: 'center' }, { opacity: 0, scale: 4, duration: 1.1, ease: 'power2.out' });
          gsap.fromTo(s.word, { opacity: 0, y: 14, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .6 });
        }
      }
    },
  }, .35)
    .to(head, { attr: { r: 26 }, opacity: 0, duration: .6 }, 3.2)
    .to('.intro-words span', { opacity: 0, y: -10, duration: .5, stagger: .06 }, 3.2)
    .to('.intro-st circle', { opacity: 0, duration: .5 }, 3.2)
    .to(path, { opacity: .25, duration: .8 }, 3.25)
    .to(logo, { opacity: 1, scale: 1, duration: .8, ease: 'back.out(1.8)' }, 3.2)
    .to('.intro-name', { opacity: 1, clipPath: 'inset(0 0 0 0%)', duration: 1, ease: 'power3.inOut' }, 3.45)
    .to('.intro-sub', { opacity: 1, y: 0, duration: .7 }, 3.95)
    .add(() => done(), 4.85)
    .to(el, { opacity: 0, scale: 1.12, duration: .9, ease: 'power2.inOut' }, 4.85)
    .add(remove);

  const skip = () => {
    tl.kill();
    done();
    el.classList.add('is-out');
    gsap.to(el, { opacity: 0, duration: .45, onComplete: remove });
  };
  d.getElementById('introSkip').addEventListener('click', skip);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') skip(); }, { once: true });
})();
