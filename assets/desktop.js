/* ------------------------------------------------------------------
   Desktop shell: windows, dock, browser, and the message bus that lets
   pages inside the browser talk to the CLI journey.

   The journey always writes into one #termBody element. `setHost()`
   moves that element between app skins, so the same flow can run in
   Terminal, VS Code, Claude or GitHub Copilot — switch apps mid-run and
   it carries on exactly where it was.

   Pages in npx/pages/ post messages up:
     { eai:true, nav:{url,title} }   — I loaded, here's my address
     { eai:true, action:'signin' }   — the user did the thing you're waiting on
------------------------------------------------------------------- */

// Not every flow has every window — the setup-app flow has no CLI host, for
// instance — so only register the ones this page actually contains.
const WINDOWS = {
  browser: document.getElementById('winBrowser'),
  host: document.getElementById('winHost'),
  setup: document.getElementById('winSetup'),
  dmg: document.getElementById('winDmg'),
  finder: document.getElementById('winFinder'),
};
Object.keys(WINDOWS).forEach((k) => { if (!WINDOWS[k]) delete WINDOWS[k]; });

const desktop = {
  wins: WINDOWS,
  frame: document.getElementById('browFrame'),
  urlBar: document.getElementById('browUrl'),
  titleBar: document.getElementById('browserTitle'),
  hostTitle: document.getElementById('hostTitle'),
  hostBody: document.getElementById('hostBody'),
  menuApp: document.getElementById('menuApp'),
  coach: document.getElementById('coach'),
  clipboard: '',
  z: 10,
};

/** Whatever the user last copied on this fake machine. */
function clipboardText() { return desktop.clipboard; }

/* --- the app the CLI runs inside ---------------------------------- */

// The terminal surface itself never gets rebuilt — only the chrome around it.
const termBody = document.createElement('div');
termBody.className = 'term-body';
termBody.id = 'termBody';
termBody.tabIndex = 0;

const HOSTS = {
  terminal: {
    menu: 'Terminal',
    title: 'gareth — zsh — ~/work',
    dark: true,
    skin: '<div class="skin-terminal"><div class="term-slot"></div></div>',
  },

  vscode: {
    menu: 'Code',
    title: 'work — Visual Studio Code',
    dark: true,
    skin: `
      <div class="skin-code">
        <div class="vs-activity">
          <svg viewBox="0 0 24 24" fill="none" class="on"><path d="M3 5h7l2 2h9v12H3z" stroke="currentColor" stroke-width="1.6"/></svg>
          <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.6"/></svg>
          <svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="6" r="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="18" r="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="12" r="2.4" stroke="currentColor" stroke-width="1.6"/><path d="M7 8.4v7.2M9.4 6H15v3.6" stroke="currentColor" stroke-width="1.6"/></svg>
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 4h9l5 5v11H5z" stroke="currentColor" stroke-width="1.6"/><path d="M9 13h6M9 17h6" stroke="currentColor" stroke-width="1.6"/></svg>
        </div>
        <div class="vs-side">
          <div class="ttl">EXPLORER</div>
          <div class="grp">▾ WORK</div>
          <div class="f on">README.md</div>
          <div class="f">package.json</div>
          <div class="f">eai.config.ts</div>
          <div class="grp" style="margin-top:10px;">▸ node_modules</div>
        </div>
        <div class="vs-main">
          <div class="vs-tabs"><span class="tab on">README.md</span><span class="tab">eai.config.ts</span></div>
          <div class="vs-editor"># work<br /><span class="p">Scaffolded by the EAI CLI.</span><br /><span class="k">const</span> <span class="p">tenant =</span> <span class="s">'northwind'</span></div>
          <div class="vs-panel">
            <div class="vs-panel-tabs"><span>PROBLEMS</span><span>OUTPUT</span><span>DEBUG CONSOLE</span><b>TERMINAL</b><span>PORTS</span></div>
            <div class="term-slot"></div>
          </div>
        </div>
        <div class="vs-status"><span>&#9095; main*</span><span>&#9888; 0 &#10005; 0</span><span class="sp"></span><span>EAI</span><span>UTF-8</span><span>zsh</span></div>
      </div>`,
  },

  copilot: {
    menu: 'Code',
    title: 'work — Visual Studio Code — GitHub Copilot',
    dark: true,
    skin: `
      <div class="skin-copilot">
        <div class="vs-activity">
          <svg viewBox="0 0 24 24" fill="none"><path d="M3 5h7l2 2h9v12H3z" stroke="currentColor" stroke-width="1.6"/></svg>
          <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.6"/></svg>
          <svg viewBox="0 0 24 24" fill="none" class="on"><path d="M4 12c0-4 3-6 8-6s8 2 8 6-3 6-8 6c-1.5 0-3-.2-4.2-.6L4 19z" stroke="currentColor" stroke-width="1.6"/></svg>
        </div>
        <div class="vs-main">
          <div class="vs-tabs"><span class="tab on">README.md</span></div>
          <div class="vs-editor" style="height:auto; flex:1;"># work<br /><span class="p">Scaffolded by the EAI CLI.</span><br /><br /><span class="k">const</span> <span class="p">tenant =</span> <span class="s">'northwind'</span><br /><span class="k">export default</span> <span class="p">defineApp({ tenant })</span></div>
        </div>
        <div class="cp-panel">
          <div class="cp-head">
            <svg width="15" height="15" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 20c8 0 12 3 12 3s4-1 6 1c1.6 1.6 1.4 6 1.4 6s2.6 1.4 2.6 5.6c0 6-4 9.4-8 11.2-4 1.8-9 2.2-14 2.2s-10-.4-14-2.2c-4-1.8-8-5.2-8-11.2 0-4.2 2.6-5.6 2.6-5.6s-.2-4.4 1.4-6c2-2 6-1 6-1s4-3 12-3z" fill="#e7e7e7"/><ellipse cx="24" cy="37" rx="5.4" ry="6.4" fill="#1f1f1f"/><ellipse cx="40" cy="37" rx="5.4" ry="6.4" fill="#1f1f1f"/></svg>
            GitHub Copilot <span class="badge">agent · eai</span>
          </div>
          <div class="term-slot"></div>
          <div class="cp-foot">Ask Copilot or run a command…</div>
        </div>
      </div>`,
  },

  claude: {
    menu: 'Claude',
    title: 'Claude Code — ~/work',
    dark: true,
    skin: agentSkin({ name: 'Claude Code', accent: '#d97757', model: 'claude-opus-5', hint: 'Try "build me an app" · ⏎ to send · ⌘K for commands' }),
  },

  // Copilot with the project explorer showing — how the setup app hands over.
  copilotProject: {
    menu: 'Code',
    title: 'Visual Studio Code',
    dark: true,
    skin: `
      <div class="skin-copilot with-explorer">
        <div class="vs-activity">
          <svg viewBox="0 0 24 24" fill="none" class="on"><path d="M3 5h7l2 2h9v12H3z" stroke="currentColor" stroke-width="1.6"/></svg>
          <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.6"/></svg>
          <svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="6" r="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="18" r="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="12" r="2.4" stroke="currentColor" stroke-width="1.6"/><path d="M7 8.4v7.2M9.4 6H15v3.6" stroke="currentColor" stroke-width="1.6"/></svg>
        </div>
        <div class="vs-side">
          <div class="ttl">EXPLORER</div>
          <div class="grp" data-project-folder>▾ PROJECT</div>
          <div class="f on">README.md</div>
          <div class="f">eai.config.ts</div>
          <div class="f">package.json</div>
          <div class="f">.gofer/</div>
          <div class="f">app/</div>
        </div>
        <div class="vs-main">
          <div class="vs-tabs"><span class="tab on">README.md</span></div>
          <div class="vs-editor" style="height:auto; flex:1;"># <span data-project-name>project</span><br /><span class="p">Created by Enterprise AI Setup.</span><br /><br /><span class="k">const</span> <span class="p">tenant =</span> <span class="s">'northwind'</span><br /><span class="k">export default</span> <span class="p">defineApp({ tenant })</span></div>
        </div>
        <div class="cp-panel">
          <div class="cp-head">
            <svg width="15" height="15" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 20c8 0 12 3 12 3s4-1 6 1c1.6 1.6 1.4 6 1.4 6s2.6 1.4 2.6 5.6c0 6-4 9.4-8 11.2-4 1.8-9 2.2-14 2.2s-10-.4-14-2.2c-4-1.8-8-5.2-8-11.2 0-4.2 2.6-5.6 2.6-5.6s-.2-4.4 1.4-6c2-2 6-1 6-1s4-3 12-3z" fill="#e7e7e7"/><ellipse cx="24" cy="37" rx="5.4" ry="6.4" fill="#1f1f1f"/><ellipse cx="40" cy="37" rx="5.4" ry="6.4" fill="#1f1f1f"/></svg>
            GitHub Copilot <span class="badge">agent · eai</span>
          </div>
          <div class="term-slot"></div>
          <div class="cp-foot">Ask Copilot or run a command…</div>
        </div>
      </div>`,
  },

  codex: {
    menu: 'Codex',
    title: 'Codex — ~/work',
    dark: true,
    skin: agentSkin({ name: 'Codex', accent: '#10a37f', model: 'gpt-5-codex', hint: 'Describe a task · ⏎ to send' }),
  },

  gemini: {
    menu: 'Gemini',
    title: 'Gemini CLI — ~/work',
    dark: true,
    skin: agentSkin({ name: 'Gemini CLI', accent: '#4285f4', model: 'gemini-3-pro', hint: 'Ask Gemini · ⏎ to send' }),
  },
};

/** Claude, Codex and Gemini share a shape: session list, transcript, composer. */
function agentSkin({ name, accent, model, hint }) {
  return `
    <div class="skin-claude">
      <div class="cl-side">
        <div class="brandline"><i style="background:${accent}"></i> ${name}</div>
        <div class="row on">~/work</div>
        <div class="grp">Recent</div>
        <div class="row">Set up EAI workspace</div>
        <div class="row">Contract renewals app</div>
        <div class="grp">MCP</div>
        <div class="row">eai · connected</div>
      </div>
      <div class="cl-main">
        <div class="cl-head">~/work · ${model} · eai CLI</div>
        <div class="term-slot"></div>
        <div class="cl-foot">${hint}</div>
      </div>
    </div>`;
}

/** What a page calls each app, and which dock app that is here. */
const APP_IDS = {
  Codex: 'codex', Claude: 'claude', 'VS Code': 'vscode', Gemini: 'gemini',
  'EAI Setup': 'setup',
};

/** Swap the chrome around the terminal without disturbing the journey. */
function setHost(app) {
  if (!desktop.wins.host) return;
  const host = HOSTS[app] || HOSTS.terminal;
  desktop.wins.host.dataset.app = app;
  dockItem(app)?.classList.remove('tucked'); // running it means you have it
  desktop.wins.host.classList.toggle('dark', !!host.dark);
  desktop.hostTitle.textContent = host.title;
  desktop.hostBody.innerHTML = host.skin;
  desktop.hostBody.querySelector('.term-slot').appendChild(termBody);
  termBody.scrollTop = termBody.scrollHeight;
}

/* --- window management -------------------------------------------- */

function focusWin(name) {
  const win = desktop.wins[name];
  if (!win) return;
  Object.values(desktop.wins).forEach((w) => w.classList.remove('focused'));
  win.classList.remove('hidden');
  win.classList.add('focused');
  win.style.zIndex = ++desktop.z;
  const MENU = { setup: 'EAI Setup', dmg: 'Finder', browser: 'Safari' };
  desktop.menuApp.textContent = name === 'host'
    ? (HOSTS[win.dataset.app] || HOSTS.terminal).menu
    : (MENU[name] || 'Safari');
}

function hideWin(name) {
  desktop.wins[name]?.classList.add('hidden');
  syncDock();
}

function dockItem(name) {
  return document.querySelector(`.dock .item[data-app="${name}"]`);
}

/** Dots under the dock icons follow which windows are actually open. */
function syncDock() {
  const host = desktop.wins.host;
  const hostOpen = host && !host.classList.contains('hidden');
  document.querySelectorAll('.dock .item').forEach((item) => {
    const app = item.dataset.app;
    let open = false;
    if (app === 'browser') open = !desktop.wins.browser.classList.contains('hidden');
    else if (app === 'setup') open = desktop.wins.setup && !desktop.wins.setup.classList.contains('hidden');
    else if (HOSTS[app]) open = hostOpen && app === host.dataset.app;
    item.classList.toggle('open', open);
  });
}

document.querySelectorAll('.win').forEach((win) => {
  const name = Object.keys(desktop.wins).find((k) => desktop.wins[k] === win);
  win.addEventListener('mousedown', () => focusWin(name), true);

  win.querySelector('[data-win-close]')?.addEventListener('click', (e) => { e.stopPropagation(); hideWin(name); });
  win.querySelector('[data-win-min]')?.addEventListener('click', (e) => { e.stopPropagation(); hideWin(name); });
  win.querySelector('[data-win-zoom]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (win.dataset.zoomed) {
      Object.assign(win.style, JSON.parse(win.dataset.zoomed));
      delete win.dataset.zoomed;
    } else {
      win.dataset.zoomed = JSON.stringify({ left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height });
      Object.assign(win.style, { left: '2%', top: '5%', width: '96%', height: '82%' });
    }
  });

  // Drag by the title bar. The iframe swallows mousemove, so disable pointer
  // events on window contents while dragging. A plain click must not nudge the
  // window, so nothing moves until the pointer actually travels.
  const bar = win.querySelector('[data-drag]');
  bar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.tl')) return;
    const rect = win.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;

    const move = (ev) => {
      if (!dragging) {
        if (Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return;
        dragging = true;
        win.style.width = `${rect.width}px`;
        win.style.height = `${rect.height}px`;
        desktop.frame.style.pointerEvents = 'none';
      }
      win.style.left = `${Math.max(0, Math.min(window.innerWidth - 120, ev.clientX - offX))}px`;
      win.style.top = `${Math.max(26, Math.min(window.innerHeight - 60, ev.clientY - offY))}px`;
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      desktop.frame.style.pointerEvents = '';
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
});

/* --- dock ---------------------------------------------------------- */

document.querySelectorAll('.dock .item').forEach((item) => {
  item.addEventListener('click', () => {
    const app = item.dataset.app;

    if (app === 'browser') {
      focusWin('browser');
      hideCoach();
    } else if (HOSTS[app]) {
      // Terminal, VS Code, Claude, Copilot — same journey, different app.
      setHost(app);
      focusWin('host');
      hideCoach();
      window.dispatchEvent(new CustomEvent('terminal-opened'));
    } else if (app === 'setup') {
      focusWin('setup');
    } else if (app === 'downloads') {
      const badge = item.querySelector('.badge');
      coach('Downloads', downloadCount
        ? `${downloadCount} item${downloadCount > 1 ? 's' : ''} — installed and added to your dock.`
        : 'Nothing downloaded yet.');
      setTimeout(hideCoach, 2400);
      badge.hidden = true;
    } else {
      coach(item.querySelector('.tip').textContent, 'Not part of this prototype — the journey runs in Safari and your CLI app.');
      setTimeout(hideCoach, 2400);
    }
    syncDock();
  });
});

/* --- downloading an app from the docs ------------------------------- */

let downloadCount = 0;

/**
 * Fly the app icon from the docs page into the Downloads stack, then put the
 * app in the dock — the same two beats as a real download.
 * `rect` is the button's position inside the browser frame.
 */
function downloadApp(name, rect) {
  const app = APP_IDS[name] || 'terminal';
  const item = dockItem(app);
  const dl = dockItem('downloads');
  if (!item || !dl) return;

  const frame = desktop.frame.getBoundingClientRect();
  const size = 46;
  const startX = frame.left + rect.left + rect.width / 2 - size / 2;
  const startY = frame.top + rect.top + rect.height / 2 - size / 2;

  const fly = document.createElement('div');
  fly.className = 'fly-icon';
  fly.innerHTML = item.querySelector('.ico').innerHTML;
  fly.style.left = `${startX}px`;
  fly.style.top = `${startY}px`;
  document.getElementById('desktop').appendChild(fly);

  const target = dl.querySelector('.ico').getBoundingClientRect();
  const dx = target.left + target.width / 2 - (startX + size / 2);
  const dy = target.top + target.height / 2 - (startY + size / 2);

  const flight = fly.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 70}px) scale(0.72)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.16)`, opacity: 0.85 },
  ], { duration: 780, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });

  flight.onfinish = () => {
    fly.remove();

    // land in Downloads
    downloadCount += 1;
    const badge = dl.querySelector('.badge');
    badge.textContent = downloadCount;
    badge.hidden = false;
    dl.classList.add('bump');
    setTimeout(() => dl.classList.remove('bump'), 1200);

    // then whatever this flow does with a finished download
    setTimeout(() => {
      desktop.lastInstalled = app;
      if (typeof onDownloaded === 'function' && onDownloaded(app, name) === 'handled') return;
      item.classList.remove('tucked');
      item.classList.add('landing');
      setTimeout(() => item.classList.remove('landing'), 600);
      syncDock();
    }, 420);
  };
}

/** Flows can override what a finished download does (see setup.js). */
let onDownloaded = null;
function setDownloadHandler(fn) { onDownloaded = fn; }

/* --- the EAI Setup app window -------------------------------------- */

const setupHint = document.getElementById('setupHint');
const sayInSetup = (msg) => {
  if (setupHint) setupHint.innerHTML = `<strong>${msg}</strong> — that flow hasn't been defined yet.`;
};
document.getElementById('setupSignin')?.addEventListener('click', () => sayInSetup('Browser would open for sign-in.'));
document.getElementById('setupCreate')?.addEventListener('click', () => sayInSetup('Account creation would open in the browser.'));

/* --- ⌘K panel -------------------------------------------------------- */

const sheet = document.getElementById('sheet');
const sheetBackdrop = document.getElementById('sheetBackdrop');

function toggleSheet(open) {
  const show = open === undefined ? !sheet.classList.contains('on') : open;
  sheet.classList.toggle('on', show);
  sheetBackdrop.classList.toggle('on', show);
  sheet.setAttribute('aria-hidden', String(!show));
  if (show) {
    // Mark which app the journey is currently running in.
    const app = desktop.wins.host.dataset.app;
    sheet.querySelectorAll('[data-host]').forEach((b) => b.classList.toggle('on', b.dataset.host === app));
  }
}

document.getElementById('sheetClose').addEventListener('click', () => toggleSheet(false));
sheetBackdrop.addEventListener('click', () => toggleSheet(false));

sheet.querySelectorAll('[data-host]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setHost(btn.dataset.host);
    focusWin('host');
    syncDock();
    toggleSheet(false);
    window.dispatchEvent(new CustomEvent('terminal-opened'));
  });
});

// ⌘K from the shell itself. Keystrokes inside the browser frame are forwarded
// by page.js, since an iframe keeps its own key events.
function hotkeys(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    toggleSheet();
  } else if (e.key === 'Escape') {
    toggleSheet(false);
  }
}
document.addEventListener('keydown', hotkeys);

/* --- apple menu ----------------------------------------------------- */

const appleBtn = document.getElementById('appleBtn');
const appleMenu = document.getElementById('appleMenu');
appleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  appleMenu.classList.toggle('on');
  appleBtn.classList.toggle('on');
});
document.addEventListener('click', () => {
  appleMenu.classList.remove('on');
  appleBtn.classList.remove('on');
});

/* --- browser ------------------------------------------------------- */

const HOME_PAGE = 'pages/google.html';

/**
 * The fake browser only ever loads pages from this site. Anything with a
 * scheme (`javascript:`, `data:`) or a protocol-relative host is refused —
 * page.js messages are the one place an outside value could reach here.
 */
function safePath(url) {
  const ok = typeof url === 'string'
    && url.length < 512
    && !/^[a-z][a-z0-9+.-]*:/i.test(url)
    && !url.startsWith('//');
  return ok ? url : HOME_PAGE;
}

const browser = {
  history: [],
  at: -1,

  go(url, { push = true } = {}) {
    const path = safePath(url);
    desktop.frame.src = path;
    if (push) {
      browser.history = browser.history.slice(0, browser.at + 1);
      browser.history.push(path);
      browser.at = browser.history.length - 1;
    }
    focusWin('browser');
    syncDock();
  },

  /** Wait for a page inside the browser to report a specific action. */
  waitFor(action) {
    return new Promise((resolve) => { browser.pending = { action, resolve }; });
  },
};

document.getElementById('browBack').addEventListener('click', () => {
  if (browser.at > 0) { browser.at -= 1; browser.go(browser.history[browser.at], { push: false }); }
});
document.getElementById('browFwd').addEventListener('click', () => {
  if (browser.at < browser.history.length - 1) { browser.at += 1; browser.go(browser.history[browser.at], { push: false }); }
});
document.getElementById('browReload').addEventListener('click', () => {
  browser.go(browser.history[browser.at] || HOME_PAGE, { push: false });
});

/**
 * The prototype's own pages report themselves through page.js. The real EAI
 * docs site doesn't know anything about this shell, so wire it up on load:
 * address bar, history, and the ⌘K shortcut.
 */
desktop.frame.addEventListener('load', () => {
  let doc;
  try { doc = desktop.frame.contentDocument; } catch (err) { return; }
  if (!doc || doc.querySelector('meta[name="eai-url"]')) return;

  const path = doc.location.pathname.replace(/\.html$/, '');
  desktop.urlBar.textContent = `enterpriseaigroup.com${path}`;
  desktop.titleBar.textContent = doc.title || 'Safari';

  if (browser.history[browser.at] !== path) {
    browser.history = browser.history.slice(0, browser.at + 1);
    browser.history.push(safePath(doc.location.pathname));
    browser.at = browser.history.length - 1;
  }

  doc.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); toggleSheet(); }
    else if (ev.key === 'Escape') toggleSheet(false);
  });
});

window.addEventListener('message', (e) => {
  // Only the page inside our own browser window may drive the desktop.
  if (e.source !== desktop.frame.contentWindow) return;
  const msg = e.data;
  if (!msg || !msg.eai) return;

  if (msg.nav) {
    desktop.urlBar.textContent = String(msg.nav.url || '');
    desktop.titleBar.textContent = String(msg.nav.title || 'Safari');
    const current = browser.history[browser.at];
    const file = msg.nav.file && safePath(msg.nav.file);
    if (file && file !== current) {
      browser.history = browser.history.slice(0, browser.at + 1);
      browser.history.push(file);
      browser.at = browser.history.length - 1;
    }
  }

  if (msg.hotkey === 'cmd-k') toggleSheet();
  if (msg.hotkey === 'escape') toggleSheet(false);

  if (msg.action) {
    // Remember what was actually copied, so pasting it later matches. Nothing
    // else happens: a web page can't bounce a dock icon or open an app.
    if (msg.action === 'copied') desktop.clipboard = (msg.data && msg.data.text) || '';

    if (msg.action === 'download-app') {
      downloadApp(msg.data.app, msg.data.rect);
      return;
    }

    // The docs let you pick a coding agent — open the matching app here.
    if (msg.action === 'open-app') {
      const app = APP_IDS[msg.data && msg.data.app] || 'terminal';
      setHost(app);
      focusWin('host');
      syncDock();
      window.dispatchEvent(new CustomEvent('terminal-opened'));
      return;
    }
    if (browser.pending && browser.pending.action === msg.action) {
      const { resolve } = browser.pending;
      browser.pending = null;
      resolve(msg.data || {});
    }
  }
});

/* --- end of experiment ---------------------------------------------- */

/**
 * Both flows finish at the same place — the `/eai` prompt — so both end with
 * the same unmissable message. A participant in an unmoderated test has no
 * moderator to tell them they're done.
 *
 * `onContinue` is optional: the npx flow has more journey after this point,
 * which is useful for demos even though the experiment stops here.
 */
function endOfExperiment({ onContinue } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'done-overlay on';
  overlay.innerHTML = `
    <div class="done-card">
      <div class="mark">🎉</div>
      <h3>Thank you — experiment done</h3>
      <p>You've reached the point where you can describe the app you want to build. That's everything we needed. Please head back to the questions.</p>
      <button class="btn btn-dark" data-done>Done</button>
      ${onContinue ? '<button class="btn btn-ghost" data-continue>Keep exploring the prototype</button>' : ''}
    </div>`;

  document.getElementById('desktop').appendChild(overlay);

  overlay.querySelector('[data-done]').addEventListener('click', () => overlay.remove());
  overlay.querySelector('[data-continue]')?.addEventListener('click', () => {
    overlay.remove();
    onContinue();
  });
}

/* --- coach marks ---------------------------------------------------- */

function coach(title, text) {
  const heading = document.createElement('strong');
  heading.textContent = title;
  desktop.coach.replaceChildren(heading, document.createTextNode(text));
  desktop.coach.classList.add('on');
}
function hideCoach() { desktop.coach.classList.remove('on'); }

/** Whichever app the journey is currently running in. */
function hostName() {
  const host = desktop.wins.host;
  return (host && HOSTS[host.dataset.app] ? HOSTS[host.dataset.app] : HOSTS.terminal).menu;
}

/** The journey rail is gone; keep the call sites harmless. */
function stage() {}

// Nothing outside the desktop should ever scroll — anchors inside the browser
// frame can otherwise drag the whole shell out of view.
window.addEventListener('scroll', () => window.scrollTo(0, 0), { passive: true });

/* --- boot ----------------------------------------------------------- */

setHost('terminal');
browser.history = [HOME_PAGE];
browser.at = 0;
focusWin('browser');
syncDock();

// No prototype hints on the desktop itself — ⌘K is documented on the launch
// pad instead, so nothing here breaks the illusion of a real machine.

// Flow-specific scripts (terminal.js, setup.js) load after this file.
