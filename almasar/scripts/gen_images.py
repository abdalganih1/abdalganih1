#!/usr/bin/env python3
"""Generate the illustrative images for almasar.org with Cloudflare Workers AI (FLUX.1 schnell).

Writes .webp files to src/assets/gen/ (wide 1600x900 + 800w variant). Existing files are skipped.
Env: CF_API_TOKEN, CF_ACCOUNT_ID.  Usage: python3 scripts/gen_images.py
"""
import base64
import concurrent.futures as cf
import io
import json
import os
import sys
import urllib.request

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src/assets/gen')
MODEL = '@cf/black-forest-labs/flux-1-schnell'
STYLE = ('cinematic soft lighting, deep midnight blue palette with teal glow and warm golden accents, '
         'high detail, sharp focus, editorial photography, no text, no letters, no watermark, no logo')

IMAGES = {
    # pages and sections
    'hero': 'a young Arab student standing on a hill at dawn looking at a long glowing golden path winding through valleys toward a bright city of light on the horizon, wide landscape',
    'discover': 'a teenage student holding a glowing compass in a dark library full of floating luminous books, discovery and curiosity',
    'define': 'a hand pinning a glowing route on a large paper map with stations and milestones, desk lamp, planning a life path',
    'create': 'a young maker building a small robot and glowing circuits at a workbench, sparks of light, creativity',
    'cat-programming': 'a laptop with abstract glowing code lines and an Arduino board on a desk at night',
    'cat-academic': 'a stack of books, a graduation cap and a tablet with charts on a clean desk, morning light',
    'cat-track': 'a mountain trail with glowing waypoint markers leading to a summit flag under stars',
    'cat-ai': 'an abstract glowing neural network shaped like a human head made of light particles',
    'about': 'an engineer mentor teaching a small group of young Arab students around a table with laptops in a modern learning studio',
    'app': 'a modern smartphone standing on a wooden desk, its screen showing a blurred colorful video player with a play button, wireless earbuds and a notebook nearby, blank screen without any text',
    'cta': 'silhouettes of young people walking together on a glowing path toward a sunrise',
    'experiences': 'a 3D holographic electronic circuit simulator floating above a desk, futuristic lab',
    'certificate': 'an elegant blank certificate with a golden seal on a dark desk next to a laptop',
    # blog covers (slug -> prompt)
    'post-welcome-to-masar': 'a bright modern online learning platform on a laptop, students learning together, welcoming atmosphere',
    'post-001-التفكير-خارج-الصندوق': 'a glowing lightbulb rising out of an open cardboard box, creative thinking',
    'post-التفكير-خارج-الصندوق-2': 'a person stepping out of a giant cube into a colorful open world, thinking outside the box',
    'post-أصبح-الذكاء-الصناعي-الرئيس-التنفيذي': 'a sleek AI hologram sitting at the head of a corporate boardroom table',
    'post-إعداد-معلم-فعال': 'an inspiring teacher in a modern classroom with engaged students, warm light',
    'post-الإبداع-creativity': 'colorful paint and light swirling out of an open notebook, creativity',
    'post-الاكتئاب': 'a person sitting by a rainy window with a single ray of sun breaking through the clouds, hope, gentle mood',
    'post-التخطيط-الاستراتيجي-الشخصي': 'a personal planner, goals board and calendar on a desk, strategic life planning',
    'post-التخطيط-الاستراتيجي': 'a chess board with a glowing strategy map behind it, strategic planning',
    'post-التعليم-الذاتي': 'a student learning alone at night with a laptop and headphones, books and a lamp, self learning',
    'post-الذكاء-الصناعي-في-الروبوت': 'a humanoid robot with glowing AI brain circuits in a lab',
    'post-الذكاء-العاطفي': 'two people talking with empathy, abstract glowing heart and mind connection',
    'post-القدرة-على-الابتكار': 'a young inventor sketching ideas with glowing holographic prototypes around',
    'post-المتحكمات-الصغرية-القابلة-للبرمجة': 'macro photo of a microcontroller chip on a circuit board with glowing traces',
    'post-صنع-القرارات-في-العمل': 'a business person standing at a crossroads of glowing paths inside a modern office',
    'post-ما-هو-التدريب-الالكتروني': 'an online trainer recording a video course with a camera and ring light',
    'post-مهارة-الاتصال-في-العمل': 'a diverse team communicating around a table in a bright modern office',
}


def gen(name, prompt):
    path = os.path.join(OUT, name + '.webp')
    if os.path.exists(path):
        return name, 'skip'
    url = f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CF_ACCOUNT_ID']}/ai/run/{MODEL}"
    body = json.dumps({'prompt': f'{prompt}, {STYLE}', 'steps': 8}).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, data=body, headers={
                'Authorization': f"Bearer {os.environ['CF_API_TOKEN']}", 'Content-Type': 'application/json'})
            res = json.load(urllib.request.urlopen(req, timeout=120))
            img = Image.open(io.BytesIO(base64.b64decode(res['result']['image']))).convert('RGB')
            w, h = img.size
            th = int(w * 9 / 16)
            img = img.crop((0, (h - th) // 2, w, (h - th) // 2 + th)).resize((1600, 900), Image.LANCZOS)
            img.save(path, 'WEBP', quality=78)
            img.resize((800, 450), Image.LANCZOS).save(os.path.join(OUT, name + '-800.webp'), 'WEBP', quality=74)
            return name, 'ok'
        except Exception as e:  # noqa: BLE001
            err = e
    return name, f'fail {err}'


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    with cf.ThreadPoolExecutor(6) as ex:
        for name, st in ex.map(lambda kv: gen(*kv), IMAGES.items()):
            print(st, name, flush=True)
    sys.exit(0)
