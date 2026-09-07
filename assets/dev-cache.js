/* ------------------------------------------------------------------
   Dev cache bust — always load fresh assets (localhost + GitHub Pages).

   Loaded inline OR as first script. Opt out with ?prod=1 on the URL.
------------------------------------------------------------------- */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.has('prod')) return;

  const V = Date.now().toString(36);
  window.__EAI_DEV_V = V;

  /* Drop stale service workers that may serve old JS/CSS. */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
  }

  if (!document.querySelector('meta[http-equiv="Cache-Control"]')) {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'no-cache, no-store, must-revalidate';
    document.head.appendChild(meta);
  }

  function isAsset(url) {
    if (!url) return false;
    if (/fonts\.googleapis|fonts\.gstatic|gstatic\.com|cdn\.jsdelivr|unpkg\.com/.test(url)) return false;
    return /(?:^|\/)assets\//.test(url) || /(?:^|\/)assets\//.test(decodeURI(url));
  }

  function bust(url) {
    if (!isAsset(url)) return url;
    try {
      const u = new URL(url, location.href);
      u.searchParams.set('v', V);
      return u.pathname + u.search + u.hash;
    } catch (_) {
      return url;
    }
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
    if (el.tagName === 'SCRIPT') {
      const src = el.getAttribute('src');
      if (src && isAsset(src)) {
        el.setAttribute('src', bust(src));
        el.dataset.eaiBust = '1';
      }
    }
  }

  function bustAll() {
    document.querySelectorAll('link[rel="stylesheet"], script[src]').forEach(bustEl);
  }

  /* Patch setAttribute so parser-time src/href updates get busted too. */
  const nativeSet = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if ((name === 'href' || name === 'src') && typeof value === 'string' && isAsset(value)) {
      return nativeSet.call(this, name, bust(value));
    }
    return nativeSet.call(this, name, value);
  };

  bustAll();

  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        bustEl(node);
        node.querySelectorAll?.('link[rel="stylesheet"], script[src]').forEach(bustEl);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', bustAll);

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) location.reload();
  });

  /* Expose for dynamic import() in module scripts */
  window.__EAI_asset = function (path) {
    return bust(path);
  };
})();
