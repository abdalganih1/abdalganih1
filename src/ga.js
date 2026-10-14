// Google Analytics 4 (gtag). The measurement ID is filled in at build time.
(function (w, d) {
  var id = '__GA_ID__';
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { w.dataLayer.push(arguments); };
  w.gtag('js', new Date());
  w.gtag('config', id, { anonymize_ip: true });
  var s = d.createElement('script'); s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  d.head.appendChild(s);
  // Useful conversions: consultation form + WhatsApp/email clicks.
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (/wa\.me|whatsapp/.test(a.href)) w.gtag('event', 'contact_whatsapp', { link_url: a.href });
    else if (/^mailto:/.test(a.href)) w.gtag('event', 'contact_email');
  });
  d.addEventListener('submit', function (e) { if (e.target.id === 'consult-form') w.gtag('event', 'generate_lead', { form: 'consultation' }); });
})(window, document);
