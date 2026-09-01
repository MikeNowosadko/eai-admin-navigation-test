(function () {
  const STORAGE = {
    tenancy: 'bw-tenancy',
    email: 'bw-email',
    ws: 'bw-ws',
    signedIn: 'bw-signed-in',
    pendingPrompt: 'bw-pending-prompt',
  };

  const SEEDED = {
    wsName: 'Adaptovate',
    wsInitial: 'A',
    wsPlan: 'Builder',
    userName: 'Gareth Chainey',
    userAv: 'GC',
    userRole: 'Owner',
    creditsLeft: 42,
    creditsMax: 100,
  };

  const SEEDED_APPS = [
    {
      id: 'kyc-onboarding',
      name: 'KYC Onboarding',
      initial: 'K',
      subtitle: 'Customer identity verification · Finance',
      meta: 'Created 3 weeks ago · 128 runs this week',
      access: 'Anyone in workspace',
      desc: 'Collect documents, verify identity, and route exceptions for compliance review.',
      env: 'Draft',
      url: '—',
      status: 'draft',
      statusLabel: 'Draft',
      cardMeta: ['Submit → Review → Outcome', '3 environments'],
    },
    {
      id: 'leave-approval',
      name: 'Leave approval',
      initial: 'L',
      subtitle: 'Manager sign-off · People',
      meta: 'Created 8 weeks ago · 12 runs today',
      access: 'Anyone in workspace',
      desc: 'Manager approval workflow with balance checks and HR notification on decision.',
      env: 'Production',
      url: 'leave.adaptovate.app',
      status: 'live',
      statusLabel: 'Live',
      cardMeta: ['12 runs today', 'Production'],
    },
    {
      id: 'invoice-processing',
      name: 'Invoice processing',
      initial: 'I',
      subtitle: 'PO matching · Finance',
      meta: 'Last edited yesterday · Staging',
      access: 'Only invited people',
      desc: 'Capture invoice details, match POs, and route over-threshold items for sign-off.',
      env: 'Staging',
      url: 'invoices.staging.adaptovate.app',
      status: 'draft',
      statusLabel: 'Draft',
      cardMeta: ['Last edited yesterday', 'Staging'],
    },
  ];

  function params() {
    return new URLSearchParams(location.search);
  }

  function readFromUrl() {
    const p = params();
    const signedIn = sessionStorage.getItem(STORAGE.signedIn) === '1';

    // Sign in (or explicit seeded URL) always wins — Adaptovate demo workspace with apps.
    if (signedIn || p.get('tenancy') === 'seeded') {
      sessionStorage.setItem(STORAGE.signedIn, '1');
      sessionStorage.setItem(STORAGE.tenancy, 'seeded');
      sessionStorage.removeItem(STORAGE.email);
      sessionStorage.removeItem(STORAGE.ws);
      return;
    }

    if (p.get('tenancy') === 'new' || p.get('ws') || p.get('email')) {
      sessionStorage.setItem(STORAGE.tenancy, 'new');
      sessionStorage.removeItem(STORAGE.signedIn);
      if (p.get('email')) sessionStorage.setItem(STORAGE.email, p.get('email'));
      if (p.get('ws')) sessionStorage.setItem(STORAGE.ws, p.get('ws'));
    }
  }

  function mode() {
    readFromUrl();
    return sessionStorage.getItem(STORAGE.tenancy) === 'seeded' ? 'seeded' : 'new';
  }

  function profile() {
    const seeded = mode() === 'seeded';
    if (seeded) return { ...SEEDED, mode: 'seeded' };

    const ws = sessionStorage.getItem(STORAGE.ws) || params().get('ws') || 'My workspace';
    const email = sessionStorage.getItem(STORAGE.email) || params().get('email') || '';
    const local = email.split('@')[0].replace(/[._+]/g, ' ').trim();
    const userName = local
      ? local.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'New user';

    return {
      mode: 'new',
      wsName: ws,
      wsInitial: ws.charAt(0).toUpperCase() || 'W',
      wsPlan: 'Builder',
      userName,
      userAv: userName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'NU',
      userRole: 'Owner',
      creditsLeft: 100,
      creditsMax: 100,
      email,
    };
  }

  function signInSeeded() {
    sessionStorage.setItem(STORAGE.signedIn, '1');
    sessionStorage.setItem(STORAGE.tenancy, 'seeded');
    sessionStorage.removeItem(STORAGE.email);
    sessionStorage.removeItem(STORAGE.ws);
  }

  function seededApps() {
    return SEEDED_APPS.slice();
  }

  function appById(id) {
    return SEEDED_APPS.find((a) => a.id === id) || SEEDED_APPS[0];
  }

  function renderAppCard(app) {
    return `
      <a class="bw-app-card" href="app-settings.html?app=${app.id}">
        <div class="bw-app-card-hd"><b>${app.name}</b><span class="bw-app-status ${app.status}">${app.statusLabel}</span></div>
        <p>${app.desc}</p>
        <div class="bw-app-meta">${app.cardMeta.map((m) => `<span>${m}</span>`).join('')}</div>
      </a>`;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function paintSidebar() {
    const p = profile();
    setText('wsInitial', p.wsInitial);
    setText('wsName', p.wsName);
    setText('wsPlan', p.wsPlan);
    setText('userName', p.userName);
    setText('userAv', p.userAv);
    const roleEl = document.querySelector('.nb-user .tx span');
    if (roleEl) roleEl.textContent = p.userRole;
    const crLeft = document.querySelector('.bd-credits .hd i span');
    if (crLeft) crLeft.textContent = String(p.creditsLeft);
    const crBar = document.querySelector('.bd-credits .bar i');
    if (crBar) crBar.style.width = `${Math.round((p.creditsLeft / p.creditsMax) * 100)}%`;
    const procCount = document.getElementById('processCount');
    if (procCount && mode() === 'seeded') procCount.textContent = String(SEEDED_APPS.length);
  }

  window.bwTenancy = {
    mode,
    profile,
    paintSidebar,
    signInSeeded,
    seededApps,
    appById,
    renderAppCard,
    isSeeded: () => mode() === 'seeded',
    pendingPrompt: () => sessionStorage.getItem(STORAGE.pendingPrompt) || params().get('prompt') || '',
    clearPendingPrompt: () => sessionStorage.removeItem(STORAGE.pendingPrompt),
    STORAGE,
  };

  document.addEventListener('DOMContentLoaded', paintSidebar);
})();
