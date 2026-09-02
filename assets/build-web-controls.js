(function () {
  const inBuildWeb = /\/build-web\//.test(location.pathname);
  const inMarketing = /\/marketing\//.test(location.pathname);
  if (!inBuildWeb && !inMarketing) return;

  const root = inBuildWeb ? '../' : inMarketing ? '../../' : '';

  function pageName() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function isBlocks() {
    return pageName().includes('blocks') || location.search.includes('blocks=1');
  }

  function toggleSheet(open) {
    const sheet = document.getElementById('bwSheet');
    const backdrop = document.getElementById('bwSheetBackdrop');
    if (!sheet || !backdrop) return;
    const show = open === undefined ? !sheet.classList.contains('on') : open;
    sheet.classList.toggle('on', show);
    backdrop.classList.toggle('on', show);
    sheet.setAttribute('aria-hidden', String(!show));
  }

  function injectSheet() {
    if (document.getElementById('bwSheet')) return;

    const blocks = isBlocks();
    const mktPage = blocks ? 'index-blocks.html' : 'index.html';
    const builderPage = blocks ? 'builder-blocks.html' : 'builder.html';
    const sugarMkt = `${root}build-sugar/index.html`;
    const sugarBuilder = `${root}build-sugar/pages/builder.html`;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="bw-sheet-backdrop" id="bwSheetBackdrop"></div>
      <aside class="bw-sheet" id="bwSheet" aria-hidden="true">
        <button class="close" type="button" id="bwSheetClose" title="Close">&#10005;</button>
        <h3>Prototype settings</h3>
        <p class="sub">Presentation and navigation — not part of the product UI.</p>
        <div class="grp">Presentation</div>
        <button class="act on" type="button" disabled>Browser <span class="hint">default</span></button>
        <a class="act" href="${sugarMkt}">macOS shell · marketing</a>
        <a class="act" href="${sugarBuilder}">macOS shell · builder</a>
        <div class="grp">Jump to</div>
        <a class="act" href="${inBuildWeb ? '' : `${root}build-web/`}${mktPage}">Marketing site</a>
        <a class="act" href="${inBuildWeb ? '' : `${root}build-web/`}${builderPage}">Builder workshop</a>
        <a class="act" href="${inBuildWeb ? 'ws-home.html?tenancy=seeded' : `${root}build-web/ws-home.html?tenancy=seeded`}">Signed-in home</a>
        <a class="act" href="${inBuildWeb ? 'home.html?tenancy=seeded' : `${root}build-web/home.html?tenancy=seeded`}">Signed-in home (legacy)</a>
        <a class="act" href="${inBuildWeb ? 'apps.html?tenancy=seeded' : `${root}build-web/apps.html?tenancy=seeded`}">Manage your apps</a>
        <div class="grp">Go</div>
        <a class="act primary" href="${root}index.html">Launch pad</a>
        <div class="foot"><kbd>⌘</kbd> <kbd>K</kbd> toggles · <kbd>esc</kbd> closes</div>
      </aside>`;
    document.body.appendChild(wrap);

    document.getElementById('bwSheetClose').addEventListener('click', () => toggleSheet(false));
    document.getElementById('bwSheetBackdrop').addEventListener('click', () => toggleSheet(false));
  }

  injectSheet();

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleSheet();
    }
    if (e.key === 'Escape') toggleSheet(false);
  });

  document.querySelectorAll('.nb-search').forEach((el) => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => toggleSheet(true));
  });
})();
