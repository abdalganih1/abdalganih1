/* Techno Enjaz launch intro.
 * Shot list: inside the small circle a programmer is coding → camera pulls back and the circle
 * turns out to be the logo's launch button → button is pressed, countdown, ignition → the logo
 * lifts off like a rocket through the clouds → we reach space above the Earth → the rocket
 * boosts toward the camera and the site opens through it.
 */
(function () {
  'use strict';
  var w = window, d = document;

  w.AGIntro = function (root, opts) {
    var gsap = w.gsap;
    var $ = function (s) { return root.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };
    var cam = $('.in-cam'), stage = $('.in-stage'), rocket = $('.in-rocket'), disc = $('.in-disc');
    var cv = $('.in-cv'), ctx = cv.getContext('2d');
    var DPR = Math.min(1.5, w.devicePixelRatio || 1), W = 0, H = 0;
    var opened = false, finished = false;

    /* ---------- shared animated state (driven by the GSAP timeline, read by the canvas loop) ---------- */
    var S = {
      starA: 0,      // star visibility
      climb: 0,      // vertical streaking while ascending (0..1)
      warp: 0,       // radial warp toward camera (0..1)
      smoke: 0,      // smoke emission rate at the launch pad
      burst: 0,      // one-shot smoke burst trigger
      thrust: 0,     // flame particle emission (0..1)
      ground: 0,     // how far the world below has dropped (px)
      shake: 0       // camera shake amplitude (px)
    };

    /* ---------- sizing ---------- */
    var stageW = 0, stageH = 0;
    function size() {
      W = w.innerWidth; H = w.innerHeight;
      cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      stageW = stage.offsetWidth; stageH = stage.offsetHeight;
    }
    size(); w.addEventListener('resize', size);

    // Transform that puts the disc (the small circle) full-screen: zoom around the disc centre.
    function discCloseUp() {
      var dr = disc.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      var cx = dr.left + dr.width / 2, cy = dr.top + dr.height / 2;
      var target = Math.min(W, H) * 0.82;
      var s = target / dr.width;
      // stage transform-origin is the disc centre (set in CSS), so only translate to centre it.
      return { scale: s, x: W / 2 - cx, y: H / 2 - cy, ox: (cx - sr.left) / sr.width * 100, oy: (cy - sr.top) / sr.height * 100 };
    }

    /* ---------- particle sprites ---------- */
    function sprite(r, stops) {
      var c = d.createElement('canvas'); c.width = c.height = r * 2;
      var g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
      g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c;
    }
    var SMOKE = sprite(64, [[0, 'rgba(190,215,235,.55)'], [.45, 'rgba(120,150,180,.22)'], [1, 'rgba(60,80,110,0)']]);
    var SMOKE2 = sprite(64, [[0, 'rgba(225,250,255,.6)'], [.4, 'rgba(150,215,225,.25)'], [1, 'rgba(60,110,130,0)']]);
    var FIRE = sprite(32, [[0, 'rgba(255,255,255,1)'], [.25, 'rgba(160,255,240,.9)'], [.6, 'rgba(25,224,200,.35)'], [1, 'rgba(53,120,255,0)']]);
    var GLOW = sprite(64, [[0, 'rgba(25,224,200,.5)'], [1, 'rgba(25,224,200,0)']]);

    /* ---------- stars (3D, with vertical climb streaks and radial warp) ---------- */
    var stars = [];
    for (var i = 0; i < 520; i++) stars.push({ x: (Math.random() - .5) * 2, y: (Math.random() - .5) * 2, z: Math.random() * .9 + .1, t: Math.random() * 6.28 });
    var smoke = [], fire = [], sparks = [];

    function nozzle() {
      var r = rocket.getBoundingClientRect();
      return { x: r.left + r.width * .489, y: r.top + r.height * .955, w: r.width };
    }
    function pad() {
      // launch pad sits where the rocket stood; it drops away with the world as we climb
      var r = stage.getBoundingClientRect();
      return { x: r.left + r.width * .489, y: r.top + r.height * .985 + S.ground, w: r.width };
    }

    var last = performance.now();
    function frame(now) {
      if (finished) return;
      var dt = Math.min(50, now - last) / 16.67; last = now;
      ctx.clearRect(0, 0, W, H);

      // stars
      if (S.starA > 0.01) {
        var cx = W / 2, cy = H / 2, F = Math.max(W, H) * .6;
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          s.z -= (0.0006 + S.warp * 0.03) * dt;
          s.y += S.climb * 0.02 * dt * (1.2 - s.z);
          if (s.z <= .05 || s.y > 1.2) { s.x = (Math.random() - .5) * 2; s.y = S.climb > .3 ? -1.2 + Math.random() * .2 : (Math.random() - .5) * 2; s.z = 1; }
          var px = cx + s.x / s.z * F * .5, py = cy + s.y / s.z * F * .5;
          if (px < -50 || px > W + 50 || py < -50 || py > H + 50) { if (S.warp > .05) s.z = .04; continue; }
          var tw = .55 + Math.sin(s.t += .05 * dt) * .45;
          var a = S.starA * (1 - s.z * .7) * (S.warp > .1 ? 1 : tw);
          var sz = (1.3 - s.z) * 1.6;
          var len = S.climb * 26 * (1.2 - s.z) + S.warp * 60 / s.z;
          ctx.strokeStyle = s.z < .3 ? 'rgba(170,255,240,' + a + ')' : 'rgba(220,235,255,' + a + ')';
          if (len > 1.5) {
            ctx.lineWidth = sz; ctx.beginPath(); ctx.moveTo(px, py);
            if (S.warp > S.climb) { var dx = px - cx, dy = py - cy, dl = Math.hypot(dx, dy) || 1; ctx.lineTo(px - dx / dl * len, py - dy / dl * len); }
            else ctx.lineTo(px, py - len);
            ctx.stroke();
          } else { ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(px, py, sz, sz); }
        }
      }

      // smoke at the pad (lingers, billows sideways, drops with the ground)
      var p = pad();
      var emit = S.smoke * 3 * dt + (S.burst > 0 ? 40 : 0);
      if (S.burst > 0) S.burst = 0;
      if (S.thrust > .3 && S.ground < H) {
        var nz = nozzle();
        for (var e = 0; e < 2 * dt; e++) smoke.push({ x: nz.x + (Math.random() - .5) * nz.w * .2, y: nz.y + nz.w * (1 + Math.random() * 1.2), vx: (Math.random() - .5) * 3, vy: 1 + Math.random() * 2,
          r: nz.w * (.1 + Math.random() * .12), g: 1.012, a: .8, life: .9, gy: S.ground, tone: 1 });
      }
      for (var k = 0; k < emit; k++) {
        var side = Math.random() < .5 ? -1 : 1, burst = emit > 10;
        smoke.push({ x: p.x + (Math.random() - .5) * p.w * .4, y: p.y - Math.random() * 14, vx: side * (Math.random() * (burst ? 11 : 2.8) + .4), vy: -(Math.random() * (burst ? 3.2 : 1.6) + .2),
          r: p.w * (.1 + Math.random() * .2), g: 1.005 + Math.random() * .012, a: .9, life: 1, gy: S.ground, tone: Math.random() < .3 ? 1 : 0 });
      }
      ctx.globalCompositeOperation = 'source-over';
      for (var m = smoke.length - 1; m >= 0; m--) {
        var q = smoke[m];
        q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .975; q.vy *= .985; q.r *= Math.pow(q.g, dt); q.life -= .006 * dt;
        var yy = q.y + (S.ground - q.gy);
        if (q.life <= 0 || yy - q.r > H + 200) { smoke.splice(m, 1); continue; }
        ctx.globalAlpha = Math.max(0, q.life) * .8;
        ctx.drawImage(q.tone ? SMOKE2 : SMOKE, q.x - q.r, yy - q.r, q.r * 2, q.r * 2);
      }
      if (smoke.length > 700) smoke.splice(0, smoke.length - 700);

      // exhaust fire + sparks from the nozzle
      ctx.globalCompositeOperation = 'lighter';
      if (S.thrust > .01) {
        var n = nozzle();
        for (var f = 0; f < S.thrust * 6 * dt; f++) {
          fire.push({ x: n.x + (Math.random() - .5) * n.w * .12, y: n.y, vx: (Math.random() - .5) * 1.4, vy: 6 + Math.random() * 8 * S.thrust, r: n.w * (.05 + Math.random() * .07), life: 1 });
          if (Math.random() < .35) sparks.push({ x: n.x, y: n.y, vx: (Math.random() - .5) * 7, vy: 3 + Math.random() * 9, life: 1 });
        }
        ctx.globalAlpha = .55 * S.thrust;
        ctx.drawImage(GLOW, n.x - n.w * .7, n.y - n.w * .35, n.w * 1.4, n.w * 1.4);
      }
      for (var j = fire.length - 1; j >= 0; j--) {
        var o = fire[j]; o.x += o.vx * dt; o.y += o.vy * dt; o.r *= 1.035; o.life -= .055 * dt;
        if (o.life <= 0) { fire.splice(j, 1); continue; }
        ctx.globalAlpha = o.life * .9; ctx.drawImage(FIRE, o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
      }
      for (var z = sparks.length - 1; z >= 0; z--) {
        var sp = sparks[z]; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += .25 * dt; sp.life -= .03 * dt;
        if (sp.life <= 0) { sparks.splice(z, 1); continue; }
        ctx.globalAlpha = sp.life; ctx.fillStyle = '#bffff3'; ctx.fillRect(sp.x, sp.y, 2, 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

      // camera shake
      if (S.shake > .05) gsap.set(cam, { x: (Math.random() - .5) * S.shake, y: (Math.random() - .5) * S.shake });
      else gsap.set(cam, { x: 0, y: 0 });

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* ---------- HUD typing ---------- */
    var code = $('.in-code');
    var LINES = ['const idea = new Idea("مشروعك");', 'await engineer.design(idea);', 'build({ hardware, software, ai });', 'TechnoEnjaz.launch(); // 🚀'];
    function typeCode(tl, at) {
      code.innerHTML = '';
      LINES.forEach(function (ln, i) {
        var row = d.createElement('div'); row.className = 'ln'; code.appendChild(row);
        var o = { n: 0 };
        tl.to(o, { n: ln.length, duration: ln.length * .022, ease: 'none', onUpdate: function () { row.textContent = ln.slice(0, Math.round(o.n)); } }, at + i * .38);
      });
    }

    /* ---------- the shot ---------- */
    var close = discCloseUp();
    gsap.set(stage, { transformOrigin: close.ox + '% ' + close.oy + '%' });
    gsap.set(stage, { x: close.x, y: close.y, scale: close.scale });
    gsap.set($('.in-body'), { opacity: 0, clipPath: 'inset(100% 0 0 0)' });
    gsap.set($('.in-disc-art'), { opacity: 0 });
    gsap.set($('.in-ring .charge'), { strokeDashoffset: 100 });
    gsap.set($$('.in-flame i'), { scaleY: 0 });
    gsap.set($('.in-earth'), { yPercent: 100 });
    gsap.set($('.in-title'), { opacity: 0 });

    var flick = null;
    var tl = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: done });

    // 1. inside the circle: the programmer at work
    tl.addLabel('coder', 0)
      .from($('.in-coder'), { opacity: 0, duration: .9, ease: 'power2.out' }, 0)
      .fromTo($('.in-coder img'), { scale: 1.25 }, { scale: 1.05, duration: 2.6, ease: 'power1.out' }, 0)
      .from($('.in-hud'), { opacity: 0, y: 20, duration: .6 }, .3)
      .from($('.in-skip'), { opacity: 0, duration: .6 }, .6);
    typeCode(tl, .45);

    // 2. pull back: the circle is the bottom of the Techno Enjaz logo
    tl.addLabel('pull', 2.25)
      .to(stage, { x: 0, y: 0, scale: 1, duration: 1.7, ease: 'expo.inOut' }, 'pull')
      .to($('.in-code'), { opacity: 0, y: -10, duration: .5 }, 'pull')
      .to($('.in-body'), { opacity: 1, clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'expo.out' }, 'pull+=.75')
      .to($('.in-disc-art'), { opacity: 1, duration: .8, ease: 'power2.inOut' }, 'pull+=.9')
      .to($('.in-coder'), { opacity: .0, duration: .8 }, 'pull+=1.1')
      .from($('.in-pad'), { opacity: 0, scaleX: .2, duration: 1, ease: 'expo.out' }, 'pull+=1.1')
      .call(function () { setHud('READY · اضغط زر الإطلاق'); }, null, 'pull+=1.3');

    // 3. press the launch button: charge ring + countdown + rumble
    tl.addLabel('press', 4.15)
      .to($('.in-press'), { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2)' }, 'press-=.3')
      .to($('.in-press'), { scale: .7, opacity: 0, duration: .25, ease: 'power2.in' }, 'press')
      .to(disc, { scale: .84, duration: .14, ease: 'power2.in' }, 'press')
      .to(disc, { scale: 1, duration: .6, ease: 'elastic.out(1.2,.35)' }, 'press+=.14')
      .fromTo($('.in-disc-wave'), { scale: .6, opacity: .9 }, { scale: 2.6, opacity: 0, duration: .9, ease: 'expo.out' }, 'press')
      .to($('.in-disc-glow'), { opacity: 1, scale: 1.4, duration: .5, ease: 'power2.out' }, 'press')
      .to($('.in-ring .charge'), { strokeDashoffset: 0, duration: 1.5, ease: 'power1.in' }, 'press+=.1')
      .to(S, { smoke: .5, shake: 2.5, duration: 1.5, ease: 'power1.in' }, 'press+=.1')
      .call(function () { countdown('3'); }, null, 'press+=.1')
      .call(function () { countdown('2'); }, null, 'press+=.6')
      .call(function () { countdown('1'); }, null, 'press+=1.1');

    // 4. ignition
    tl.addLabel('ignite', 5.75)
      .call(function () { S.burst = 1; countdown(''); setHud('IGNITION'); startFlicker(); }, null, 'ignite')
      .fromTo($('.in-flash'), { opacity: 0 }, { opacity: .55, duration: .08, ease: 'none', yoyo: true, repeat: 1 }, 'ignite')
      .to($$('.in-flame i'), { scaleY: 1, duration: .35, ease: 'power3.out', stagger: .04 }, 'ignite')
      .to(S, { thrust: 1, shake: 9, smoke: 2.4, duration: .4, ease: 'power2.out' }, 'ignite')
      .fromTo($('.in-shock'), { scale: .2, opacity: 1 }, { scale: 4, opacity: 0, duration: 1.1, ease: 'expo.out' }, 'ignite')
      .to($('.in-ring'), { opacity: 0, duration: .4 }, 'ignite+=.2')
      .to($('.in-disc-glow'), { opacity: .6, duration: .4 }, 'ignite+=.2');

    // 5. lift-off and climb through the clouds
    tl.addLabel('lift', 6.25)
      .to(rocket, { y: function () { return -H * .12; }, duration: 1.2, ease: 'power2.in' }, 'lift')
      .to(S, { ground: function () { return H * 1.3; }, duration: 2.2, ease: 'power2.in' }, 'lift+=.4')
      .to($('.in-pad'), { y: function () { return H * 1.3; }, duration: 2.2, ease: 'power2.in' }, 'lift+=.4')
      .to(S, { smoke: 0, duration: .8 }, 'lift+=.6')
      .to($('.in-sky'), { yPercent: 80, opacity: 0, duration: 2.6, ease: 'power2.in' }, 'lift+=.2')
      .fromTo($('.in-clouds'), { yPercent: -70, scale: 1 }, { yPercent: 70, scale: 2.2, duration: 1.7, ease: 'power1.in' }, 'lift+=.9')
      .fromTo($('.in-clouds'), { opacity: 0 }, { opacity: 1, duration: .6, ease: 'power1.out', yoyo: true, repeat: 1, repeatDelay: .4 }, 'lift+=.9')
      .to(S, { starA: 1, climb: 1, duration: 1.4, ease: 'power2.in' }, 'lift+=1.1')
      .call(function () { setHud('ALT ↑'); altCounter(); }, null, 'lift+=.3')
      .to(S, { shake: 4, duration: 1.2 }, 'lift+=1.6');

    // 6. space: the Earth below, the rocket cruising
    tl.addLabel('space', 8.9)
      .to(S, { climb: .05, shake: 0, thrust: .35, duration: 1.4, ease: 'power3.out' }, 'space')
      .to($$('.in-flame i'), { scaleY: .45, duration: 1.2, ease: 'power3.out' }, 'space')
      .to($('.in-nebula'), { opacity: .32, duration: 2, ease: 'power2.out' }, 'space-=.3')
      .to($('.in-earth'), { yPercent: 0, duration: 2.2, ease: 'expo.out' }, 'space-=.2')
      .to(rocket, { y: function () { return -H * .06; }, rotate: -4, duration: 2.2, ease: 'sine.inOut' }, 'space')
      .to($('.in-title'), { opacity: 1, duration: .1 }, 'space+=.35')
      .from($$('.in-title .tw > span'), { yPercent: 120, opacity: 0, duration: 1, stagger: .06, ease: 'power4.out' }, 'space+=.35')
      .from($('.in-title p'), { opacity: 0, y: 14, letterSpacing: '.6em', duration: 1.1, ease: 'expo.out' }, 'space+=.8')
      .call(function () { setHud('ORBIT · 400 KM'); }, null, 'space+=.4');

    // 7. boost toward the camera; the site opens through the rocket
    tl.addLabel('open', 11.4)
      .to($('.in-title'), { opacity: 0, y: -30, duration: .5, ease: 'power2.in' }, 'open')
      .to($('.in-hud'), { opacity: 0, duration: .4 }, 'open')
      .to(rocket, { rotate: 0, y: 0, duration: .5, ease: 'power2.inOut' }, 'open')
      .to(S, { thrust: 1.2, warp: 1, starA: 1, duration: .9, ease: 'power2.in' }, 'open+=.2')
      .to(stage, { scale: 14, duration: 1.3, ease: 'expo.in' }, 'open+=.35')
      .to($('.in-earth'), { yPercent: 40, opacity: 0, duration: 1, ease: 'power2.in' }, 'open+=.3')
      .to(rocket, { filter: 'blur(6px) brightness(1.6)', duration: .8, ease: 'power2.in' }, 'open+=.8')
      .to($('.in-flash'), { opacity: 1, duration: .3, ease: 'power2.in' }, 'open+=.95')
      .to($('.in-flash'), { opacity: 0, duration: .7, ease: 'power2.out' }, 'open+=1.3')
      .fromTo(root, { '--iris': '0px' }, { '--iris': function () { return Math.hypot(W, H) * .75 + 'px'; }, duration: 1.2, ease: 'expo.out' }, 'open+=1.25')
      .call(openSite, null, 'open+=1.35');

    function setHud(t) { var el = $('.in-hud .tag'); if (el) el.textContent = t; }
    function countdown(t) {
      var c = $('.in-count'); c.textContent = t;
      if (t) gsap.fromTo(c, { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: .45, ease: 'expo.out' });
    }
    function altCounter() {
      var o = { v: 0 }, el = $('.in-alt');
      gsap.to(el, { opacity: 1, duration: .3 });
      gsap.to(o, { v: 400, duration: 2.8, ease: 'power2.in', onUpdate: function () { el.textContent = 'ALT ' + String(Math.round(o.v)).padStart(3, '0') + ' KM'; } });
    }
    function startFlicker() {
      flick = gsap.to($$('.in-flame i'), { scaleX: function () { return .85 + Math.random() * .3; }, opacity: function () { return .8 + Math.random() * .2; },
        duration: .06, repeat: -1, repeatRefresh: true, ease: 'none' });
    }
    function openSite() {
      if (opened) return; opened = true;
      root.classList.add('opening');
      if (opts.onOpen) opts.onOpen();
    }
    function done() {
      if (finished) return; finished = true;
      if (flick) flick.kill();
      openSite();
      w.removeEventListener('resize', size);
      root.remove();
      if (opts.onDone) opts.onDone();
    }

    // skip → jump straight to the boost
    $('.in-skip').addEventListener('click', function () {
      if (tl.time() < tl.labels.open) tl.seek('open').timeScale(1.4);
    });
    d.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { d.removeEventListener('keydown', esc); if (!finished) tl.seek('open').timeScale(1.4); } });
  };
})();
