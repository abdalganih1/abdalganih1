#!/usr/bin/env python3
"""Extract project articles from a wget mirror of the old abdalgani.com into content/posts.json.

Usage: python3 scripts/extract.py <mirror-dir>
"""
import glob
import html
import json
import os
import re
import sys
from urllib.parse import quote

MIRROR = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'content', 'posts.json')

# Category chips that have their own archive page on the site.
CATS = {'برمجة': 'برمجة', 'هاردوير': 'هاردوير', 'Arduino': 'arduino', 'ArduinoC': 'arduino',
        'ESP32CAM': 'esp32cam', 'Uncategorized': 'uncategorized'}


def text(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def clean_body(body, slug):
    body = re.sub(r'\s*onerror="[^"]*"', '', body)
    body = body.replace('"/ ', '" ').replace('/ data-', ' data-')
    images = []

    def fig(m):
        tag = m.group(0)
        src = re.search(r'src="([^"]+)"', tag).group(1)
        orig = re.search(r'data-original-src="([^"]+)"', tag)
        real = '/ph-' not in src and not src.endswith('.png')  # the old .png files are 404 pages
        if real:
            src = '/assets/img/' + os.path.basename(src)
        idx = len(images)
        # Heading right before the image gives the image its meaning.
        before = body[:m.start()]
        heads = re.findall(r'<h[2-4][^>]*>([\s\S]*?)</h[2-4]>', before)
        ctx = text(heads[-1]) if heads else ''
        images.append({'i': idx, 'real': real, 'src': src if real else None,
                       'orig': orig.group(1) if orig else None, 'context': ctx})
        return '<!--IMG:%d-->' % idx

    body = re.sub(r'<img[^>]*>', fig, body)
    body = re.sub(r'\sclass="wp-image-\d+"', '', body)
    return body.strip(), images


posts = []
for f in sorted(glob.glob(os.path.join(MIRROR, '20*/*/*/*/index.html'))):
    t = open(f, encoding='utf-8').read()
    rel = os.path.relpath(os.path.dirname(f), MIRROR)
    y, mo, d, slug = rel.split('/')
    title = text(re.search(r'<h1[^>]*>([\s\S]*?)</h1>', t).group(1))
    chips = [text(c) for c in re.findall(r'<a class="tag"[^>]*>([^<]*)</a>', t)]
    cats = sorted({CATS[c] for c in chips if c in CATS}) or ['uncategorized']
    tags = [c for c in chips if c not in ('Uncategorized',)]
    feat = re.search(r'<figure class="feat-img[\s\S]*?<img([^>]*)>', t)
    feat_src = re.search(r'src="([^"]+)"', feat.group(1)).group(1) if feat else ''
    feat_real = '/assets/img/' + os.path.basename(feat_src) if feat_src and '/ph-' not in feat_src and not feat_src.endswith('.png') else None
    m = re.search(r'<div class="prose[^"]*"[^>]*>([\s\S]*?)</div>\s*<div class="share', t)
    body, images = clean_body(m.group(1), slug)
    paras = [text(p) for p in re.findall(r'<p[^>]*>([\s\S]*?)</p>', body)]
    excerpt = next((p for p in paras if len(p) > 60), paras[0] if paras else '')
    if len(excerpt) > 190:
        excerpt = excerpt[:185].rsplit(' ', 1)[0] + '…'
    words = len(text(body).split())
    posts.append({
        'slug': slug, 'date': f'{y}-{mo}-{d}',
        'path': f'/{y}/{mo}/{d}/{slug}/',
        'url': f'/{y}/{mo}/{d}/{quote(slug)}/',
        'title': title, 'cats': cats, 'tags': tags, 'excerpt': excerpt,
        'minutes': max(2, round(words / 200)), 'feature_real': feat_real,
        'body': body, 'images': images,
    })

posts.sort(key=lambda p: (p['date'], p['title']), reverse=True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(posts, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(posts), 'posts,', sum(len(p['images']) for p in posts), 'inline images,',
      sum(not i['real'] for p in posts for i in p['images']), 'missing')
