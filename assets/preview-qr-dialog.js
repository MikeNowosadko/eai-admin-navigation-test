/* ------------------------------------------------------------------
   Mobile preview QR — ported from eainocodebuilder preview-qr-dialog.tsx
------------------------------------------------------------------- */
(function () {
  const QR_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 3h3v3h-3v-3zm3-3h3v3h-3v-3zM14 14h3v3h-3v-3z" stroke="currentColor" stroke-width="1.5"/></svg>';

  function makeDialog(getUrl) {
    let open = false;
    let token = null;
    let overlay = null;

    function close() {
      if (!overlay) return;
      overlay.hidden = true;
      open = false;
      document.body.classList.remove('bd-qr-open');
    }

    function paint() {
      if (!overlay) return;
      const url = token ? getUrl(token) : null;
      const body = overlay.querySelector('.bd-qr-body');
      body.innerHTML = url ? `
        <div class="bd-qr-canvas-wrap">
          <canvas id="bdQrCanvas" width="200" height="200" aria-label="QR code"></canvas>
        </div>
        <div class="bd-qr-url">
          <span class="bd-qr-url-txt">${url}</span>
          <button type="button" class="nb-btn" data-copy>Copy</button>
        </div>
        <p class="bd-qr-note">Scan with your phone camera to open the live form. Responses aren&rsquo;t saved in preview.</p>
        <button type="button" class="bd-qr-regen" data-regen>Regenerate link</button>
      ` : `
        <div class="bd-qr-empty">
          <span class="bd-qr-empty-ico">${QR_ICON}</span>
          <p>Create a private link you can open on any device before publishing.</p>
          <button type="button" class="nb-btn primary" data-create>Create preview link</button>
        </div>`;

      if (url) {
        const canvas = body.querySelector('#bdQrCanvas');
        if (window.QRCode && canvas) {
          window.QRCode.toCanvas(canvas, url, { width: 200, margin: 0 }, () => {});
        }
        body.querySelector('[data-copy]')?.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(url);
            const btn = body.querySelector('[data-copy]');
            btn.textContent = 'Copied';
            setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
          } catch (_) { /* noop */ }
        });
        body.querySelector('[data-regen]')?.addEventListener('click', () => {
          token = randomToken();
          paint();
        });
      } else {
        body.querySelector('[data-create]')?.addEventListener('click', () => {
          token = randomToken();
          paint();
        });
      }
    }

    function show() {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'bd-qr-overlay';
        overlay.hidden = true;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'bdQrTitle');
        overlay.innerHTML = `
          <div class="bd-qr-dialog">
            <button type="button" class="bd-qr-close" aria-label="Close">&times;</button>
            <h2 id="bdQrTitle">Preview on mobile</h2>
            <p class="bd-qr-lede" data-lede></p>
            <div class="bd-qr-body"></div>
          </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.bd-qr-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close();
        });
      }
      open = true;
      overlay.hidden = false;
      document.body.classList.add('bd-qr-open');
      const url = token ? getUrl(token) : null;
      overlay.querySelector('[data-lede]').textContent = url
        ? 'Scan with your phone camera to open the live form on your device.'
        : 'Create a private link you can open on any device before publishing.';
      paint();
    }

    return { show, close, getToken: () => token };
  }

  function randomToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < 12; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  window.initPreviewQr = function initPreviewQr({ button, getUrl }) {
    const dialog = makeDialog(getUrl);
    button.addEventListener('click', () => dialog.show());
    return dialog;
  };
})();
