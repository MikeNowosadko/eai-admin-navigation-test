/* ------------------------------------------------------------------
   Dev cache bust — load fresh assets without incognito.

   Included first in <head> on every prototype page. On local / preview
   hosts, appends ?v=<timestamp> to every /assets/ stylesheet and script
   before the browser fetches them. Skips production (github.io) unless
   ?dev=1 is in the URL.

   Disable for one session: ?prod=1
------------------------------------------------------------------- */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.has('prod')) return;

  const host = location.hostname;
  const isProdHost = host.endsWith('github.io') || host.endsWith('enterpriseaigroup.com');
  if (isProdHost && !params.has('dev')) return;

  const V = Date.now().toString(36);
  window.__EAI_DEV_V = V;

  if (!document.querySelector('meta[http-equiv="Cache-Control"]')) {
    ['Cache-Control:no-cache, no-store, must-revalidate', 'Pragma:no-cache'].forEach((pair) => {
      const [key, val] = pair.split(':');
      const meta = document.createElement('meta');
      meta.httpEquiv = key;
      meta.content = val;
      document.head.appendChild(meta);
    });
  }

  function isAsset(url) {
    if (!url) return false;
    if (/fonts\.googleapis|fonts\.gstatic|gstatic\.com/.test(url)) return false;
    return /(?:^|\/)assets\//.test(url) || /(?:^|\/)assets\//.test(decodeURI(url));
  }

  function bust(url) {
    if (!isAsset(url)) return url;
    const u = new URL(url, location.href);
    u.searchParams.set('v', V);
    return u.pathname + u.search + u.hash;
  }

  function bustEl(el) {
    if (!el || el.dataset.eaiBust) return;
    if (el.tagName === 'LINK' && el.rel === 'stylesheet') {
      const href = el.getAttribute('href');
      if (href && isAsset(href)) {
        el.setAttribute('href', bust(href));
        el.dataset.eaiBust = '1';
      }
    }
    if (el.tagName === 'SCRIPT' && el.hasAttribute('src')) {
      const src = el.getAttribute('src');
      if (src && isAsset(src)) {
        el.setAttribute('src', bust(src));
        el.dataset.eaiBust = '1';
      }
    }
  }

  document.querySelectorAll('link[rel="stylesheet"], script[src]').forEach(bustEl);

  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        bustEl(node);
        node.querySelectorAll?.('link[rel="stylesheet"], script[src]').forEach(bustEl);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* Back-forward cache can restore old JS state — reload instead. */
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) location.reload();
  });

  /* Service worker: network-only for same-origin GETs once active. */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const script = document.currentScript;
    if (script?.src) {
      const root = script.src.replace(/\/assets\/dev-cache\.js(\?.*)?$/, '/');
      navigator.serviceWorker.register(root + 'dev-sw.js').catch(() => {});
    }
  }
})();
