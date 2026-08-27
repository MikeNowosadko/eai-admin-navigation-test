(function () {
  const isOS = !!document.getElementById('desktop');
  const inPages = /\/marketing\/pages\//.test(location.pathname);

  function marketingPath() {
    if (isOS) {
      const frame = document.getElementById('browFrame');
      if (!frame) return 'index.html';
      try {
        const tail = frame.contentWindow.location.pathname.split('/marketing/')[1];
        return tail || 'index.html';
      } catch (_) {
        const src = frame.getAttribute('src') || 'index.html';
        return src.split('?')[0];
      }
    }
    return inPages
      ? `pages/${location.pathname.split('/').pop()}`
      : 'index.html';
  }

  function pageHref(name) {
    if (name === 'index.html') return inPages ? '../index.html' : 'index.html';
    return inPages ? name : `pages/${name}`;
  }

  function osHref(page) {
    const prefix = inPages ? '../' : '';
    return `${prefix}os.html?page=${encodeURIComponent(page)}`;
  }

  function fullscreenHref(page) {
    if (page === 'index.html') return inPages ? '../index.html' : 'index.html';
    return inPages ? page : `pages/${page}`;
  }

  function goOS() {
    location.href = osHref(marketingPath());
  }

  function goFullscreen() {
    location.href = fullscreenHref(marketingPath());
  }

  function toggleSheet(open) {
    const sheet = document.getElementById(isOS ? 'sheet' : 'mktSheet');
    const backdrop = document.getElementById(isOS ? 'sheetBackdrop' : 'mktSheetBackdrop');
    if (!sheet || !backdrop) return;
    const show = open === undefined ? !sheet.classList.contains('on') : open;
    sheet.classList.toggle('on', show);
    backdrop.classList.toggle('on', show);
    sheet.setAttribute('aria-hidden', String(!show));
  }

  function bindHotkeys() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSheet();
      }
      if (e.key === 'Escape') toggleSheet(false);
    });
  }

  function enhanceOSSheet() {
    const sheet = document.getElementById('sheet');
    if (!sheet || sheet.querySelector('[data-mkt-mode="fullscreen"]')) return;

    const anchor = sheet.querySelector('p.sub');
    if (!anchor) return;

    const grp = document.createElement('div');
    grp.className = 'grp';
    grp.textContent = 'Presentation';

    const go = document.createElement('button');
    go.className = 'act';
    go.type = 'button';
    go.dataset.mktMode = 'fullscreen';
    go.innerHTML = 'Full screen mode <span class="sub">default for ICP</span>';
    go.addEventListener('click', () => goFullscreen());

    const on = document.createElement('button');
    on.className = 'act on';
    on.type = 'button';
    on.disabled = true;
    on.textContent = 'Within macOS';

    anchor.after(grp, go, on);
  }

  function injectFullscreenSheet() {
    if (document.getElementById('mktSheet')) return;

    const wrap = document.createElement('div');
    wrap.className = 'mkt-controls';
    wrap.innerHTML = `
      <div class="mkt-sheet-backdrop" id="mktSheetBackdrop"></div>
      <aside class="mkt-sheet" id="mktSheet" aria-hidden="true">
        <button class="close" type="button" id="mktSheetClose" title="Close">&#10005;</button>
        <h3>Marketing ICP</h3>
        <p class="sub">Google search → pick a landing page → start building.</p>
        <div class="grp">Presentation</div>
        <button class="act on" type="button" disabled>Full screen mode</button>
        <button class="act" type="button" data-mkt-mode="os">Within macOS <span class="sub">for download tests</span></button>
        <div class="grp">Landing pages</div>
        <a class="act" data-mkt-page="index.html" href="#">Google search results</a>
        <a class="act" data-mkt-page="home.html" href="#">Homepage — Enterprise AI</a>
        <a class="act" data-mkt-page="configurator.html" href="#">Configurator landing</a>
        <a class="act" data-mkt-page="cli.html" href="#">CLI landing</a>
        <div class="grp">Go</div>
        <a class="act primary" data-mkt-launch href="#">Launch pad</a>
        <a class="act" data-mkt-restart href="#">Restart at Google</a>
        <div class="foot"><kbd>⌘</kbd> <kbd>K</kbd> toggles this panel · <kbd>esc</kbd> closes it.</div>
      </aside>`;
    document.body.appendChild(wrap);

    document.getElementById('mktSheetClose').addEventListener('click', () => toggleSheet(false));
    document.getElementById('mktSheetBackdrop').addEventListener('click', () => toggleSheet(false));
    wrap.querySelector('[data-mkt-mode="os"]').addEventListener('click', goOS);
    wrap.querySelector('[data-mkt-launch]').href = inPages ? '../../index.html' : '../index.html';
    wrap.querySelector('[data-mkt-restart]').href = inPages ? '../index.html' : 'index.html';
    wrap.querySelectorAll('[data-mkt-page]').forEach((a) => {
      a.href = fullscreenHref(a.dataset.mktPage);
    });
  }

  if (isOS) {
    enhanceOSSheet();
  } else {
    injectFullscreenSheet();
  }
  bindHotkeys();
})();
