# almasar.org

الواجهة العامة لمنصة مسار، معاد بناؤها كموقع ثابت يُنشر على Cloudflare Pages (المشروع `masar-lms`).
تطبيق التعلّم نفسه (صفحة الكورس والدروس، الشهادات، لوحة الإدارة ولوحة المعلم) بقي كما هو ويتصل بـ API على
`masar-lms-api.abdalganih2.workers.dev`.

## البنية
- `original/`: نسخة كاملة من الموقع قبل إعادة البناء (تُنسخ أولاً إلى `dist/` لكي تبقى لوحات الإدارة والمعلم وصفحة الكورس تعمل).
- `content/`: لقطة من بيانات الـ API (الكورسات، الدروس، المقالات) + `site.json` و`faq.json`.
- `src/`: التصميم (`styles.css`)، التفاعل (`app.js`)، الانترو (`intro.js`)، جسر الألوان لصفحات التطبيق (`bridge.css`)، الخطوط والصور.
- `scripts/fetch_data.sh`: تحديث لقطة البيانات من الـ API. `scripts/gen_images.py`: توليد الصور عبر Workers AI.
- `functions/post.js`: تحويل 301 من روابط المقالات القديمة `/post?slug=…` إلى `/blog/<slug>/`.
- `build.mjs`: يولّد كل الصفحات + `sitemap.xml` و`robots.txt` و`llms.txt` و`llms-full.txt` و`_headers`.

## الأوامر
```bash
npm install
sh scripts/fetch_data.sh   # اختياري: تحديث البيانات من الـ API
node build.mjs             # → dist/
# معاينة (لا تلمس الموقع الأساسي):
npx wrangler pages deploy dist --project-name masar-lms --branch preview
# الإنتاج (almasar.org):
npx wrangler pages deploy dist --project-name masar-lms --branch main
```
لتفعيل Google Analytics: ضع رقم القياس في `content/site.json` (`"ga": "G-XXXX"`) أو `GA_ID=G-XXXX node build.mjs`.
