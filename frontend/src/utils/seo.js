export function setSEO({ title, description, lang = 'en', canonical, ogImage, hreflangs = [] }) {
  if (typeof document === 'undefined') return;
  if (title) document.title = title;

  const ensureMeta = (name, content, attr = 'name') => {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  ensureMeta('description', description);
  ensureMeta('og:title', title, 'property');
  ensureMeta('og:description', description, 'property');
  ensureMeta('og:type', 'website', 'property');
  if (ogImage) ensureMeta('og:image', ogImage, 'property');
  ensureMeta('twitter:card', 'summary_large_image');
  ensureMeta('twitter:title', title);
  ensureMeta('twitter:description', description);
  if (ogImage) ensureMeta('twitter:image', ogImage);

  // canonical
  if (canonical) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);
  }

  // hreflang
  hreflangs.forEach((h) => {
    let link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', h.lang);
    link.setAttribute('href', h.href);
    document.head.appendChild(link);
  });

  // html lang/dir
  const html = document.documentElement;
  if (html) {
    html.setAttribute('lang', lang);
  }
}