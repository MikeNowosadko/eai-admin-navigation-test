/* Shared workspace navigation for both builder surfaces. */
window.mountEaiWorkspaceDrawer = function({state, params, esc, adminHref, builderAppDashboardHref, goCli, storagePrefix = "eai-local-admin:"}) {
const BUILDER_STORAGE_PREFIX = storagePrefix;
function dashboardIcon(name) {
  const paths = {
    home: '<path d="M4 10.5 12 4l8 6.5V20H5V10.5M9 20v-6h6v6"/>',
    file: '<path d="M7 3h7l4 4v14H7zM14 3v5h5"/>',
    building: '<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h18M10 7h4M10 11h4M10 15h4"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    template: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M10 9v12"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    activity: '<path d="M4 14h3l2.2-6 3.3 10 2.2-6H20"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M3 20h18"/>',
    users: '<path d="M16 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H7.7A3.7 3.7 0 0 0 4 18.2V20M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8v6M14 11h6"/>',
    workflow: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 6h8M6 8v8M8 18c6 0 10-4 10-10"/>',
    resources: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
    sparkle: '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
    plug: '<path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v5"/>',
    checklist: '<path d="M9 6h11M9 12h11M9 18h11M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    rocket: '<path d="M8 16 5 13c2-5 7-9 14-10 0 7-4 12-9 14l-2-1ZM14 8h.01M5 16c-2 1-2 4-2 4s3 0 4-2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    terminal: '<path d="m5 7 4 4-4 4M11 17h8"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths[name] || paths.activity}</svg>`;
}

function mountWorkspaceDrawer() {
  if (document.querySelector('[data-workspace-drawer-layer]')) return;
  const displayName = state.email
    ? state.email.split('@')[0].replace(/[._+-]+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Michael Nowosadko';
  const initial = (displayName || 'M').charAt(0).toUpperCase();
  let savedCreatedApp = null;
  try {
    savedCreatedApp = JSON.parse(localStorage.getItem(`${BUILDER_STORAGE_PREFIX}created-app`) || 'null');
  } catch {
    savedCreatedApp = null;
  }
  const primaryApp = savedCreatedApp?.name
    ? {
        id: savedCreatedApp.id || 'vendor-onboarding',
        name: String(savedCreatedApp.name),
        initial: String(savedCreatedApp.initial || savedCreatedApp.name.charAt(0)).toUpperCase(),
        status: savedCreatedApp.status === 'Live' ? 'live' : 'draft',
        buildSurface: 'NCB',
      }
    : { id: 'vendor-onboarding', name: 'Vendor Onboarding', initial: 'V', status: 'draft', buildSurface: 'NCB' };
  const recentApps = [
    primaryApp,
    { id: 'leave-approval', name: 'Leave approval', initial: 'L', status: 'live', buildSurface: 'NCB' },
    primaryApp.name === 'Vendor Onboarding'
      ? { id: 'kyc-onboarding', name: 'KYC Onboarding', initial: 'K', status: 'live', buildSurface: 'CLI' }
      : { id: 'vendor-onboarding', name: 'Vendor Onboarding', initial: 'V', status: 'draft', buildSurface: 'CLI' },
  ];

  try {
    const extra = JSON.parse(localStorage.getItem('eai-local-admin:workspace-apps') || '[]').filter(app => app.ws === state.ws);
    recentApps.unshift(...extra.map(app => ({...app, status:app.live ? 'live' : 'draft'})));
  } catch {}
  recentApps.forEach(app => {
    try { if (localStorage.getItem('eai-cli-app:' + state.ws + ':' + app.name)) app.buildSurface = 'CLI'; } catch {}
  });

  const currentAppId = params.get('app') || 'vendor-onboarding';
  const currentSurface = params.get('surface') || 'ncb';
  const currentProject = params.get('project') || document.querySelector('.bd-crumbs b')?.textContent.trim();
  const matchingApps = recentApps.filter(app => app.id === currentAppId && app.buildSurface.toLowerCase() === currentSurface);
  const selectedApp = matchingApps.find(app => app.name === currentProject) || matchingApps[0];
  const isCurrentApp = app => app === selectedApp;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="bd-workspace-drawer-layer" data-workspace-drawer-layer aria-hidden="true">
      <button class="bd-workspace-drawer-backdrop" type="button" data-workspace-drawer-close aria-label="Close workspace navigation"></button>
      <aside class="bd-workspace-drawer" id="bdWorkspaceDrawer" aria-label="Workspace navigation">
        <div class="bd-workspace-drawer-head">
          <button type="button" class="bd-workspace-company" data-company-dropdown aria-expanded="false" aria-controls="bdCompanyOptions">
            <span class="bd-workspace-company-icon">${dashboardIcon('building')}</span>
            <span><b>${esc(state.ws)}</b><small>Company platform</small></span>
            <svg class="bd-workspace-swap" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 9 4-4 4 4M8 15l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div id="bdCompanyOptions" class="bd-company-options" hidden>
            <label>Search companies<input type="search" placeholder="Search companies" aria-label="Search companies" /></label>
            <small>Companies</small>
            ${[[state.ws, 'L1'], ['Amazing Retail Group', 'L1'], ['Amazing Clothes Store', 'L2'], ['Amazing Electronics store', 'L2']].map(([name, level]) => `<button type="button" disabled data-company-label="${esc(name.toLowerCase())}" class="${level === 'L2' ? 'child' : ''}">${dashboardIcon('building')}<span>${esc(name)}</span><small>${level}</small></button>`).join('')}
          </div>
          <div class="bd-workspace-build-tabs" role="tablist" aria-label="How you build">
            <button class="on" type="button" role="tab" aria-selected="true">No Code Builder</button>
            <button type="button" role="tab" aria-selected="false" data-workspace-drawer-cli>${dashboardIcon('terminal')}CLI</button>
          </div>
        </div>

        <div class="bd-workspace-drawer-body">
          <nav class="bd-workspace-primary-nav" aria-label="Workspace">
            <a href="${adminHref('ws-home.html')}">${dashboardIcon('home')}<span>Home</span></a>
            <a href="${adminHref('ws-processes.html')}">${dashboardIcon('grid')}<span>All apps</span><i>${recentApps.length}</i></a>
            <a href="${adminHref('ws-templates.html')}">${dashboardIcon('template')}<span>Templates</span></a>
            <a href="${adminHref('ws-integrations.html')}">${dashboardIcon('plug')}<span>Integrations</span></a>
          </nav>

          <section class="bd-workspace-recents" aria-labelledby="bdWorkspaceRecentsTitle">
            <h2 id="bdWorkspaceRecentsTitle">Recent apps</h2>
            ${recentApps.map((app) => `
              <a ${isCurrentApp(app) ? 'class="on" aria-current="page"' : ''} href="${builderAppDashboardHref(app.id, app.name, app.buildSurface.toLowerCase())}">
                <span class="bd-workspace-app-icon">${esc(app.initial)}</span>
                <b>${esc(app.name)}</b>
                <span class="bd-workspace-app-kind" title="${app.buildSurface === 'NCB' ? 'No Code Builder' : 'Command line interface'}">${app.buildSurface}</span>
                <i class="${app.status}" aria-label="${app.status === 'live' ? 'Live' : 'Draft'}"></i>
              </a>`).join('')}
          </section>
        </div>

        <footer class="bd-workspace-drawer-foot">
          <a class="bd-workspace-settings-link" href="${adminHref('ws-home.html', { settings: 'users' })}">${dashboardIcon('gear')}<span>Workspace settings</span></a>
          <a class="bd-workspace-user-link" href="${adminHref('ws-home.html', { profile: '1' })}">
            <span class="bd-workspace-user-avatar">${esc(initial)}</span>
            <span><b>${esc(displayName)}</b><small>Owner</small></span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 10 4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </footer>
      </aside>
    </div>`);

  const layer = document.querySelector('[data-workspace-drawer-layer]');
  const companyToggle = layer.querySelector('[data-company-dropdown]');
  const companyMenu = layer.querySelector('#bdCompanyOptions');
  const closeCompany = () => { companyMenu.hidden = true; companyToggle.setAttribute('aria-expanded', 'false'); };
  companyToggle.addEventListener('click', () => {
    companyMenu.hidden = !companyMenu.hidden;
    companyToggle.setAttribute('aria-expanded', String(!companyMenu.hidden));
    if (!companyMenu.hidden) companyMenu.querySelector('input').focus();
  });
  companyMenu.querySelector('input').addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase().trim();
    companyMenu.querySelectorAll('[data-company-label]').forEach(row => { row.hidden = !row.dataset.companyLabel.includes(query); });
  });
  document.addEventListener('click', (event) => { if (!companyMenu.contains(event.target) && !companyToggle.contains(event.target)) closeCompany(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeCompany(); });

  const opener = document.querySelector('[data-workspace-drawer-open]');
  let closeTimer = null;

  function setOpen(open, restoreFocus = false) {
    clearTimeout(closeTimer);
    layer.classList.toggle('is-open', open);
    layer.setAttribute('aria-hidden', String(!open));
    opener.classList.toggle('is-open', open);
    opener.setAttribute('aria-expanded', String(open));
    opener.setAttribute('aria-label', open ? 'Close workspace navigation' : 'Open workspace navigation');
    document.body.classList.toggle('bd-workspace-drawer-open', open);
    if (!open && restoreFocus) {
      closeTimer = setTimeout(() => opener.focus({ preventScroll: true }), 260);
    }
  }

  opener.addEventListener('click', () => setOpen(!layer.classList.contains('is-open')));
  layer.querySelectorAll('[data-workspace-drawer-close]').forEach((button) => {
    button.addEventListener('click', () => setOpen(false, true));
  });
  layer.querySelector('[data-workspace-drawer-cli]').addEventListener('click', () => {
    setOpen(false);
    goCli('workspace-drawer');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && layer.classList.contains('is-open') && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      setOpen(false, true);
    }
  });

  if (params.get('drawer') === 'open') {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.remove('bd-workspace-drawer-preopen');
    }));
  }
}

mountWorkspaceDrawer();
window.alignEaiBuilderColumns?.();
};

window.alignEaiBuilderColumns = function() {
  const body = document.body;
  if (body.classList.contains('bd-chat-first') && !body.classList.contains('bd-full-header')) return;
  if (body.classList.contains('bd-preview-only')) return;
  const chat = document.querySelector('#bdChat');
  const header = document.querySelector('.bd-top');
  const bar = document.querySelector('.mkt-wf-bar') || document.querySelector('.bd-pv-bar');
  if (!chat || !header || !bar) return;
  body.classList.add('bd-column-headers');
  const sidebarOpener = document.querySelector('[data-workspace-drawer-open]');
  if (sidebarOpener && !sidebarOpener.querySelector('img')) {
    const logo = document.createElement('img');
    logo.src = location.pathname.includes('/admin/') ? '../../assets/logos/eai-mark-dark.svg' : '../assets/logos/eai-mark-dark.svg';
    logo.alt = '';
    sidebarOpener.prepend(logo);
    sidebarOpener.classList.add('bd-sidebar-opener-logo');
  }

  const cli = body.classList.contains('bd-cli-app');
  if (!cli) chat.prepend(header);
  else if (chat.contains(header)) {
    const layout = chat.closest('.bd-body');
    layout?.before(header);
  }
  const actions = document.querySelector('.bd-top-acts');
  if (actions && cli) header.appendChild(actions);
  if (actions && !cli) {
    const right = bar.querySelector('.bd-preview-actions') || bar;
    right.appendChild(actions);
  }
  if (!bar.querySelector('[data-workspace-opener-backup]')) {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.className = 'bd-workspace-opener-backup bd-sidebar-logo-toggle';
    opener.dataset.workspaceOpenerBackup = '';
    opener.setAttribute('aria-label', 'Open workspace sidebar');
    opener.setAttribute('aria-controls', 'bdWorkspaceDrawer');
    opener.innerHTML = `<img alt="" src="${location.pathname.includes('/admin/') ? '../../assets/' : '../assets/'}logos/eai-mark-dark.svg"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>`;
    opener.addEventListener('click', () => document.querySelector('[data-workspace-drawer-open]')?.click());
    bar.prepend(opener);
  }
  const panelIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-11-3 3 3 3"/></svg>';
  if (!cli && !header.querySelector('[data-close-chat]')) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'bd-chat-panel-button';
    close.dataset.closeChat = '';
    close.setAttribute('aria-label', 'Close chat panel');
    close.setAttribute('aria-controls', 'bdChat');
    close.title = 'Close chat panel';
    close.innerHTML = panelIcon;
    close.addEventListener('click', () => {
      body.classList.add('bd-chat-panel-closed');
      document.querySelector('[data-open-chat]')?.focus();
    });
    header.appendChild(close);
  }
  if (!cli && !bar.querySelector('[data-open-chat]')) {
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'bd-chat-panel-button bd-chat-panel-reopen';
    open.dataset.openChat = '';
    open.setAttribute('aria-label', 'Open chat panel');
    open.setAttribute('aria-controls', 'bdChat');
    open.title = 'Open chat panel';
    open.innerHTML = panelIcon;
    open.addEventListener('click', () => {
      body.classList.remove('bd-chat-panel-closed');
      header.querySelector('[data-close-chat]')?.focus();
    });
    bar.prepend(open);
  }
  const drawer = document.querySelector('#bdWorkspaceDrawer');
  if (drawer && !drawer.querySelector('.bd-sidebar-brand')) {
    const brand = document.createElement('div');
    brand.className = 'bd-sidebar-brand';
    const img = document.createElement('img');
    img.src = location.pathname.includes('/admin/') ? '../../assets/logos/eai-mark-dark.svg' : '../assets/logos/eai-mark-dark.svg';
    img.alt = 'EAI';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'bd-sidebar-logo-toggle';
    close.setAttribute('aria-label', 'Close sidebar');
    close.setAttribute('aria-controls', 'bdWorkspaceDrawer');
    close.title = 'Close sidebar';
    close.innerHTML = panelIcon;
    close.prepend(img);
    close.addEventListener('click', () => {
      document.querySelector('[data-workspace-drawer-open]')?.click();
      document.querySelector('[data-workspace-drawer-open]')?.focus();
    });
    brand.appendChild(close);
    drawer.prepend(brand);
  }
};
