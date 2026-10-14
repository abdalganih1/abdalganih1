// 301 the old dynamic article URLs (/post?slug=…) to the prerendered articles (/blog/<slug>/).
export function onRequest({ request }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  const to = slug ? `/blog/${encodeURIComponent(slug)}/` : '/blog';
  return Response.redirect(new URL(to, url.origin).toString(), 301);
}
