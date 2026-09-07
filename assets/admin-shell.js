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
    'ws-home.html', 'ws-processes.html', 'ws-cli.html', 'ws-templates.html', 'ws-integrations.html',
    'ws-users.html', 'ws-settings.html', 'profile.html',
    'app-overview.html', 'app-submissions.html', 'app-submission.html', 'app-analytics.html', 'app-resources.html', 'app-general.html', 'app-clients.html', 'app-client.html',
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
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
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
    left: '<path d="m15 18-6-6 6-6"/>',
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
    return {
      shell: b.adShell,
      nav: b.adNav || '',
      title: b.adTitle || 'Home',
      rail: b.adRail || '',
      hero: b.adHero === '1',
      narrow: b.adNarrow === '1',
      mode: b.adMode || 'ncb',
      appId: app.id,
      app,
      clientId: rawClient ? D.client(rawClient, app.id).id : '',
    };
  }

  /* ------------------------------------------------------ ws shell */
  function tipText(label) {
    return String(label)
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ldquo;/g, '\u201c')
      .replace(/&rdquo;/g, '\u201d');
  }

  function tipPop(label) {
    return `<span class="ad-tip-pop" aria-hidden="true">${esc(tipText(label))}</span>`;
  }

  function wsItem(s, id, icon, label, href, extra) {
    const on = s.nav === id ? ' on' : '';
    const tail = extra || '';
    return href
      ? `<a class="ad-item ad-tip${on}" href="${href}">${svg(icon)}<span>${label}</span>${tail}${tipPop(label)}</a>`
      : `<button class="ad-item ad-tip${on}" type="button" data-stub>${svg(icon)}<span>${label}</span>${tail}${tipPop(label)}</button>`;
  }

  function wsShell(pane, s) {
    const w = D.workspace;
    const u = D.user;
    return `
<div class="ad-ws" data-ad-root>
  <aside class="ad-side">
    <div class="ad-side-hd">
      <button class="ad-ws-switch ad-tip" type="button" data-stub>
        <span class="tile">${w.initial}</span>
        <span class="tx"><b>${w.name}</b></span>
        ${svg('swap')}
        ${tipPop(w.name)}
      </button>
      <div class="ad-seg" role="tablist" aria-label="How you build">
        <a class="ad-seg-tab${s.mode === 'ncb' ? ' on' : ''}" href="ws-home.html" role="tab" aria-selected="${s.mode === 'ncb'}">No Code Builder</a>
        <a class="ad-seg-tab${s.mode === 'cli' ? ' on' : ''}" href="ws-cli.html" role="tab" aria-selected="${s.mode === 'cli'}">${svg('terminal')}CLI</a>
      </div>
    </div>
    <div class="ad-side-body">
      <nav class="ad-nav">
        ${wsItem(s, 'home', 'home', 'Home', 'ws-home.html')}
        ${wsItem(s, 'processes', 'grid', 'All apps', 'ws-processes.html', `<i class="count">${D.processes.length}</i>`)}
        ${wsItem(s, 'templates', 'template', 'Templates', 'ws-templates.html')}
        ${wsItem(s, 'integrations', 'plug', 'Integrations', 'ws-integrations.html')}
      </nav>
      <nav class="ad-nav">
        <div class="ad-nav-label">Manage</div>
        ${wsItem(s, 'data', 'data', 'Data', null)}
        ${wsItem(s, 'users', 'users', 'Users &amp; roles', 'ws-users.html')}
        ${wsItem(s, 'analytics', 'chart', 'Analytics', null, '<span class="tag">New</span>')}
        ${wsItem(s, 'automations', 'zap', 'Automations', null)}
        ${wsItem(s, 'audit', 'file', 'Audit log', null)}
      </nav>
      <nav class="ad-nav">
        <div class="ad-nav-label">Workspace Settings</div>
        ${wsItem(s, 'settings', 'gear', 'Settings', 'ws-settings.html')}
      </nav>
    </div>
    <div class="ad-side-ft">
      <div class="ad-upsell">
        <b>Upgrade to Team</b>
        <p>Unlimited apps, roles &amp; audit history.</p>
        <button class="btn" type="button" data-stub>View plans</button>
      </div>
      <a class="ad-user ad-tip${s.nav === 'profile' ? ' on' : ''}" href="profile.html">
        <span class="av">${u.av}</span>
        <span class="tx"><b>${u.name}</b><span>${u.role}</span></span>
        ${svg('dots')}
        ${tipPop(u.name)}
      </a>
    </div>
  </aside>
  <main class="ad-main">
    <header class="ad-top">
      <div class="ad-top-l">
        <button class="collapse" type="button" data-ad-collapse-ws aria-expanded="true" aria-label="Collapse sidebar">${svg('panel')}</button>
        <b>${s.title}</b>
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
        <button class="ad-btn" type="button" data-stub>${svg('plus')}Create new app</button>
      </div>
    </header>
    <div class="ad-body${s.hero ? ' hero' : ''}"><div class="ad-col${s.narrow ? ' narrow' : ''}">${pane}</div></div>
  </main>
</div>
<div class="ad-flag" data-ad-root>MVP · prototype</div>`;
  }

  /* ----------------------------------------------------- app shell */
  function railItem(s, id, icon, label, href) {
    const on = s.rail === id ? ' on' : '';
    return `<a class="ad-rail-item ad-tip${on}" href="${href}">${svg(icon)}<span class="lb">${label}</span>${tipPop(label)}</a>`;
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
    const app = s.app;
    const clientsOpen = s.rail === 'clients' || s.rail === 'client';
    return `
<div class="ad-app" data-ad-root>
  <div class="ad-app-outer">
    <header class="ad-app-top">
      <button class="ad-back" type="button" data-ad-back aria-label="Back to workspace">${svg('left')}<span>Back to workspace</span></button>
      <div class="ad-app-acts">${notifBell()}</div>
    </header>
    <div class="ad-card-shell">
      <div class="ad-card-bar">
        <button class="ad-icon-btn" type="button" data-ad-collapse-rail aria-expanded="true" aria-label="Collapse rail" style="width:28px;height:28px;">${svg('panel')}</button>
        <span class="ad-card-title"><b>${app.name}</b> App settings</span>
      </div>
      <div class="ad-card-body">
        <aside class="ad-rail">
          <div class="ad-rail-search">
            <label>${svg('search')}<input type="search" placeholder="Search…" aria-label="Search settings" /></label>
          </div>
          <nav class="ad-rail-nav" aria-label="App settings">
            ${railItem(s, 'overview', 'home', 'Overview', `app-overview.html?app=${s.appId}`)}
            ${railItem(s, 'submissions', 'file', 'Submissions', `app-submissions.html?app=${s.appId}`)}
            ${railItem(s, 'analytics', 'chart', 'Analytics', `app-analytics.html?app=${s.appId}`)}
            ${railItem(s, 'resources', 'data', 'Resources', `app-resources.html?app=${s.appId}`)}
            ${railItem(s, 'general', 'gear', 'Settings', `app-general.html?app=${s.appId}`)}
            <div>
              <a class="ad-rail-item ad-tip${clientsOpen ? ' on' : ''}" href="app-clients.html?app=${s.appId}" aria-expanded="${clientsOpen}">
                ${svg('building')}<span class="lb">Clients</span>${svg('chev', 'chev')}
                ${tipPop('Clients')}
              </a>
              ${clientsOpen ? clientSub(s) : ''}
            </div>
            <div class="ad-rail-ft">
              <button class="ad-rail-item ad-tip" type="button" data-stub>${svg('warn')}<span class="lb">Danger zone</span>${tipPop('Danger zone')}</button>
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
      if (!needle) return D.processes;
      return D.processes.filter((p) =>
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
      list.innerHTML = rows.map((p, i) => `
        <li role="option" aria-selected="${i === 0}">
          <a class="ad-search-hit${i === 0 ? ' on' : ''}" href="app-overview.html?app=${esc(p.id)}">
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
        const what = (el.textContent || el.getAttribute('aria-label') || 'This').trim();
        toast(`${what} isn’t part of this prototype.`);
      });
    });
  }

  const WS_SIDE_KEY = 'ad-ws-side-collapsed';
  const APP_RAIL_KEY = 'ad-app-rail-collapsed';

  function setWsSideCollapsed(ws, btn, collapsed) {
    ws.classList.toggle('side-collapsed', collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  }

  function setAppRailCollapsed(body, btn, collapsed) {
    body.classList.toggle('rail-collapsed', collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute('aria-label', collapsed ? 'Expand rail' : 'Collapse rail');
  }

  function bindBack(root) {
    root.querySelector('[data-ad-back]')?.addEventListener('click', (e) => {
      e.preventDefault();
      go(new URL('ws-home.html', location.href).href, true);
    });
  }

  function bindCollapse(root) {
    const ws = root.classList.contains('ad-ws') ? root : root.querySelector('.ad-ws');
    if (ws) {
      const btn = ws.querySelector('[data-ad-collapse-ws]');
      if (btn) {
        setWsSideCollapsed(ws, btn, sessionStorage.getItem(WS_SIDE_KEY) === '1');
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const collapsed = !ws.classList.contains('side-collapsed');
          setWsSideCollapsed(ws, btn, collapsed);
          sessionStorage.setItem(WS_SIDE_KEY, collapsed ? '1' : '0');
        });
      }
    }

    const app = root.classList.contains('ad-app') ? root : root.querySelector('.ad-app');
    if (app) {
      const btn = app.querySelector('[data-ad-collapse-rail]');
      const body = app.querySelector('.ad-card-body');
      if (btn && body) {
        setAppRailCollapsed(body, btn, sessionStorage.getItem(APP_RAIL_KEY) === '1');
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const collapsed = !body.classList.contains('rail-collapsed');
          setAppRailCollapsed(body, btn, collapsed);
          sessionStorage.setItem(APP_RAIL_KEY, collapsed ? '1' : '0');
        });
      }
    }
  }

  function mount(paneHTML) {
    const s = state();
    if (window.__adSearchTeardown) window.__adSearchTeardown();
    document.querySelectorAll('[data-ad-root]').forEach((n) => n.remove());
    document.body.insertAdjacentHTML('afterbegin', s.shell === 'app' ? appShell(paneHTML, s) : wsShell(paneHTML, s));
    document.querySelectorAll('[data-ad-root]').forEach((root) => {
      bindCollapse(root);
      bindBack(root);
      bindStubs(root);
      bindNotifications(root);
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
        adDepth: adNavCount,
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
  let navigating = false;
  let adNavCount = 0;

  async function go(href, push) {
    if (navigating) return;
    navigating = true;
    const mine = ++token;
    let doc;
    try {
      const res = await fetch(href, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    } catch (err) {
      navigating = false;
      location.href = href; // fall back to a real navigation
      return;
    }
    if (mine !== token) {
      navigating = false;
      return; // a later click won
    }

    if (push) {
      adNavCount += 1;
      history.pushState({ ad: true, depth: adNavCount }, '', href);
    }

    Object.keys(document.body.dataset)
      .filter((k) => k.startsWith('ad'))
      .forEach((k) => { delete document.body.dataset[k]; });
    Object.keys(doc.body.dataset).forEach((k) => { document.body.dataset[k] = doc.body.dataset[k]; });

    document.title = doc.title;
    const urlMeta = document.querySelector('meta[name="eai-url"]');
    const newMeta = doc.querySelector('meta[name="eai-url"]');
    if (urlMeta && newMeta) urlMeta.content = newMeta.content;

    const pane = doc.getElementById('adPane');
    mount(pane ? pane.innerHTML : '');
    await ensureScripts(doc);
    runPageScripts(doc);
    announce();
    navigating = false;
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download') || a.dataset.stub !== undefined) return;
    let url;
    try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    if (!isRoute(url)) return;
    e.preventDefault();
    if (url.href === location.href) return;
    go(url.href, true);
  });

  window.addEventListener('popstate', () => {
    if (history.state?.ad && typeof history.state.depth === 'number') adNavCount = history.state.depth;
    go(location.href, false);
  });

  window.addEventListener('message', (e) => {
    if (e.data?.eai && e.data.action === 'ad-history-back' && adNavCount > 0) history.back();
  });

  /* ------------------------------------------------------------ go */
  const paneEl = document.getElementById('adPane');
  const pane = paneEl ? paneEl.innerHTML : '';
  if (paneEl) paneEl.remove();
  mount(pane);
  history.replaceState({ ad: true, depth: 0 }, '', location.href);
  announce();
})();
