// Static site generator for abdalgani.com. `node build.mjs` → dist/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = process.env.OUT ? path.resolve(process.env.OUT) : path.join(ROOT, 'dist');
const SITE = 'https://abdalgani.com';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const posts = JSON.parse(read('content/posts.json'));
const themes = JSON.parse(read('content/themes.json'));
const imgPlan = JSON.parse(read('content/images.json')).posts;
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const SITECFG = JSON.parse(read('content/site.json'));
const GA_ID = (process.env.GA_ID || SITECFG.ga || '').trim();

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('ar-SY-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

const CAT = {
  'برمجة': { name: 'برمجة', desc: 'تطبيقات ويب وموبايل، لوحات تحكم، ومنصات متكاملة.' },
  'هاردوير': { name: 'هاردوير', desc: 'أنظمة مدمجة، حساسات، متحكمات صغرية، ودارات إلكترونية.' },
  arduino: { name: 'Arduino', desc: 'مشاريع مبنية على لوحات الأردوينو وبرمجتها.' },
  esp32cam: { name: 'ESP32-CAM', desc: 'مشاريع الرؤية والاتصال اللاسلكي باستخدام شريحة ESP32-CAM.' },
  uncategorized: { name: 'مشاريع متنوعة', desc: 'مشاريع هندسية متنوعة بين الروبوتات والطاقة والبرمجيات.' },
};

const WA_DISPLAY = '963951413649';
const WA_FORM = '963958794195'; // number the old consultation form sent to
const EMAIL = 'info@abdalgani.com';
const IG = 'https://www.instagram.com/abdalgani_h1/';
const IG_TE = 'https://www.instagram.com/techno_enjaz/';

/* ---------- assets with content hashes ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
const hashed = {};
function emit(src, name) {
  const buf = fs.readFileSync(path.join(ROOT, src));
  const h = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
  const [base, ext] = [name.replace(/\.[^.]+$/, ''), path.extname(name)];
  const out = `/assets/h/${base}.${h}${ext}`;
  fs.mkdirSync(path.dirname(path.join(DIST, out)), { recursive: true });
  fs.writeFileSync(path.join(DIST, out), buf);
  return (hashed[name] = out);
}
// fonts are self-hosted (arabic + latin subsets) and inlined at the top of the stylesheet
fs.mkdirSync(path.join(DIST, 'assets/h'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.styles.build.css'), read('src/fonts.css') + read('src/styles.css'));
emit('.styles.build.css', 'styles.css');
fs.rmSync(path.join(ROOT, '.styles.build.css'));
if (GA_ID) {
  fs.writeFileSync(path.join(ROOT, '.ga.build.js'), read('src/ga.js').replace('__GA_ID__', GA_ID));
  emit('.ga.build.js', 'ga.js');
  fs.rmSync(path.join(ROOT, '.ga.build.js'));
}
emit('src/boot.js', 'boot.js');
emit('src/intro.js', 'intro.js');
emit('src/app.js', 'app.js');
emit('node_modules/gsap/dist/gsap.min.js', 'vendor/gsap.min.js');
emit('node_modules/gsap/dist/ScrollTrigger.min.js', 'vendor/ScrollTrigger.min.js');
emit('node_modules/lenis/dist/lenis.min.js', 'vendor/lenis.min.js');
fs.cpSync(path.join(ROOT, 'src/assets'), path.join(DIST, 'assets'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/assets/brand/favicon.png'), path.join(DIST, 'favicon.ico'));

/* ---------- icons ---------- */
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const ic = {
  robot: I('<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16.5h6M2 12v3M22 12v3"/>'),
  chip: I('<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  code: I('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>'),
  eye: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  send: I('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/>'),
  target: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  pen: I('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>'),
  brush: I('<path d="M9.06 11.9 18 3l3 3-8.9 8.94M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3Z"/>'),
  camp: I('<path d="M3 20h18L12 4 3 20ZM12 4v16M8 20l4-6 4 6"/>'),
  slides: I('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M7 12l3-3 2 2 4-4"/>'),
  grad: I('<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'),
  globe: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  phone: I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>'),
  mail: I('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>'),
  pin: I('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  ig: I('<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'),
  wa: I('<path d="M3 21l1.7-5A9 9 0 1 1 8 19.3L3 21Z"/><path d="M9 10c0 3 2 5 5 5l1.2-1.2-2-1-1 .7c-1-.4-1.7-1.1-2.1-2.1l.7-1-1-2L9 10Z"/>'),
  tg: I('<path d="m22 3-9.5 18-2.5-8-8-2.5L22 3Z"/>'),
  x: I('<path d="M4 4l16 16M20 4 4 20"/>'),
  copy: I('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  up: I('<path d="M12 19V5M5 12l7-7 7 7"/>'),
};

/* ---------- SEO / GEO data ---------- */
const PERSON = {
  '@type': 'Person', '@id': SITE + '/#person', name: 'عبد الغني الحمدي', alternateName: ['Abdalgani Alhamdi', 'المهندس عبد الغني'],
  url: SITE + '/about/', image: SITE + '/assets/brand/abdalgani.webp', email: 'mailto:' + EMAIL, telephone: '+963951413649',
  jobTitle: 'مستشار بالمشاريع التقنية ومدرّب روبوتيك',
  description: 'مهندس ومستشار هندسي متخصّص في مشاريع التخرّج التقنية، مدرّب أردوينو وروبوتيك، وقائد فريق تكنو إنجاز.',
  alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'جامعة البعث' }, { '@type': 'CollegeOrUniversity', name: 'جامعة حلب' }],
  knowsAbout: ['Arduino', 'ESP32', 'NodeMCU', 'الروبوتات', 'الأنظمة المدمجة', 'إنترنت الأشياء', 'الطاقة الشمسية', 'الرؤية الحاسوبية', 'Flutter', 'Laravel', 'هندسة التحكم والأتمتة', 'مشاريع التخرج'],
  worksFor: { '@id': SITE + '/#org' }, sameAs: [IG],
  address: { '@type': 'PostalAddress', addressCountry: 'SY' },
};
const ORG = {
  '@type': 'ProfessionalService', '@id': SITE + '/#org', name: 'تكنو إنجاز', alternateName: 'Techno Enjaz', url: SITE + '/techno/',
  logo: SITE + '/assets/brand/logo.png', image: SITE + '/assets/gen/page-techno.webp', email: EMAIL, telephone: '+963951413649',
  founder: { '@id': SITE + '/#person' }, areaServed: ['SY', 'Worldwide'], address: { '@type': 'PostalAddress', addressCountry: 'SY' },
  sameAs: [IG_TE], knowsLanguage: ['ar', 'en'],
  serviceType: ['استشارات مشاريع التخرج', 'تصميم وتنفيذ الروبوتات والأنظمة المدمجة', 'تطوير المواقع والتطبيقات', 'التدريب التقني', 'الهوية البصرية والعروض التقديمية'],
};
const WEBSITE = { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'المهندس عبد الغني الحمدي', inLanguage: 'ar', publisher: { '@id': SITE + '/#person' } };
const crumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: [['/', 'الرئيسية'], ...items].map(([u, n], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + encodeURI(u) })) });

const FAQ = [
  ['من هو المهندس عبد الغني الحمدي؟', 'مهندس ومستشار هندسي سوري متخصّص في مشاريع التخرّج التقنية، خرّيج هندسة التحكّم الآلي والحواسيب من جامعة البعث مع شهادة الباسل للمرتبة الأولى، ومتابع للدراسات العليا في هندسة التحكّم والأتمتة بجامعة حلب. ساهم في إنجاز أكثر من 500 مشروع تقني، ودرّب أكثر من 20,000 متدرّب، ويقود فريق «تكنو إنجاز».'],
  ['ما أنواع المشاريع التي تساعدون فيها؟', 'الروبوتات والأذرع الروبوتية، الأنظمة المدمجة وإنترنت الأشياء باستخدام Arduino وESP32 وNodeMCU، منظومات الطاقة الشمسية، الرؤية الحاسوبية والذكاء الاصطناعي، وتطبيقات الويب والموبايل باستخدام Flutter وLaravel.'],
  ['هل تساعدون طلاب الجامعات في مشاريع التخرّج؟', 'نعم، مشاريع التخرّج هي التخصّص الأساسي: من اختيار الفكرة وتصميم المخطط الصندوقي، إلى التنفيذ والبرمجة والاختبار، ثم التوثيق والتحضير للمناقشة.'],
  ['كيف أطلب استشارة؟', 'عبّئ نموذج «طلب استشارة» في الموقع فيُرسل طلبك مباشرة عبر واتساب، أو تواصل على الرقم ‎+963 951 413 649 أو على البريد info@abdalgani.com.'],
  ['هل تعملون عن بُعد ومع عملاء خارج سوريا؟', 'نعم، الفريق في سوريا ويعمل عن بُعد مع طلاب وعملاء من مختلف المناطق، وتتم المتابعة عبر واتساب والاجتماعات الإلكترونية.'],
  ['هل تقدّمون دورات تدريبية؟', 'نعم، أكثر من 30 دورة تدريبية في برمجة الأردوينو، الروبوتات المتنقّلة، التحكّم الصناعي، وإدارة المشاريع، إضافة إلى معسكر برمجي صيفي لطلاب الجامعات.'],
  ['ما هي «تكنو إنجاز»؟', '«تكنو إنجاز» فريق تقني يقوده المهندس عبد الغني، يقدّم تطوير المواقع والمتاجر الإلكترونية، الهوية البصرية، العروض التقديمية، المعسكر البرمجي، وإرشاد مشاريع التخرّج.'],
  ['هل يمكنكم تصميم موقع لشركتي أو مشروعي؟', 'نعم، عبر «تكنو إنجاز»، ويمكن أن يصلك نموذج تجريبي للتصميم خلال 24 ساعة من طلبك.'],
  ['ما المتحكّمات والقطع المستخدمة في مشاريع الهاردوير؟', 'Arduino Uno وشريحة ATmega328P وESP32-CAM وNodeMCU، مع وحدات مثل البلوتوث HC-05 ومشغّل الصوت DFPlayer وحساسات الغاز MQ وحساسات اللهب والأشعة تحت الحمراء IR.'],
  ['أين أجد أمثلة على المشاريع المنفّذة؟', `في صفحة «المشاريع» ${posts.length} مشروعاً موثّقاً بالتفصيل، منها روبوت تنظيف الألواح الشمسية، نظارة تساعد المكفوفين، كراج ذكي، وذراع روبوتية.`],
];
const faqHtml = (list) => `<div class="faq">${list.map(([q, a], i) => `<details data-rv${i === 0 ? ' open' : ''}><summary><span>${esc(q)}</span><i aria-hidden="true"></i></summary><p>${esc(a)}</p></details>`).join('')}</div>`;
const faqLd = (list) => ({ '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

/* ---------- layout ---------- */
const NAV = [['/', 'الرئيسية'], ['/prjects/', 'المشاريع'], ['/about/', 'عني'], ['/techno/', 'تكنو إنجاز'], ['/contact/', 'استشارة']];
function layout({ title, desc, url, image, body, current, jsonld, loader = false, type = 'website', noindex = false }) {
  const full = title.includes('عبد الغني') ? title : `${title} — المهندس عبد الغني الحمدي`;
  const og = SITE + (image || '/assets/gen/page-hero.webp');
  const nav = NAV.map(([h, t]) => `<a href="${h}"${current === h ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const mnav = NAV.map(([h, t], i) => `<a href="${h}"><i>0${i + 1}</i>${t}</a>`).join('');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${encodeURI(url)}">
<meta name="theme-color" content="#050a13">
<meta property="og:type" content="${type}"><meta property="og:locale" content="ar_AR"><meta property="og:site_name" content="المهندس عبد الغني الحمدي">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${encodeURI(url)}"><meta property="og:image" content="${og}"><meta property="og:image:alt" content="${esc(full)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(full)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${og}">
<meta name="robots" content="${noindex ? 'noindex' : 'index,follow,max-image-preview:large,max-snippet:-1'}">
<meta name="author" content="عبد الغني الحمدي">
<link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt">
<link rel="icon" href="/assets/brand/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/assets/brand/logo.png">
<link rel="preload" href="/assets/fonts/IBMPlexSansArabic-400-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/ElMessiri-600-arabic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${hashed['styles.css']}">
<script src="${hashed['boot.js']}"></script>
${GA_ID ? `<script src="${hashed['ga.js']}" async></script>` : ''}
${jsonld ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [].concat(jsonld) })}</script>` : ''}
</head>
<body>
<a class="sr" href="#main">تخطَّ إلى المحتوى</a>
${loader ? `<div class="intro" aria-hidden="true">
<div class="in-nebula"><img data-src="/assets/intro/nebula.webp" alt=""></div>
<div class="in-sky"></div>
<canvas class="in-cv"></canvas>
<div class="in-earth"><img data-src="/assets/intro/earth.webp" alt=""></div>
<div class="in-clouds"><img data-src="/assets/intro/clouds.webp" alt=""></div>
<div class="in-cam">
<div class="in-stage">
<div class="in-pad"></div>
<div class="in-rocket">
<div class="in-flame"><i class="c"></i><i class="l"></i><i class="r"></i></div>
<img class="in-body" data-src="/assets/brand/te-body.webp" alt="">
<div class="in-disc">
<div class="in-disc-glow"></div><div class="in-disc-wave"></div><div class="in-shock"></div>
<div class="in-coder"><img data-src="/assets/intro/coder.webp" alt=""><i class="scan"></i></div>
<img class="in-disc-art" data-src="/assets/brand/te-disc.webp" alt="">
<svg class="in-ring" viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="56" pathLength="100"/><circle class="charge" cx="60" cy="60" r="56" pathLength="100"/></svg>
<span class="in-press">اضغط</span>
</div>
</div>
</div>
</div>
<div class="in-count"></div>
<div class="in-title"><h2><span class="tw"><span>تكنو</span></span> <span class="tw"><span>إنجاز</span></span></h2><p>TECHNO ENJAZ · من فكرة مبرمج لإنجاز بيوصل للفضاء</p></div>
<div class="in-hud"><div class="in-code"></div><div class="row"><span class="dot"></span><span class="tag">BOOT · مبرمج عم يشتغل…</span><span class="in-alt"></span></div></div>
<button class="in-skip" type="button">تخطَّ الانترو ←</button>
<div class="in-flash"></div>
</div>` : ''}
<div class="curtain" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
<div class="progress" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div><div class="glow" aria-hidden="true"></div><div class="cursor" aria-hidden="true"><b></b></div>
<header class="site"><div class="wrap">
<a class="brand" href="/" aria-label="الرئيسية"><img src="/assets/brand/logo.webp" alt="" width="34" height="36"><span>المهندس عبد الغني الحمدي<small>TECH CONSULTANT</small></span></a>
<nav class="main" aria-label="القائمة الرئيسية">${nav}</nav>
<a class="btn pri sm" href="/contact/">اطلب استشارة <span class="arw">←</span></a>
<button class="menu-btn" aria-label="القائمة" aria-expanded="false"><i></i><i></i></button>
</div></header>
<nav class="mnav" aria-label="قائمة الجوال">${mnav}</nav>
<main id="main">
${body}
</main>
${footer()}
<button class="totop" aria-label="للأعلى">${ic.up}</button>
<script src="${hashed['vendor/gsap.min.js']}" defer></script>
<script src="${hashed['vendor/ScrollTrigger.min.js']}" defer></script>
<script src="${hashed['vendor/lenis.min.js']}" defer></script>
${loader ? `<script src="${hashed['intro.js']}" defer></script>` : ''}
<script src="${hashed['app.js']}" defer></script>
</body>
</html>
`;
}

function footer() {
  return `<footer class="site">
<div class="big-name" aria-hidden="true">عبد الغني</div>
<div class="wrap">
<div class="cols">
<div><h4>— عن الموقع</h4><p>مستشار بالمشاريع التقنية: مشاريع تخرّج، روبوتات، أنظمة مدمجة، طاقة شمسية، وتطبيقات ويب وموبايل.</p>
<div class="socials"><a href="${IG}" target="_blank" rel="noopener" aria-label="إنستغرام">${ic.ig}</a><a href="https://wa.me/${WA_DISPLAY}" target="_blank" rel="noopener" aria-label="واتساب">${ic.wa}</a><a href="mailto:${EMAIL}" aria-label="البريد">${ic.mail}</a></div></div>
<div><h4>الأقسام</h4><ul>${Object.entries(CAT).filter(([k]) => k !== 'uncategorized').map(([k, c]) => `<li><a href="/category/${k}/">${c.name}</a></li>`).join('')}</ul></div>
<div><h4>الموقع</h4><ul><li><a href="/prjects/">المشاريع</a></li><li><a href="/about/">عني</a></li><li><a href="/techno/">تكنو إنجاز</a></li><li><a href="/contact/">طلب استشارة</a></li><li><a href="/faq/">أسئلة شائعة</a></li></ul></div>
<div><h4>تواصل</h4><ul><li><a href="https://wa.me/${WA_DISPLAY}" target="_blank" rel="noopener" dir="ltr">+963 951 413 649</a></li><li><a href="mailto:${EMAIL}">${EMAIL}</a></li><li><a href="${IG_TE}" target="_blank" rel="noopener">تكنو إنجاز على إنستغرام</a></li></ul></div>
</div>
<div class="fine"><span>© ${new Date().getFullYear()} المهندس عبد الغني الحمدي. جميع الحقوق محفوظة. · <a href="/?intro" style="color:var(--teal)">شاهد انترو الإطلاق 🚀</a></span><span class="mono">ABDALGANI.COM</span></div>
</div></footer>`;
}

/* ---------- helpers ---------- */
const coverOf = (p) => imgPlan[p.slug].feature_real || imgPlan[p.slug].cover;
const small = (src) => src.replace(/\.webp$/, '-sm.webp');
const hasSmall = (src) => /\.webp$/.test(src) && fs.existsSync(path.join(ROOT, 'src', small(src)));
const srcset = (src, sizes) => hasSmall(src) ? ` srcset="${small(src)} 512w, ${src} 1024w" sizes="${sizes}"` : '';
const catLinks = (p) => p.cats.map((c) => `<a class="tag" href="/category/${c}/">${CAT[c].name}</a>`).join(' ');

function card(p, i = 0) {
  return `<article class="card" data-rv data-cats="${p.cats.join(' ')}" data-cursor="اقرأ">
<div class="thumb"><img src="${small(coverOf(p))}" alt="${esc(p.title)}" loading="lazy" decoding="async" width="512" height="320"></div>
<div class="body"><div class="meta"><span>${p.date}</span><span>${CAT[p.cats[0]].name}</span><span>${p.minutes} د قراءة</span></div>
<h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><span class="more">اقرأ المشروع <span class="arw">←</span></span></div>
<a class="cover" href="${p.path}" aria-label="${esc(p.title)}"></a></article>`;
}

function pageHead({ crumb, title, sub, img }) {
  return `<section class="page-head">${img ? `<div class="bgimg"><img${img.includes('/brand/') ? ' class="portrait"' : ''} src="${img}" alt="" fetchpriority="high"></div>` : ''}<div class="wrap">
<div class="crumb"><a href="/">الرئيسية</a><span>/</span><span>${crumb}</span></div>
<h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></section>`;
}

const ctaBlock = (t = 'عندك فكرة مشروع؟ خلّينا نحوّلها لواقع.', s = 'احكيلي عن مشروعك، ومنرجعلك بخطة واضحة: التصميم، القطع، البرمجة، والتسليم.') => `<section class="blk"><div class="wrap"><div class="cta" data-rv>
<div class="orb a"></div><div class="orb b"></div>
<div class="kicker" style="justify-content:center">ابدأ الآن</div>
<h2 data-split>${t}</h2><p>${s}</p>
<div class="ctas"><a class="btn pri" href="/contact/">اطلب استشارة <span class="arw">←</span></a><a class="btn ghost" href="https://wa.me/${WA_DISPLAY}" target="_blank" rel="noopener">${ic.wa} واتساب مباشر</a></div>
</div></div></section>`;

function write(urlPath, html) {
  const out = path.join(DIST, urlPath, urlPath.endsWith('.html') ? '' : 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

const TESTIMONIALS = [
  ['م. زهراء الحمود', 'مطوّرة واجهات', 'تحت إشراف المهندس عبد الغني، استطعت اكتساب مهارات الفرونت إند وتطبيق مفاهيم البرمجة بثقة ودقة. بفضل توجيهاته، أصبحت مطوّرة فرونت إند أكثر فعالية.'],
  ['ريم قصاباشي', 'مهارات حاسوب', 'قدّم لي المهندس عبد الغني التدريب الذي أحتاجه لإتقان صناعة العروض التقديمية ومهارات الحاسوب الأساسية. نظرة المهندس الحمدي للتعلم والتنمية الذاتية شجّعتني على التطور المستمر.'],
  ['علي بلال', 'توجيه وإرشاد', 'قابلت المهندس عبد الغني في مرحلة كنت فيها على حافة الهاوية، لم أكن أملك أهدافًا واضحة ولا بوصلة توجّهني. لكن بفضل توجيهاته ونصائحه القيمة، تحوّلت حياتي من العشوائية إلى الابتكار والهدفية.'],
  ['راما حلو', 'تخطيط استراتيجي', 'عبر دورات التخطيط الاستراتيجي الشخصي التي قدّمها المهندس عبد الغني، اكتشفت مدى الحكمة والوعي التي يتمتّع بها. هذه الخبرة أثّرت بشكل كبير على حياتي المهنية والشخصية.'],
];
const quotes = (list) => `<div class="quotes">${list.map(([n, r, q]) => `<figure class="qt" data-rv><p>«${q}»</p><figcaption class="who"><span class="av">${n.replace('م. ', '')[0]}</span><span><b>${n}</b><span>${r}</span></span></figcaption></figure>`).join('')}</div>`;

const STATS = [[500, '+', 'مشروع تقني منفّذ'], [20000, '+', 'متدرّب'], [30, '+', 'دورة تدريبية'], [posts.length, '', 'مشروع موثّق هنا']];
const stats = () => `<div class="stats">${STATS.map(([n, s, l]) => `<div class="stat" data-rv><b><span data-count="${n}">${n.toLocaleString('en-US')}</span><em>${s}</em></b><span>${l}</span></div>`).join('')}</div>`;

/* ---------- home ---------- */
const SKILLS = ['روبوتات', 'أنظمة مدمجة', 'طاقة شمسية', 'تطبيقات ويب', 'IoT', 'ذكاء اصطناعي', 'Arduino', 'ESP32', 'Flutter', 'Laravel', 'رؤية حاسوبية', 'مشاريع تخرّج'];
const marquee = (o) => `<div class="marquee" aria-hidden="true"><div class="track">${[...SKILLS, ...SKILLS].map((s, i) => `<span class="item${(i + o) % 3 === 1 ? ' o' : ''}">${s}</span>`).join('')}</div></div>`;

{
  const featured = posts.slice(0, 7);
  const body = `
<section class="hero">
<div class="hero-bg"><img src="/assets/gen/page-hero.webp" alt="" fetchpriority="high"></div>
<canvas aria-hidden="true"></canvas>
<div class="wrap">
<span class="eyebrow"><i></i>مستشار بالمشاريع التقنية · جاهز لمشروعك القادم</span>
<h1><span class="ln"><span>نحوّل الأفكار</span></span><span class="ln"><span class="grad-t">الهندسية</span> <span>إلى أنظمة</span></span><span class="ln"><span>تعمل وتُبهِر.</span></span></h1>
<p class="lead">من روبوت تنظيف الألواح الشمسية إلى منصات الويب المتكاملة: ${posts.length} مشروعاً موثّقاً بالتصميم والتنفيذ والنتائج، وأكثر من 500 مشروع تقني أُنجز مع الطلاب والشركات.</p>
<div class="ctas"><a class="btn pri" href="#work">استكشف المشاريع <span class="arw">←</span></a><a class="btn ghost" href="/contact/">اطلب استشارة</a></div>
<div class="hero-meta"><div><b>+500</b><span>مشروع تقني</span></div><div><b>+20K</b><span>متدرّب</span></div><div><b>+30</b><span>دورة تدريبية</span></div><div><b>5</b><span>مجالات هندسية</span></div></div>
</div>
<div class="scroll-cue"><i></i>SCROLL</div>
</section>
${marquee(0)}
<section class="blk"><div class="wrap">
<div class="sec-head"><div><div class="kicker">ماذا أقدّم</div><h2 class="big" data-split>خبرة تغطي المشروع من الفكرة حتى التسليم</h2></div>
<p data-rv>إشراف واستشارات وتنفيذ في أربعة مجالات رئيسية، مع توثيق كامل يساعدك تفهم كل خطوة وتدافع عن مشروعك بثقة.</p></div>
<div class="services">
<div class="svc" data-rv><span class="n">01</span><div class="ic">${ic.robot}</div><h3>روبوتات وأتمتة</h3><p>أذرع روبوتية، روبوتات متنقلة وتوصيل، وأنظمة تحكم آلي مع حساسات ومحركات.</p></div>
<div class="svc" data-rv><span class="n">02</span><div class="ic">${ic.chip}</div><h3>أنظمة مدمجة و IoT</h3><p>Arduino و ESP32 و NodeMCU، مراقبة عن بعد، إنذارات فورية، وربط مع تطبيقات الموبايل.</p></div>
<div class="svc" data-rv><span class="n">03</span><div class="ic">${ic.sun}</div><h3>طاقة شمسية</h3><p>تصميم منظومات تغذية بالطاقة الشمسية، تحسين معامل الاستطاعة، والتحكم عبر الإنترنت.</p></div>
<div class="svc" data-rv><span class="n">04</span><div class="ic">${ic.code}</div><h3>تطبيقات ويب وموبايل</h3><p>Flutter و Laravel: متاجر، منصات تعليمية وخيرية، ولوحات تحكم متكاملة.</p></div>
</div></div></section>

<section class="showcase" id="work">
<div class="wrap"><div class="sec-head"><div><div class="kicker">أحدث الأعمال</div><h2 class="big" data-split>مشاريع حقيقية، نتائج ملموسة</h2></div>
<a class="btn ghost" href="/prjects/" data-rv>كل المشاريع (${posts.length}) <span class="arw">←</span></a></div></div>
<div class="rail">
${featured.map((p, i) => `<a class="scard" href="${p.path}" data-cursor="اكتشف"><div class="im"><img src="${coverOf(p)}"${srcset(coverOf(p), '(max-width: 760px) 92vw, 60vw')} alt="${esc(p.title)}" loading="lazy" decoding="async"></div>
<div class="tx"><span class="idx">${String(i + 1).padStart(2, '0')}</span><div class="meta"><span>${p.date}</span><span>${CAT[p.cats[0]].name}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><span class="more">اقرأ القصة كاملة <span class="arw">←</span></span></div></a>`).join('\n')}
<a class="scard end" href="/prjects/"><div><h3>شوف كل المشاريع</h3><p>${posts.length} مشروع بين الهاردوير والبرمجة</p><span class="btn ghost" style="border-color:#02131a;color:#02131a">الأرشيف الكامل ←</span></div></a>
</div>
<div class="bar"><i></i></div>
</section>

<section class="blk"><div class="wrap">${stats()}</div></section>

<section class="blk" style="padding-top:0"><div class="wrap duo">
<div class="reveal-img" data-clip><img class="portrait" src="/assets/brand/abdalgani.webp" alt="المهندس عبد الغني الحمدي" data-parallax="14" loading="lazy">
<div class="badge"><b>ماجستير</b><span>هندسة التحكّم والأتمتة · جامعة حلب</span></div></div>
<div class="txt"><div class="kicker">من أنا</div><h2 class="big" data-split>مهندس، مدرّب، وقائد فريق تكنو إنجاز</h2>
<p data-rv>مهندس ومستشار متخصّص في مشاريع التخرّج التقنية. ساهم في إنجاز أكثر من 500 مشروع تقني، وحصل على المركز السادس في مسابقة «تميّز للإبداع والاختراع» على مستوى القطر، ويدرّب على برمجة الأردوينو والروبوتيك.</p>
<blockquote class="q" data-rv>«التغيير يبدأ من الداخل، ابدأ بنفسك ثم غيّر العالم»</blockquote>
<a class="btn ghost" href="/about/" data-rv>تعرّف عليّ أكثر <span class="arw">←</span></a></div>
</div></section>

${marquee(1)}

<section class="blk"><div class="wrap">
<div class="sec-head"><div><div class="kicker">طريقة العمل</div><h2 class="big" data-split>أربع خطوات من الفكرة للتسليم</h2></div></div>
<div class="steps"><div class="line"></div>
<div class="step" data-rv><div class="dot">01</div><h3>نفهم الفكرة</h3><p>جلسة استشارة نحدد فيها المشكلة والهدف والمتطلبات والميزانية.</p></div>
<div class="step" data-rv><div class="dot">02</div><h3>نصمّم الحل</h3><p>مخطط صندوقي، اختيار القطع والتقنيات، وخطة تنفيذ بمراحل واضحة.</p></div>
<div class="step" data-rv><div class="dot">03</div><h3>ننفّذ ونختبر</h3><p>بناء الدارات والبرمجة والواجهات، مع اختبار كل جزء قبل الدمج.</p></div>
<div class="step" data-rv><div class="dot">04</div><h3>نوثّق ونسلّم</h3><p>تقرير ومخططات وعرض تقديمي، وتجهيزك للمناقشة بثقة.</p></div>
</div></div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
<div class="sec-head"><div><div class="kicker">شهادات</div><h2 class="big" data-split>ماذا يقول من عمل معه</h2></div><p data-rv>أعضاء من فريق تكنو إنجاز ومتدرّبون سابقون.</p></div>
${quotes(TESTIMONIALS)}
</div></section>
<section class="blk" id="faq"><div class="wrap">
<div class="sec-head"><div><div class="kicker">أسئلة شائعة</div><h2 class="big" data-split>كل شي بدك تعرفه قبل ما تبلّش</h2></div>
<p data-rv>أجوبة مختصرة عن الخدمات، مشاريع التخرّج، الدورات وطريقة التواصل. <a href="/faq/">كل الأسئلة ←</a></p></div>
${faqHtml(FAQ.slice(0, 6))}
</div></section>
${ctaBlock()}`;
  write('/', layout({
    title: 'المهندس عبد الغني الحمدي — مستشار بالمشاريع التقنية', current: '/', url: '/', loader: true,
    desc: 'المهندس عبد الغني الحمدي، مستشار بالمشاريع التقنية: مشاريع تخرّج، روبوتات، أنظمة مدمجة، طاقة شمسية، وتطبيقات ويب وموبايل.',
    body,
    jsonld: [WEBSITE, PERSON, ORG, { '@type': 'WebPage', '@id': SITE + '/#webpage', url: SITE + '/', name: 'المهندس عبد الغني الحمدي', isPartOf: { '@id': SITE + '/#website' }, about: { '@id': SITE + '/#person' }, inLanguage: 'ar' }, faqLd(FAQ.slice(0, 6))],
  }));
}

/* ---------- projects archive + categories ---------- */
function archive({ url, title, sub, list, current, crumb }) {
  const cats = Object.keys(CAT).filter((c) => list.some((p) => p.cats.includes(c)));
  const filters = list === posts ? `<div class="filters" role="group" aria-label="تصفية المشاريع" data-rv><button class="tag on" data-f="all" aria-pressed="true">الكل (${list.length})</button>${cats.map((c) => `<button class="tag" data-f="${c}" aria-pressed="false">${CAT[c].name} (${list.filter((p) => p.cats.includes(c)).length})</button>`).join('')}</div>` : '';
  const body = `${pageHead({ crumb, title, sub, img: '/assets/gen/page-projects.webp' })}
<section class="blk" style="padding-top:20px"><div class="wrap">${filters}<div class="grid">${list.map(card).join('\n')}</div></div></section>${ctaBlock()}`;
  write(url, layout({ title: crumb, desc: sub, url, body, current, jsonld: [{ '@type': 'CollectionPage', name: crumb, url: SITE + encodeURI(url), isPartOf: { '@id': SITE + '/#website' }, hasPart: list.map((p) => ({ '@type': 'TechArticle', headline: p.title, url: SITE + encodeURI(p.path) })) }, WEBSITE, crumbs([[url, crumb]])] }));
}
archive({ url: '/prjects/', crumb: 'المشاريع', title: 'الأرشيف الكامل', sub: `${posts.length} مشروعاً بين التنفيذ والتوثيق: روبوتات، أنظمة مدمجة، طاقة شمسية، وتطبيقات.`, list: posts, current: '/prjects/' });
for (const [k, c] of Object.entries(CAT)) {
  const list = posts.filter((p) => p.cats.includes(k));
  archive({ url: `/category/${k}/`, crumb: `تصنيف: ${c.name}`, title: c.name, sub: `${c.desc} (${list.length} مشروع)`, list, current: '/prjects/' });
}
archive({ url: '/author/abdalgani/', crumb: 'كل المشاريع', title: 'مشاريع المهندس عبد الغني', sub: `${posts.length} مشروعاً موثّقاً.`, list: posts, current: '/prjects/' });

/* ---------- articles ---------- */
function slugify(s) { return s.replace(/[\s ]+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
function renderBody(p) {
  const plan = imgPlan[p.slug].slots;
  const ctxOf = (i) => p.images[i].context.replace(/[:：]\s*$/, '').replace(/^[\d.\-\s ]+/, '');
  let b = p.body;
  b = b.replace(/ class="[^"]*\brv\b[^"]*"| data-d="\d"/g, '');
  b = b.replace(/<!--IMG:(\d+)-->/g, (_, i) => {
    const s = plan[i];
    if (!s) return '';
    const cap = ctxOf(+i) || p.title;
    return `<figure class="pic" data-rv><div class="im"><img src="${s.src}"${srcset(s.src, '(max-width: 760px) 92vw, 720px')} alt="${esc(cap)}" loading="lazy" decoding="async" width="1024" height="768" data-parallax="8"></div><figcaption><span>${esc(cap)}</span>${s.real ? '' : '<span class="ai">صورة توضيحية</span>'}</figcaption></figure>`;
  });
  // unwrap old WordPress figures that now hold our figure (or nothing)
  b = b.replace(/<figure class="wp-block-image[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/figure>(?!\s*<\/div>)/g, (m, inner) => inner.includes('<figure') ? inner.replace(/<figcaption class="wp-element-caption">[\s\S]*?<\/figcaption>/, '') : (inner.trim() ? m : ''));
  b = b.replace(/<figure class="wp-block-gallery[^"]*"[^>]*>([\s\S]*?)<\/figure>\s*(?=<(?:h|p|ul|ol|figure class="wp|$))/g, '$1');
  // pair consecutive generated figures side by side
  b = b.replace(/(<figure class="pic"[\s\S]*?<\/figure>)\s*(<figure class="pic"[\s\S]*?<\/figure>)/g, '<div class="pair">$1$2</div>');
  b = b.replace(/<p>\s*(&nbsp;)?\s*<\/p>/g, '');
  b = b.replace(/<table\b/g, '<div class="tbl" tabindex="0" role="region" aria-label="جدول"><table').replace(/<\/table>/g, '</table></div>');
  const toc = [];
  b = b.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (m, attrs, inner) => {
    const txt = inner.replace(/<[^>]+>/g, '').trim();
    const id = (attrs.match(/id="([^"]+)"/) || [])[1] || 'h-' + slugify(txt);
    toc.push([id, txt.replace(/^[\d.\-\s ]+/, '')]);
    return `<h2 id="${id}" data-rv>${inner}</h2>`;
  });
  return { html: b, toc };
}

posts.forEach((p, i) => {
  const { html, toc } = renderBody(p);
  const prev = posts[i + 1], next = posts[i - 1];
  const related = posts.filter((q) => q !== p && q.cats.some((c) => p.cats.includes(c))).slice(0, 3);
  const cover = coverOf(p);
  const body = `<section class="art-hero"><div class="bgimg"><img src="${cover}"${srcset(cover, '100vw')} alt="${esc(p.title)}" fetchpriority="high"></div><div class="wrap">
<div class="crumb"><a href="/">الرئيسية</a><span>/</span><a href="/prjects/">المشاريع</a><span>/</span><span>${CAT[p.cats[0]].name}</span></div>
<h1>${esc(p.title)}</h1>
<div class="meta"><span>${fmtDate(p.date)}</span><span>المهندس عبد الغني</span><span>${p.minutes} دقائق قراءة</span></div>
<div class="chips" style="margin-top:18px">${catLinks(p)} ${p.tags.filter((t) => !Object.values(CAT).some((c) => c.name === t) && !['ArduinoC', 'ESP32CAM', 'Arduino'].includes(t)).map((t) => `<span class="tag">${esc(t)}</span>`).join(' ')}</div>
</div></section>
<section class="blk" style="padding-top:30px"><div class="wrap art-layout">
<article><div class="prose">${html}</div>
<div class="share"><span>شارك المشروع</span><a href="#" data-share="wa" target="_blank" rel="noopener" aria-label="واتساب">${ic.wa}</a><a href="#" data-share="tg" target="_blank" rel="noopener" aria-label="تيليجرام">${ic.tg}</a><a href="#" data-share="x" target="_blank" rel="noopener" aria-label="إكس">${ic.x}</a><button data-share="cp" aria-label="نسخ الرابط">${ic.copy}</button></div>
</article>
${toc.length > 2 ? `<aside class="toc" aria-label="محتويات المقال"><h4>المحتويات</h4>${toc.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</aside>` : '<div></div>'}
</div></section>
<section class="blk" style="padding-top:0"><div class="wrap">
<div class="pn">${prev ? `<a href="${prev.path}" data-rv><small>→ المشروع السابق</small><b>${esc(prev.title)}</b></a>` : '<span></span>'}${next ? `<a class="nx" href="${next.path}" data-rv><small>المشروع التالي ←</small><b>${esc(next.title)}</b></a>` : ''}</div>
${related.length ? `<div class="sec-head" style="margin-top:100px"><div><div class="kicker">مشاريع ذات صلة</div><h2 class="big" data-split>تابع الاستكشاف</h2></div></div><div class="grid">${related.map(card).join('')}</div>` : ''}
</div></section>${ctaBlock('بدك تنفّذ مشروع متل هاد؟', 'منساعدك بالفكرة والتصميم والتنفيذ والتوثيق، خطوة بخطوة.')}`;
  write(p.path, layout({
    title: p.title, desc: p.excerpt, url: p.path, image: cover, body, current: '/prjects/', type: 'article',
    jsonld: [{ '@type': 'TechArticle', headline: p.title, description: p.excerpt, datePublished: p.date, dateModified: BUILD_DATE, image: [SITE + cover], inLanguage: 'ar',
      author: { '@id': SITE + '/#person' }, publisher: { '@id': SITE + '/#person' }, mainEntityOfPage: SITE + encodeURI(p.path), articleSection: CAT[p.cats[0]].name,
      keywords: (p.tags || []).join('، '), wordCount: p.minutes * 200, isPartOf: { '@id': SITE + '/#website' } },
      PERSON, WEBSITE, crumbs([['/prjects/', 'المشاريع'], [p.path, p.title]])],
  }));
});

/* ---------- about ---------- */
write('/about/', layout({
  title: 'عن المهندس عبد الغني الحمدي', url: '/about/', current: '/about/',
  desc: 'مهندس ومستشار متخصّص في مشاريع التخرّج التقنية، مدرّب أردوينو وروبوتيك، وقائد فريق تكنو إنجاز.',
  body: `${pageHead({ crumb: 'عني', title: 'من هو المهندس عبد الغني', sub: 'مستشار هندسي · مدرّب تقني · مشرف مشاريع تقنية', img: '/assets/brand/abdalgani.webp' })}
<section class="blk" style="padding-top:30px"><div class="wrap duo" style="align-items:start">
<div class="prose-lg">
<p data-rv>مرحبًا بكم في موقع المهندس عبد الغني الحمدي. إذا كنتم تبحثون عن مستشار هندسي أو مدرّب متخصّص في مجالات التقنية والروبوتيك، فأنتم في المكان الصحيح.</p>
<p data-rv>المهندس عبد الغني مهندس ومستشار هندسي متخصّص في مشاريع التخرّج التقنية، وقد حقّق إنجازات كبيرة في مجاله. ساهم في إنجاز أكثر من 500 مشروع تقني خلال السنوات الماضية، وحصل على المركز السادس ضمن مسابقة «تميّز للإبداع والاختراع» على مستوى القطر. وهو مدرّب في مجال برمجة لوحات الأردوينو والروبوتيك، وقائد فريق «تكنو إنجاز».</p>
<p data-rv>رؤيته الشخصية هي تكوين مجتمع مترابط ومستقل ذو كفاءة عالية، بينما تتمثل رسالته في التطوّر والتقدّم العلمي والعملي للرقيّ بجميع المجالات. وهدفه الرئيسي رفع الوعي للأشخاص الطموحين ومتابعتهم عبر استقطاب المشاريع وتدريبهم عليها.</p>
</div>
<div class="reveal-img" data-clip style="aspect-ratio:4/4.6"><img src="/assets/gen/page-award.webp" alt="" data-parallax="14" loading="lazy"><div class="badge"><b>المركز السادس</b><span>مسابقة «تميّز للإبداع والاختراع»</span></div></div>
</div></section>
<section class="blk" style="padding-top:0"><div class="wrap">
<div class="sec-head"><div><div class="kicker">المسيرة</div><h2 class="big" data-split>التعليم والخبرة</h2></div></div>
<div class="cols3">
<div class="panel" data-rv><div class="ic">${ic.grad}</div><h3>البكالوريوس</h3><p>هندسة التحكّم الآلي والحواسيب من جامعة البعث، مع شهادة الباسل للمرتبة الأولى في السنة الرابعة.</p></div>
<div class="panel" data-rv><div class="ic">${ic.target}</div><h3>الماجستير</h3><p>هندسة التحكّم والأتمتة من جامعة حلب.</p></div>
<div class="panel" data-rv><div class="ic">${ic.camp}</div><h3>التدريب</h3><p>دورات في الروبوتات المتنقّلة وإدارة المشاريع والتحكّم الصناعي وبرمجة الأردوينو.</p></div>
</div>
<div class="prose-lg" style="margin-top:60px"><p data-rv>بفضل خبرته العملية الغنية والمتنوّعة، يمكنه تقديم الدعم والمشورة الفنية في العديد من المجالات الهندسية والتقنية. سواء كنتم تحتاجون إلى مستشار لمشروع تخرّج، أو مدرّب لمساعدتكم في تطوير مهاراتكم في الروبوتيك أو البرمجة، فهو الشخص المناسب لمساعدتكم.</p>
<blockquote class="q" data-rv>«التغيير يبدأ من الداخل، ابدأ بنفسك ثم غيّر العالم»</blockquote></div>
</div></section>
<section class="blk" style="padding-top:0"><div class="wrap">${stats()}</div></section>
<section class="blk" style="padding-top:0"><div class="wrap">
<div class="sec-head"><div><div class="kicker">شهادات</div><h2 class="big" data-split>ماذا يقول الأفراد عنه</h2></div><p data-rv>أعضاء فريق تكنو إنجاز.</p></div>
${quotes(TESTIMONIALS)}</div></section>
${ctaBlock('تابع أحدث المشاريع على إنستغرام', 'يمكنك متابعة أحدث وآخر المشاريع والأعمال ضمن صفحة الإنستغرام، أو اطلب استشارتك الآن.')}`,
}));

/* ---------- techno enjaz ---------- */
write('/techno/', layout({
  title: 'تكنو إنجاز — خدمات وحلول تقنية', url: '/techno/', current: '/techno/',
  desc: 'تكنو إنجاز: تطوير المواقع والمتاجر، الهوية البصرية، المعسكر البرمجي، العروض التقديمية، وإرشاد مشاريع التخرّج.',
  body: `${pageHead({ crumb: 'تكنو إنجاز', title: 'تكنو إنجاز', sub: 'نؤمن بأن «تكنو إنجاز» مفتاح التحوّل الحقيقي في التكنولوجيا: رؤية لمستقبل مشرق، ورسالة لتحويل الأحلام الشخصية إلى واقع احترافي بالإبداع التقني.', img: '/assets/gen/page-techno.webp' })}
<section class="blk" style="padding-top:30px"><div class="wrap">
<div class="sec-head"><div><div class="kicker">من نحن</div><h2 class="big" data-split>رؤيتنا ورسالتنا وأهدافنا</h2></div></div>
<div class="cols3">
<div class="panel" data-rv><div class="ic">${ic.eye}</div><h3>الرؤية</h3><p>أن نصبح روّادًا في مجال التكنولوجيا وقادة مبتكرين، نحوّل الحلم الشخصي إلى واقع احترافي ونقدّم حلولًا تكنولوجية استثنائية.</p></div>
<div class="panel" data-rv><div class="ic">${ic.send}</div><h3>الرسالة</h3><p>نسعى لتطوير مشاريع ويب مبتكرة وعالية الجودة، ونعمل جنبًا إلى جنب مع عملائنا لتحويل رؤيتهم وأحلامهم التكنولوجية إلى حقيقة احترافية.</p></div>
<div class="panel" data-rv><div class="ic">${ic.target}</div><h3>الأهداف</h3><p>تقديم حلول تكنولوجية مبتكرة ومتطوّرة لعملائنا، وتحقيق أعلى مستويات الجودة والأداء في جميع مشاريعنا.</p></div>
</div></div></section>
${marquee(2)}
<section class="blk"><div class="wrap">
<div class="sec-head"><div><div class="kicker">أعمالنا</div><h2 class="big" data-split>آخر الأعمال</h2></div></div>
<div class="works">
<a class="work" href="https://almasar.org" target="_blank" rel="noopener" data-rv><small>منصة تعليمية</small><b>Almasar.org</b><p>منصة تعليمية متكاملة لإدارة المسارات والدورات والاختبارات لخدمة الطلاب والمعلّمين.</p><span class="more">استعراض <span class="arw">←</span></span></a>
<a class="work" href="https://beautycareprimo.com" target="_blank" rel="noopener" data-rv><small>متجر إلكتروني</small><b>beautycareprimo.com</b><p>موقع وتطبيق لبيع منتجات العناية بالبشرة والمستحضرات التجميلية بتجربة شراء سلسة.</p><span class="more">استعراض <span class="arw">←</span></span></a>
<a class="work" href="/" data-rv><small>موقع شخصي</small><b>abdalgani.com</b><p>الموقع الشخصي للمهندس عبد الغني الحمدي لعرض المشاريع التقنية والخدمات الاستشارية.</p><span class="more">استعراض <span class="arw">←</span></span></a>
</div></div></section>
<section class="blk" style="padding-top:0"><div class="wrap">
<div class="sec-head"><div><div class="kicker">خدماتنا</div><h2 class="big" data-split>ماذا نقدّم</h2></div></div>
<div class="cols3">
<div class="panel" data-rv><div class="ic">${ic.globe}</div><h3>تطوير المواقع والمتاجر</h3><p>تصميم وتنفيذ مواقع ومتاجر إلكترونية سريعة ومتوافقة مع الجوال، بأداء عالٍ وتجربة مستخدم واضحة.</p></div>
<div class="panel" data-rv><div class="ic">${ic.brush}</div><h3>الهوية البصرية</h3><p>هوية بصرية متكاملة للدورات والتدريبات ومنشورات التواصل، من الشعار إلى القوالب الجاهزة.</p></div>
<div class="panel" data-rv><div class="ic">${ic.camp}</div><h3>المعسكر البرمجي</h3><p>معسكر صيفي برمجي لضمّ الطلاب الجامعيين من اختصاصات البرمجة وتدريبهم على مشاريع عملية.</p></div>
<div class="panel" data-rv><div class="ic">${ic.slides}</div><h3>العروض التقديمية</h3><p>أكثر من 500 عرض تقديمي ناجح: عروض تعليمية، تقارير تجارية، وعروض تسويقية وإبداعية.</p></div>
<div class="panel" data-rv><div class="ic">${ic.grad}</div><h3>نصائح لمشاريع التخرّج</h3><p>محتوى بصري وإرشادي لمساعدة الطلاب على إنجاز مشاريع تخرّج مميزة وناجحة.</p></div>
<div class="panel" data-rv><div class="ic">${ic.pen}</div><h3>صمّم موقعك معنا</h3><p>اطلب تصميم موقعك ليصلك نموذج تجريبي خلال 24 ساعة، بتصميم مبدع يجذب الانتباه ويحافظ على تركيز الجمهور.</p></div>
</div></div></section>
${ctaBlock('جاهز تبلّش مشروعك مع تكنو إنجاز؟', 'تستطيع متابعة آخر أعمال تكنو إنجاز على إنستغرام، أو اطلب استشارتك مباشرة.')}`,
}));

/* ---------- contact ---------- */
write('/contact/', layout({
  title: 'طلب استشارة', url: '/contact/', current: '/contact/',
  desc: 'اطلب استشارة تقنية من المهندس عبد الغني الحمدي: مشاريع تخرّج، روبوتات، أنظمة مدمجة، طاقة شمسية، وتطبيقات.',
  body: `${pageHead({ crumb: 'طلب استشارة', title: 'خلّينا نحكي عن مشروعك', sub: 'عبّئ بياناتك وأرسل الطلب، ومنوصلك الاستشارة على واتساب فورًا.', img: '/assets/gen/page-contact.webp' })}
<section class="blk" style="padding-top:30px"><div class="wrap contact-grid">
<div class="cinfo">
<a href="https://wa.me/${WA_DISPLAY}" target="_blank" rel="noopener" data-rv><span class="ic">${ic.phone}</span><span><b>هاتف · واتساب</b><span class="v">+963 951 413 649</span><span>تواصل عبر حجز موعد مع مسؤولة التنظيم.</span></span></a>
<a href="mailto:${EMAIL}" data-rv><span class="ic">${ic.mail}</span><span><b>البريد الإلكتروني</b><span class="v">${EMAIL}</span><span>للاستفسارات والمراسلات الرسمية وطلبات التعاون.</span></span></a>
<div class="c" data-rv><span class="ic">${ic.pin}</span><span><b>الموقع</b><span>الجمهورية العربية السورية. نعمل عن بُعد ومع عملاء من مختلف المناطق.</span></span></div>
<a href="${IG}" target="_blank" rel="noopener" data-rv><span class="ic">${ic.ig}</span><span><b>إنستغرام</b><span>تابع أحدث المشاريع والأعمال.</span></span></a>
</div>
<form id="consult-form" class="cc" data-wa="${WA_FORM}" data-rv>
<h3>أرسل طلبك مباشرة</h3><p>بعد الإرسال بيفتح واتساب ورسالتك جاهزة.</p>
<div class="row2"><div class="fld"><label class="sr" for="f-name">الاسم الكامل</label><input id="f-name" required name="name" placeholder="الاسم الكامل" autocomplete="name"></div>
<div class="fld"><label class="sr" for="f-phone">رقم الهاتف</label><input id="f-phone" required type="tel" name="phone" placeholder="رقم الهاتف للتواصل" autocomplete="tel" dir="ltr" style="text-align:right"></div></div>
<div class="fld"><label class="sr" for="f-topic">نوع الاستشارة</label><select id="f-topic" required name="topic"><option value="">نوع الاستشارة…</option><option>مشروع تخرج / بحثي</option><option>روبوتات وأنظمة مدمجة</option><option>تطبيق ويب أو موبايل</option><option>طاقة شمسية</option><option>أخرى</option></select></div>
<div class="fld"><label class="sr" for="f-details">التفاصيل</label><textarea id="f-details" name="details" rows="5" placeholder="تفاصيل المشروع أو السؤال…"></textarea></div>
<button class="btn pri" type="submit" style="justify-content:center">إرسال عبر واتساب <span class="arw">←</span></button>
</form>
</div></section>`,
}));

/* ---------- faq ---------- */
write('/faq/', layout({
  title: 'أسئلة شائعة', url: '/faq/', current: '/faq/',
  desc: 'أسئلة شائعة عن خدمات المهندس عبد الغني الحمدي وتكنو إنجاز: مشاريع التخرّج، الروبوتات، الأنظمة المدمجة، الدورات، تصميم المواقع وطريقة طلب الاستشارة.',
  body: `${pageHead({ crumb: 'أسئلة شائعة', title: 'أسئلة شائعة', sub: 'أجوبة مباشرة عن الخدمات ومشاريع التخرّج والدورات وطريقة التواصل.' })}
<section class="blk"><div class="wrap narrow">${faqHtml(FAQ)}</div></section>${ctaBlock('ما لقيت جواب سؤالك؟', 'اسألنا مباشرة على واتساب ومنرد عليك بأقرب وقت.')}`,
  jsonld: [faqLd(FAQ), WEBSITE, PERSON, crumbs([['/faq/', 'أسئلة شائعة']])],
}));

/* ---------- 404, sitemap, robots, headers ---------- */
write('/404.html', layout({
  title: 'الصفحة غير موجودة', url: '/404', desc: 'الصفحة غير موجودة.', noindex: true,
  body: `<section class="nf"><div><b class="grad-t">404</b><h1 style="font:700 32px var(--f-disp)">هالصفحة مو موجودة</h1><p style="color:var(--ink2)">يمكن انحذفت أو تغيّر رابطها. جرّب ترجع للرئيسية أو تتصفح المشاريع.</p>
<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px"><a class="btn pri" href="/">الرئيسية</a><a class="btn ghost" href="/prjects/">المشاريع</a></div></div></section>`,
}));

const urls = ['/', '/prjects/', '/about/', '/techno/', '/contact/', '/faq/', ...Object.keys(CAT).map((k) => `/category/${k}/`), ...posts.map((p) => p.path)];
const PIMG = { '/': '/assets/gen/page-hero.webp', '/about/': '/assets/brand/abdalgani.webp', '/techno/': '/assets/gen/page-techno.webp', '/contact/': '/assets/gen/page-contact.webp', '/prjects/': '/assets/gen/page-projects.webp' };
const xmlEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => {
  const post = posts.find((p) => p.path === u);
  const img = post ? coverOf(post) : PIMG[u];
  return `  <url><loc>${SITE}${encodeURI(u)}</loc><lastmod>${BUILD_DATE}</lastmod><changefreq>${post ? 'monthly' : 'weekly'}</changefreq><priority>${u === '/' ? '1.0' : post ? '0.8' : '0.7'}</priority>${img && fs.existsSync(path.join(DIST, img)) ? `<image:image><image:loc>${SITE}${encodeURI(img)}</image:loc>${post ? `<image:title>${xmlEsc(post.title)}</image:title>` : ''}</image:image>` : ''}</url>`;
}).join('\n')}
</urlset>
`);
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot', 'meta-externalagent', 'DuckAssistBot', 'cohere-ai', 'MistralAI-User'];
fs.writeFileSync(path.join(DIST, 'robots.txt'), `# محركات البحث ومساعدات الذكاء الاصطناعي مرحّب بها
User-agent: *
Allow: /
Disallow: /404.html

${AI_BOTS.map((b) => `User-agent: ${b}`).join('\n')}
Allow: /

Sitemap: ${SITE}/sitemap.xml
# LLM summary: ${SITE}/llms.txt
`);
const plain = (h) => h.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<\/(p|h[1-6]|li|tr|div|figure|blockquote)>/g, '\n').replace(/<br\s*\/?>/g, '\n').replace(/<h([23])[^>]*>/g, (m, n) => '\n' + '#'.repeat(+n + 1) + ' ').replace(/<li[^>]*>/g, '- ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const LLMS_HEAD = `# المهندس عبد الغني الحمدي (Abdalgani Alhamdi)

> مهندس ومستشار هندسي سوري متخصّص في مشاريع التخرّج التقنية، مدرّب أردوينو وروبوتيك، وقائد فريق «تكنو إنجاز» (Techno Enjaz). ساهم في أكثر من 500 مشروع تقني ودرّب أكثر من 20,000 متدرّب عبر أكثر من 30 دورة. الموقع يوثّق ${posts.length} مشروعاً في الروبوتات، الأنظمة المدمجة وإنترنت الأشياء (Arduino, ESP32, NodeMCU)، الطاقة الشمسية، الرؤية الحاسوبية، وتطبيقات الويب والموبايل (Flutter, Laravel).

- الخبرة: خرّيج هندسة التحكّم الآلي والحواسيب (جامعة البعث، شهادة الباسل للمرتبة الأولى)، دراسات عليا في هندسة التحكّم والأتمتة (جامعة حلب).
- التواصل: واتساب +963 951 413 649، البريد ${EMAIL}، إنستغرام ${IG}
- تكنو إنجاز: ${IG_TE}
- اللغة: العربية (مع مصطلحات تقنية إنجليزية).
`;
fs.writeFileSync(path.join(DIST, 'llms.txt'), `${LLMS_HEAD}
## الصفحات الرئيسية

- [الرئيسية](${SITE}/): الخدمات، المشاريع المختارة، الإحصائيات، الأسئلة الشائعة.
- [عن المهندس](${SITE}/about/): السيرة، التعليم، الجوائز، المسيرة المهنية.
- [تكنو إنجاز](${SITE}/techno/): خدمات الفريق (مواقع ومتاجر، هوية بصرية، عروض تقديمية، معسكر برمجي، إرشاد مشاريع التخرج).
- [تواصل واطلب استشارة](${SITE}/contact/): نموذج يرسل الطلب عبر واتساب.
- [أسئلة شائعة](${SITE}/faq/)
- [كل المشاريع](${SITE}/prjects/)

## المشاريع الموثّقة

${posts.map((p) => `- [${p.title}](${SITE}${encodeURI(p.path)}): ${p.excerpt}`).join('\n')}

## أسئلة شائعة

${FAQ.map(([q, a]) => `### ${q}\n${a}`).join('\n\n')}

## Optional

- [النص الكامل لكل المشاريع](${SITE}/llms-full.txt)
`);
fs.writeFileSync(path.join(DIST, 'llms-full.txt'), `${LLMS_HEAD}
${posts.map((p) => `---

# ${p.title}

المصدر: ${SITE}${encodeURI(p.path)}
التاريخ: ${p.date} · التصنيف: ${CAT[p.cats[0]].name}${(p.tags || []).length ? ' · الوسوم: ' + p.tags.join('، ') : ''}

${plain(p.body)}
`).join('\n')}
---

# أسئلة شائعة

${FAQ.map(([q, a]) => `## ${q}\n${a}`).join('\n\n')}
`);
const GA_CSP = GA_ID ? { s: ' https://www.googletagmanager.com', c: ' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com', i: ' https://*.google-analytics.com https://www.googletagmanager.com' } : { s: '', c: '', i: '' };
fs.writeFileSync(path.join(DIST, '_headers'), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data:${GA_CSP.i}; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' https://static.cloudflareinsights.com${GA_CSP.s}; connect-src 'self' https://cloudflareinsights.com${GA_CSP.c}; frame-src https://www.youtube-nocookie.com https://www.youtube.com; base-uri 'self'; form-action 'self'
/assets/h/*
  Cache-Control: public, max-age=31536000, immutable
/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *
/assets/gen/*
  Cache-Control: public, max-age=2592000
/assets/brand/*
  Cache-Control: public, max-age=2592000
/assets/intro/*
  Cache-Control: public, max-age=2592000
/llms.txt
  Content-Type: text/plain; charset=utf-8
/llms-full.txt
  Content-Type: text/plain; charset=utf-8
`);
console.log('built', urls.length, 'pages →', path.relative(ROOT, DIST));
