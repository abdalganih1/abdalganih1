# abdalgani.com

الموقع الشخصي للمهندس عبد الغني الحمدي، معاد بناؤه كموقع ثابت (static) يُنشر على Cloudflare Pages (المشروع `abdalgani-rebuild`).

## البنية
- `content/posts.json`: محتوى المشاريع (16 مقال) مستخرج من الموقع القديم عبر `scripts/extract.py`.
- `content/themes.json` + `scripts/gen_images.py`: توليد الصور التوضيحية عبر Cloudflare Workers AI (FLUX.1 schnell) إلى `src/assets/gen/`.
- `src/styles.css`, `src/app.js`, `src/boot.js`: التصميم والأنيميشن (GSAP + ScrollTrigger + Lenis).
- `build.mjs`: يولّد كل الصفحات إلى `dist/` مع الحفاظ على نفس روابط الموقع القديم.

## الأوامر
```bash
npm install
npm run build          # → dist/
npm run preview        # معاينة محلية
# نشر معاينة (لا يلمس الموقع الأساسي):
npx wrangler pages deploy dist --project-name abdalgani-rebuild --branch preview
```
