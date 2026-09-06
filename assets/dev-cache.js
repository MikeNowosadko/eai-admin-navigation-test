/* ------------------------------------------------------------------
   First-paint guard + opt-in development cache busting.

   Included first in <head> on every prototype page. It keeps the raw page
   markup hidden until styles and the shared shell are ready, and opts every
   page into a restrained cross-document fade. This prevents the oversized,
   unstyled frame that otherwise appears between screens.

   Asset cache busting is deliberately opt-in with ?dev=1. Giving every
   navigation a new timestamp made the browser download and re-parse all CSS
   on every click, which was the main source of transition flashes.
------------------------------------------------------------------- */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);

  const root = document.documentElement;
  root.classList.add('eai-booting');

  const firstPaintStyle = document.createElement('style');
  firstPaintStyle.dataset.eaiFirstPaint = '1';
  firstPaintStyle.textContent = `
    html { background: #fff; }
    html.eai-booting body { visibility: hidden !important; opacity: 0 !important; }
    html.eai-ready body {
      visibility: visible;
      opacity: 1;
      animation: 120ms ease-out both eai-first-paint;
    }

    @view-transition { navigation: auto; }
    ::view-transition-old(root) { animation: 120ms ease-out both eai-page-out; }
    ::view-transition-new(root) { animation: 170ms ease-out both eai-page-in; }
    @keyframes eai-page-out { to { opacity: 0; } }
    @keyframes eai-page-in { from { opacity: 0; } }
    @keyframes eai-first-paint { from { opacity: 0; } to { opacity: 1; } }

    @media (prefers-reduced-motion: reduce) {
      ::view-transition-old(root),
      ::view-transition-new(root),
      html.eai-ready body { animation-duration: 1ms; }
    }
  `;
  document.head.appendChild(firstPaintStyle);

  let revealed = false;
  function reveal() {
    if (revealed) return;
    revealed = true;
    requestAnimationFrame(() => {
      root.classList.remove('eai-booting');
      root.classList.add('eai-ready');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reveal, { once: true });
  } else {
    reveal();
  }
  /* Never strand a page invisibly if a non-essential script fails. */
  setTimeout(reveal, 2500);

  if (params.has('prod') || !params.has('dev')) return;

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

  /* Only explicit development sessions trade a smooth bfcache restore for
     fully fresh script state. Normal prototype navigation keeps bfcache. */
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
