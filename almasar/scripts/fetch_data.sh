#!/bin/sh
# Refresh the API snapshot used by build.mjs (courses, lessons, blog posts).
set -e
cd "$(dirname "$0")/.."
A=$(node -e "console.log(require('./content/site.json').api)")
curl -fsS "$A/courses" > content/courses.json
curl -fsS "$A/blog?limit=100" > content/blog.json
for id in $(node -e "require('./content/courses.json').results.forEach(c=>console.log(c.id))"); do
  curl -fsS "$A/courses/$id" > "content/course/$id.json"
done
node -e "require('./content/blog.json').results.forEach(p=>console.log(p.slug))" | while read -r slug; do
  enc=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$slug")
  curl -fsS "$A/blog/$enc" > "content/post/$slug.json"
done
echo "snapshot updated"
