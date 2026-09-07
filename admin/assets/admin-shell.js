/* ------------------------------------------------------------------
   Shell renderer + router for the admin/settings prototype.

   Each page ships only its pane markup in <div id="adPane">. This file
   builds the chrome around it, so the sidebar, the rail and the active
   states are defined once instead of copied into eight files.

   Pages opt in with body data attributes:
     data-ad-shell="ws" | "app"
     data-ad-nav       which workspace sidebar row is lit
     data-ad-title     what the workspace topbar says
     data-ad-rail      which app rail row is lit
     data-ad-client    client id, when a client is open
     data-ad-app       process id (defaults to kyc-onboarding)

   NAVIGATION
   ----------
   These are eight separate files, which is right for the address bar and
   for how the real product would route — but a document load repaints
   the whole window, so moving between two screens that share a sidebar
   flashed white every time. Clicking a client should feel like changing
   a selection, not like leaving the page.

   So links between the admin pages are intercepted: fetch the target,
   swap the pane, re-light the nav, push the URL. The chrome is rebuilt
   synchronously from the same template, so nothing flickers, and the
   destination page's own script is re-run inside a function scope (its
   top-level `const`s would otherwise collide on the second visit).

   Everything else — real links out to home.html, builder.html, an
   external URL — falls through to the browser untouched.
------------------------------------------------------------------- */

(function () {
  const D = window.ADMIN;
  if (!D || !document.body.dataset.adShell) return;

  /* The pages this router owns. A link to anything else is a real link. */
  const ROUTES = [
    'builder.html', 'ws-home.html', 'ws-processes.html', 'ws-cli.html', 'ws-templates.html', 'ws-integrations.html',
    'ws-users.html', 'ws-settings.html', 'ws-advanced-settings.html', 'profile.html',
    'app-overview.html', 'app-submissions.html', 'app-analytics.html', 'app-users.html', 'app-general.html', 'app-configure.html', 'app-clients.html', 'app-client.html',
  ];

  const I = {
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    template: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    plug: '<path d="M12 22v-5M9 8V2M15 8V2M7 8h10v4a4 4 0 0 1-8 0V8z"/>',
    data: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h6"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
    warn: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    bell: '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    person: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    exit: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    up: '<path d="m5 15 7-7 7 7"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    open: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
    download: '<path d="M12 15V3M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5"/>',
    calendar: '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    move: '<path d="M18 8l4 4-4 4M2 12h20"/>',
    userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    sparkle: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    swap: '<path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>',
    gem: '<path d="M6 3h12l4 7-10 13L2 10z"/>',
    logo: '<rect x="3" y="3" width="18" height="18" rx="5"/><rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor"/>',
    report: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 17v-4M13 17v-7M17 17v-2"/>',
    workflow: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 6h8M6 8v8M8 18c6 0 10-4 10-10"/>',
    checklist: '<path d="M9 6h11M9 12h11M9 18h11M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2M9 15l-3-3c1.1-2.8 3.4-5.4 6.1-7.1C14.7 3.3 18 2.5 21.5 2.5c0 3.5-.8 6.8-2.4 9.4C17.4 14.6 14.8 16.9 12 18z"/><circle cx="15.5" cy="8.5" r="2"/>',
  };

  function svg(name, cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;
  }
  window.adIcon = svg;

  /* ---------------------------------------------------------- toast */
  let toastEl;
  function toast(msg) {
    if (!toastEl || !toastEl.isConnected) {
      toastEl = document.createElement('div');
      toastEl.className = 'ad-toast';
      toastEl.hidden = true;
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }
  window.adToast = toast;

  /* ---------------------------------------------- persistent demo state */
  const DEMO_STORAGE_PREFIX = 'eai-local-admin:';
  function demoRead(key, fallback) {
    try {
      const value = localStorage.getItem(`${DEMO_STORAGE_PREFIX}${key}`);
      return value === null ? fallback : JSON.parse(value);
    } catch (err) {
      return fallback;
    }
  }
  function demoWrite(key, value) {
    try {
      localStorage.setItem(`${DEMO_STORAGE_PREFIX}${key}`, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }
  window.adDemoStore = { read: demoRead, write: demoWrite };
  const signedInUser = demoRead('signed-in-user', null);
  if (signedInUser?.name) {
    D.user.name = String(signedInUser.name);
    D.user.av = D.user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || D.user.av;
  }
  if (signedInUser?.email) D.user.email = String(signedInUser.email);
  const savedProfile = demoRead('profile', null);
  if (savedProfile?.name) {
    D.user.name = String(savedProfile.name);
    D.user.av = D.user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || D.user.av;
  }
  if (savedProfile?.title) D.user.title = String(savedProfile.title);
  if (D.members?.length) {
    D.members[0] = {
      ...D.members[0],
      av: D.user.av,
      name: D.user.name,
      email: D.user.email,
    };
  }

  D.workspace.name = 'Amazing Pet Store';
  D.workspace.initial = 'A';

  const createdApp = demoRead('created-app', null);
  if (createdApp?.name) {
    const app = D.processes.find((process) => process.id === 'vendor-onboarding');
    if (app) {
      Object.assign(app, {
        name: String(createdApp.name),
        initial: String(createdApp.initial || createdApp.name.charAt(0)).toUpperCase(),
        subtitle: 'Built with EAI',
        desc: String(createdApp.prompt || app.desc),
        status: createdApp.status === 'Live' ? 'Live' : 'Draft',
        live: createdApp.status === 'Live',
        seen: 'Just now',
        hoursAgo: 0,
        url: String(createdApp.url || '—'),
      });
    }
  }

  /* --------------------------------------------------------- state */
  /* `?app=` and `?client=` are resolved through the seed rather than used
     as written. Both end up inside hrefs built with innerHTML, so taking
     the id off the resolved record — never the raw query string — is what
     stops a hand-typed URL from reaching the DOM. It is also the more
     correct behaviour: an unknown id already falls back to the first
     record, and the links should follow it there. */
  function state() {
    const b = document.body.dataset;
    const p = new URLSearchParams(location.search);
    const app = D.process(p.get('app') || b.adApp || '');
    const rawClient = p.get('client') || b.adClient || '';
    const michaelDemo = p.get('demo') === 'michael';
    const settingsLayout = p.get('workspaceSettings') === 'sidebar' ? 'sidebar' : 'popup';
    const file = location.pathname.split('/').pop();
    let nav = b.adNav || '';
    let rail = b.adRail || '';
    if (michaelDemo && file === 'ws-settings.html') {
      if (p.get('tab') === 'general') nav = 'company-information';
      if (p.get('tab') === 'billing') nav = 'plan-billing';
    }
    if (file === 'app-configure.html') {
      const section = ['workflow', 'resources', 'ai', 'connections'].includes(p.get('section')) ? p.get('section') : 'resources';
      rail = `configure-${section}`;
    }
    return {
      shell: b.adShell,
      embedded: p.get('embedded') === '1',
      nav,
      title: b.adTitle || 'Home',
      rail,
      hero: b.adHero === '1',
      narrow: b.adNarrow === '1',
      wide: b.adWide === '1',
      mode: b.adMode || 'ncb',
      michaelDemo,
      settingsLayout,
      appId: app.id,
      app,
      clientId: rawClient ? D.client(rawClient, app.id).id : '',
    };
  }

  /* ------------------------------------------------------ ws shell */
  function michaelHref(s, href) {
    if (!href || !s.michaelDemo) return href;
    let target = `${href}${href.includes('?') ? '&' : '?'}demo=michael`;
    if (s.settingsLayout === 'sidebar') target += '&workspaceSettings=sidebar';
    return target;
  }

  function michaelBuilderAppHref(s, appOrId, section = 'overview', buildSurface = 'ncb') {
    const app = typeof appOrId === 'string' ? D.process(appOrId) : appOrId;
    if (!s.michaelDemo) return `app-overview.html?app=${encodeURIComponent(app.id)}`;
    const company = michaelActiveCompany();
    const query = new URLSearchParams({
      prompt: app.name,
      project: app.name,
      published: app.status === 'Live' ? '1' : '0',
      app: app.id,
      ws: company.name,
      email: D.user.email,
      surface: buildSurface,
      view: buildSurface === 'ncb' && section === 'overview' ? 'preview' : 'dashboard',
      source: 'workspace',
      drawer: 'open',
    });
    if (app.companyId && buildSurface === 'ncb' && section === 'overview') {
      query.set('experience', 'full');
      query.set('workspaceApp', '1');
      query.set('prompt', app.prompt || app.name);
      return '../../build-web/builder-chat-first.html?' + query.toString();
    }
    if (section && section !== 'overview') query.set('section', section);
    return `builder.html?${query.toString()}`;
  }
  window.adBuilderAppHref = (appId, section = 'overview') => michaelBuilderAppHref(state(), D.process(appId), section);

  function wsItem(s, id, icon, label, href, extra) {
    const on = s.nav === id ? ' on' : '';
    const tail = extra || '';
    const target = michaelHref(s, href);
    return target
      ? `<a class="ad-item${on}" href="${target}">${svg(icon)}<span>${label}</span>${tail}</a>`
      : `<button class="ad-item${on}" type="button" data-stub>${svg(icon)}<span>${label}</span>${tail}</button>`;
  }

  const MICHAEL_COMPANIES = [
    { id: 'northwind-ops', name: 'Amazing Pet Store', level: 'L1', depth: 0 },
    { id: 'northwind-group', name: 'Amazing Retail Group', level: 'L1', depth: 0 },
    { id: 'northwind-logistics', name: 'Amazing Clothes Store', level: 'L2', depth: 1, parent: 'northwind-group' },
    { id: 'northwind-digital', name: 'Amazing Electronics store', level: 'L2', depth: 1, parent: 'northwind-group' },
  ];
  const MICHAEL_COMPANY_APPS = {
    'northwind-group': ['kyc-onboarding', 'leave-approval', 'candidate-screening', 'vendor-onboarding', 'invoice-processing'],
    'northwind-ops': ['kyc-onboarding', 'leave-approval', 'vendor-onboarding'],
    'northwind-logistics': ['vendor-onboarding', 'invoice-processing'],
    'northwind-digital': ['candidate-screening', 'kyc-onboarding'],
  };
  const MICHAEL_LEGACY_COMPANY_NAMES = {
    'northwind-group': 'Northwind Group',
    'northwind-ops': 'Northwind Ops',
    'northwind-logistics': 'Northwind Logistics',
    'northwind-digital': 'Northwind Digital',
  };
  MICHAEL_COMPANIES.forEach((company) => {
    const saved = demoRead(`workspace-${company.id}`, {});
    if (saved.name && saved.name !== MICHAEL_LEGACY_COMPANY_NAMES[company.id]) company.name = String(saved.name);
  });
  let michaelCompanySelection = demoRead('active-company', 'northwind-ops');

  function michaelActiveCompany() {
    return MICHAEL_COMPANIES.find((company) => company.id === michaelCompanySelection) || MICHAEL_COMPANIES[0];
  }
  window.adActiveCompany = michaelActiveCompany;

  function michaelCompanyPreferences(company) {
    const target = company || michaelActiveCompany();
    return {
      name: target.name,
      region: D.workspace.region,
      defaultRole: 'Builder',
      ...demoRead(`workspace-${target.id}`, {}),
    };
  }

  function saveMichaelCompanyPreferences(company, preferences) {
    const next = { ...michaelCompanyPreferences(company), ...preferences };
    company.name = next.name;
    demoWrite(`workspace-${company.id}`, next);
    return next;
  }

  const MICHAEL_DEFAULT_APP_RESOURCES = ['supplier-compliance-policy', 'vendor-due-diligence-pack'];
  const MICHAEL_KNOWLEDGE_RESOURCES = [
    { id: 'supplier-compliance-policy', name: 'Supplier compliance policy', desc: 'Rules and guidance for supplier assessment' },
    { id: 'procurement-operating-guide', name: 'Procurement operating guide', desc: 'Approved purchasing and escalation procedures' },
    { id: 'customer-identity-standard', name: 'Customer identity standard', desc: 'Verification requirements for customer-facing apps' },
  ];

  function michaelAppResourceIds(companyId, appId) {
    const saved = demoRead(`app-tenant-config-${companyId}-${appId}`, null);
    return Array.isArray(saved?.resources) ? saved.resources : MICHAEL_DEFAULT_APP_RESOURCES;
  }

  function michaelWorkspaceAddedUsers(company) {
    const saved = demoRead(`workspace-users-${company.id}`, []);
    return Array.isArray(saved) ? saved : [];
  }

  function michaelWorkspaceUserRows(company) {
    return [...D.members.map((member) => ({ ...member, fixed: true })), ...michaelWorkspaceAddedUsers(company)].map((member) => {
      const pending = member.pending || member.status === 'Invite sent';
      return `
        <div class="ad-settings-member-row" data-workspace-member-id="${esc(member.id || member.email)}">
          <span class="ad-avatar${pending ? ' dim' : ''}">${esc(member.av || '?')}</span>
          <span class="tx"><b>${esc(member.name)}</b><small>${esc(member.email)}</small></span>
          <span class="ad-role">${esc(member.role)}</span>
          <span class="ad-badge ${pending ? 'grey' : 'green'}"><span class="dot"></span>${pending ? 'Invite sent' : 'Active'}</span>
          ${member.fixed ? '<span class="ad-settings-member-action"></span>' : `<button class="ad-settings-member-action" type="button" data-workspace-user-remove="${esc(member.id)}" aria-label="Remove ${esc(member.name)}">${svg('exit')}</button>`}
        </div>`;
    }).join('');
  }

  function michaelCompanyProcesses() {
    const ids = MICHAEL_COMPANY_APPS[michaelActiveCompany().id] || [];
    const apps = ids.map((id) => D.processes.find((process) => process.id === id)).filter(Boolean);
    const extra = D.processes.filter(app => app.companyId === michaelActiveCompany().id && !ids.includes(app.id));
    if (extra.length) return [...extra, ...apps];
    if (createdApp?.name && michaelActiveCompany().id === 'northwind-ops') {
      return apps.sort((a, b) => (a.id === 'vendor-onboarding' ? -1 : b.id === 'vendor-onboarding' ? 1 : 0));
    }
    return apps;
  }
  window.adCompanyProcesses = michaelCompanyProcesses;

  function michaelCompanyPicker() {
    const active = michaelActiveCompany();
    return `
      <div class="ad-company-picker">
        <button class="ad-ws-switch" type="button" data-company-toggle aria-expanded="false" aria-haspopup="listbox" aria-controls="adCompanyMenu">
          <span class="tile">${svg('building')}</span>
          <span class="tx"><b data-company-current-name>${esc(active.name)}</b><small>Company platform</small></span>
          ${svg('swap')}
        </button>
        <div class="ad-company-menu" id="adCompanyMenu" data-company-menu hidden>
          <label class="ad-company-search">
            ${svg('search')}
            <input type="search" data-company-search placeholder="Search companies" autocomplete="off" aria-label="Search companies" />
          </label>
          <div class="ad-company-label">Companies</div>
          <div class="ad-company-list" role="listbox" aria-label="Companies">
            ${MICHAEL_COMPANIES.map((company) => `
              <button class="ad-company-row depth-${company.depth}${company.id === active.id ? ' on' : ''}" type="button" disabled role="option" aria-disabled="true" aria-selected="${company.id === active.id}" data-company-id="${company.id}" data-company-parent="${company.parent || ''}" data-company-name="${esc(company.name.toLowerCase())}">
                ${company.depth ? '<span class="branch" aria-hidden="true"></span>' : ''}
                <span class="company-icon">${svg('building')}</span>
                <span class="company-name">${esc(company.name)}</span>
                <span class="company-level">${company.level}</span>
              </button>`).join('')}
          </div>
          <p class="ad-company-empty" data-company-empty hidden>No companies found</p>
        </div>
      </div>`;
  }

  const MICHAEL_WORKSPACE_SETTINGS = [
    {
      group: 'Workspace',
      items: [
        { id: 'users', icon: 'users', title: 'Users & roles', desc: 'Manage workspace access, roles and invitations', keywords: 'members people permissions seats invite', custom: true },
        { id: 'company', icon: 'building', title: 'Company information', desc: 'Workspace identity and company details', keywords: 'business organisation organization name profile', custom: true },
        { id: 'billing', icon: 'card', title: 'Plan & billing', desc: 'Plan, seats, invoices and payment details', keywords: 'subscription cost usage credits receipts', custom: true },
      ],
    },
    {
      group: 'Resources',
      items: [
        { id: 'templates-library', icon: 'template', title: 'Templates', desc: 'Reusable app scaffolds', keywords: 'starter apps forms', href: 'ws-templates.html', action: 'Manage templates' },
        { id: 'knowledge', icon: 'data', title: 'Knowledge', desc: 'Knowledge bases the chatbot uses', keywords: 'rag content sources data' },
        { id: 'documents', icon: 'file', title: 'Documents', desc: 'Shared document sets', keywords: 'files uploads content' },
        { id: 'additional-assets', icon: 'gem', title: 'Additional assets', desc: 'Other reusable files and media', keywords: 'resources uploads images' },
      ],
    },
    {
      group: 'AI & workflows',
      items: [
        { id: 'model-profiles', icon: 'sliders', title: 'Model profiles', desc: 'Default model apps inherit', keywords: 'ai llm defaults' },
        { id: 'prompt-configuration', icon: 'terminal', title: 'Prompt configuration', desc: 'Shared prompt and guardrail defaults', keywords: 'instructions system safety ai' },
        { id: 'workflow-templates', icon: 'zap', title: 'Workflow templates', desc: 'Shared workflows apps start from', keywords: 'automation flows process' },
      ],
    },
    {
      group: 'Connections',
      items: [
        { id: 'workspace-integrations', icon: 'plug', title: 'Integrations', desc: 'Connect once, then enable in apps', keywords: 'connections plugins external tools', href: 'ws-integrations.html', action: 'Manage integrations' },
        { id: 'services', icon: 'grid', title: 'Services', desc: 'Backend services apps draw on', keywords: 'api backend tools capabilities' },
      ],
    },
    {
      group: 'Governance & operations',
      items: [
        { id: 'analytics', icon: 'chart', title: 'Analytics', desc: 'Workspace usage and performance reporting', keywords: 'insights reports metrics', custom: true },
        { id: 'audit', icon: 'file', title: 'Audit log', desc: 'Administrative actions and security events', keywords: 'history activity compliance', custom: true },
        { id: 'inheritance-defaults', icon: 'building', title: 'Inheritance & defaults', desc: 'Values child companies and apps inherit', keywords: 'policies organisation organization children' },
        { id: 'bootstrap-health', icon: 'chart', title: 'Bootstrap health', desc: 'System status and setup checks', keywords: 'diagnostics monitoring checks', action: 'Run health check' },
      ],
    },
  ];

  function michaelWorkspaceSettingsNav() {
    return MICHAEL_WORKSPACE_SETTINGS.map((section) => `
      <div class="ad-settings-nav-label" data-settings-group-label>${esc(section.group)}</div>
      <nav class="ad-settings-nav-group">
        ${section.items.map((item) => item.id === 'billing' ? `
          <div class="ad-settings-billing-nav">
            <button class="ad-settings-nav-item ad-settings-billing-toggle" type="button" data-settings-billing-toggle aria-expanded="false">
              ${svg(item.icon)}<span>${esc(item.title)}</span>${svg('chev', 'billing-chev')}
            </button>
            <div class="ad-settings-subnav" data-settings-billing-subnav hidden>
              <button class="ad-settings-subnav-item" type="button" data-settings-pane="billing-plans" aria-selected="false">Plans &amp; payment</button>
              <button class="ad-settings-subnav-item" type="button" data-settings-pane="billing-usage" aria-selected="false">Usage</button>
            </div>
          </div>` : `<button class="ad-settings-nav-item${item.id === 'users' ? ' on' : ''}" type="button" data-settings-pane="${item.id}" data-settings-search="${esc(`${section.group} ${item.title} ${item.desc} ${item.keywords || ''}`)}" aria-selected="${item.id === 'users'}">${svg(item.icon)}<span>${esc(item.title)}</span></button>`).join('')}
      </nav>`).join('');
  }

  function michaelWorkspaceSettingsPanels(s) {
    return MICHAEL_WORKSPACE_SETTINGS.flatMap((section) => section.items).filter((item) => !item.custom).map((item) => {
      if (item.id === 'knowledge') {
        const company = michaelActiveCompany();
        const apps = michaelCompanyProcesses();
        return `
          <section class="ad-settings-panel" data-settings-panel="knowledge" hidden>
            <div class="ad-settings-panel-head">
              <h3>Knowledge</h3>
              <p>Manage shared knowledge and choose which apps can use each resource.</p>
            </div>
            <div class="ad-settings-resource-list">
              <div class="ad-settings-resource-list-head">
                <div><b>Knowledge resources</b><span>Available in ${esc(company.name)}</span></div>
                <button class="ad-btn" type="button" data-stub>New resource</button>
              </div>
              ${MICHAEL_KNOWLEDGE_RESOURCES.map((resource) => {
                const assignedApps = apps.filter((app) => michaelAppResourceIds(company.id, app.id).includes(resource.id));
                return `
                  <div class="ad-settings-resource-row" data-workspace-resource="${resource.id}">
                    <span class="ad-settings-resource-icon">${svg('data')}</span>
                    <span class="tx"><b>${esc(resource.name)}</b><small>${esc(resource.desc)}</small></span>
                    <span class="ad-settings-resource-apps" data-resource-app-count="${resource.id}">${assignedApps.length ? `Used by ${assignedApps.length} ${assignedApps.length === 1 ? 'app' : 'apps'}` : 'Not used by an app'}</span>
                    <button class="ad-btn sm" type="button" data-resource-push="${resource.id}" data-resource-name="${esc(resource.name)}">Add to app</button>
                  </div>`;
              }).join('')}
            </div>
            <div class="ad-settings-resource-push" data-resource-push-panel hidden>
              <div class="tx"><b data-resource-push-title>Add resource to an app</b><span>The app will be able to use this workspace-managed resource.</span></div>
              <label><span>App</span><select data-resource-app-select aria-label="Choose an app">${apps.map((app) => `<option value="${app.id}">${esc(app.name)}</option>`).join('')}</select></label>
              <div class="actions">
                <button class="ad-btn" type="button" data-resource-push-cancel>Cancel</button>
                <button class="ad-btn dark" type="button" data-resource-push-confirm>Add resource</button>
              </div>
            </div>
          </section>`;
      }
      const action = item.action || 'Configure';
      const control = item.href
        ? `<a class="ad-btn dark" href="${michaelHref(s, item.href)}">${esc(action)}${svg('right')}</a>`
        : `<button class="ad-btn dark" type="button" data-stub>${esc(action)}</button>`;
      return `
        <section class="ad-settings-panel" data-settings-panel="${item.id}" hidden>
          <div class="ad-settings-panel-head">
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.desc)}.</p>
          </div>
          <div class="ad-settings-feature-card">
            <span class="ad-settings-feature-icon">${svg(item.icon)}</span>
            <div class="tx"><b>${esc(item.title)} settings</b><p>Configure the workspace defaults available to your apps.</p></div>
            ${control}
          </div>
        </section>`;
    }).join('');
  }

  function michaelRecentApps(s) {
    const companyApps = michaelCompanyProcesses();
    const leaveApproval = D.processes.find((process) => process.id === 'leave-approval');
    const vendorOnboarding = D.processes.find((process) => process.id === 'vendor-onboarding');
    const kycOnboarding = D.processes.find((process) => process.id === 'kyc-onboarding');
    const primaryApp = companyApps.find(app => app.id === 'vendor-onboarding') || companyApps[0];
    const cliApp = primaryApp?.name === 'Vendor Onboarding'
      ? kycOnboarding
      : vendorOnboarding && {
          ...vendorOnboarding,
          name: 'Vendor Onboarding',
          initial: 'V',
          subtitle: 'Supplier checks · Procurement',
          status: 'Draft',
          live: false,
        };
    const recentApps = createdApp?.name && michaelActiveCompany().id === 'northwind-ops'
      ? [
          primaryApp,
          leaveApproval,
          cliApp,
        ].filter(Boolean)
      : companyApps.slice(0, 3);
    const additional = companyApps.filter(app => app.companyId && !recentApps.some(item => item.id === app.id));
    return [...additional, ...recentApps].map((process, index) => {
      let buildSurface = process.buildSurface ? process.buildSurface.toLowerCase() : index < 2 ? 'ncb' : 'cli';
      try { if (localStorage.getItem('eai-cli-app:' + michaelActiveCompany().name + ':' + process.name)) buildSurface = 'cli'; } catch {}
      return `
      <a class="ad-recent-app" href="${michaelBuilderAppHref(s, process, 'overview', buildSurface)}">
        <span class="av">${esc(process.initial)}</span>
        <span class="tx">${esc(process.name)}</span>
        <span class="surface-tag" title="${buildSurface === 'ncb' ? 'No Code Builder' : 'Command line interface'}">${buildSurface === 'ncb' ? 'NCB' : 'CLI'}</span>
        <i class="${process.live ? 'live' : 'draft'}" aria-label="${esc(process.status)}"></i>
      </a>`;
    }).join('');
  }

  function michaelHomeRecentApps(s) {
    return michaelCompanyProcesses().slice(0, 3).map((process, index) => `
      <a class="ad-t-r" href="${michaelBuilderAppHref(s, process, 'overview', index < 2 ? 'ncb' : 'cli')}">
        <span class="tx"><b>${esc(process.name)}</b><span>${esc(process.subtitle)}</span></span>
        <span class="st">${process.status === 'Live' ? '<i class="live"></i>' : '<i class="draft"></i>'}${esc(process.status)}</span>
        <span class="ago">${esc(process.seen)}</span>
      </a>`).join('');
  }

  function refreshMichaelCompanyApps(root) {
    const s = state();
    const sideList = root.querySelector('[data-company-recent-apps]');
    if (sideList) sideList.innerHTML = `<div class="ad-nav-label">Recent apps</div>${michaelRecentApps(s)}`;
    root.querySelectorAll('[data-company-app-count]').forEach((el) => { el.textContent = String(michaelCompanyProcesses().length); });
    const homeList = root.querySelector('#recent');
    if (homeList) homeList.innerHTML = michaelHomeRecentApps(s);
  }

  function michaelUserMenu(s, u) {
    return `
      <div class="ad-user-menu-wrap">
        <button class="ad-user${s.nav === 'profile' ? ' on' : ''}" type="button" data-user-menu-toggle aria-expanded="false" aria-haspopup="menu" aria-controls="adUserMenu">
          <span class="av">${esc(u.av)}</span>
          <span class="tx"><b>${esc(u.name)}</b><span>${esc(u.role)}</span></span>
          ${svg('chev')}
        </button>
        <div class="ad-user-menu" id="adUserMenu" role="menu" aria-label="User menu" hidden>
          <div class="ad-user-menu-head">
            <span class="av">${esc(u.av)}</span>
            <span class="tx"><b>${esc(u.name)}</b><span>${esc(u.email)}</span></span>
          </div>
          <div class="ad-user-menu-items">
            <button class="ad-user-menu-item" type="button" role="menuitem" data-profile-open>${svg('person')}<span>Profile</span></button>
            <button class="ad-user-menu-item" type="button" role="menuitem" data-stub>${svg('theme')}<span>Light mode</span></button>
          </div>
          <div class="ad-user-menu-items split">
            <button class="ad-user-menu-item" type="button" role="menuitem" data-stub>${svg('file')}<span>Documentation</span></button>
            <button class="ad-user-menu-item" type="button" role="menuitem" data-stub>${svg('warn')}<span>Report bug</span></button>
          </div>
          <div class="ad-user-menu-items split">
            <button class="ad-user-menu-item" type="button" role="menuitem" data-stub>${svg('exit')}<span>Sign out</span></button>
          </div>
        </div>
      </div>`;
  }

  function michaelProfileModal(s, w, u) {
    const profilePreferences = demoRead('profile', {
      name: u.name,
      title: u.title,
      notifications: true,
    });
    const surface = D.harness.surface === 'cli' ? ['CLI'] : D.harness.surface === 'nocode' ? ['No-code'] : ['No-code', 'CLI'];
    const workspaces = [
      { initial: w.initial, name: w.name, meta: `${D.processes.length} apps · 42 credits left`, role: 'Owner', dark: true },
      { initial: 'B', name: 'Bendigo pilot', meta: '1 app · guest access', role: 'Builder', dark: false },
    ];
    const workspaceRows = workspaces.map((workspace) => `
      <div class="ad-c-row">
        <span class="ad-avatar sq" style="${workspace.dark ? 'background:#18181B;color:#fff;' : 'background:var(--ad-line);color:var(--ad-ink-3);'}width:28px;height:28px;flex-basis:28px;">${esc(workspace.initial)}</span>
        <div class="tx" style="flex:1;min-width:0;"><b>${esc(workspace.name)}</b></div>
        <span class="ad-profile-workspace-meta">${esc(workspace.meta)}</span>
        <span class="ad-role">${esc(workspace.role)}</span>
      </div>`).join('');
    return `
      <div class="ad-settings-modal-layer ad-profile-modal-layer" id="adProfileModal" data-profile-modal hidden>
        <section class="ad-settings-modal-window ad-profile-modal-window" role="dialog" aria-modal="true" aria-labelledby="adProfileModalTitle">
          <header class="ad-settings-modal-head">
            <div class="ad-settings-modal-title">${svg('person')}<h2 id="adProfileModalTitle">Profile</h2></div>
            <button class="ad-settings-modal-close" type="button" data-profile-close aria-label="Close profile">&times;</button>
          </header>
          <div class="ad-profile-modal-content">
            <div class="ad-profile-modal-panel">
              <div class="ad-profile-modal-heading">
                <div><h3>Your profile</h3><p>How you appear to everyone you build with.</p></div>
                <button class="ad-btn dark" type="button" data-profile-save>Save changes</button>
              </div>

              <div class="ad-c pad ad-profile-details-card">
                <div class="ad-profile-details">
                  <div class="ad-profile-avatar-column">
                    <div class="ad-profile-avatar" data-profile-avatar>${esc(u.av)}</div>
                    <button type="button" class="ad-link" data-stub>Change photo</button>
                  </div>
                  <div class="ad-profile-fields">
                    <div class="ad-f-row">
                      <div class="ad-f"><label for="adProfileName">Full name</label><input id="adProfileName" type="text" value="${esc(profilePreferences.name || u.name)}" data-profile-name /></div>
                      <div class="ad-f"><label for="adProfileTitle">What you do</label><input id="adProfileTitle" type="text" value="${esc(profilePreferences.title || u.title)}" data-profile-title /></div>
                    </div>
                    <div class="ad-f"><label>Email</label><div class="ctl read"><span class="grow">${esc(u.email)}</span><span class="ad-badge green">Verified</span></div></div>
                  </div>
                </div>
              </div>

              <div class="ad-c">
                <div class="ad-c-hd"><div><h2>Your workspaces</h2><p class="sub">Your role is set by each workspace owner.</p></div></div>
                ${workspaceRows}
              </div>

              <div class="ad-c">
                <div class="ad-c-row" style="border-top:0;">
                  <div class="tx" style="flex:1;min-width:0;"><b>How you build</b><span>${esc(`${surface.join(' and ')}, running ${D.harness.agent}. Inherited from ${w.name}.`)}</span></div>
                  <div class="ad-profile-harness-chips">${surface.map((label) => `<span class="ad-chip">${esc(label)}</span>`).join('')}</div>
                  <button class="ad-btn sm" type="button" data-stub data-stub-label="Changing how you build">Change</button>
                </div>
                <div class="ad-c-row">
                  <div class="tx"><b>Notifications</b><span>Daily digest of submissions that need you.</span></div>
                  <button class="ad-toggle${profilePreferences.notifications === false ? '' : ' on'}" type="button" data-profile-notifications aria-label="Daily notification digest" aria-pressed="${profilePreferences.notifications === false ? 'false' : 'true'}"><i></i></button>
                </div>
                <div class="ad-c-row">
                  <div class="tx"><b>Sign-in &amp; security</b><span>Microsoft Entra ID · last signed in 2 minutes ago</span></div>
                  <button class="ad-btn sm" type="button" data-stub>Manage</button>
                </div>
              </div>

              <div class="ad-c ad-profile-danger">
                <div class="ad-c-row" style="border-top:0;">
                  <div class="tx"><b>Sign out everywhere</b><span>Ends every session on every device, including this one.</span></div>
                  <button class="ad-btn sm" type="button" data-stub>Sign out everywhere</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>`;
  }

  function michaelSettingsModal(s, w) {
    const activeCompany = michaelActiveCompany();
    const companyPreferences = michaelCompanyPreferences(activeCompany);
    const parentCompany = MICHAEL_COMPANIES.find((company) => company.id === activeCompany.parent);
    return `
      <div class="ad-settings-modal-layer" id="adWorkspaceSettings" data-settings-modal hidden>
        <section class="ad-settings-modal-window" ${s.settingsLayout === 'sidebar' ? 'role="region" aria-label="Workspace settings"' : 'role="dialog" aria-modal="true" aria-labelledby="adWorkspaceSettingsTitle"'}>
          ${s.settingsLayout === 'popup' ? `
          <header class="ad-settings-modal-head">
            <div class="ad-settings-modal-title">${svg('gear')}<h2 id="adWorkspaceSettingsTitle">Workspace settings</h2></div>
            <button class="ad-settings-modal-close" type="button" data-settings-close aria-label="Close workspace settings">&times;</button>
          </header>` : ''}
          <div class="ad-settings-modal-body">
            <aside class="ad-settings-modal-nav" aria-label="Settings sections">
              ${s.settingsLayout === 'sidebar' ? `
              <button class="ad-settings-sidebar-back" type="button" data-settings-close>${svg('right')}<span>Back</span></button>` : ''}
              ${michaelWorkspaceSettingsNav()}
            </aside>

            <div class="ad-settings-modal-content">
              <section class="ad-settings-panel" data-settings-panel="users">
                <div class="ad-settings-panel-head">
                  <h3>Users &amp; roles</h3>
                  <p>Manage workspace access, roles and outstanding invitations.</p>
                </div>
                <div class="ad-settings-plan-card">
                  <div><span>Workspace seats</span><h4>${w.seatsUsed} of ${w.seatsTotal} used</h4><p data-workspace-pending-count>${w.invitesPending + michaelWorkspaceAddedUsers(activeCompany).length} pending ${w.invitesPending + michaelWorkspaceAddedUsers(activeCompany).length === 1 ? 'invitation' : 'invitations'}</p></div>
                  <div class="ad-settings-plan-actions">
                    <button class="ad-btn dark" type="button" data-workspace-user-open>${svg('userplus')}Add user</button>
                    <a class="ad-btn" href="${michaelHref(s, 'ws-users.html')}">Manage users${svg('right')}</a>
                  </div>
                </div>
                <div class="ad-settings-member-list">
                  <div class="ad-settings-member-list-head"><b>Workspace users</b><span>Access to ${esc(activeCompany.name)}</span></div>
                  <div data-workspace-member-rows>${michaelWorkspaceUserRows(activeCompany)}</div>
                </div>
                <div class="ad-settings-rule"></div>
                <div class="ad-settings-action-row">
                  <div><b>Default member role</b><p data-default-role-copy>New members join this workspace as ${esc(companyPreferences.defaultRole)}s.</p></div>
                  <div class="ad-settings-inline-control">
                    <select data-default-role aria-label="Default member role">
                      <option${companyPreferences.defaultRole === 'Builder' ? ' selected' : ''}>Builder</option>
                      <option${companyPreferences.defaultRole === 'Admin' ? ' selected' : ''}>Admin</option>
                      <option${companyPreferences.defaultRole === 'Viewer' ? ' selected' : ''}>Viewer</option>
                    </select>
                    <button class="ad-btn" type="button" data-default-role-save>Save role</button>
                  </div>
                </div>
              </section>

              <section class="ad-settings-panel" data-settings-panel="analytics" hidden>
                <div class="ad-settings-panel-head">
                  <h3>Analytics</h3>
                  <p>Workspace-wide reporting and activity summaries.</p>
                </div>
                <div class="ad-settings-metric-grid">
                  <div><span>Active apps</span><b data-company-app-count>${michaelCompanyProcesses().length}</b><small>Across the workspace</small></div>
                  <div><span>Total submissions</span><b>1,284</b><small>Last 30 days</small></div>
                  <div><span>Completion rate</span><b>76%</b><small>All live apps</small></div>
                </div>
                <div class="ad-settings-save"><button class="ad-btn dark" type="button" data-stub>View analytics</button></div>
              </section>

              <section class="ad-settings-panel" data-settings-panel="audit" hidden>
                <div class="ad-settings-panel-head">
                  <h3>Audit log</h3>
                  <p>Review administrative actions and security events across the workspace.</p>
                </div>
                <div class="ad-settings-summary-list">
                  <div>${svg('person')}<span><b>${esc(D.user.name)} updated workspace settings</b><small>Today at 10:42 am</small></span></div>
                  <div>${svg('users')}<span><b>Priya Sharma invited a new member</b><small>Yesterday at 4:18 pm</small></span></div>
                  <div>${svg('template')}<span><b>KYC Onboarding was published</b><small>2 days ago</small></span></div>
                </div>
                <div class="ad-settings-save"><button class="ad-btn" type="button" data-stub>Export audit log</button></div>
              </section>

              <section class="ad-settings-panel" data-settings-panel="company" hidden>
                <div class="ad-settings-panel-head">
                  <h3>Company information</h3>
                  <p>Update the company details shown across your workspace.</p>
                </div>
                <div class="ad-settings-form-grid">
                  <label class="ad-settings-control"><span>Company name</span><input type="text" data-company-current-input value="${esc(companyPreferences.name)}" /></label>
                  <label class="ad-settings-control"><span>Company level</span><input type="text" value="${esc(activeCompany.level)}" readonly /></label>
                  <label class="ad-settings-control"><span>Parent company</span><input type="text" value="${esc(parentCompany ? parentCompany.name : 'None') }" readonly /></label>
                  <label class="ad-settings-control"><span>Data region</span><input type="text" data-company-region-input value="${esc(companyPreferences.region)}" /></label>
                  <label class="ad-settings-control ad-settings-control-wide"><span>Workspace URL</span><input type="text" value="northwind-ops.enterpriseai.app" /></label>
                </div>
                <div class="ad-settings-save"><button class="ad-btn dark" type="button" data-company-settings-save>Save changes</button></div>
              </section>

              <section class="ad-settings-panel" data-settings-panel="billing-plans" hidden>
                <div class="ad-settings-panel-head">
                  <h3>Plans &amp; payment</h3>
                  <p>Review your current plan, payment method and invoices.</p>
                </div>
                <div class="ad-settings-plan-card">
                  <div><span>Current plan</span><h4>${esc(w.plan)}</h4><p>${w.seatsUsed} of ${w.seatsTotal} seats in use</p></div>
                  <button class="ad-btn" type="button" data-stub>Manage plan</button>
                </div>
                <div class="ad-settings-rule"></div>
                <div class="ad-settings-action-row">
                  <div><b>Invoices and payment</b><p>Manage payment methods and download past invoices.</p></div>
                  <button class="ad-btn" type="button" data-stub>View billing</button>
                </div>
              </section>

              <section class="ad-settings-panel" data-settings-panel="billing-usage" hidden>
                <div class="ad-settings-panel-head">
                  <h3>Usage</h3>
                  <p>Monitor workspace usage for the current billing period.</p>
                </div>
                <div class="ad-settings-metric-grid">
                  <div><span>Credits used</span><b>58</b><small>of 100 this month</small></div>
                  <div><span>Seats assigned</span><b>${w.seatsUsed}</b><small>of ${w.seatsTotal} available</small></div>
                  <div><span>Storage used</span><b>2.4 GB</b><small>of 10 GB included</small></div>
                </div>
                <div class="ad-settings-rule"></div>
                <div class="ad-settings-action-row">
                  <div><b>Current billing period</b><p>Usage resets on 1 October 2026.</p></div>
                  <button class="ad-btn" type="button" data-stub>View detailed usage</button>
                </div>
              </section>

              ${michaelWorkspaceSettingsPanels(s)}
            </div>
          </div>
        </section>
        <div class="ad-user-dialog-layer" data-workspace-user-dialog hidden>
          <section class="ad-user-dialog" role="dialog" aria-modal="true" aria-labelledby="adWorkspaceUserTitle">
            <header class="ad-user-dialog-head">
              <div><h2 id="adWorkspaceUserTitle">Add a workspace user</h2><p>Invite someone to ${esc(activeCompany.name)}.</p></div>
              <button type="button" data-workspace-user-close aria-label="Close add workspace user dialog">&times;</button>
            </header>
            <form data-workspace-user-form novalidate>
              <div class="ad-user-dialog-body">
                <div class="ad-f">
                  <label for="adWorkspaceUserName">Name</label>
                  <input id="adWorkspaceUserName" type="text" autocomplete="name" placeholder="e.g. Alex Morgan" data-workspace-user-name required />
                </div>
                <div class="ad-f">
                  <label for="adWorkspaceUserEmail">Work email</label>
                  <input id="adWorkspaceUserEmail" type="email" autocomplete="email" placeholder="alex@company.com" data-workspace-user-email required />
                </div>
                <div class="ad-f">
                  <label for="adWorkspaceUserRole">Workspace role</label>
                  <select id="adWorkspaceUserRole" data-workspace-user-role>
                    <option>Builder</option>
                    <option>Admin</option>
                    <option>Viewer</option>
                  </select>
                </div>
                <p class="ad-form-error" data-workspace-user-error role="alert" hidden></p>
              </div>
              <footer class="ad-user-dialog-foot">
                <button class="ad-btn" type="button" data-workspace-user-cancel>Cancel</button>
                <button class="ad-btn dark" type="submit">Add user</button>
              </footer>
            </form>
          </section>
        </div>
      </div>`;
  }

  function wsShell(pane, s) {
    const w = D.workspace;
    const u = D.user;
    const activeCompany = michaelActiveCompany();
    return `
<div class="ad-ws${s.settingsLayout === 'sidebar' ? ' ad-settings-layout-sidebar' : ''}" data-ad-root>
  <aside class="ad-side">
    <div class="ad-sidebar-brand"><button type="button" class="ad-sidebar-logo-toggle" data-sidebar-close aria-label="Close sidebar" title="Close sidebar"><img src="../../assets/logos/eai-mark-dark.svg" alt="EAI" />${svg('panel')}</button></div>
    <div class="ad-side-hd">
      ${s.michaelDemo ? michaelCompanyPicker() : `<button class="ad-ws-switch" type="button" data-stub>
        <span class="tile">${w.initial}</span>
        <span class="tx"><b>${w.name}</b></span>
        ${svg('swap')}
      </button>`}
      <div class="ad-seg" role="tablist" aria-label="How you build">
        <a class="ad-seg-tab${s.mode === 'ncb' ? ' on' : ''}" href="${michaelHref(s, 'ws-home.html')}" role="tab" aria-selected="${s.mode === 'ncb'}">No Code Builder</a>
        <a class="ad-seg-tab${s.mode === 'cli' ? ' on' : ''}" href="${michaelHref(s, 'ws-cli.html')}" role="tab" aria-selected="${s.mode === 'cli'}">${svg('terminal')}CLI</a>
      </div>
    </div>
    <div class="ad-side-body">
      <nav class="ad-nav">
        ${wsItem(s, 'home', 'home', 'Home', 'ws-home.html')}
        ${wsItem(s, 'processes', 'grid', 'All apps', 'ws-processes.html', `<i class="count"${s.michaelDemo ? ' data-company-app-count' : ''}>${s.michaelDemo ? michaelCompanyProcesses().length : D.processes.length}</i>`)}
        ${wsItem(s, 'templates', 'template', 'Templates', 'ws-templates.html')}
        ${wsItem(s, 'integrations', 'plug', 'Integrations', 'ws-integrations.html')}
      </nav>
      ${s.michaelDemo ? `
      <nav class="ad-nav ad-recent-apps" data-company-recent-apps>
        <div class="ad-nav-label">Recent apps</div>
        ${michaelRecentApps(s)}
      </nav>` : `
      <nav class="ad-nav">
        <div class="ad-nav-label">Manage</div>
        ${wsItem(s, 'data', 'data', 'Data', null)}
        ${wsItem(s, 'users', 'users', 'Users &amp; roles', 'ws-users.html')}
        ${wsItem(s, 'analytics', 'chart', 'Analytics', null, '<span class="tag">New</span>')}
        ${wsItem(s, 'automations', 'zap', 'Automations', null)}
        ${wsItem(s, 'audit', 'file', 'Audit log', null)}
      </nav>`}
    </div>
    <div class="ad-side-ft">
      ${s.michaelDemo
        ? `<nav class="ad-nav ad-settings-above-user"><button class="ad-item" type="button" data-settings-open ${s.settingsLayout === 'popup' ? 'aria-haspopup="dialog"' : 'aria-controls="adWorkspaceSettings"'} aria-expanded="false">${svg('gear')}<span>Workspace settings</span></button></nav>`
        : `<nav class="ad-nav">${wsItem(s, 'settings', 'gear', 'Workspace settings', 'ws-settings.html')}</nav>`}
      ${s.michaelDemo ? '' : `<div class="ad-upsell">
        <b>Upgrade to Team</b>
        <p>Unlimited apps, roles &amp; audit history.</p>
        <button class="btn" type="button" data-stub>View plans</button>
      </div>`}
      ${s.michaelDemo ? michaelUserMenu(s, u) : `<a class="ad-user${s.nav === 'profile' ? ' on' : ''}" href="profile.html">
        <span class="av">${u.av}</span>
        <span class="tx"><b>${u.name}</b><span>${u.role}</span></span>
        ${svg('dots')}
      </a>`}
    </div>
  </aside>
  <main class="ad-main">
    <header class="ad-top">
      <div class="ad-top-l">
        <button class="collapse" type="button" data-sidebar-toggle aria-label="Toggle sidebar" aria-expanded="true">${svg('panel')}</button>
        ${s.michaelDemo && s.nav === 'home' ? '' : `<b>${s.title}</b>`}
        ${s.michaelDemo && s.nav !== 'home' ? `<span class="ad-top-company" data-company-current-name>${esc(activeCompany.name)}</span>` : ''}
      </div>
      <div class="ad-search-wrap">
        <button class="ad-search-trigger" type="button" aria-label="Search apps" aria-expanded="false" aria-controls="adSearchPal" aria-haspopup="dialog">
          ${svg('search')}<span>Search apps…</span><kbd>&#8984;K</kbd>
        </button>
        <div class="ad-search-pal" id="adSearchPal" hidden role="dialog" aria-label="Search apps">
          <div class="ad-search-pal-hd">
            ${svg('search')}
            <input class="ad-search-input" type="search" placeholder="Search apps…" autocomplete="off" spellcheck="false" aria-label="Search apps" />
            <kbd class="ad-search-esc" aria-hidden="true">esc</kbd>
          </div>
          <ul class="ad-search-list" role="listbox" aria-label="Apps"></ul>
          <div class="ad-search-pal-ft">
            <a href="ws-processes.html">Browse all apps</a>
          </div>
        </div>
      </div>
      <div class="ad-top-r">
        ${notifBell()}
        <button class="ad-btn dark" type="button" data-local-new-app>${svg('plus')}New app</button>
      </div>
    </header>
    <div class="ad-body${s.hero ? ' hero' : ''}"><div class="ad-col${s.narrow ? ' narrow' : ''}${s.wide ? ' wide' : ''}">${pane}</div></div>
  </main>
  ${s.michaelDemo ? michaelSettingsModal(s, w) : ''}
  ${s.michaelDemo ? michaelProfileModal(s, w, u) : ''}
</div>
<div class="ad-flag" data-ad-root>MVP · prototype</div>`;
  }

  /* ----------------------------------------------------- app shell */
  function railItem(s, id, icon, label, href) {
    const on = s.rail === id ? ' on' : '';
    return `<a class="ad-rail-item${on}" href="${michaelHref(s, href)}">${svg(icon)}<span class="lb">${label}</span></a>`;
  }

  function railStubItem(icon, label, tail, extraClass) {
    return `<button class="ad-rail-item${extraClass ? ` ${extraClass}` : ''}" type="button" data-stub data-stub-label="${esc(label)}">${svg(icon)}<span class="lb">${esc(label)}</span>${tail || ''}</button>`;
  }

  function michaelAppRail(s) {
    return `
      <div class="ad-rail-section-label first">Manage</div>
      <a class="ad-rail-item${s.rail === 'overview' ? ' on' : ''}" href="${michaelBuilderAppHref(s, s.app)}">${svg('home')}<span class="lb">Overview</span></a>
      ${railItem(s, 'submissions', 'file', 'Submissions', `app-submissions.html?app=${s.appId}`)}
      ${railItem(s, 'analytics', 'chart', 'Analytics & reports', `app-analytics.html?app=${s.appId}`)}
      ${railItem(s, 'users', 'users', 'Users', `app-users.html?app=${s.appId}`)}
      <div class="ad-rail-section-label">Configure</div>
      ${railItem(s, 'configure-workflow', 'workflow', 'Workflow', `app-configure.html?app=${s.appId}&section=workflow`)}
      ${railItem(s, 'configure-resources', 'data', 'Resources', `app-configure.html?app=${s.appId}&section=resources`)}
      ${railItem(s, 'configure-ai', 'sparkle', 'AI & prompts', `app-configure.html?app=${s.appId}&section=ai`)}
      ${railItem(s, 'configure-connections', 'plug', 'Connections', `app-configure.html?app=${s.appId}&section=connections`)}
      <div class="ad-rail-section-label">Launch</div>
      ${railStubItem('checklist', 'Readiness')}
      ${railStubItem('rocket', 'Deploy')}`;
  }

  function notifBell() {
    const unread = D.unreadCount();
    const badge = unread ? `<span class="ad-notif-badge">${unread}</span>` : '';
    const items = D.notifications.map((n) => `
      <a class="ad-notif-row${n.unread ? ' unread' : ''}" href="${n.href}">
        <span class="ad-notif-dot" aria-hidden="true"></span>
        <span class="tx"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><i>${esc(n.time)}</i></span>
      </a>`).join('');
    return `
<div class="ad-notif-wrap">
  <button class="ad-icon-btn ad-notif-btn" type="button" aria-label="Notifications" aria-expanded="false" aria-haspopup="true">
    ${svg('bell')}${badge}
  </button>
  <div class="ad-notif-panel" hidden role="menu" aria-label="Notifications">
    <div class="ad-notif-hd"><b>Notifications</b>${unread ? `<span>${unread} unread</span>` : ''}</div>
    <div class="ad-notif-list">${items}</div>
    <div class="ad-notif-ft"><button type="button" data-notif-mark>Mark all as read</button></div>
  </div>
</div>`;
  }

  function clientSub(s) {
    const rows = D.clientsFor(s.appId).map((c) => {
      const on = s.clientId === c.id ? ' on' : '';
      return `<a class="${on.trim()}" href="app-client.html?app=${s.appId}&client=${c.id}">${c.name}</a>`;
    }).join('');
    return `<div class="ad-rail-sub">${rows}<button type="button" class="muted" data-stub>+ Add client</button></div>`;
  }

  function appShell(pane, s) {
    const w = D.workspace;
    const u = D.user;
    const app = s.app;
    const activeCompany = s.michaelDemo ? michaelActiveCompany() : w;
    const clientsOpen = s.rail === 'clients' || s.rail === 'client';
    return `
<div class="ad-app" data-ad-root>
  <div class="ad-app-outer">
    <header class="ad-app-top">
      <a class="ad-mark" href="${michaelHref(s, 'ws-home.html')}" aria-label="Back to ${esc(activeCompany.name)}">${svg('logo')}</a>
      <span class="ad-slash" aria-hidden="true"></span>
      <div class="ad-appid">
        <span class="av">${app.initial}</span>
        <span class="tx"><b>${app.name}</b><span>${esc(activeCompany.name)}</span></span>
      </div>
      <div class="ad-app-acts">
        ${notifBell()}
        <div class="ad-av-stack">
          <span class="av">${u.av}</span>
          ${s.michaelDemo
            ? `<a class="add" href="${michaelHref(s, `app-users.html?app=${s.appId}&add=1`)}" aria-label="Add a user">${svg('plus')}</a>`
            : `<button class="add" type="button" data-stub aria-label="Invite people">${svg('plus')}</button>`}
        </div>
        <button class="ad-icon-btn" type="button" data-stub aria-label="More">${svg('dots')}</button>
        <button class="ad-upgrade" type="button" data-stub>${svg('gem')}Upgrade</button>
      </div>
    </header>
    <div class="ad-card-shell">
      <div class="ad-card-bar">
        <button class="ad-icon-btn" type="button" data-stub aria-label="Collapse rail" style="width:28px;height:28px;">${svg('panel')}</button>
        <span>App settings</span>
      </div>
      <div class="ad-card-body">
        <aside class="ad-rail">
          <div class="ad-rail-search">
            <label>${svg('search')}<input type="search" placeholder="Search…" aria-label="Search settings" /></label>
          </div>
          <nav class="ad-rail-nav" aria-label="App settings">
            ${s.michaelDemo ? michaelAppRail(s) : `
              ${railItem(s, 'overview', 'home', 'Overview', `app-overview.html?app=${s.appId}`)}
              ${railItem(s, 'submissions', 'file', 'Submissions', `app-submissions.html?app=${s.appId}`)}
              ${railItem(s, 'analytics', 'chart', 'Analytics', `app-analytics.html?app=${s.appId}`)}
              ${railItem(s, 'general', 'gear', 'Settings', `app-general.html?app=${s.appId}`)}
              <div>
                <a class="ad-rail-item${clientsOpen ? ' on' : ''}" href="app-clients.html?app=${s.appId}" aria-expanded="${clientsOpen}">
                  ${svg('building')}<span class="lb">Clients</span>${svg('chev', 'chev')}
                </a>
                ${clientsOpen ? clientSub(s) : ''}
              </div>`}
            <div class="ad-rail-ft">
              <button class="ad-rail-item" type="button" data-stub>${svg('warn')}<span class="lb">Danger zone</span></button>
            </div>
          </nav>
        </aside>
        <div class="ad-pane"><div class="ad-pane-col">${pane}</div></div>
      </div>
    </div>
  </div>
</div>
<div class="ad-flag" data-ad-root>MVP · prototype</div>`;
  }

  /* ---------------------------------------------------------- search */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function bindSearch(root) {
    const wrap = root.querySelector('.ad-search-wrap');
    if (!wrap) return;

    const trigger = wrap.querySelector('.ad-search-trigger');
    const pal = wrap.querySelector('.ad-search-pal');
    const input = wrap.querySelector('.ad-search-input');
    const list = wrap.querySelector('.ad-search-list');
    let idx = -1;
    let open = false;

    function match(q) {
      const needle = q.trim().toLowerCase();
      const source = new URLSearchParams(location.search).get('demo') === 'michael' ? michaelCompanyProcesses() : D.processes;
      if (!needle) return source;
      return source.filter((p) =>
        [p.name, p.subtitle, p.desc, p.status, p.id].some((field) => field.toLowerCase().includes(needle)),
      );
    }

    function hits() {
      return [...list.querySelectorAll('.ad-search-hit')];
    }

    function paintActive() {
      hits().forEach((el, i) => el.classList.toggle('on', i === idx));
      const opts = list.querySelectorAll('[role="option"]');
      opts.forEach((el, i) => el.setAttribute('aria-selected', String(i === idx)));
    }

    function render(q) {
      const rows = match(q);
      idx = rows.length ? 0 : -1;
      if (!rows.length) {
        list.innerHTML = '<li class="ad-search-empty" role="presentation">No apps match.</li>';
        return;
      }
      const searchState = state();
      list.innerHTML = rows.map((p, i) => `
        <li role="option" aria-selected="${i === 0}">
          <a class="ad-search-hit${i === 0 ? ' on' : ''}" href="${searchState.michaelDemo ? michaelBuilderAppHref(searchState, p) : `app-overview.html?app=${esc(p.id)}`}">
            <span class="tx">
              <b>${esc(p.name)}</b>
              <span>${esc(p.subtitle)}</span>
            </span>
            <span class="ad-badge ${p.live ? 'green' : 'amber'}"><i class="dot"></i>${esc(p.status)}</span>
          </a>
        </li>`).join('');
    }

    function setOpen(next) {
      open = next;
      pal.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        input.value = '';
        render('');
        input.focus();
      }
    }

    function pickActive() {
      const hit = hits()[idx];
      if (hit) hit.click();
    }

    trigger.addEventListener('click', () => setOpen(!open));

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      const rows = hits();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!rows.length) return;
        idx = Math.min(idx + 1, rows.length - 1);
        paintActive();
        rows[idx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!rows.length) return;
        idx = Math.max(idx - 1, 0);
        paintActive();
        rows[idx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        pickActive();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        trigger.focus();
      }
    });

    const onDocClick = (e) => {
      if (!open) return;
      if (wrap.contains(e.target)) return;
      setOpen(false);
    };

    const onDocKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === 'Escape' && open && document.activeElement !== input) {
        setOpen(false);
      }
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);

    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onDocKey);
    };
  }

  /* ---------------------------------------------------------- mount */
  function bindNotifications(root) {
    const wrap = root.querySelector('.ad-notif-wrap');
    if (!wrap) return;

    if (window.__adNotifTeardown) window.__adNotifTeardown();

    const btn = wrap.querySelector('.ad-notif-btn');
    const panel = wrap.querySelector('.ad-notif-panel');
    const mark = wrap.querySelector('[data-notif-mark]');

    function close() {
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }

    function open() {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panel.hidden) open();
      else close();
    });

    mark?.addEventListener('click', (e) => {
      e.preventDefault();
      D.notifications.forEach((n) => { n.unread = false; });
      wrap.querySelectorAll('.ad-notif-row.unread').forEach((r) => r.classList.remove('unread'));
      wrap.querySelector('.ad-notif-badge')?.remove();
      const hd = wrap.querySelector('.ad-notif-hd span');
      if (hd) hd.remove();
      toast('All notifications marked as read.');
      close();
    });

    const onDocClick = (e) => {
      if (!wrap.contains(e.target)) close();
    };
    const onDocKey = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
    window.__adNotifTeardown = () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onDocKey);
      window.__adNotifTeardown = null;
    };
  }

  function bindStubs(root) {
    root.querySelectorAll('[data-stub]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const what = (el.dataset.stubLabel || el.textContent || el.getAttribute('aria-label') || 'This').trim();
        toast(`${what} isn’t part of this prototype.`);
      });
    });
  }

  function bindCompanyPicker(root) {
    const picker = root.querySelector('.ad-company-picker');
    if (!picker) return;

    const toggle = picker.querySelector('[data-company-toggle]');
    const menu = picker.querySelector('[data-company-menu]');
    const input = picker.querySelector('[data-company-search]');
    const rows = [...picker.querySelectorAll('[data-company-id]')];
    const empty = picker.querySelector('[data-company-empty]');

    function close() {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }

    function filterCompanies(query) {
      const needle = query.trim().toLowerCase();
      const visibleIds = new Set();

      if (!needle) {
        rows.forEach((row) => visibleIds.add(row.dataset.companyId));
      } else {
        rows.forEach((row) => {
          if (!row.dataset.companyName.includes(needle)) return;
          visibleIds.add(row.dataset.companyId);
          let parentId = row.dataset.companyParent;
          while (parentId) {
            visibleIds.add(parentId);
            parentId = rows.find((candidate) => candidate.dataset.companyId === parentId)?.dataset.companyParent || '';
          }
        });
      }

      rows.forEach((row) => { row.hidden = !visibleIds.has(row.dataset.companyId); });
      empty.hidden = visibleIds.size !== 0;
    }

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = menu.hidden;
      menu.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      if (opening) {
        input.value = '';
        filterCompanies('');
        input.focus();
      }
    });

    input.addEventListener('input', () => filterCompanies(input.value));
    rows.forEach((row) => row.addEventListener('click', () => {
      michaelCompanySelection = row.dataset.companyId;
      demoWrite('active-company', michaelCompanySelection);
      const selected = michaelActiveCompany();
      const preferences = michaelCompanyPreferences(selected);
      rows.forEach((candidate) => {
        const active = candidate.dataset.companyId === selected.id;
        candidate.classList.toggle('on', active);
        candidate.setAttribute('aria-selected', String(active));
      });
      root.querySelectorAll('[data-company-current-name]').forEach((el) => { el.textContent = selected.name; });
      root.querySelectorAll('[data-company-current-initial]').forEach((el) => { el.textContent = selected.name.charAt(0); });
      root.querySelectorAll('[data-company-current-input]').forEach((el) => { el.value = selected.name; });
      root.querySelectorAll('[data-company-region-input]').forEach((el) => { el.value = preferences.region; });
      root.querySelectorAll('[data-default-role]').forEach((el) => { el.value = preferences.defaultRole; });
      root.querySelectorAll('[data-default-role-copy]').forEach((el) => { el.textContent = `New members join this workspace as ${preferences.defaultRole}s.`; });
      refreshMichaelCompanyApps(root);
      window.dispatchEvent(new CustomEvent('ad:company-change', { detail: { company: selected, processes: michaelCompanyProcesses() } }));
      close();
      toggle.focus();
      toast(`Switched to ${selected.name}.`);
    }));

    const onDocClick = (e) => {
      if (!picker.contains(e.target)) close();
    };
    const onDocKey = (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        close();
        toggle.focus();
      }
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
    window.__adCompanyPickerTeardown = () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onDocKey);
      window.__adCompanyPickerTeardown = null;
    };
  }

  function bindUserMenu(root) {
    const wrap = root.querySelector('.ad-user-menu-wrap');
    if (!wrap) return;

    const btn = wrap.querySelector('[data-user-menu-toggle]');
    const menu = wrap.querySelector('.ad-user-menu');

    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = menu.hidden;
      menu.hidden = !opening;
      btn.setAttribute('aria-expanded', String(opening));
    });

    const onDocClick = (e) => {
      if (!wrap.contains(e.target)) close();
    };
    const onDocKey = (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        close();
        btn.focus();
      }
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onDocKey);
    window.__adUserMenuTeardown = () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onDocKey);
      window.__adUserMenuTeardown = null;
    };
  }

  function bindProfileModal(root) {
    const trigger = root.querySelector('[data-profile-open]');
    const layer = root.querySelector('[data-profile-modal]');
    if (!trigger || !layer) return;

    const closeBtn = layer.querySelector('[data-profile-close]');
    const saveBtn = layer.querySelector('[data-profile-save]');
    const nameInput = layer.querySelector('[data-profile-name]');
    const titleInput = layer.querySelector('[data-profile-title]');
    const avatar = layer.querySelector('[data-profile-avatar]');
    const notificationToggle = layer.querySelector('[data-profile-notifications]');
    let lastFocus = null;

    function close() {
      if (layer.hidden) return;
      layer.hidden = true;
      document.body.classList.remove('ad-profile-modal-open');
      lastFocus?.focus();
    }

    function open() {
      lastFocus = document.activeElement;
      const preferences = demoRead('profile', {
        name: D.user.name,
        title: D.user.title,
        notifications: true,
      });
      nameInput.value = preferences.name || D.user.name;
      titleInput.value = preferences.title || D.user.title;
      avatar.textContent = D.user.av;
      const notificationsOn = preferences.notifications !== false;
      notificationToggle.classList.toggle('on', notificationsOn);
      notificationToggle.setAttribute('aria-pressed', String(notificationsOn));
      root.querySelector('.ad-user-menu').hidden = true;
      root.querySelector('[data-user-menu-toggle]').setAttribute('aria-expanded', 'false');
      layer.hidden = false;
      document.body.classList.add('ad-profile-modal-open');
      closeBtn.focus();
    }

    trigger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    notificationToggle.addEventListener('click', () => {
      const on = !notificationToggle.classList.contains('on');
      notificationToggle.classList.toggle('on', on);
      notificationToggle.setAttribute('aria-pressed', String(on));
    });
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const title = titleInput.value.trim();
      if (!name || !title) {
        toast('Enter your name and job title before saving.');
        (!name ? nameInput : titleInput).focus();
        return;
      }
      const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || D.user.av;
      const next = { name, title, notifications: notificationToggle.classList.contains('on') };
      demoWrite('profile', next);
      D.user.name = name;
      D.user.title = title;
      D.user.av = initials;
      avatar.textContent = initials;
      root.querySelectorAll('.ad-user .tx b, .ad-user-menu-head .tx b').forEach((el) => { el.textContent = name; });
      root.querySelectorAll('.ad-user .av, .ad-user-menu-head .av').forEach((el) => { el.textContent = initials; });
      toast('Profile saved.');
    });

    const onLayerClick = (event) => { if (event.target === layer) close(); };
    const onDocKey = (event) => { if (event.key === 'Escape' && !layer.hidden) close(); };
    layer.addEventListener('click', onLayerClick);
    document.addEventListener('keydown', onDocKey);
    window.__adProfileModalTeardown = () => {
      document.body.classList.remove('ad-profile-modal-open');
      document.removeEventListener('keydown', onDocKey);
      window.__adProfileModalTeardown = null;
    };

    if (new URLSearchParams(location.search).get('profile') === '1') open();
  }

  function bindSettingsModal(root) {
    const trigger = root.querySelector('[data-settings-open]');
    const layer = root.querySelector('[data-settings-modal]');
    if (!trigger || !layer) return;

    const closeBtn = layer.querySelector('[data-settings-close]');
    const tabs = [...layer.querySelectorAll('[data-settings-pane]')];
    const panels = [...layer.querySelectorAll('[data-settings-panel]')];
    const searchInput = layer.querySelector('[data-settings-search-input]');
    const searchEmpty = layer.querySelector('[data-settings-search-empty]');
    const navGroups = [...layer.querySelectorAll('.ad-settings-nav-group')];
    const billingToggle = layer.querySelector('[data-settings-billing-toggle]');
    const billingSubnav = layer.querySelector('[data-settings-billing-subnav]');
    const companySave = layer.querySelector('[data-company-settings-save]');
    const companyNameInput = layer.querySelector('[data-company-current-input]');
    const companyRegionInput = layer.querySelector('[data-company-region-input]');
    const roleSelect = layer.querySelector('[data-default-role]');
    const roleSave = layer.querySelector('[data-default-role-save]');
    const resourcePushPanel = layer.querySelector('[data-resource-push-panel]');
    const resourcePushTitle = layer.querySelector('[data-resource-push-title]');
    const resourceAppSelect = layer.querySelector('[data-resource-app-select]');
    const resourcePushConfirm = layer.querySelector('[data-resource-push-confirm]');
    const resourcePushCancel = layer.querySelector('[data-resource-push-cancel]');
    const workspaceUserDialog = layer.querySelector('[data-workspace-user-dialog]');
    const workspaceUserOpen = layer.querySelector('[data-workspace-user-open]');
    const workspaceUserClose = layer.querySelector('[data-workspace-user-close]');
    const workspaceUserCancel = layer.querySelector('[data-workspace-user-cancel]');
    const workspaceUserForm = layer.querySelector('[data-workspace-user-form]');
    const workspaceUserName = layer.querySelector('[data-workspace-user-name]');
    const workspaceUserEmail = layer.querySelector('[data-workspace-user-email]');
    const workspaceUserRole = layer.querySelector('[data-workspace-user-role]');
    const workspaceUserError = layer.querySelector('[data-workspace-user-error]');
    const workspaceMemberRows = layer.querySelector('[data-workspace-member-rows]');
    const workspacePendingCount = layer.querySelector('[data-workspace-pending-count]');
    const sidebarLayout = root.classList.contains('ad-settings-layout-sidebar');
    let lastFocus = null;

    function setBillingExpanded(expanded) {
      if (!billingToggle || !billingSubnav) return;
      billingSubnav.hidden = !expanded;
      billingToggle.setAttribute('aria-expanded', String(expanded));
    }

    function filterSettings(query) {
      const needle = query.trim().toLowerCase();
      let visibleCount = 0;
      navGroups.forEach((group) => {
        let groupCount = 0;
        group.querySelectorAll('[data-settings-search]').forEach((tab) => {
          const visible = !needle || tab.dataset.settingsSearch.toLowerCase().includes(needle);
          tab.hidden = !visible;
          if (visible) groupCount += 1;
        });
        group.hidden = groupCount === 0;
        const label = group.previousElementSibling;
        if (label?.matches('[data-settings-group-label]')) label.hidden = groupCount === 0;
        visibleCount += groupCount;
      });
      if (searchEmpty) searchEmpty.hidden = visibleCount !== 0;
    }

    function showPane(name) {
      const billingActive = name === 'billing-plans' || name === 'billing-usage';
      tabs.forEach((tab) => {
        const active = tab.dataset.settingsPane === name;
        tab.classList.toggle('on', active);
        tab.setAttribute('aria-selected', String(active));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.settingsPanel !== name;
      });
      billingToggle?.classList.toggle('on', billingActive);
      if (billingActive) setBillingExpanded(true);
      if (resourcePushPanel) resourcePushPanel.hidden = true;
      layer.querySelector('.ad-settings-modal-content')?.scrollTo(0, 0);
    }

    function refreshResourceCounts() {
      const company = michaelActiveCompany();
      const apps = michaelCompanyProcesses();
      layer.querySelectorAll('[data-resource-app-count]').forEach((label) => {
        const count = apps.filter((app) => michaelAppResourceIds(company.id, app.id).includes(label.dataset.resourceAppCount)).length;
        label.textContent = count ? `Used by ${count} ${count === 1 ? 'app' : 'apps'}` : 'Not used by an app';
      });
    }

    function renderWorkspaceMembers() {
      if (!workspaceMemberRows) return;
      const company = michaelActiveCompany();
      const additions = michaelWorkspaceAddedUsers(company);
      workspaceMemberRows.innerHTML = michaelWorkspaceUserRows(company);
      if (workspacePendingCount) {
        const pending = D.workspace.invitesPending + additions.length;
        workspacePendingCount.textContent = `${pending} pending ${pending === 1 ? 'invitation' : 'invitations'}`;
      }
      workspaceMemberRows.querySelectorAll('[data-workspace-user-remove]').forEach((button) => {
        button.addEventListener('click', () => {
          const current = michaelWorkspaceAddedUsers(company);
          const removed = current.find((member) => member.id === button.dataset.workspaceUserRemove);
          demoWrite(`workspace-users-${company.id}`, current.filter((member) => member.id !== button.dataset.workspaceUserRemove));
          renderWorkspaceMembers();
          toast(`${removed ? removed.name : 'User'} removed from ${company.name}.`);
        });
      });
    }

    function closeWorkspaceUserDialog() {
      if (!workspaceUserDialog || workspaceUserDialog.hidden) return;
      workspaceUserDialog.hidden = true;
      document.body.classList.remove('ad-user-dialog-open');
      workspaceUserForm.reset();
      workspaceUserError.hidden = true;
      workspaceUserOpen?.focus();
    }

    function openWorkspaceUserDialog() {
      if (!workspaceUserDialog) return;
      const company = michaelActiveCompany();
      workspaceUserDialog.querySelector('.ad-user-dialog-head p').textContent = `Invite someone to ${company.name}.`;
      workspaceUserRole.value = michaelCompanyPreferences(company).defaultRole;
      workspaceUserError.hidden = true;
      workspaceUserDialog.hidden = false;
      document.body.classList.add('ad-user-dialog-open');
      workspaceUserName.focus();
    }

    function close() {
      if (layer.hidden) return;
      closeWorkspaceUserDialog();
      if (new URLSearchParams(location.search).get('settingsOverlay') === '1') {
        window.parent.postMessage('close-workspace-settings', location.origin);
      }
      layer.hidden = true;
      root.classList.remove('ad-settings-active');
      document.body.classList.remove('ad-settings-modal-open');
      trigger.classList.remove('on');
      trigger.setAttribute('aria-expanded', 'false');
      lastFocus?.focus();
    }

    function open() {
      lastFocus = document.activeElement;
      layer.hidden = false;
      root.classList.add('ad-settings-active');
      if (!sidebarLayout) document.body.classList.add('ad-settings-modal-open');
      trigger.classList.add('on');
      trigger.setAttribute('aria-expanded', 'true');
      setBillingExpanded(false);
      showPane('users');
      if (searchInput) {
        searchInput.value = '';
        filterSettings('');
      }
      closeBtn.focus();
    }

    trigger.addEventListener('click', () => {
      if (sidebarLayout && !layer.hidden) close();
      else open();
    });
    closeBtn.addEventListener('click', close);
    billingToggle?.addEventListener('click', () => {
      const opening = billingSubnav.hidden;
      setBillingExpanded(opening);
      if (opening) showPane('billing-plans');
    });
    companySave?.addEventListener('click', () => {
      const company = michaelActiveCompany();
      const name = companyNameInput.value.trim();
      if (!name) {
        toast('Enter a company name before saving.');
        companyNameInput.focus();
        return;
      }
      const preferences = saveMichaelCompanyPreferences(company, {
        name,
        region: companyRegionInput.value.trim() || D.workspace.region,
      });
      root.querySelectorAll('[data-company-current-name]').forEach((el) => { el.textContent = preferences.name; });
      root.querySelectorAll('[data-company-current-initial]').forEach((el) => { el.textContent = preferences.name.charAt(0); });
      const companyRow = root.querySelector(`[data-company-id="${company.id}"]`);
      if (companyRow) {
        companyRow.dataset.companyName = preferences.name.toLowerCase();
        const label = companyRow.querySelector('.company-name');
        if (label) label.textContent = preferences.name;
      }
      toast('Company information saved.');
    });
    roleSave?.addEventListener('click', () => {
      const company = michaelActiveCompany();
      const preferences = saveMichaelCompanyPreferences(company, { defaultRole: roleSelect.value });
      layer.querySelectorAll('[data-default-role-copy]').forEach((el) => { el.textContent = `New members join this workspace as ${preferences.defaultRole}s.`; });
      toast('Default member role saved.');
    });
    layer.querySelectorAll('[data-resource-push]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!resourcePushPanel || !resourceAppSelect) return;
        resourcePushPanel.dataset.resourceId = button.dataset.resourcePush;
        resourcePushPanel.dataset.resourceName = button.dataset.resourceName;
        resourcePushTitle.textContent = `Add ${button.dataset.resourceName} to an app`;
        const vendorOption = [...resourceAppSelect.options].find((option) => option.value === 'vendor-onboarding');
        resourceAppSelect.value = vendorOption ? vendorOption.value : resourceAppSelect.options[0]?.value || '';
        resourcePushPanel.hidden = false;
        resourceAppSelect.focus();
        resourcePushPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    });
    resourcePushCancel?.addEventListener('click', () => { resourcePushPanel.hidden = true; });
    resourcePushConfirm?.addEventListener('click', () => {
      const company = michaelActiveCompany();
      const app = D.process(resourceAppSelect.value);
      const resourceId = resourcePushPanel.dataset.resourceId;
      const resourceName = resourcePushPanel.dataset.resourceName;
      const key = `app-tenant-config-${company.id}-${app.id}`;
      const saved = demoRead(key, {});
      const resources = Array.isArray(saved.resources) ? [...saved.resources] : [...MICHAEL_DEFAULT_APP_RESOURCES];
      if (resources.includes(resourceId)) {
        toast(`${resourceName} is already available in ${app.name}.`);
      } else {
        resources.push(resourceId);
        demoWrite(key, { ...saved, resources });
        refreshResourceCounts();
        toast(`${resourceName} added to ${app.name}.`);
      }
      resourcePushPanel.hidden = true;
    });
    workspaceUserOpen?.addEventListener('click', openWorkspaceUserDialog);
    workspaceUserClose?.addEventListener('click', closeWorkspaceUserDialog);
    workspaceUserCancel?.addEventListener('click', closeWorkspaceUserDialog);
    workspaceUserDialog?.addEventListener('click', (event) => {
      if (event.target === workspaceUserDialog) closeWorkspaceUserDialog();
    });
    workspaceUserForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const company = michaelActiveCompany();
      const name = workspaceUserName.value.trim();
      const email = workspaceUserEmail.value.trim().toLowerCase();
      const additions = michaelWorkspaceAddedUsers(company);
      const pending = D.workspace.invitesPending + additions.length;
      if (!name || !email || !workspaceUserEmail.validity.valid) {
        workspaceUserError.textContent = 'Enter a name and a valid work email.';
        workspaceUserError.hidden = false;
        (!name ? workspaceUserName : workspaceUserEmail).focus();
        return;
      }
      if ([...D.members, ...additions].some((member) => member.email.toLowerCase() === email)) {
        workspaceUserError.textContent = 'That person already belongs to this workspace.';
        workspaceUserError.hidden = false;
        workspaceUserEmail.focus();
        return;
      }
      if (D.workspace.seatsUsed + pending >= D.workspace.seatsTotal) {
        workspaceUserError.textContent = 'There are no available workspace seats.';
        workspaceUserError.hidden = false;
        return;
      }
      const av = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || '?';
      additions.push({ id: `workspace-added-${Date.now()}`, name, email, av, role: workspaceUserRole.value, status: 'Invite sent', fixed: false });
      demoWrite(`workspace-users-${company.id}`, additions);
      renderWorkspaceMembers();
      closeWorkspaceUserDialog();
      toast(`${name} added to ${company.name}.`);
    });
    renderWorkspaceMembers();
    tabs.forEach((tab) => tab.addEventListener('click', () => showPane(tab.dataset.settingsPane)));
    searchInput?.addEventListener('input', () => filterSettings(searchInput.value));

    const onLayerClick = (e) => {
      if (!sidebarLayout && e.target === layer) close();
    };
    const onDocKey = (e) => {
      if (e.key !== 'Escape') return;
      if (workspaceUserDialog && !workspaceUserDialog.hidden) closeWorkspaceUserDialog();
      else if (!layer.hidden) close();
    };

    layer.addEventListener('click', onLayerClick);
    document.addEventListener('keydown', onDocKey);
    window.__adSettingsModalTeardown = () => {
      document.body.classList.remove('ad-settings-modal-open');
      root.classList.remove('ad-settings-active');
      document.removeEventListener('keydown', onDocKey);
      window.__adSettingsModalTeardown = null;
    };

    const requestedPane = new URLSearchParams(location.search).get('settings');
    if (requestedPane && panels.some((panel) => panel.dataset.settingsPanel === requestedPane)) {
      open();
      showPane(requestedPane);
    }
    if (new URLSearchParams(location.search).get('addWorkspaceUser') === '1') {
      if (layer.hidden) open();
      showPane('users');
      openWorkspaceUserDialog();
    }
  }

  function mount(paneHTML) {
    const s = state();
    const existing = document.querySelector('.ad-ws');
    if (existing && s.shell === 'ws' && !s.embedded) {
      const template = document.createElement('template');
      template.innerHTML = wsShell(paneHTML, s);
      const nextBody = template.content.querySelector('.ad-body');
      const currentBody = existing.querySelector('.ad-body');
      if (nextBody && currentBody) {
        window.__wsProcessesTeardown?.();
        currentBody.replaceWith(nextBody);
        const currentTitle = existing.querySelector('.ad-top-l');
        const nextTitle = template.content.querySelector('.ad-top-l');
        const toggle = currentTitle.querySelector('[data-sidebar-toggle]');
        currentTitle.replaceChildren(toggle, ...[...nextTitle.children].filter(node => !node.matches('[data-sidebar-toggle]')));
        const nextLinks = [...template.content.querySelectorAll('.ad-side a')];
        existing.querySelectorAll('.ad-side a').forEach(link => {
          const match = nextLinks.find(item => item.getAttribute('href') === link.getAttribute('href'));
          link.classList.toggle('on', !!match?.classList.contains('on'));
          if (link.hasAttribute('role')) link.setAttribute('aria-selected', String(!!match?.classList.contains('on')));
        });
        bindStubs(nextBody);
        return;
      }
    }
    if (window.__adSearchTeardown) window.__adSearchTeardown();
    if (window.__adUserMenuTeardown) window.__adUserMenuTeardown();
    if (window.__adProfileModalTeardown) window.__adProfileModalTeardown();
    if (window.__adSettingsModalTeardown) window.__adSettingsModalTeardown();
    if (window.__adCompanyPickerTeardown) window.__adCompanyPickerTeardown();
    document.querySelectorAll('[data-ad-root]').forEach((n) => n.remove());
    document.body.classList.toggle('ad-embedded', s.embedded);
    if (s.embedded) {
      document.body.insertAdjacentHTML('afterbegin', `<main class="ad-embedded-pane" data-ad-root><div class="ad-pane-col">${paneHTML}</div></main>`);
      document.querySelectorAll('[data-ad-root]').forEach((root) => bindStubs(root));
      return;
    }
    document.body.insertAdjacentHTML('afterbegin', s.shell === 'app' ? appShell(paneHTML, s) : wsShell(paneHTML, s));
    document.querySelectorAll('[data-ad-root]').forEach((root) => {
      bindStubs(root);
      bindNotifications(root);
      bindUserMenu(root);
      bindProfileModal(root);
      bindCompanyPicker(root);
      bindSettingsModal(root);
      const off = bindSearch(root);
      if (off) window.__adSearchTeardown = off;
    });
    mountUt();
  }

  function mountUt() {
    if (window.adUtMount) {
      window.adUtMount();
      return;
    }
    if (document.querySelector('script[data-ad-ut]')) return;
    const s = document.createElement('script');
    s.dataset.adUt = '1';
    s.src = '../assets/admin-ut.js?v=mtg8tt0q.j1';
    s.onload = () => { if (window.adUtMount) window.adUtMount(); };
    document.head.appendChild(s);
  }

  /* --------------------------------------------------------- router */
  function isRoute(url) {
    return url.origin === location.origin && ROUTES.includes(url.pathname.split('/').pop());
  }

  /* The destination page's own <script> is re-run for the swapped-in pane.
     new Function() gives it a fresh scope, so its top-level `const D = …`
     does not collide with the one it declared on the previous visit. */
  function runPageScripts(doc) {
    doc.querySelectorAll('script:not([src])').forEach((tag) => {
      try {
        new Function(tag.textContent)();
      } catch (err) {
        console.error('admin-shell: page script failed', err);
      }
    });
  }

  function announce() {
    if (window.parent === window) return; // not inside the desktop shell
    const meta = document.querySelector('meta[name="eai-url"]');
    const file = location.pathname.split('/').pop();
    window.parent.postMessage({
      eai: true,
      nav: {
        url: meta ? meta.content : file,
        title: document.title.replace(/^Prototype — /, ''),
        file: `pages/${file}`,
      },
    }, '*');
  }

  function loadedScript(src) {
    const file = src.split('/').pop().split('?')[0];
    return [...document.scripts].some((s) => s.src && s.src.split('/').pop().split('?')[0] === file);
  }

  async function ensureScripts(doc) {
    const tags = [...doc.querySelectorAll('script[src]')];
    for (const tag of tags) {
      const src = tag.getAttribute('src');
      if (!src || loadedScript(src)) continue;
      await new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = new URL(src, location.href).href;
        el.onload = resolve;
        el.onerror = reject;
        document.head.appendChild(el);
      });
    }
  }

  let token = 0;
  async function go(href, push) {
    const mine = ++token;
    const destination = new URL(href, location.href);
    if (destination.pathname.endsWith('/builder.html') && document.querySelector('.ad-ws')) {
      const frame = document.createElement('iframe');
      frame.title = destination.searchParams.get('project') || 'App builder';
      frame.className = 'ad-app-workspace-frame';
      destination.searchParams.set('workspaceEmbed', '1');
      frame.src = destination.href;
      frame.style.visibility = 'hidden';
      frame.addEventListener('load', () => {
        if (mine !== token) { frame.remove(); return; }
        const pane = document.querySelector('.ad-body');
        pane.replaceChildren(frame);
        pane.className = 'ad-body ad-app-workspace';
        frame.style.visibility = '';
        document.querySelector('.ad-ws').classList.add('ad-show-app-workspace');
        if (push) history.pushState({ad:true}, '', href);
        document.querySelectorAll('.ad-side a').forEach(link => {
          const url = new URL(link.href);
          const selected = url.pathname.endsWith('/builder.html') && url.searchParams.get('app') === destination.searchParams.get('app') && url.searchParams.get('surface') === destination.searchParams.get('surface') && url.searchParams.get('project') === destination.searchParams.get('project');
          link.classList.toggle('on', selected);
        });
      }, {once:true});
      document.body.appendChild(frame);
      return;
    }
    let doc;
    try {
      const res = await fetch(href, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    } catch (err) {
      location.href = href; // fall back to a real navigation
      return;
    }
    if (mine !== token) return; // a later click won

    const pane = doc.getElementById('adPane');
    await ensureScripts(doc);

    /* Keep the current screen painted while the destination is fetched, then
       replace the shell and pane in one captured frame. Rebuilding outside a
       view transition briefly exposed the destination at its unmeasured size
       and made every route change look like a full-page zoom. */
    const applyRoute = () => {
      if (push) history.pushState({ ad: true }, '', href);

      Object.keys(document.body.dataset)
        .filter((k) => k.startsWith('ad'))
        .forEach((k) => { delete document.body.dataset[k]; });
      Object.keys(doc.body.dataset).forEach((k) => { document.body.dataset[k] = doc.body.dataset[k]; });

      document.title = doc.title;
      const urlMeta = document.querySelector('meta[name="eai-url"]');
      const newMeta = doc.querySelector('meta[name="eai-url"]');
      if (urlMeta && newMeta) urlMeta.content = newMeta.content;

      document.querySelector('.ad-ws')?.classList.remove('ad-show-app-workspace');
      mount(pane ? pane.innerHTML : '');
      runPageScripts(doc);
      announce();
    };

    applyRoute();

  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download') || a.dataset.stub !== undefined) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (!isRoute(url)) return;
    const currentParams = new URLSearchParams(location.search);
    if (currentParams.get('demo') === 'michael') {
      const targetFile = url.pathname.split('/').pop();
      const dashboardSection = {
        'app-overview.html': 'overview',
        'app-submissions.html': 'submissions',
        'app-analytics.html': 'analytics',
        'app-users.html': 'users',
      }[targetFile] || (targetFile === 'app-configure.html' ? (url.searchParams.get('section') || 'resources') : '');
      if (dashboardSection && currentParams.get('embedded') !== '1') {
        e.preventDefault();
        go(michaelBuilderAppHref(state(), D.process(url.searchParams.get('app')), dashboardSection), true);
        return;
      }
      url.searchParams.set('demo', 'michael');
      if (currentParams.get('embedded') === '1') url.searchParams.set('embedded', '1');
      if (currentParams.get('workspaceSettings') === 'sidebar') {
        url.searchParams.set('workspaceSettings', 'sidebar');
      }
    }
    e.preventDefault();
    if (url.href === location.href) return;
    go(url.href, true);
  });

  window.addEventListener('popstate', () => go(location.href, false));

  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-sidebar-close], [data-sidebar-toggle]');
    if (!control) return;
    const shell = document.querySelector('.ad-ws');
    if (!shell) return;
    const closed = control.hasAttribute('data-sidebar-close') || !shell.classList.contains('ad-sidebar-closed');
    shell.classList.toggle('ad-sidebar-closed', closed);
    const toggle = shell.querySelector('[data-sidebar-toggle]');
    toggle?.setAttribute('aria-expanded', String(!closed));
    toggle?.setAttribute('aria-label', closed ? 'Open sidebar' : 'Close sidebar');
    if (closed) toggle?.focus();
  });

  /* ------------------------------------------------------------ go */
  const initialState = state();
  const initialFile = location.pathname.split('/').pop();
  const initialDashboardSection = {
    'app-overview.html': 'overview',
    'app-submissions.html': 'submissions',
    'app-analytics.html': 'analytics',
    'app-users.html': 'users',
  }[initialFile] || (initialFile === 'app-configure.html'
    ? (new URLSearchParams(location.search).get('section') || 'resources')
    : '');
  if (initialState.michaelDemo && !initialState.embedded && initialDashboardSection) {
    location.replace(michaelBuilderAppHref(initialState, initialState.app, initialDashboardSection));
    return;
  }
  const paneEl = document.getElementById('adPane');
  const pane = paneEl ? paneEl.innerHTML : '';
  if (paneEl) paneEl.remove();
  mount(pane);
})();

// A CLI conversion inside the app iframe also updates the persistent workspace sidebar.
(function () {
  function syncCliTags() {
    document.querySelectorAll('.ad-recent-app').forEach(link => {
      const url = new URL(link.href, location.href);
      const name = link.querySelector('.tx')?.textContent.trim();
      let moved = false;
      try { moved = !!localStorage.getItem('eai-cli-app:' + (url.searchParams.get('ws') || '') + ':' + name); } catch {}
      if (!moved) return;
      const tag = link.querySelector('.surface-tag');
      if (tag) { tag.textContent = 'CLI'; tag.title = 'Command line interface'; }
      url.searchParams.set('surface', 'cli');
      url.searchParams.set('view', 'dashboard');
      link.href = url.href;
    });
  }
  window.addEventListener('storage', syncCliTags);
  window.addEventListener('focus', syncCliTags);
  syncCliTags();
})();
