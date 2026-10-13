#!/usr/bin/env python3
"""Plan and generate illustrative images with Cloudflare Workers AI (FLUX.1 schnell).

Writes content/images.json (the plan the build reads) and the .webp files under
src/assets/gen/. Already generated files are skipped, so re-runs are cheap.

Env: CF_API_TOKEN, CF_ACCOUNT_ID.  Usage: python3 scripts/gen_images.py [--plan-only]
"""
import base64
import concurrent.futures as cf
import io
import json
import os
import re
import sys
import urllib.request

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
POSTS = json.load(open(os.path.join(ROOT, 'content/posts.json'), encoding='utf-8'))
THEMES = json.load(open(os.path.join(ROOT, 'content/themes.json'), encoding='utf-8'))
OUT = os.path.join(ROOT, 'src/assets/gen')
MODEL = '@cf/black-forest-labs/flux-1-schnell'
STYLE = ('cinematic lighting, deep navy background with teal and cyan accent glow, '
         'high detail, sharp focus, professional photography, no text, no letters, no watermark, no logo')

KINDS = [
    (r'مخطط|خوارزمي|الصفوف|حالات|التدفقي|مفهوم', 'a clean isometric 3D conceptual illustration of the system architecture: '
     'glowing connected modules, data flow lines between blocks, for'),
    (r'لقطات|واجهة|تطبيق|لوحة التحكم|صورة من|مجلد', 'a sleek device mockup (smartphone and laptop) displaying a modern abstract dashboard UI for'),
    (r'دار|شريحة|الأردوينو|أردوينو|ESP32|البلوتوث|DFPlayer|NodeMCU|المتحكم|لغة البرمجة', 'a macro photo of the electronics hardware '
     '(microcontroller board, sensor modules and wires on a workbench) used in'),
    (r'الشكل النهائي|اختبار|النموذج', 'a photo of the finished working prototype of'),
    (r'الشبكات العصبونية|الرؤية الحاسوبية|YOLO', 'an abstract visualization of a neural network and computer vision detection for'),
]
PAGES = {
    'hero': 'a futuristic engineering workshop at night, robotic arm, circuit boards, drones and solar panel models on a desk, holographic glow',
    'about': 'an engineer mentor teaching a group of university students robotics and Arduino in a modern lab',
    'techno': 'a creative tech team collaborating around a large screen with website designs and code in a modern studio',
    'contact': 'a calm modern consultation desk with a laptop, a smartphone showing a chat, coffee and engineering sketches',
    'award': 'an engineer workbench at night with Arduino boards, a small robotic arm, soldering tools and a glowing innovation award trophy',
    'projects': 'a wall of engineering student projects: robots, circuit boards, apps and solar prototypes displayed like a gallery',
}


def kind(ctx):
    for pat, desc in KINDS:
        if re.search(pat, ctx):
            return desc
    return 'an illustrative scene of'


def plan():
    items, posts = [], {}
    for name, desc in PAGES.items():
        items.append({'file': f'page-{name}.webp', 'prompt': f'{desc}, {STYLE}', 'crop': 'wide'})
    for p in POSTS:
        th = THEMES[p['slug']]
        pid, theme = th['id'], th['theme']
        cover = f'{pid}/cover.webp'
        items.append({'file': cover, 'prompt': f'hero image of {theme}, {STYLE}', 'crop': 'wide'})
        slots, n, run = {}, 0, (None, 0)
        for im in p['images']:
            if im['real']:
                slots[im['i']] = {'src': im['src'], 'real': True}
                run = (None, 0)
                continue
            # Collapse runs of missing screenshots under one heading to at most two images.
            same = run[0] == im['context']
            run = (im['context'], run[1] + 1 if same else 1)
            if run[1] > 2:
                slots[im['i']] = None
                continue
            n += 1
            f = f'{pid}/{n:02d}.webp'
            items.append({'file': f, 'prompt': f'{kind(im["context"])} {theme}, variation {n}, {STYLE}', 'crop': 'std'})
            slots[im['i']] = {'src': '/assets/gen/' + f, 'real': False}
        posts[p['slug']] = {'cover': '/assets/gen/' + cover, 'feature_real': p['feature_real'], 'slots': slots}
    return items, posts


def generate(item):
    path = os.path.join(OUT, item['file'])
    if os.path.exists(path):
        return item['file'], 'cached'
    acct, tok = os.environ['CF_ACCOUNT_ID'], os.environ['CF_API_TOKEN']
    req = urllib.request.Request(
        f'https://api.cloudflare.com/client/v4/accounts/{acct}/ai/run/{MODEL}',
        data=json.dumps({'prompt': item['prompt'], 'steps': 8}).encode(),
        headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'})
    for attempt in range(3):
        try:
            res = json.load(urllib.request.urlopen(req, timeout=120))
            break
        except Exception as e:  # noqa: BLE001 - retry transient API errors
            if attempt == 2:
                return item['file'], f'error {e}'
    img = Image.open(io.BytesIO(base64.b64decode(res['result']['image']))).convert('RGB')
    w, h = img.size
    ch = int(w * (10 / 16 if item['crop'] == 'wide' else 3 / 4))
    top = (h - ch) // 2
    img = img.crop((0, top, w, top + ch))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', quality=80, method=6)
    img.resize((w // 2, ch // 2), Image.LANCZOS).save(path.replace('.webp', '-sm.webp'), 'WEBP', quality=78, method=6)
    return item['file'], 'ok'


if __name__ == '__main__':
    items, posts = plan()
    json.dump({'posts': posts, 'items': items}, open(os.path.join(ROOT, 'content/images.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print(len(items), 'images planned')
    if '--plan-only' in sys.argv:
        sys.exit()
    with cf.ThreadPoolExecutor(4) as ex:
        for f, status in ex.map(generate, items):
            print(status, f, flush=True)
