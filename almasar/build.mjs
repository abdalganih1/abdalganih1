// Static site generator for almasar.org. `node build.mjs` → dist/
// 1) copies the original platform (original/) so the LMS app, admin and teacher panels keep working,
// 2) replaces the public pages with the new design, 3) prerenders a page per course and per article,
// 4) writes SEO/GEO files (sitemap.xml, robots.txt, llms.txt, llms-full.txt, _headers, _redirects).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { marked } from 'marked';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'dist');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const SITE = json('content/site.json');
const URL_ = SITE.url;
const GA_ID = (process.env.GA_ID || SITE.ga || '').trim();
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const FAQ = json('content/faq.json');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (h = '') => String(h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&#8220;|&#8221;/g, '"').replace(/&#8211;/g, '–').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, s.lastIndexOf(' ', n) > 40 ? s.lastIndexOf(' ', n) : n) + '…' : s);
const fmtDate = (d) => new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString('ar-SY-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const iso = (d) => new Date(d.replace(' ', 'T') + 'Z').toISOString();
const enc = (slug) => encodeURIComponent(slug);

/* ---------- data ---------- */
const courses = json('content/courses.json').results
  .filter((c) => !c.is_archived)
  .map((c) => ({ ...c, ...json(`content/course/${c.id}.json`) }))
  .map((c) => {
    const secs = c.lessons.reduce((a, l) => a + (l.duration_seconds || 0), 0);
    const intro = c.description.replace(/\*\*ماذا ستتعلم؟\*\*\s*/, '').split('\n')[0].trim();
    return { ...c, nLessons: c.lessons.length, hours: Math.max(1, Math.round(secs / 3600)), intro, url: `/courses/${c.id}/` };
  });
const TRACK_ORDER = [108, 105, 103, 102, 106, 104, 107, 109, 100, 101];
courses.sort((a, b) => TRACK_ORDER.indexOf(a.id) - TRACK_ORDER.indexOf(b.id));
const totalLessons = courses.reduce((a, c) => a + c.nLessons, 0);
const totalHours = courses.reduce((a, c) => a + c.hours, 0);

const posts = json('content/blog.json').results.map((p) => {
  const full = json(`content/post/${p.slug}.json`);
  return { ...p, ...full, tags: safeTags(full.tags), url: `/blog/${enc(p.slug)}/` };
}).sort((a, b) => (a.slug === 'welcome-to-masar' ? -1 : b.slug === 'welcome-to-masar' ? 1 : a.title.localeCompare(b.title, 'ar')));
function safeTags(t) { try { return JSON.parse(t || '[]'); } catch { return []; } }

// AI experiences + testimonials come from the platform's own registry (original/js/experiences.js)
const expSrc = read('original/js/experiences.js');
const EXPERIENCES = Function(`${expSrc}; return AI_EXPERIENCES;`)();
const TESTIMONIALS = Function(`${expSrc}; return typeof TESTIMONIALS !== 'undefined' ? TESTIMONIALS : [];`)();

/* ---------- output ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'original'), DIST, { recursive: true });
const out = (rel, body) => {
  const f = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
};

// hashed assets
const H = {};
function emit(src, name, transform) {
  let buf = fs.readFileSync(path.join(ROOT, src));
  if (transform) buf = Buffer.from(transform(buf.toString()));
  const h = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
  const ext = path.extname(name);
  const rel = `/assets/h/${name.slice(0, -ext.length)}.${h}${ext}`;
  out(rel, buf);
  return (H[name] = rel);
}
emit('src/styles.css', 'masar.css', (css) => read('src/fonts.css') + css);
emit('src/app.js', 'masar.js');
emit('src/intro.js', 'intro.js');
emit('node_modules/gsap/dist/gsap.min.js', 'gsap.js');
emit('node_modules/gsap/dist/ScrollTrigger.min.js', 'st.js');
emit('node_modules/lenis/dist/lenis.min.js', 'lenis.js');
if (GA_ID) emit('src/ga.js', 'ga.js', (s) => s.replaceAll('__GA_ID__', GA_ID));
fs.cpSync(path.join(ROOT, 'src/assets/fonts'), path.join(DIST, 'assets/fonts'), { recursive: true, filter: (f) => !f.endsWith('.css') });
fs.cpSync(path.join(ROOT, 'src/assets/gen'), path.join(DIST, 'assets/gen'), { recursive: true });
fs.cpSync(path.join(ROOT, 'src/assets/brand'), path.join(DIST, 'assets/brand'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/assets/brand/mark.svg'), path.join(DIST, 'favicon.svg'));

// theme bridge for the untouched app pages (course player, certificate, admin, teacher): new palette + fonts
const bridge = read('src/bridge.css');
for (const f of ['css/style.css', 'admin/admin.css']) {
  fs.appendFileSync(path.join(DIST, f), '\n' + read('src/fonts.css') + bridge);
}

/* ---------- partials ---------- */
const NAV = [
  ['/', 'الرئيسية'],
  ['/courses', 'الكورسات'],
  ['/experiences', 'التجارب الذكية'],
  ['/blog', 'المدونة'],
  ['/summaries', 'الملخصات'],
  ['/about', 'من نحن'],
];
const LOGO = `<svg class="logo-mark" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2fd3d9"/><stop offset="1" stop-color="#f7b955"/></linearGradient></defs><rect x=".75" y=".75" width="46.5" height="46.5" rx="13.5" fill="#0d1630" stroke="#2fd3d9" stroke-opacity=".35" stroke-width="1.5"/><path d="M12 38c0-9 8-9 12-14s1-12 12-12" fill="none" stroke="url(#lg)" stroke-width="4.2" stroke-linecap="round"/><circle cx="12" cy="38" r="3.2" fill="#2fd3d9"/><circle cx="36" cy="12" r="4.2" fill="#f7b955"/></svg>`;
const icon = (n) => `<svg class="i" aria-hidden="true"><use href="/assets/brand/icons.svg#${n}"/></svg>`;

function header(active) {
  return `<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
<header class="mh" id="mh">
  <div class="wrap mh-in">
    <a href="/" class="logo" aria-label="منصة مسار، الصفحة الرئيسية">${LOGO}<span class="logo-t">مسار<small>منصة تعليمية</small></span></a>
    <nav class="mh-nav" id="mhNav" aria-label="القائمة الرئيسية">
      <ul>${NAV.map(([h, t]) => `<li><a href="${h}"${h === active ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul>
      <div class="mh-auth" data-auth>
        <a href="/login" class="btn btn-g btn-sm">تسجيل الدخول</a>
        <a href="/register" class="btn btn-p btn-sm">ابدأ مجاناً</a>
      </div>
    </nav>
    <button class="mh-burger" id="mhBurger" aria-label="فتح القائمة" aria-expanded="false" aria-controls="mhNav"><span></span><span></span><span></span></button>
  </div>
</header>`;
}

function footer() {
  return `<footer class="mf">
  <div class="wrap">
    <div class="mf-top">
      <div class="mf-brand">
        <a href="/" class="logo">${LOGO}<span class="logo-t">مسار<small>منصة تعليمية</small></span></a>
        <p>منصة تعليمية عربية لإعداد جيل ريادي للمستقبل، واعٍ وقادر ومؤثر.</p>
        <a class="mf-app" href="/download">${icon('phone')}<span><b>تطبيق مسار لأندرويد</b><small>تعلّم بدون إنترنت</small></span></a>
      </div>
      <div class="mf-col"><h2>المنصة</h2><ul>
        <li><a href="/courses">كل الكورسات</a></li><li><a href="/experiences">التجارب الذكية</a></li>
        <li><a href="/summaries">ملخصات الكورسات</a></li><li><a href="/blog">المدونة</a></li><li><a href="/faq">الأسئلة الشائعة</a></li></ul></div>
      <div class="mf-col"><h2>مسارات</h2><ul>
        ${courses.slice(0, 5).map((c) => `<li><a href="${c.url}">${esc(c.title)}</a></li>`).join('')}</ul></div>
      <div class="mf-col"><h2>تواصل</h2><ul>
        <li><a href="mailto:${SITE.email}">${SITE.email}</a></li>
        <li><a href="tel:${SITE.phone}" dir="ltr">${SITE.phoneDisplay}</a></li>
        <li><a href="/about">من نحن</a></li><li><a href="/privacy">سياسة الخصوصية</a></li><li><a href="/terms">الشروط والأحكام</a></li></ul></div>
    </div>
    <div class="mf-bottom">
      <p>© ${new Date().getFullYear()} منصة مسار. جميع الحقوق محفوظة.</p>
      <p class="mf-lic">${icon('shield')} مرخّصة ومسجّلة في دولة الإمارات العربية المتحدة</p>
      <p><a href="/?intro" class="mf-intro">شاهد الانترو من جديد ✦</a></p>
    </div>
  </div>
</footer>`;
}

const ORG = {
  '@type': 'EducationalOrganization',
  '@id': `${URL_}/#org`,
  name: 'منصة مسار',
  alternateName: ['Masar', 'Almasar', 'مسار'],
  url: URL_,
  logo: `${URL_}/assets/brand/logo-512.png`,
  email: SITE.email,
  telephone: SITE.phone,
  foundingDate: SITE.founded,
  founder: { '@type': 'Person', name: 'عبد الغني الحمدي', alternateName: 'Abdalgani Alhamdi', url: 'https://abdalgani.com' },
  address: { '@type': 'PostalAddress', addressCountry: 'AE' },
  areaServed: 'Arab world',
  knowsLanguage: ['ar', 'en'],
  description: SITE.description,
  sameAs: ['https://abdalgani.com'],
};

function page({ file, path: p, title, desc, body, active, image, type = 'website', ld = [], dark = true, scripts = '', head = '', noindex = false, intro = false, crumbs }) {
  const url = URL_ + p;
  const og = image ? (image.startsWith('http') ? image : URL_ + image) : `${URL_}/assets/brand/og.jpg`;
  const graph = [ORG, { '@type': 'WebSite', '@id': `${URL_}/#site`, url: URL_, name: 'منصة مسار', inLanguage: 'ar', publisher: { '@id': `${URL_}/#org` },
    potentialAction: { '@type': 'SearchAction', target: `${URL_}/courses?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }, ...ld];
  if (crumbs) graph.push({ '@type': 'BreadcrumbList', itemListElement: [['الرئيسية', '/'], ...crumbs].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: URL_ + u })) });
  const html = `<!doctype html>
<html lang="ar" dir="rtl"${intro ? ' data-intro' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'}
<meta name="theme-color" content="#060a18">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/brand/logo-180.png">
<link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt">
<meta property="og:site_name" content="منصة مسار">
<meta property="og:locale" content="ar_AR">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${og}">
<link rel="preload" href="/assets/fonts/IBMPlexSansArabic-400-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/Alexandria-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${H['masar.css']}">
${head}
<script>${read('src/boot.js').trim()}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>
${GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script src="${H['ga.js']}"></script>` : ''}
</head>
<body class="${dark ? 'm-dark' : 'm-light'}">
${intro ? introMarkup() : ''}
${header(active)}
<main id="main">
${body}
</main>
${footer()}
<script src="${H['gsap.js']}" defer></script>
<script src="${H['st.js']}" defer></script>
<script src="${H['lenis.js']}" defer></script>
${intro ? `<script src="${H['intro.js']}" defer></script>` : ''}
<script src="${H['masar.js']}" defer></script>
${scripts}
</body>
</html>`;
  out(file, html);
  if (!noindex) sitemap.push({ loc: url, img: image ? og : null, lastmod: arguments[0].lastmod || BUILD_DATE, pri: arguments[0].pri || '0.7' });
}
const sitemap = [];

function introMarkup() {
  return `<div class="intro" id="intro" aria-hidden="true">
  <canvas class="intro-stars" id="introStars"></canvas>
  <svg class="intro-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2fd3d9"/><stop offset=".6" stop-color="#8be9e4"/><stop offset="1" stop-color="#f7b955"/></linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path id="introPath" d="M 820 1060 C 820 880, 220 900, 240 720 S 780 560, 760 420 S 300 300, 500 140" fill="none" stroke="url(#ig)" stroke-width="5" stroke-linecap="round" filter="url(#glow)"/>
    <g class="intro-st" data-at=".27"><circle r="10"/><circle class="ring" r="10"/></g>
    <g class="intro-st" data-at=".55"><circle r="10"/><circle class="ring" r="10"/></g>
    <g class="intro-st" data-at=".8"><circle r="10"/><circle class="ring" r="10"/></g>
    <circle id="introHead" r="9" fill="#fff" filter="url(#glow)"/>
  </svg>
  <div class="intro-words"><span>اكتشف ذاتك</span><span>حدّد مسارك</span><span>أبدع في حياتك</span></div>
  <div class="intro-brand"><div class="intro-logo">${LOGO}</div><div class="intro-name">مسار</div><div class="intro-sub">ريادة المستقبل تبدأ بخطوة</div></div>
  <button class="intro-skip" id="introSkip" type="button">تخطَّ الانترو</button>
</div>`;
}

/* ---------- shared blocks ---------- */
const img = (name, alt, cls = '', eager = false, sizes = '(max-width: 760px) 100vw, 50vw') =>
  `<img class="${cls}" src="/assets/gen/${name}.webp" srcset="/assets/gen/${name}-800.webp 800w, /assets/gen/${name}.webp 1600w" sizes="${sizes}" width="1600" height="900" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;

function courseCard(c, i = 0) {
  return `<a class="cc reveal" href="${c.url}" data-cat="${esc(c.category)}" data-title="${esc(c.title)}" style="--d:${(i % 3) * 0.08}s">
  <div class="cc-img"><img src="${esc(c.thumbnail_url)}" alt="${esc(c.title)}" loading="lazy" decoding="async" width="640" height="360" onerror="this.onerror=null;this.src='https://pub-f2c0b43b09ea4983a05bdb7998fafdf3.r2.dev/covers/general.png'"><span class="tag tag-free">مجاني</span></div>
  <div class="cc-body">
    <span class="cc-cat">${esc(c.category)}</span>
    <h3>${esc(c.title)}</h3>
    <p>${esc(clip(c.intro, 120))}</p>
    <div class="cc-meta"><span>${icon('play')} ${c.nLessons} درس</span><span>${icon('clock')} ${c.hours} ساعة</span></div>
  </div>
</a>`;
}

function postCard(p, i = 0) {
  return `<a class="pc reveal" href="${p.url}" style="--d:${(i % 3) * 0.08}s">
  <div class="pc-img">${img('post-' + p.slug, p.title, '', false, '(max-width: 760px) 100vw, 33vw')}</div>
  <div class="pc-body"><h3>${esc(p.title)}</h3><p>${esc(clip(strip(p.excerpt), 130))}</p><span class="pc-more">اقرأ المقال ${icon('arrow')}</span></div>
</a>`;
}

const expImg = { 'arduino-lab': 'experiences', anmat: 'cat-ai' };
function expCard(e, i = 0) {
  const c = courses.find((x) => x.id === e.courseId);
  return `<article class="xc reveal" style="--d:${i * 0.1}s">
  <div class="xc-img">${img(expImg[e.id] || 'cat-ai', e.title)}</div>
  <div class="xc-body"><span class="xc-ico" aria-hidden="true">${e.icon}</span>
    <h3>${esc(e.title)}</h3><p>${esc(e.description)}</p>
    <div class="xc-foot"><a class="btn btn-p btn-sm" href="${e.url}" target="_blank" rel="noopener">جرّب الآن ${icon('ext')}</a>${c ? `<a class="lnk" href="${c.url}">ضمن كورس: ${esc(c.title)}</a>` : ''}</div>
  </div>
</article>`;
}

function faqBlock(items, title = 'الأسئلة الشائعة') {
  return `<section class="sec" id="faq"><div class="wrap narrow">
  <div class="sec-h reveal"><span class="kick">أسئلة وأجوبة</span><h2 class="split">${title}</h2></div>
  <div class="faq">${items.map((f, i) => `<details class="reveal"${i === 0 ? ' open' : ''}><summary><h3>${esc(f.q)}</h3><span class="faq-x" aria-hidden="true"></span></summary><div class="faq-a"><p>${esc(f.a)}</p></div></details>`).join('')}</div>
</div></section>`;
}
const faqLd = (items) => ({ '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

const ctaBand = (t = 'ابدأ مسارك اليوم، مجاناً', s = 'أنشئ حسابك خلال دقيقة، واختر أول كورس، وابدأ رحلة اكتشاف دورك المناسب في الحياة.') => `<section class="cta"><div class="cta-bg">${img('cta', 'مجموعة من الشباب يسيرون على مسار مضيء نحو الشروق', '', false, '100vw')}</div>
<div class="wrap cta-in reveal"><h2 class="split">${t}</h2><p>${s}</p><div class="btns"><a href="/register" class="btn btn-p btn-lg magnetic">أنشئ حساباً مجانياً ${icon('arrow')}</a><a href="/courses" class="btn btn-g btn-lg">تصفّح الكورسات</a></div></div></section>`;

const pageHero = (kick, title, sub, imgName, alt) => `<section class="ph">
  ${imgName ? `<div class="ph-bg">${img(imgName, alt || title, '', true, '100vw')}</div>` : ''}
  <div class="wrap ph-in"><span class="kick reveal">${kick}</span><h1 class="split">${title}</h1>${sub ? `<p class="reveal">${sub}</p>` : ''}</div>
</section>`;

/* ---------- home ---------- */
{
  const goals = [
    ['01', 'اكتشف', 'discover', 'افهم ذاتك وقدراتك ومواهبك وميولك', 'نبدأ من الداخل: مسار ريادة المستقبل واختبار أنماط الذكي يساعدانك على فهم نقاط قوتك وطريقة تفكيرك، لتعرف من أين تبدأ.'],
    ['02', 'حدّد', 'define', 'اختر المسار الأنسب لرغباتك وظروفك', 'بعد ما تعرف نفسك، تختار مساراً متكاملاً ومترابطاً، أكاديمياً وعملياً، من البرمجة والأردوينو إلى مهارات الحاسوب وريادة الأعمال.'],
    ['03', 'أبدع', 'create', 'طبّق وابنِ وتميّز في موهبتك', 'تتعلّم بالتطبيق: دروس خطوة بخطوة، اختبارات تفاعلية، تجارب ذكية تحاكي الواقع، وشهادة إتمام تثبت ما أنجزته.'],
  ];
  const cats = [
    ['cat-programming', 'البرمجة والإلكترونيات', 'HTML وCSS وJavaScript وووردبريس والأردوينو', '/courses?category=برمجة'],
    ['cat-academic', 'أكاديمي ومهارات', 'ICDL ومهارات الحاسوب وتطوير الذات', '/courses?category=أكاديمي'],
    ['cat-track', 'منهاج المسار', `المسار الكامل: ${courses.length} كورسات متكاملة`, '/courses'],
    ['cat-ai', 'التجارب الذكية', 'تعلّم تفاعلي بالذكاء الاصطناعي', '/experiences'],
  ];
  const why = [
    ['video', 'فيديوهات واضحة ومفصّلة', 'شرح عملي خطوة بخطوة، وكل درس مبني على الذي قبله.'],
    ['phone', 'تعلّم من أي مكان', 'على الويب، وعلى تطبيق أندرويد يشغّل دروسك بدون إنترنت.'],
    ['award', 'شهادات إتمام', 'شهادة باسمك برقم فريد ورمز QR يمكن التحقق منها.'],
    ['spark', 'اختبارات ومساعد ذكي', 'اختبارات تفاعلية بعد الدروس ومساعد يجيب عن أسئلتك.'],
    ['gift', 'مجاني بالكامل', 'كل الكورسات المنشورة حالياً مجانية، ومعها منح ورموز خصم.'],
    ['chat', 'دعم مباشر', 'فريق جاهز للإجابة على استفساراتك عبر البريد والهاتف.'],
  ];
  const body = `
<section class="hero" id="top">
  <div class="hero-bg" data-parallax>${img('hero', 'طالب يقف على تلة عند الفجر ينظر إلى مسار مضيء يمتد نحو مدينة من الضوء', '', true, '100vw')}</div>
  <svg class="hero-path" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 700 C 260 640, 300 420, 560 460 S 900 300, 1220 120" pathLength="1"/></svg>
  <div class="wrap hero-in">
    <span class="kick hero-kick">منصة تعليمية عربية · ريادة المستقبل</span>
    <h1 class="hero-t"><span class="w">كيف</span> <span class="w hl">تحدّد</span> <span class="w hl">وتكتشف</span> <span class="w hl">وتبدع</span><br><span class="w">في</span> <span class="w">مسار</span> <span class="w">حياتك</span></h1>
    <p class="hero-s">لإعداد جيل ريادي للمستقبل، واعٍ وقادر ومؤثر، ينطلق من فهم ذاته والتفوّق في موهبته واكتشاف دوره المناسب في الحياة.</p>
    <div class="btns hero-b"><a href="/register" class="btn btn-p btn-lg magnetic">ابدأ مسارك مجاناً ${icon('arrow')}</a><a href="#journey" class="btn btn-g btn-lg">كيف يعمل المسار؟</a></div>
    <dl class="stats hero-st">
      <div><dt>كورس متكامل</dt><dd><b data-count="${courses.length}">${courses.length}</b></dd></div>
      <div><dt>درس مسجّل</dt><dd><b data-count="${totalLessons}">${totalLessons}</b>+</dd></div>
      <div><dt>ساعة تعليمية</dt><dd><b data-count="${totalHours}">${totalHours}</b>+</dd></div>
      <div><dt>مجاني</dt><dd><b data-count="100">100</b>%</dd></div>
    </dl>
  </div>
  <a class="hero-scroll" href="#journey" aria-label="انزل للأسفل"><span></span></a>
</section>

<section class="journey" id="journey">
  <div class="wrap">
    <div class="sec-h reveal"><span class="kick">رحلتك على المسار</span><h2 class="split">ثلاث محطات تصنع الفرق</h2><p>مسار ليس مجرد كورسات، بل منهجية تأخذك من فهم ذاتك إلى الإبداع في دورك.</p></div>
  </div>
  <div class="jr" id="jr">
    <svg class="jr-line" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true"><path class="jr-base" d="M50 0 C 90 160, 10 330, 50 500 S 90 840, 50 1000"/><path class="jr-glow" id="jrGlow" d="M50 0 C 90 160, 10 330, 50 500 S 90 840, 50 1000" pathLength="1"/></svg>
    ${goals.map(([n, t, im, h, p], i) => `<article class="st st-${i % 2 ? 'b' : 'a'}">
      <div class="st-img reveal-img">${img(im, h)}</div>
      <div class="st-txt reveal"><span class="st-n">${n}</span><h3><span>${t}</span>${h}</h3><p>${p}</p></div>
      <span class="st-dot" aria-hidden="true"></span>
    </article>`).join('')}
  </div>
</section>

<section class="sec" id="categories"><div class="wrap">
  <div class="sec-h reveal"><span class="kick">التصنيفات</span><h2 class="split">اختر المجال اللي بيشبهك</h2></div>
  <div class="cats">${cats.map(([im, t, s, h], i) => `<a class="cat reveal" href="${h}" style="--d:${i * 0.08}s">${img(im, t, '', false, '(max-width: 760px) 100vw, 25vw')}<span class="cat-t"><b>${t}</b><small>${s}</small></span><span class="cat-go">${icon('arrow')}</span></a>`).join('')}</div>
</div></section>

<section class="sec sec-alt" id="courses"><div class="wrap">
  <div class="sec-h sec-h-row reveal"><div><span class="kick">الكورسات</span><h2 class="split">ابدأ من أي محطة</h2></div><a class="lnk" href="/courses">كل الكورسات ${icon('arrow')}</a></div>
  <div class="rail" data-rail><div class="rail-track">${courses.map(courseCard).join('')}</div></div>
  <div class="rail-nav"><button type="button" data-rail-prev aria-label="السابق">${icon('arrow')}</button><button type="button" data-rail-next aria-label="التالي">${icon('arrow')}</button></div>
</div></section>

<section class="sec vision"><div class="wrap">
  <div class="sec-h reveal"><span class="kick">ريادة المستقبل</span><h2 class="split">رؤيتنا ورسالتنا وأهدافنا</h2></div>
  <div class="vm">
    <article class="vm-c reveal"><span class="vm-i">${icon('eye')}</span><h3>رؤيتنا</h3><p>إعداد جيل ريادي للمستقبل واعٍ وقادر ومؤثر، منطلقاً من فهم ذاته والتفوق في موهبته، ومن خلال اكتشاف دوره المناسب في الحياة.</p></article>
    <article class="vm-c reveal" style="--d:.1s"><span class="vm-i">${icon('rocket')}</span><h3>رسالتنا</h3><p>إعداد أجيال ريادية متخصصة بمساراتها، ومؤثرة ومتمكنة من مهاراتها، لإعمار الأوطان والرقي في الإنسان والريادة في كل مكان.</p></article>
    <article class="vm-c vm-goals reveal" style="--d:.2s"><span class="vm-i">${icon('target')}</span><h3>أهدافنا</h3><ol>
      <li>تحديد المسار بناءً على قدرات الريادي ومواهبه وميوله</li><li>اختيار المسار الأنسب وفق رغبات وظروف الريادي</li>
      <li>حضور مسار متكامل مترابط احترافي أكاديمي وعملي</li><li>رفده بأدوات ومهارات إبداعية وفكرية لبناء المنهجية الريادية</li></ol></article>
  </div>
</div></section>

<section class="sec sec-alt" id="experiences"><div class="wrap">
  <div class="sec-h sec-h-row reveal"><div><span class="kick">التجارب الذكية</span><h2 class="split">طبّق ما تتعلمه فوراً</h2><p>تجارب تفاعلية بالذكاء الاصطناعي مرتبطة بمسارات المنصة، تعمل من المتصفح مباشرة.</p></div><a class="lnk" href="/experiences">كل التجارب ${icon('arrow')}</a></div>
  <div class="xgrid">${EXPERIENCES.map(expCard).join('')}</div>
</div></section>

<section class="sec" id="why"><div class="wrap">
  <div class="sec-h reveal"><span class="kick">لماذا مسار؟</span><h2 class="split">تجربة تعليمية مصمّمة لتكمل</h2></div>
  <div class="why">${why.map(([ic, t, s], i) => `<div class="why-c reveal" style="--d:${(i % 3) * 0.08}s"><span class="why-i">${icon(ic)}</span><h3>${t}</h3><p>${s}</p></div>`).join('')}</div>
</div></section>

<section class="app-band"><div class="wrap app-in">
  <div class="app-txt reveal"><span class="kick">تطبيق أندرويد</span><h2 class="split">دروسك بجيبك، حتى بدون إنترنت</h2><p>حمّل الدروس وشاهدها أوفلاين، تابع تقدّمك، واسأل المساعد الذكي عن أي درس. مجاني 100%.</p>
    <div class="btns"><a class="btn btn-p btn-lg" href="/download">${icon('download')} حمّل التطبيق</a><a class="btn btn-g btn-lg" href="/register">أو تعلّم من الويب</a></div></div>
  <div class="app-img reveal-img">${img('app', 'هاتف ذكي يعرض تطبيق تعلّم بدروس فيديو')}</div>
</div></section>

${TESTIMONIALS.length ? `<section class="sec" id="testimonials"><div class="wrap">
  <div class="sec-h reveal"><span class="kick">آراء المتعلمين</span><h2 class="split">ماذا يقول طلابنا؟</h2></div>
  <div class="tst">${TESTIMONIALS.map((t, i) => `<figure class="tst-c reveal" style="--d:${i * 0.1}s"><span class="tst-q" aria-hidden="true">”</span><blockquote>${esc(t.text)}</blockquote><figcaption><span class="tst-a">${esc((t.name || '؟').trim().charAt(0))}</span><span><b>${esc(t.name)}</b><small>${esc(t.role)}</small></span></figcaption></figure>`).join('')}</div>
</div></section>` : ''}

<section class="sec sec-alt" id="blog"><div class="wrap">
  <div class="sec-h sec-h-row reveal"><div><span class="kick">من المدونة</span><h2 class="split">أفكار تضيء طريقك</h2></div><a class="lnk" href="/blog">كل المقالات ${icon('arrow')}</a></div>
  <div class="pgrid">${posts.filter((p) => p.slug !== 'welcome-to-masar').slice(0, 3).map(postCard).join('')}</div>
</div></section>

${faqBlock(FAQ.slice(0, 6))}

<section class="sec en" lang="en" dir="ltr"><div class="wrap narrow reveal">
  <h2>About Masar</h2>
  <p><strong>Masar</strong> (almasar.org) is an Arabic-first, AI-native learning platform founded in 2026 by engineer Abdalgani Alhamdi and registered in the United Arab Emirates. It helps Arab learners discover and pursue their ideal path: ${courses.length} free structured courses with ${totalLessons}+ video and text lessons (≈${totalHours} hours), completion certificates with QR verification, an offline-capable Android app, and interactive AI learning experiences such as a 3D Arduino circuit simulator and an AI personality assessment.</p>
  <p class="en-meta">Founded 2026 · UAE-registered · <a href="mailto:${SITE.email}">${SITE.email}</a> · <a href="tel:${SITE.phone}">${SITE.phoneDisplay}</a></p>
</div></section>

${ctaBand()}`;
  page({ file: 'index.html', path: '/', title: 'منصة مسار | كيف تحدد وتكتشف وتبدع في مسار حياتك', desc: SITE.description, body, active: '/', intro: true, pri: '1.0',
    ld: [faqLd(FAQ.slice(0, 6)), { '@type': 'ItemList', name: 'كورسات منصة مسار', itemListElement: courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: URL_ + c.url, name: c.title })) }] });
}

/* ---------- courses list ---------- */
{
  const cats = [...new Set(courses.map((c) => c.category))];
  const body = `${pageHero('الكورسات', 'كل الكورسات، مجاناً', `${courses.length} كورسات و${totalLessons}+ درس في البرمجة والأردوينو ومهارات الحاسوب وريادة المستقبل. اختر محطتك وابدأ.`, 'cat-track', 'مسار جبلي مضيء بعلامات طريق')}
<section class="sec"><div class="wrap">
  <div class="filters reveal" role="toolbar" aria-label="تصفية الكورسات">
    <button type="button" class="chip is-on" data-filter="">الكل <small>${courses.length}</small></button>
    ${cats.map((c) => `<button type="button" class="chip" data-filter="${esc(c)}">${esc(c)} <small>${courses.filter((x) => x.category === c).length}</small></button>`).join('')}
    <label class="search"><span class="sr">ابحث عن كورس</span>${icon('search')}<input type="search" id="courseSearch" placeholder="ابحث عن كورس…" autocomplete="off"></label>
  </div>
  <div class="cgrid" id="cgrid">${courses.map(courseCard).join('')}</div>
  <p class="empty" id="cEmpty" hidden>ما في كورس بهالاسم حالياً. جرّب كلمة تانية.</p>
</div></section>
${ctaBand()}`;
  page({ file: 'courses.html', path: '/courses', title: 'كل الكورسات المجانية | منصة مسار', desc: `${courses.length} كورسات مجانية على منصة مسار: HTML وCSS وJavaScript وووردبريس والأردوينو وICDL وريادة المستقبل، ${totalLessons}+ درس مع شهادات إتمام.`, body, active: '/courses', crumbs: [['الكورسات', '/courses']], pri: '0.9',
    ld: [{ '@type': 'ItemList', itemListElement: courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: URL_ + c.url })) }] });
}

/* ---------- course landing pages ---------- */
for (const c of courses) {
  const descHtml = marked.parse(c.description.replace(/\*\*ماذا ستتعلم؟\*\*\s*/, ''));
  const exp = EXPERIENCES.find((e) => e.courseId === c.id);
  const related = courses.filter((x) => x.id !== c.id && x.category === c.category).slice(0, 3);
  const app = `/course?id=${c.id}`;
  const curriculum = c.lessons.map((l, i) => `<li><span class="ls-n">${String(i + 1).padStart(2, '0')}</span><span class="ls-t">${esc(l.title)}</span><span class="ls-m">${l.type === 'video' ? icon('play') : icon('doc')}${l.duration_seconds ? Math.max(1, Math.round(l.duration_seconds / 60)) + ' د' : 'نص'}</span></li>`).join('');
  const body = `<section class="ch">
  <div class="ch-bg"><img src="${esc(c.thumbnail_url)}" alt="" aria-hidden="true" fetchpriority="high"></div>
  <div class="wrap ch-in">
    <nav class="crumbs reveal" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span>/</span><a href="/courses">الكورسات</a><span>/</span><span aria-current="page">${esc(c.title)}</span></nav>
    <div class="ch-grid">
      <div>
        <span class="kick reveal">${esc(c.category)} · مجاني</span>
        <h1 class="split">${esc(c.title)}</h1>
        <p class="ch-lead reveal">${esc(c.intro)}</p>
        <dl class="ch-facts reveal"><div><dt>الدروس</dt><dd>${c.nLessons}</dd></div><div><dt>المدة</dt><dd>${c.hours} ساعة</dd></div><div><dt>المستوى</dt><dd>من الصفر</dd></div><div><dt>الشهادة</dt><dd>شهادة إتمام</dd></div></dl>
        <div class="btns reveal"><a class="btn btn-p btn-lg magnetic" href="${app}">ابدأ الكورس مجاناً ${icon('arrow')}</a><a class="btn btn-g btn-lg" href="#curriculum">محتوى الكورس</a></div>
      </div>
      <figure class="ch-cover reveal-img"><img src="${esc(c.thumbnail_url)}" alt="غلاف كورس ${esc(c.title)}" width="640" height="360"></figure>
    </div>
  </div>
</section>
<section class="sec"><div class="wrap ch-body">
  <article class="prose reveal">
    <h2>ماذا ستتعلم؟</h2>${descHtml}
    <p>يقدّم هذا الكورس ${esc(c.instructor || 'فريق مسار')} ضمن منهاج منصة مسار التعليمية، ويضم ${c.nLessons} درساً بمدة تقارب ${c.hours} ساعة، ويمكنك متابعته من الويب أو من تطبيق مسار على أندرويد حتى بدون إنترنت.</p>
    ${exp ? `<div class="callout"><span>${exp.icon}</span><div><b>تجربة ذكية مرتبطة بالكورس: ${esc(exp.title)}</b><p>${esc(exp.description)}</p><a href="${exp.url}" target="_blank" rel="noopener" class="lnk">جرّبها الآن ${icon('ext')}</a></div></div>` : ''}
  </article>
  <aside class="ch-side reveal">
    <h2>تفاصيل الكورس</h2>
    <ul><li>${icon('play')} ${c.nLessons} درس</li><li>${icon('clock')} ${c.hours} ساعة تقريباً</li><li>${icon('award')} شهادة إتمام قابلة للتحقق</li><li>${icon('phone')} يعمل على تطبيق أندرويد</li><li>${icon('gift')} مجاني بالكامل</li></ul>
    <a class="btn btn-p btn-block" href="${app}">سجّل وابدأ الآن</a>
  </aside>
</div></section>
<section class="sec sec-alt" id="curriculum"><div class="wrap narrow">
  <div class="sec-h reveal"><span class="kick">محتوى الكورس</span><h2 class="split">${c.nLessons} درس خطوة بخطوة</h2></div>
  <ol class="lessons reveal">${curriculum}</ol>
  <div class="center"><a class="btn btn-p btn-lg" href="${app}">ابدأ الدرس الأول ${icon('arrow')}</a></div>
</div></section>
${related.length ? `<section class="sec"><div class="wrap"><div class="sec-h reveal"><span class="kick">تابع مسارك</span><h2 class="split">كورسات قريبة</h2></div><div class="cgrid">${related.map(courseCard).join('')}</div></div></section>` : ''}
${ctaBand('جاهز تبدأ هذا الكورس؟', 'أنشئ حسابك المجاني وابدأ الدرس الأول الآن، وتابع تقدّمك حتى الشهادة.')}`;
  page({ file: `courses/${c.id}/index.html`, path: c.url, title: `${c.title} | كورس مجاني على منصة مسار`, desc: clip(`${c.intro} ${c.nLessons} درساً مجانياً مع شهادة إتمام.`, 158), body, active: '/courses', image: c.thumbnail_url,
    crumbs: [['الكورسات', '/courses'], [c.title, c.url]], pri: '0.8', lastmod: (c.created_at || '').slice(0, 10) > BUILD_DATE ? BUILD_DATE : BUILD_DATE,
    ld: [{ '@type': 'Course', '@id': URL_ + c.url + '#course', name: c.title, description: c.intro, url: URL_ + c.url, image: c.thumbnail_url, inLanguage: 'ar',
      provider: { '@id': `${URL_}/#org` }, isAccessibleForFree: true, educationalLevel: 'Beginner', numberOfCredits: c.nLessons,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', category: 'Free', availability: 'https://schema.org/InStock', url: URL_ + c.url },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: `PT${c.hours}H`, instructor: { '@type': 'Person', name: c.instructor || 'أستاذ المسار' } },
      syllabusSections: c.lessons.slice(0, 30).map((l) => ({ '@type': 'Syllabus', name: l.title, ...(l.duration_seconds ? { timeRequired: `PT${Math.max(1, Math.round(l.duration_seconds / 60))}M` } : {}) })) }] });
}

/* ---------- blog ---------- */
function cleanPost(html) {
  let h = html;
  h = h.replace(/\sclass="[^"]*"/g, '').replace(/\sstyle="[^"]*"/g, '');
  h = h.replace(/https:\/\/web\.archive\.org\/web\/\d+\//g, '');
  // youtube links on their own paragraph → privacy-friendly lite embed
  const seen = new Set();
  h = h.replace(/<p>\s*(?:<a[^>]*>)?\s*https?:\/\/(?:youtu\.be\/|www\.youtube\.com\/watch\?v=)([\w-]{11})[^<]*(?:<\/a>)?\s*(?:(?:<a[^>]*>)?\s*https?:\/\/youtu\.be\/[\w-]{11}[^<]*(?:<\/a>)?\s*)*<\/p>/g, (_, id) => {
    if (seen.has(id)) return '';
    seen.add(id);
    return `<div class="yt" data-yt="${id}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="فيديو مرتبط بالمقال" loading="lazy" width="480" height="360"><button type="button" aria-label="تشغيل الفيديو">${icon('play')}</button></div>`;
  });
  // old WordPress uploads are gone → drop those figures/images
  h = h.replace(/<figure[^>]*>\s*<img[^>]*almasar\.org\/wp-content[^>]*>[\s\S]*?<\/figure>/g, '').replace(/<img[^>]*wp-content[^>]*>/g, '');
  // heading levels: article title is h1, so normalise h5/h6 → h4 and shift h2.. appropriately
  h = h.replace(/<(\/?)h[56]>/g, '<$1h4>');
  h = h.replace(/<p>\s*(&nbsp;)?\s*<\/p>/g, '').replace(/\n{3,}/g, '\n');
  h = h.replace(/<table/g, '<div class="tbl"><table').replace(/<\/table>/g, '</table></div>');
  return h;
}
{
  const body = `${pageHero('المدونة', 'أفكار تضيء طريقك', 'مقالات في التخطيط والإبداع والذكاء الاصطناعي ومهارات العمل وتطوير الذات.', 'discover')}
<section class="sec"><div class="wrap"><div class="pgrid">${posts.map(postCard).join('')}</div></div></section>${ctaBand()}`;
  page({ file: 'blog.html', path: '/blog', title: 'المدونة | منصة مسار', desc: 'مدونة منصة مسار: مقالات في التخطيط الاستراتيجي الشخصي والإبداع والذكاء الاصطناعي والتعليم الذاتي ومهارات الاتصال وصنع القرار.', body, active: '/blog', crumbs: [['المدونة', '/blog']], pri: '0.8',
    ld: [{ '@type': 'Blog', '@id': `${URL_}/blog#blog`, name: 'مدونة منصة مسار', url: `${URL_}/blog`, publisher: { '@id': `${URL_}/#org` }, blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: URL_ + p.url })) }] });
}
for (const p of posts) {
  const content = cleanPost(p.content_html || '');
  const words = strip(content).split(' ').length;
  const mins = Math.max(1, Math.round(words / 180));
  const desc = clip(strip(p.excerpt || content), 155);
  const others = posts.filter((x) => x.slug !== p.slug && x.slug !== 'welcome-to-masar').slice(0, 3);
  const updated = (p.updated_at || p.created_at);
  const body = `<article class="art">
  <header class="art-h">
    <div class="art-bg">${img('post-' + p.slug, p.title, '', true, '100vw')}</div>
    <div class="wrap narrow art-hin">
      <nav class="crumbs reveal" aria-label="مسار التنقل"><a href="/">الرئيسية</a><span>/</span><a href="/blog">المدونة</a></nav>
      <h1 class="split">${esc(p.title)}</h1>
      <p class="art-meta reveal"><span>${icon('user')} ${esc(p.author_name || 'فريق مسار')}</span><span>${icon('clock')} ${mins} دقائق قراءة</span><time datetime="${iso(updated)}">${icon('cal')} ${fmtDate(updated)}</time></p>
    </div>
  </header>
  <div class="wrap narrow"><div class="prose art-body">${content}</div>
    ${p.tags.length ? `<p class="tags">${p.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</p>` : ''}
    <div class="art-share"><span>شارك المقال:</span><a href="https://wa.me/?text=${enc(p.title + ' ' + URL_ + p.url)}" target="_blank" rel="noopener">واتساب</a><a href="https://twitter.com/intent/tweet?url=${enc(URL_ + p.url)}&text=${enc(p.title)}" target="_blank" rel="noopener">X</a><a href="https://www.facebook.com/sharer/sharer.php?u=${enc(URL_ + p.url)}" target="_blank" rel="noopener">فيسبوك</a><a href="https://www.linkedin.com/sharing/share-offsite/?url=${enc(URL_ + p.url)}" target="_blank" rel="noopener">لينكدإن</a></div>
  </div>
</article>
<section class="sec sec-alt"><div class="wrap"><div class="sec-h reveal"><span class="kick">تابع القراءة</span><h2 class="split">مقالات أخرى</h2></div><div class="pgrid">${others.map(postCard).join('')}</div></div></section>
${ctaBand('حوّل الفكرة إلى مسار', 'المقالات بداية، والمسارات على منصة مسار تأخذك خطوة بخطوة للتطبيق.')}`;
  page({ file: `blog/${p.slug}/index.html`, path: p.url, title: `${p.title} | مدونة منصة مسار`, desc, body, active: '/blog', image: `/assets/gen/post-${p.slug}.webp`, type: 'article', lastmod: iso(updated).slice(0, 10),
    head: `<meta property="article:published_time" content="${iso(p.created_at)}"><meta property="article:modified_time" content="${iso(updated)}">`,
    crumbs: [['المدونة', '/blog'], [p.title, p.url]],
    ld: [{ '@type': 'BlogPosting', '@id': URL_ + p.url + '#post', headline: p.title, description: desc, image: `${URL_}/assets/gen/post-${p.slug}.webp`, url: URL_ + p.url, mainEntityOfPage: URL_ + p.url,
      datePublished: iso(p.created_at), dateModified: iso(updated), inLanguage: 'ar', wordCount: words, keywords: p.tags.join(', ') || undefined,
      author: { '@type': 'Organization', name: p.author_name || 'فريق مسار', url: URL_ }, publisher: { '@id': `${URL_}/#org` } }] });
}
// old dynamic article URL (post.html?slug=…) → clean URL, client-side as a fallback to the Pages Function 301
out('post.html', `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>مدونة منصة مسار</title><link rel="canonical" href="${URL_}/blog"><script>var s=new URLSearchParams(location.search).get('slug');location.replace(s?'/blog/'+encodeURIComponent(s)+'/':'/blog');</script></head><body><a href="/blog">المدونة</a></body></html>`);

/* ---------- experiences ---------- */
{
  const body = `${pageHero('التجارب الذكية', 'تعلّم بالتجربة، مع الذكاء الاصطناعي', 'أدوات تفاعلية مبنية بالذكاء الاصطناعي ومربوطة بكورسات المنصة، تعمل من المتصفح مباشرة بلا أدوات ولا تجهيزات.', 'experiences')}
<section class="sec"><div class="wrap"><div class="xgrid">${EXPERIENCES.map(expCard).join('')}</div>
<div class="note reveal">${icon('spark')}<p>كل تجربة مرتبطة بمحطة «هدف قريب» داخل مسار الكورس: تتعلّم الدرس، ثم تطبّقه فوراً في محاكاة حيّة.</p></div></div></section>${ctaBand()}`;
  page({ file: 'experiences.html', path: '/experiences', title: 'التجارب الذكية: مختبر الأردوينو واختبار أنماط | منصة مسار', desc: 'تجارب تعلم تفاعلية بالذكاء الاصطناعي من منصة مسار: مختبر أردوينو ثلاثي الأبعاد لتصميم الدارات وتشغيل الكود، واختبار أنماط لتحليل الشخصية.', body, active: '/experiences', crumbs: [['التجارب الذكية', '/experiences']],
    ld: EXPERIENCES.map((e) => ({ '@type': 'WebApplication', name: e.title, description: e.description, url: e.url, applicationCategory: 'EducationalApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' }, provider: { '@id': `${URL_}/#org` } })) });
}

/* ---------- about ---------- */
{
  const body = `${pageHero('من نحن', 'قصة منصة مسار', 'منصة عربية وُلدت من فكرة بسيطة: أن يجد المتعلم العربي مساراً مبنياً بإتقان.', 'about', 'مهندس يعلّم مجموعة من الطلاب')}
<section class="sec"><div class="wrap ab">
  <article class="prose reveal"><h2>قصتنا</h2>
    <p>انطلقت منصة مسار عام 2026 على يد <strong>المهندس عبد الغني الحمدي</strong>، مطوّر ويب ومدرّب تقني، بفكرة واضحة: أن يجد المتعلم العربي مساراً تعليمياً مبنياً بإتقان، فيه محتوى عربي أصيل، وشرح عملي مباشر، وأدوات تطبيق حديثة، بدل التشتت بين المصادر المترجمة والمحتوى المتفرق.</p>
    <p>اليوم تضم المنصة ${courses.length} كورسات و${totalLessons}+ درساً موزعة على مسارات البرمجة وتطوير الويب والأردوينو ومهارات الحاسوب والريادة، مع تطبيق أندرويد يعمل حتى بدون إنترنت، وتجارب تفاعلية مبنية بالذكاء الاصطناعي تطبّق ما يتعلمه الطالب لحظياً.</p>
  </article>
  <dl class="stats stats-card reveal"><div><dt>سنة التأسيس</dt><dd><b>2026</b></dd></div><div><dt>كورس</dt><dd><b data-count="${courses.length}">${courses.length}</b></dd></div><div><dt>درس</dt><dd><b data-count="${totalLessons}">${totalLessons}</b>+</dd></div><div><dt>ساعة</dt><dd><b data-count="${totalHours}">${totalHours}</b>+</dd></div></dl>
</div></section>
<section class="sec sec-alt"><div class="wrap"><div class="vm">
  <article class="vm-c reveal"><span class="vm-i">${icon('eye')}</span><h3>رؤيتنا</h3><p>إعداد جيل ريادي للمستقبل واعٍ وقادر ومؤثر، منطلقاً من فهم ذاته والتفوق في موهبته، ومن خلال اكتشاف دوره المناسب في الحياة.</p></article>
  <article class="vm-c reveal" style="--d:.1s"><span class="vm-i">${icon('rocket')}</span><h3>رسالتنا</h3><p>إعداد أجيال ريادية متخصصة بمساراتها، ومؤثرة ومتمكنة من مهاراتها، لإعمار الأوطان والرقي في الإنسان والريادة في كل مكان.</p></article>
  <article class="vm-c reveal" style="--d:.2s"><span class="vm-i">${icon('user')}</span><h3>المؤسس</h3><p>المهندس عبد الغني الحمدي، مطوّر ويب ومدرّب تقني، صاحب قناة Abdalgani Alhamdi التعليمية، ومؤسس منصة مسار ومساراتها التعليمية. <a class="lnk" href="https://abdalgani.com" rel="noopener">abdalgani.com</a></p></article>
</div></div></section>
<section class="sec"><div class="wrap narrow"><div class="legal-card reveal"><h2>${icon('shield')} الكيان القانوني</h2>
  <p>تُدار منصة مسار بكيان مؤسسي خاص مرخّص من دولة الإمارات العربية المتحدة، وتمارس نشاطها التعليمي والتدريبي الإلكتروني عبر الموقع الرسمي almasar.org وتطبيقها الرسمي.</p>
  <dl class="kv"><div><dt>سنة التأسيس</dt><dd>2026</dd></div><div><dt>المؤسس والمدير</dt><dd>م. عبد الغني الحمدي</dd></div><div><dt>النشاط</dt><dd>تعليم إلكتروني وتدريب تقني</dd></div><div><dt>الترخيص</dt><dd>مرخّصة من دولة الإمارات العربية المتحدة</dd></div><div><dt>الخدمة</dt><dd>عن بُعد لكل الدول العربية</dd></div><div><dt>التواصل</dt><dd><a href="mailto:${SITE.email}">${SITE.email}</a> · <a href="tel:${SITE.phone}" dir="ltr">${SITE.phoneDisplay}</a></dd></div></dl>
</div></div></section>
<section class="sec en" lang="en" dir="ltr"><div class="wrap narrow reveal"><h2>About Masar</h2><p><strong>Masar</strong> (almasar.org) is an Arabic, AI-native learning platform founded in 2026 by engineer Abdalgani Alhamdi and registered in the UAE. We help Arab learners discover their ideal path through structured learning tracks, completion certificates, an offline-capable Android app and interactive AI learning experiences, including a 3D Arduino circuit simulator and an AI-powered personality assessment.</p></div></section>
${ctaBand('جاهز تبدأ مسارك؟', `انضم للمتعلمين على منصة مسار، وابدأ من أي كورس من ${courses.length} كورسات مجانية.`)}`;
  page({ file: 'about.html', path: '/about', title: 'من نحن: قصة منصة مسار ورسالتها | منصة مسار', desc: 'تعرّف على منصة مسار: منصة تعليمية عربية أسسها المهندس عبد الغني الحمدي عام 2026، مرخّصة في الإمارات، لإعداد جيل ريادي واعٍ وقادر ومؤثر.', body, active: '/about', crumbs: [['من نحن', '/about']],
    ld: [{ '@type': 'AboutPage', url: `${URL_}/about`, name: 'من نحن', about: { '@id': `${URL_}/#org` } }] });
}

/* ---------- FAQ ---------- */
page({ file: 'faq.html', path: '/faq', title: 'الأسئلة الشائعة | منصة مسار', desc: 'إجابات عن أكثر الأسئلة شيوعاً حول منصة مسار: الكورسات المجانية، الشهادات، تطبيق أندرويد، التجارب الذكية، وكيف تختار مسارك.', active: '',
  body: `${pageHero('مركز المساعدة', 'الأسئلة الشائعة', 'كل ما تحتاج تعرفه عن منصة مسار قبل ما تبدأ.', '')}${faqBlock(FAQ, 'كل ما تسأل عنه')}${ctaBand()}`, crumbs: [['الأسئلة الشائعة', '/faq']], ld: [faqLd(FAQ)] });

/* ---------- summaries ---------- */
{
  const orig = read('original/summaries.html');
  const items = [...orig.matchAll(/<a class="sum-card" href="([^"]+)"[^>]*><div class="sum-icon">([^<]+)<\/div><h3>([^<]+)<\/h3>/g)].map((m) => ({ href: '/' + m[1].replace('.html', ''), icon: m[2], title: m[3] }));
  const body = `${pageHero('الملخصات', 'ملخصات الكورسات', 'مراجع سريعة وشاملة لأهم النقاط، مجاناً.', 'define')}
<section class="sec"><div class="wrap"><div class="sums">${items.map((s, i) => `<a class="sum reveal" href="${s.href}" style="--d:${(i % 3) * 0.08}s"><span class="sum-i" aria-hidden="true">${s.icon}</span><h2>${esc(s.title)}</h2><span class="lnk">عرض الملخص ${icon('arrow')}</span></a>`).join('')}</div></div></section>${ctaBand()}`;
  page({ file: 'summaries.html', path: '/summaries', title: 'ملخصات الكورسات المجانية | منصة مسار', desc: 'ملخصات مجانية من منصة مسار: أساسيات بايثون، البرمجة المتقدمة، مكتبات بايثون، مقدمة في الذكاء الاصطناعي، تطوير واجهات الويب، وأتمتة المهام.', body, active: '/summaries', crumbs: [['الملخصات', '/summaries']] });
  for (const s of items) sitemap.push({ loc: URL_ + s.href, lastmod: BUILD_DATE, pri: '0.5' });
}

/* ---------- download ---------- */
page({ file: 'download.html', path: '/download', title: 'حمّل تطبيق منصة مسار لأندرويد | تعلّم بدون إنترنت', desc: 'حمّل تطبيق منصة مسار المجاني لأندرويد: حمّل الدروس وشاهدها بدون إنترنت، مساعد ذكي، منح مجانية، وشهادات إتمام.', active: '', image: '/assets/gen/app.webp', crumbs: [['تطبيق أندرويد', '/download']],
  body: `<section class="dl"><div class="dl-bg">${img('app', 'هاتف يعرض تطبيق منصة مسار', '', true, '100vw')}</div><div class="wrap dl-in">
  <span class="kick reveal">تطبيق أندرويد · مجاني 100%</span><h1 class="split">كل الكورسات بجيبك</h1>
  <p class="reveal">تعلّم البرمجة والريادة ومهارات الحاسوب أونلاين أو بدون نت.</p>
  <div class="dl-card reveal"><a id="dlBtn" class="btn btn-p btn-lg btn-block" href="${SITE.apk}">${icon('download')} حمّل التطبيق الآن</a>
    <p class="dl-meta"><span class="tag" id="verBadge">أندرويد</span><span class="tag" id="sizeBadge">النسخة الشاملة</span></p>
    <p class="dl-ios" id="iosNote" hidden>التطبيق متوفر لأندرويد حالياً. على iPhone استخدم <a href="/register">نسخة الويب الكاملة</a> من المتصفح.</p>
    <p class="dl-alt">نسخ يدوية: <a href="https://masar-apk-dl.abdalganih2.workers.dev/apk/arm64-v8a">أجهزة حديثة (64bit)</a> · <a href="https://masar-apk-dl.abdalganih2.workers.dev/apk/armeabi-v7a">أجهزة قديمة (32bit)</a> · <a href="${SITE.apk}">شامل لكل الأجهزة</a></p></div>
  <ul class="dl-f reveal"><li>${icon('download')}<b>دروس أوفلاين</b><small>شاهد بدون إنترنت</small></li><li>${icon('spark')}<b>مساعد ذكي</b><small>اسأل عن أي درس</small></li><li>${icon('gift')}<b>منح مجانية</b><small>ادخل أي كورس فوراً</small></li><li>${icon('award')}<b>شهادات</b><small>تتبّع تقدّمك</small></li></ul>
</div></section>`,
  scripts: `<script>(function(){var i=/iPhone|iPad|iPod/i.test(navigator.userAgent);if(i){document.getElementById('iosNote').hidden=false;document.getElementById('dlBtn').hidden=true;return}fetch('${SITE.api}/app/latest').then(function(r){return r.json()}).then(function(d){if(d.url)document.getElementById('dlBtn').href=d.url;if(d.version)document.getElementById('verBadge').textContent='v'+d.version;if(d.size_hint_mb)document.getElementById('sizeBadge').textContent='≈'+d.size_hint_mb+'MB'}).catch(function(){})})();</script>`,
  ld: [{ '@type': 'MobileApplication', name: 'منصة مسار', operatingSystem: 'Android', applicationCategory: 'EducationalApplication', downloadUrl: SITE.apk, offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' }, publisher: { '@id': `${URL_}/#org` } }] });

/* ---------- legal ---------- */
for (const [file, t, d] of [['privacy', 'سياسة الخصوصية', 'كيف تتعامل منصة مسار مع بياناتك الشخصية: البيانات التي نجمعها، كيف نستخدمها ونحميها، وحقوقك.'], ['terms', 'الشروط والأحكام', 'شروط وأحكام استخدام منصة مسار التعليمية وخدماتها وتطبيقها.']]) {
  const src = read(`original/${file}.html`);
  const inner = src.slice(src.indexOf('<div class="legal-box">') + '<div class="legal-box">'.length, src.lastIndexOf('</div>', src.indexOf('</section>', src.indexOf('legal-section')) - 1));
  const upd = (src.match(/آخر تحديث:[^<]+/) || [''])[0];
  const content = inner.replace(/<\/div>\s*<\/div>\s*$/, '').replace(/<a href="\/cdn-cgi\/l\/email-protection[^"]*"[^>]*>[\s\S]*?<\/a>/g, `<a href="mailto:${SITE.email}">${SITE.email}</a>`).replace(/<span class="__cf_email__"[^>]*>[^<]*<\/span>/g, SITE.email);
  page({ file: `${file}.html`, path: `/${file}`, title: `${t} | منصة مسار`, desc: d, active: '', crumbs: [[t, `/${file}`]], pri: '0.3',
    body: `${pageHero('قانوني', t, upd, '')}<section class="sec"><div class="wrap narrow"><div class="prose legal reveal">${content}</div></div></section>` });
}

/* ---------- auth pages (logic stays in the original js/app.js) ---------- */
function authPage(kind) {
  const login = kind === 'login';
  const form = login
    ? `<form id="loginForm" novalidate>
        <div class="fg"><label for="email">البريد الإلكتروني</label><input type="email" id="email" name="email" autocomplete="email" placeholder="name@example.com" required></div>
        <div class="fg"><label for="password">كلمة المرور</label><input type="password" id="password" name="password" autocomplete="current-password" placeholder="••••••••" required></div>
        <button type="submit" class="btn btn-p btn-lg btn-block">تسجيل الدخول</button></form>`
    : `<form id="registerForm" novalidate>
        <div class="fg"><label for="name">الاسم الكامل</label><input type="text" id="name" name="name" autocomplete="name" placeholder="اسمك الكامل" required></div>
        <div class="fg"><label for="email">البريد الإلكتروني</label><input type="email" id="email" name="email" autocomplete="email" placeholder="name@example.com" required></div>
        <div class="fg"><label for="phone">رقم الهاتف <small>(اختياري)</small></label><input type="tel" id="phone" name="phone" autocomplete="tel" placeholder="09XXXXXXXX" dir="ltr"></div>
        <div class="fg"><label for="password">كلمة المرور</label><input type="password" id="password" name="password" autocomplete="new-password" placeholder="6 أحرف على الأقل" required minlength="6"></div>
        <button type="submit" class="btn btn-p btn-lg btn-block">إنشاء حساب مجاني</button>
        <p class="fine">بإنشاء حساب فأنت توافق على <a href="/terms">الشروط والأحكام</a> و<a href="/privacy">سياسة الخصوصية</a>.</p></form>`;
  page({ file: `${kind}.html`, path: `/${kind}`, title: login ? 'تسجيل الدخول | منصة مسار' : 'إنشاء حساب مجاني | منصة مسار', desc: login ? 'سجّل دخولك إلى منصة مسار وتابع كورساتك ودروسك وشهاداتك.' : 'أنشئ حسابك المجاني على منصة مسار وابدأ التعلم فوراً في البرمجة والأردوينو ومهارات الحاسوب وريادة المستقبل.', active: '', noindex: login,
    body: `<section class="auth"><div class="auth-art">${img(login ? 'discover' : 'hero', '', '', true, '50vw')}<div class="auth-quote"><b>${login ? 'أهلاً بعودتك إلى مسارك' : 'خطوتك الأولى على المسار'}</b><span>${login ? 'كمّل من حيث وقفت.' : `${courses.length} كورسات مجانية و${totalLessons}+ درس بانتظارك.`}</span></div></div>
  <div class="auth-box"><div class="auth-card reveal"><h1>${login ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1><p class="auth-sub">${login ? 'أدخل بياناتك للوصول إلى حسابك' : 'مجاني بالكامل، وخلال أقل من دقيقة'}</p>
    <div class="form-err" id="${login ? 'loginError' : 'registerError'}" role="alert"></div>${form}
    <p class="auth-alt">${login ? 'ما عندك حساب؟ <a href="/register">أنشئ حساباً مجانياً</a>' : 'عندك حساب؟ <a href="/login">سجّل دخولك</a>'}</p></div></div></section>`,
    scripts: '<script src="/js/config.js"></script><script src="/js/api.js"></script><script src="/js/app.js?v=20261008"></script>' });
}
authPage('login');
authPage('register');

/* ---------- 404 ---------- */
page({ file: '404.html', path: '/404', title: 'الصفحة غير موجودة | منصة مسار', desc: 'الصفحة المطلوبة غير موجودة.', active: '', noindex: true,
  body: `<section class="nf"><div class="wrap narrow"><span class="nf-n">404</span><h1>يبدو إنك طلعت عن المسار</h1><p>الصفحة اللي عم تدوّر عليها مو موجودة أو انتقلت لمكان تاني.</p><div class="btns"><a class="btn btn-p btn-lg" href="/">ارجع للرئيسية</a><a class="btn btn-g btn-lg" href="/courses">تصفّح الكورسات</a></div></div></section>` });

/* ---------- app pages kept from the original platform: add canonical / SEO hints ---------- */
{
  const f = path.join(DIST, 'course.html');
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace('</head>', `<script>(function(){var id=new URLSearchParams(location.search).get('id');if(!id)return;var l=document.createElement('link');l.rel='canonical';l.href='${URL_}/courses/'+id+'/';document.head.appendChild(l);})();</script>
<meta name="robots" content="noindex, follow">
</head>`);
  fs.writeFileSync(f, h);
  // app.js: canonical → the prerendered course page; course description is markdown → light formatting
  const aj = path.join(DIST, 'js/app.js');
  let a = fs.readFileSync(aj, 'utf8');
  const can = "'https://almasar.org/course?id=' + encodeURIComponent(course.id)";
  const desc = '<p class="course-description">${course.description}</p>';
  if (!a.includes(can) || !a.includes(desc)) throw new Error('app.js patch anchors not found');
  a = a.replace(can, "'https://almasar.org/courses/' + encodeURIComponent(course.id) + '/'")
    .replace(desc, `<p class="course-description">\${(course.description || '').replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n+/g, '<br>')}</p>`);
  fs.writeFileSync(aj, a);
  for (const g of ['certificate.html']) {
    const p2 = path.join(DIST, g);
    fs.writeFileSync(p2, fs.readFileSync(p2, 'utf8').replace('</head>', '<meta name="robots" content="noindex, follow">\n</head>'));
  }
}

/* ---------- SEO / GEO files ---------- */
const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemap.map((u) => `  <url><loc>${xmlEsc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority>${u.img ? `<image:image><image:loc>${xmlEsc(u.img)}</image:loc></image:image>` : ''}</url>`).join('\n')}
</urlset>
`);
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider', 'meta-externalagent', 'cohere-ai', 'DuckAssistBot', 'MistralAI-User'];
out('robots.txt', `# almasar.org — search engines and AI assistants are welcome to read and cite the public pages.
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /teacher/
Disallow: /certificate
Disallow: /cdn-cgi/

${AI_BOTS.map((b) => `User-agent: ${b}`).join('\n')}
Allow: /
Disallow: /admin/
Disallow: /teacher/

Sitemap: ${URL_}/sitemap.xml
`);
const llms = `# منصة مسار (Masar)

> ${SITE.description}

منصة مسار (almasar.org) منصة تعليمية عربية تأسست عام 2026 على يد المهندس عبد الغني الحمدي، ومرخّصة ومسجلة في دولة الإمارات العربية المتحدة. شعارها: «${SITE.tagline}». تضم ${courses.length} كورسات مجانية و${totalLessons}+ درساً (قرابة ${totalHours} ساعة)، مع شهادات إتمام قابلة للتحقق، وتطبيق أندرويد يعمل بدون إنترنت، وتجارب تعلّم بالذكاء الاصطناعي.

Masar is an Arabic-first, AI-native learning platform founded in 2026 by engineer Abdalgani Alhamdi and registered in the UAE. All ${courses.length} published courses are free; learners get verifiable completion certificates, an offline-capable Android app and AI learning experiences.

- التواصل: ${SITE.email} · ${SITE.phoneDisplay}
- الرؤية: إعداد جيل ريادي للمستقبل واعٍ وقادر ومؤثر، منطلقاً من فهم ذاته والتفوق في موهبته، ومن خلال اكتشاف دوره المناسب في الحياة.
- المنهجية: اكتشف ذاتك ← حدّد مسارك ← أبدع فيه.

## الكورسات (كلها مجانية)

${courses.map((c) => `- [${c.title}](${URL_}${c.url}): ${c.intro} (${c.nLessons} درس، ~${c.hours} ساعة، تصنيف: ${c.category})`).join('\n')}

## التجارب الذكية

${EXPERIENCES.map((e) => `- [${e.title}](${e.url}): ${e.description}`).join('\n')}

## صفحات أساسية

- [الرئيسية](${URL_}/)
- [كل الكورسات](${URL_}/courses)
- [التجارب الذكية](${URL_}/experiences)
- [من نحن](${URL_}/about)
- [الأسئلة الشائعة](${URL_}/faq)
- [تطبيق أندرويد](${URL_}/download)
- [ملخصات الكورسات](${URL_}/summaries)

## المدونة

${posts.map((p) => `- [${p.title}](${URL_}${p.url}): ${clip(strip(p.excerpt), 140)}`).join('\n')}

## Optional

- [النص الكامل للمحتوى](${URL_}/llms-full.txt)
- [سياسة الخصوصية](${URL_}/privacy)
- [الشروط والأحكام](${URL_}/terms)
`;
out('llms.txt', llms);
out('llms-full.txt', `${llms}

---

# الأسئلة الشائعة

${FAQ.map((f) => `## ${f.q}\n\n${f.a}`).join('\n\n')}

---

# محتوى الكورسات بالتفصيل

${courses.map((c) => `## ${c.title}\n\nالرابط: ${URL_}${c.url}\nالتصنيف: ${c.category} · ${c.nLessons} درس · ~${c.hours} ساعة · مجاني\n\n${c.description.replace(/\*\*/g, '')}\n\nالدروس:\n${c.lessons.map((l, i) => `${i + 1}. ${l.title}`).join('\n')}`).join('\n\n')}

---

# المقالات

${posts.map((p) => `## ${p.title}\n\nالرابط: ${URL_}${p.url}\n\n${strip(cleanPost(p.content_html || '').replace(/<\/(p|h\d|li)>/g, '\n'))}`).join('\n\n')}
`);

out('_headers', `/assets/*
  Cache-Control: public, max-age=31536000, immutable
/assets/gen/*
  Cache-Control: public, max-age=2592000
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
/llms.txt
  Content-Type: text/plain; charset=utf-8
/llms-full.txt
  Content-Type: text/plain; charset=utf-8
`);
out('_redirects', `/index /  301
/home /  301
/contact /about  301
/courses/ /courses  301
/blog/ /blog  301
`);

// Pages Function: 301 for the old dynamic article URLs (only /post routes invoke it)
out('_routes.json', JSON.stringify({ version: 1, include: ['/post', '/post.html'], exclude: [] }));

console.log(`built ${sitemap.length} indexable pages → ${path.relative(process.cwd(), DIST) || DIST}`);
