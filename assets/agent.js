/* ------------------------------------------------------------------
   EAI as the agent — the spike, at /agent.

   The question this one exists to answer: if the app is a coding agent
   rather than a setup wizard, how much of the six-step setup can stop
   being the user's problem?

   The real installer (eai-installer, ui/index.html) asks for six:

     0  welcome            "Set up this computer for EAI"
     1  detect this Mac     git, node, npm, eai CLI
     2  install what's missing   admin password, PATH, timeouts
     3  sign in            browser
     4  the app            workspace -> app -> name -> parent folder
     5  choose how to work with AI   the surface list

   Here, five of the six are gone from the user's path:

     0  folded into the sign-in screen
     1  nothing to detect — the app brings its own runtime
     2  deferred. Tools get installed the moment you ask to open the
        project in your own editor, and not before, because that's the
        only thing that needs them
     3  KEPT. Only a person can sign in
     4  the agent proposes the workspace, the name and the folder from
        your first sentence, and shows each one with a way to change it
     5  gone. You're already in the thing

   So the user does two things: sign in, and say what they want.

   That deferral is the whole bet, and it's worth being clear about
   what it buys: most of what goes wrong in a real install goes wrong
   in steps 1-2 — the Mac password dialog, Windows PATH not refreshing,
   an old Node on PATH, fixed timeouts firing on a slow corporate link.
   None of it can fail for someone who never needed those tools.

   Hidden is not secret. Every decision the agent makes lands in the
   transcript with an undo next to it, and ⌘K -> "What did we skip?"
   prints the six steps and what happened to each.

   /install is the same app doing all six. /chat is the middle: all six
   steps, then a chat instead of a hand-off. This is the far end.

   Sections 1 and the chat runtime are /chat's, unchanged.
------------------------------------------------------------------- */

const setupWin = document.getElementById('winSetup');
const dmgApp = document.getElementById('dmgApp');
const dmgTarget = document.getElementById('dmgApplications');
const dmgHint = document.getElementById('dmgHint');

// The two nouns you act on are emphasised, so this is markup not text.
const HINT_DEFAULT = 'To install, drag <b>EAI Setup</b> to <b>Applications</b>';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** ~/eai/thing reads better than /Users/gareth/eai/thing. */
function shortPath(path) {
  return path.replace(/^\/Users\/[^/]+/, '~');
}

// macOS's spinner: eight tapered bars, each fading in turn. Same marker the
// setup screens use, so "the app is working" looks the same everywhere.
const SPINNER = '<s></s><s></s><s></s><s></s><s></s><s></s><s></s><s></s>';

/* ============================ 1. INSTALL ========================== */

let installed = false;

/* --- the download, the way Safari does it ------------------------------

   No flight to the dock: macOS hasn't done that in years. The file flies
   into the browser's downloads button, which pops into the toolbar and
   fills a progress ring. Opening the disk image is then the user's move.
*/

const dlBtn = document.getElementById('dlBtn');
const dlRing = document.getElementById('dlRing');
const dlPop = document.getElementById('dlPop');

setDownloadStartHandler((data) => {
  startBrowserDownload(data && data.rect);
  return 'handled';
});

function startBrowserDownload(rect) {
  dlBtn.hidden = false;
  dlBtn.classList.remove('done', 'bounce');
  dlRing.style.setProperty('--p', 0);

  flyToToolbar(rect);

  // Fill the ring over roughly the time an 84 MB file would take.
  const total = 1400;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / total);
    dlRing.style.setProperty('--p', Math.round(p * 100));
    if (p < 1) return requestAnimationFrame(tick);
    dlBtn.classList.add('done', 'bounce');
    setTimeout(() => dlBtn.classList.remove('bounce'), 520);
  };
  requestAnimationFrame(tick);
}

/** The file itself, arcing from the button on the page up to the toolbar. */
function flyToToolbar(rect) {
  if (!rect) return;
  const frame = desktop.frame.getBoundingClientRect();
  const target = dlBtn.getBoundingClientRect();

  const fly = document.createElement('div');
  fly.className = 'dl-fly';
  fly.innerHTML = '<img src="../assets/logos/eai-mark-dark.svg" alt="" />';
  const x = frame.left + rect.left + rect.width / 2 - 17;
  const y = frame.top + rect.top + rect.height / 2 - 17;
  fly.style.left = `${x}px`;
  fly.style.top = `${y}px`;
  document.body.appendChild(fly);

  const dx = target.left + target.width / 2 - (x + 17);
  const dy = target.top + target.height / 2 - (y + 17);

  fly.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.45 - 40}px) scale(0.8)`, opacity: 1, offset: 0.6 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0 },
  ], { duration: 620, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }).onfinish = () => fly.remove();
}

dlBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  dlPop.hidden = !dlPop.hidden;
});

// Clicking the file opens the disk image, as it would in Safari.
document.getElementById('dlItem').addEventListener('click', () => {
  dlPop.hidden = true;
  resetDmg();
  focusWin('dmg');
  syncDock();
});

// Anywhere else closes the list.
document.addEventListener('click', (e) => {
  if (dlPop.hidden) return;
  if (e.target.closest('#dlPop') || e.target.closest('#dlBtn')) return;
  dlPop.hidden = true;
});

function resetDmg() {
  installed = false;
  dmgApp.style.transform = '';
  dmgApp.hidden = false;
  dmgTarget.classList.remove('over', 'filled');
  dmgHint.innerHTML = HINT_DEFAULT;
  playIntro();
}

/* --- the opening sequence ------------------------------------------- */

// Three beats, each a class the CSS reacts to (see assets/install.css):
// the wordmark arrives, lifts into a title, then the icons come up.
const BEATS = { lift: 900, reveal: 1260 };

const dmgStage = document.getElementById('dmgStage');
let beatTimers = [];

function playIntro() {
  if (!dmgStage) return;
  beatTimers.forEach(clearTimeout);
  beatTimers = [];

  dmgStage.classList.remove('play', 'lift', 'reveal');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    dmgStage.classList.add('play', 'lift', 'reveal');
    return;
  }

  // Force a reflow so re-running the sequence restarts the animations
  // rather than being ignored as a no-op class change.
  void dmgStage.offsetWidth;

  requestAnimationFrame(() => {
    dmgStage.classList.add('play');
    beatTimers.push(setTimeout(() => dmgStage.classList.add('lift'), BEATS.lift));
    beatTimers.push(setTimeout(() => dmgStage.classList.add('reveal'), BEATS.reveal));
  });
}

// Watching motion means watching it more than once.
document.getElementById('replayIntro')?.addEventListener('click', () => {
  toggleSheet(false);
  focusWin('dmg');
  playIntro();
});

/** Copy to Applications: the app appears in the dock, the image ejects. */
function install() {
  if (installed) return;
  installed = true;
  dmgApp.hidden = true;
  dmgTarget.classList.add('filled');
  dmgHint.innerHTML = 'Copied to <b>Applications</b>';

  const item = dockItem('setup');
  item.classList.remove('tucked');
  item.classList.add('landing');
  setTimeout(() => item.classList.remove('landing'), 600);
  syncDock();

  setTimeout(() => hideWin('dmg'), 900);
}

dmgApp.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const start = { x: e.clientX, y: e.clientY };
  let moved = false;

  const move = (ev) => {
    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    moved = true;
    dmgApp.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
    dmgTarget.classList.toggle('over', hitTest(ev.clientX, ev.clientY, dmgTarget));
  };

  const up = (ev) => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    if (moved && hitTest(ev.clientX, ev.clientY, dmgTarget)) {
      install();
    } else {
      dmgApp.style.transform = '';
      dmgTarget.classList.remove('over');
    }
  };

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});

// Double-click installs too — dragging is fiddly and this is a prototype.
dmgApp.addEventListener('dblclick', install);
dmgTarget.addEventListener('dblclick', install);

function hitTest(x, y, el) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}


/* ======================= 2. SIGN IN — THE ONE STEP ================= */

/* The only screen in the app before the chat, because signing in is the
   only thing here that a person has to do themselves. */

function showScreen(name) {
  setupWin.querySelectorAll('[data-screen]').forEach((s) => {
    s.hidden = s.dataset.screen !== name;
  });
}

async function signIn() {
  browser.go('pages/signin.html');
  await browser.waitFor('signin');
  browser.go('pages/signed-in.html');
  await wait(1100);
  // No naming screen, no folder screen, no "choose your AI app" screen.
  // Signed in means started.
  openChat();
}

document.getElementById('setupSignin').addEventListener('click', signIn);
document.getElementById('setupCreate').addEventListener('click', signIn);

/* ==================== 3. THE FOLDER CHOOSER (ON DEMAND) ============ */

/* Still here, still real — but nobody is sent to it. It opens only if
   someone clicks "Change" on the folder the agent picked. */

const fndList = document.getElementById('fndList');
const fndCrumb = document.getElementById('fndCrumb');
const fndOpen = document.getElementById('fndOpen');

const FOLDERS = {
  eai: [
    { name: 'contract-renewals', dir: true, date: 'Just now' },
  ],
  Downloads: [
    { name: '11-Big-Sur-Color-Day-6k.jpg', size: '4.2 MB', kind: 'JPEG image', date: 'Today at 5:37 pm' },
    { name: 'hiring-candidates-workflow', dir: true, date: 'Yesterday at 9:38 pm' },
    { name: 'eai-cli-setup-with-copilot.pdf', size: '344 KB', kind: 'PDF Document', date: 'Yesterday at 8:59 pm' },
    { name: 'EAI-Setup.dmg', size: '84 MB', kind: 'Disk Image', date: 'Yesterday at 8:22 pm' },
    { name: 'printtomorrow', dir: true, date: '6 Aug 2026 at 3:18 am' },
  ],
  Desktop: [
    { name: 'screenshots', dir: true, date: 'Today at 11:02 am' },
    { name: 'client-workshop', dir: true, date: 'Yesterday at 4:15 pm' },
  ],
  Documents: [
    { name: 'projects', dir: true, date: 'Today at 8:40 am' },
    { name: 'contracts', dir: true, date: '2 Aug 2026 at 2:05 pm' },
  ],
  gareth: [
    { name: 'Applications', dir: true, date: '12 Jul 2026 at 9:00 am' },
    { name: 'Desktop', dir: true, date: 'Today at 11:02 am' },
    { name: 'Documents', dir: true, date: 'Today at 8:40 am' },
    { name: 'Downloads', dir: true, date: 'Today at 5:37 pm' },
    { name: 'eai', dir: true, date: 'Just now' },
  ],
};

let currentDir = 'gareth';
let selected = null;
let onFolderChosen = null;

function renderFolder(dir) {
  currentDir = dir;
  selected = null;
  fndCrumb.textContent = `📁 ${dir}`;
  fndOpen.disabled = true;
  fndList.replaceChildren();

  FOLDERS[dir].forEach((item) => {
    const row = document.createElement('div');
    row.className = `fnd-row ${item.dir ? 'dir' : 'file'}`;
    row.innerHTML = `
      <span class="nm">${item.dir ? '📁' : '📄'} ${escapeHtml(item.name)}</span>
      <span class="dim">${item.dir ? '--' : escapeHtml(item.size || '')}</span>
      <span class="dim">${item.dir ? 'Folder' : escapeHtml(item.kind || '')}</span>
      <span class="dim">${escapeHtml(item.date)}</span>`;

    if (item.dir) {
      row.addEventListener('click', () => {
        fndList.querySelectorAll('.fnd-row').forEach((r) => r.classList.remove('sel'));
        row.classList.add('sel');
        selected = item.name;
        fndOpen.disabled = false;
      });
      row.addEventListener('dblclick', () => { selected = item.name; chooseFolder(); });
    }
    fndList.appendChild(row);
  });
}

function chooseFolder() {
  if (!selected) return;
  const base = currentDir === 'gareth' ? '/Users/gareth' : `/Users/gareth/${currentDir}`;
  hideWin('finder');
  focusWin('chat');
  syncDock();
  if (onFolderChosen) onFolderChosen(`${base}/${selected}`);
}

document.getElementById('fndCancel').addEventListener('click', () => { hideWin('finder'); focusWin('chat'); });
fndOpen.addEventListener('click', chooseFolder);

document.getElementById('fndNew').addEventListener('click', () => {
  FOLDERS[currentDir].unshift({ name: project.name || 'new-folder', dir: true, date: 'Just now' });
  renderFolder(currentDir);
  fndList.querySelector('.fnd-row')?.click();
});

document.querySelectorAll('.skin-finder .fnd-side .row[data-dir]').forEach((row) => {
  row.addEventListener('click', () => {
    document.querySelectorAll('.skin-finder .fnd-side .row').forEach((r) => r.classList.remove('on'));
    row.classList.add('on');
    renderFolder(row.dataset.dir);
  });
});

/** Open the chooser and hand the result back to whoever asked. */
function pickFolder(then) {
  onFolderChosen = then;
  renderFolder(currentDir);
  focusWin('finder');
}

/* ==================== 4. THE CHAT — THE WHOLE APP ================== */

const chat = {
  win: document.getElementById('winChat'),
  skin: document.querySelector('#winChat .skin-chat'),
  thread: document.getElementById('chatThread'),
  scroll: document.getElementById('chatScroll'),
  chips: document.getElementById('chatChips'),
  input: document.getElementById('chatInput'),
  send: document.getElementById('chatSend'),
  hint: document.getElementById('chatHint'),
  state: document.getElementById('chatState'),
};

/* Everything the six-step wizard would have collected up front. Nothing
   here was asked for: the workspace is the only one this account is in,
   the name comes from the first sentence, the folder is the default that
   avoids OneDrive and iCloud, and the runtime ships inside the app. */
let project = {
  name: 'your app',
  // Where apps go. ~/eai rather than Documents or Desktop on purpose: those
  // are the folders OneDrive and iCloud sync, which is where npm installs
  // fail on managed machines.
  root: '/Users/gareth/eai',
  path: '',
  tenant: 'Northwind Group',
  named: false,
};

let chatStarted = false;

function labelProject() {
  document.querySelectorAll('[data-project-name]').forEach((n) => { n.textContent = project.name; });
  document.querySelectorAll('[data-project-path]').forEach((n) => {
    n.textContent = project.path ? shortPath(project.path) : 'not created yet';
  });
  document.querySelectorAll('[data-project-folder]').forEach((n) => { n.textContent = `📁 ${project.name}`; });
  document.querySelectorAll('[data-project-dir]').forEach((n) => {
    n.textContent = project.path ? shortPath(project.path) : '~/eai';
  });
  document.getElementById('chatTitle').textContent = project.named
    ? `${project.name} — Enterprise AI`
    : 'Enterprise AI';

  const app = desktop.wins.host.dataset.app;
  const label = MOVE_LABELS[app] || HOSTS[app]?.menu;
  if (label && project.named) document.getElementById('hostTitle').textContent = `${project.name} — ${label}`;
}

window.addEventListener('host-changed', labelProject);

/** Signed in, so started. There is nothing between the two. */
function openChat() {
  hideWin('setup');
  setAppWindow('chat');
  focusWin('chat');
  syncDock();

  if (chatStarted) return;
  chatStarted = true;
  labelProject();
  runChat();
}
/* --- the runtime the journey is written against ----------------------- */

/* Same shape as term-runtime.js, in a chat's terms: say/me print, ask and
   pick wait, card shows work. The journey below reads as a conversation
   because that's all these are. */

let fastForward = false;

chat.scroll.addEventListener('click', (e) => {
  // Clicking empty transcript skips the pauses; clicking a control doesn't.
  if (e.target.closest('button, input, iframe, a')) return;
  fastForward = true;
  if (!chat.input.disabled) chat.input.focus();
});

function sleep(ms) {
  return new Promise((resolve) => {
    if (fastForward) return resolve();
    const t = setTimeout(resolve, ms);
    const poll = setInterval(() => {
      if (fastForward) { clearTimeout(t); clearInterval(poll); resolve(); }
    }, 40);
    setTimeout(() => clearInterval(poll), ms + 60);
  });
}

function toBottom() { chat.scroll.scrollTop = chat.scroll.scrollHeight; }

function block(cls, html) {
  const node = document.createElement('div');
  node.className = `${cls} ch-in`;
  if (html != null) node.innerHTML = html;
  chat.thread.appendChild(node);
  toBottom();
  return node;
}

function setState(text, busy = false) {
  chat.state.innerHTML = `<i></i>${escapeHtml(text)}`;
  chat.state.classList.toggle('busy', busy);
}

/** Three dots while the app is composing, so nothing arrives from nowhere. */
async function think(ms = 620) {
  setState('Working', true);
  const dots = block('ch-dots', '<i></i><i></i><i></i>');
  await sleep(ms);
  dots.remove();
  setState('Ready');
}

/** The app's turn. */
async function say(html, { pause = 240, thinking = 460 } = {}) {
  if (thinking) await think(thinking);
  // Mirror the node the browser already parsed — see mirror().
  mirror('EAI', block('ch-msg', html));
  await sleep(pause);
}

/** The user's turn. */
function me(text) {
  block('ch-me', escapeHtml(text));
  mirror('You', text);
}

/** A block of work, ticked off a row at a time. */
function card(title, sub) {
  const el = block('ch-card',
    `<div class="hd">${escapeHtml(title)}${sub ? `<span class="sub">${escapeHtml(sub)}</span>` : ''}</div>`);

  return {
    el,
    /** Add a row, run it, land it — one at a time, like the setup screens. */
    async run(label, value, ms = 620) {
      const row = document.createElement('div');
      row.className = 'ch-row active';
      row.innerHTML = `<i class="mk busy">${SPINNER}</i>`
        + `<span class="lbl">${escapeHtml(label)}</span>`
        + '<span class="val"></span>';
      el.appendChild(row);
      toBottom();
      await sleep(ms);
      row.className = 'ch-row done';
      row.querySelector('.mk').className = 'mk done';
      row.querySelector('.mk').innerHTML = '&#10003;';
      if (value) row.querySelector('.val').textContent = value;
      mirror('EAI', `✓ ${label}${value ? ` — ${value}` : ''}`);
      toBottom();
    },
  };
}

/** Something that was built, with the one place you'd want to go next. */
function result(title, url, actions) {
  const el = block('ch-result',
    `<div class="tx"><b>${escapeHtml(title)}</b><span>${escapeHtml(url)}</span></div>`);
  actions.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `go${a.ghost ? ' ghost' : ''}`;
    b.textContent = a.label;
    b.addEventListener('click', a.onClick);
    el.appendChild(b);
  });
  mirror('EAI', `${title} — ${url}`);
  return el;
}

/* --- waiting for the user ---------------------------------------------- */

/* One pending prompt at a time, held here so the coding app you moved to can
   answer it as well as this window can. */
let pending = null;

function chips(list, onPick) {
  chat.chips.replaceChildren();
  list.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `ch-chip${c.primary ? ' primary' : ''}`;
    b.textContent = c.label;
    b.addEventListener('click', () => onPick(c));
    chat.chips.appendChild(b);
  });
  // Chips grow the composer, which shortens the scroller — so the question
  // they answer would otherwise slide under it just as it's asked.
  toBottom();
}

function clearPrompt() {
  pending = null;
  chat.chips.replaceChildren();
  chat.input.value = '';
  chat.input.disabled = true;
  chat.send.disabled = true;
  chat.input.placeholder = 'Describe the app you want to build…';
}

/** Ask for words. Chips are shortcuts, not the only way through. */
function ask({ placeholder = 'Type your answer…', suggestions = [], validate } = {}) {
  fastForward = false;

  return new Promise((resolve) => {
    // Put back exactly as it was: "Open in…" can interrupt a question at
    // any point, and the question has to survive that — the journey is
    // still awaiting this promise. See holdPrompt().
    const arm = () => {
      setState('Waiting for you');
      chat.input.disabled = false;
      chat.send.disabled = false;
      chat.input.placeholder = placeholder;
      chat.input.focus();
      chips(suggestions.map((s) => ({ label: s.label, primary: s.primary })), (c) => {
        const match = suggestions.find((s) => s.label === c.label);
        finish(match.value || match.label);
      });
    };

    const finish = (value) => {
      const text = String(value).trim();
      if (!text) return;
      if (validate) {
        const problem = validate(text);
        if (problem) {
          me(text);
          block('ch-msg', problem);
          chat.input.value = '';
          toBottom();
          return;
        }
      }
      clearPrompt();
      me(text);
      setState('Working', true);
      resolve(text);
    };

    pending = { kind: 'ask', submit: finish, arm };
    arm();
  });
}

/** A decision, not a sentence: approve, feed back, open something. */
function pick(options, { hint } = {}) {
  fastForward = false;

  return new Promise((resolve) => {
    const arm = () => {
      setState('Waiting for you');
      chat.input.disabled = true;
      chat.send.disabled = true;
      chat.input.placeholder = hint || 'Pick one to carry on…';
      chips(options, finish);
    };

    const finish = (option, { echo = true } = {}) => {
      clearPrompt();
      if (echo) me(option.label.replace(/^[^\w]+\s*/, ''));
      setState('Working', true);
      resolve(option.value);
    };

    pending = {
      kind: 'pick',
      options,
      arm,
      submit: (text) => {
        const t = String(text).trim().toLowerCase();
        const hit = options.find((o) => o.value === t)
          || options.find((o) => o.label.toLowerCase().includes(t));
        if (hit) finish(hit);
        return !!hit;
      },
    };
    arm();
  });
}

/**
 * Step aside from whatever the journey is asking, and give back the way
 * to put it back. "Open in…" is available at every moment, including the
 * moments when a question is on screen — and dropping that question
 * would strand the journey awaiting a promise nobody can resolve now.
 */
function holdPrompt() {
  const held = pending;
  if (held) clearPrompt();
  return () => {
    if (!held || !held.arm) return;
    pending = held;
    held.arm();
  };
}

function submitTyped() {
  if (!pending || pending.kind !== 'ask') return;
  pending.submit(chat.input.value);
}

chat.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitTyped(); });
chat.send.addEventListener('click', submitTyped);

/* --- the preview pane --------------------------------------------------- */

const preview = {
  el: document.getElementById('chatPreview'),
  frame: document.getElementById('chatPreviewFrame'),
  title: document.getElementById('chatPreviewTitle'),
  url: document.getElementById('chatPreviewUrl'),
  page: '',
};

/** Show what was built without sending anyone to a browser. */
function showPreview(page, title, url) {
  preview.page = page;
  preview.frame.src = page;
  preview.title.textContent = title;
  preview.url.textContent = url;
  preview.el.hidden = false;
  chat.skin.classList.add('with-preview');
  // Don't steal the front window from someone who moved to their editor —
  // the mirrored transcript tells them a preview is up. Bring the chat
  // forward only if they're already working in it.
  if (!desktop.wins.host.classList.contains('focused')) focusWin('chat');
}

function closePreview() {
  preview.el.hidden = true;
  chat.skin.classList.remove('with-preview');
}

document.getElementById('chatPreviewClose').addEventListener('click', closePreview);

// Safari is still there for anyone who wants a real browser — it just isn't
// the only way to see the thing any more.
document.getElementById('chatPreviewSafari').addEventListener('click', () => {
  if (preview.page) browser.go(preview.page);
});


/* --- what the agent decided, and how to undo it ------------------------

   A wizard asks four questions and waits. The agent answers them itself
   and shows its working: one row per decision, the reason in the value,
   and a button that changes it. Nothing is hidden — it just isn't in
   your way. */

function decisions(title) {
  const el = block('ch-card',
    `<div class="hd">${escapeHtml(title)}<span class="sub">nothing to fill in</span></div>`);
  const rows = {};

  return {
    el,
    /** A decision, mid-flight. It lands with `settle`. */
    open(key, label) {
      const row = document.createElement('div');
      row.className = 'ch-row active';
      row.innerHTML = `<i class="mk busy">${SPINNER}</i>`
        + `<span class="lbl">${escapeHtml(label)}</span>`
        + '<span class="val"></span>';
      el.appendChild(row);
      rows[key] = row;
      toBottom();
      return row;
    },
    /** The decision, made — with the way to change it, if there is one. */
    settle(key, value, action) {
      const row = rows[key];
      if (!row) return;
      row.className = 'ch-row done';
      row.querySelector('.mk').className = 'mk done';
      row.querySelector('.mk').innerHTML = '&#10003;';
      row.querySelector('.val').textContent = value;
      mirror('EAI', `✓ ${row.querySelector('.lbl').textContent} — ${value}`);
      if (!action) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ch-act';
      btn.textContent = action.label;
      btn.addEventListener('click', () => action.onClick(row, btn));
      row.appendChild(btn);
      toBottom();
    },
    value(key, text) {
      const row = rows[key];
      if (row) row.querySelector('.val').textContent = text;
    },
    row(key) { return rows[key]; },
  };
}

/** Turn a settled row's value into an input, in place. */
function editRow(row, current, onCommit) {
  const val = row.querySelector('.val');
  const input = document.createElement('input');
  input.className = 'ch-edit';
  input.value = current;
  input.spellcheck = false;
  val.replaceChildren(input);
  input.focus();
  input.select();

  const commit = () => {
    const next = input.value.trim();
    val.textContent = next || current;
    if (next && next !== current) onCommit(next);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { val.textContent = current; }
  });
  input.addEventListener('blur', commit);
}

/* --- the journey ---------------------------------------------------------

   Short on purpose. This prototype is about setup, not building. It ends
   at the prompt: the app is installed, signed in, and ready, and what you
   type there is the next prototype's problem.

   The order matters. Setup happens BEFORE the brief, not underneath it:
   walking into a chat that isn't ready yet is the thing we're trying to
   get rid of. */

const STEPS = [
  hello,
  offerSetup,      // the "ask agent" moment — before anything is typed
  ready,
];

async function runChat() {
  for (const step of STEPS) await step();
}

/** No welcome panel. The first thing the app says is the useful thing. */
async function hello() {
  await say(
    "<b>You're in, Gareth.</b>\n"
    + 'Signed in as gareth@northwind.com · Northwind Group (AU) · Australian hosting.',
    { thinking: 300 });
}

/**
 * The button Conductor puts on its setup panel, in a chat: the agent can
 * do this, or you can. Delegating is one click and is the default, but it
 * is asked rather than assumed — the app is about to write to your disk.
 */
async function offerSetup() {
  await say(
    'Before you start, this machine needs a few things set up. I can do all of it now — '
    + 'about twenty seconds, nothing installed outside Enterprise AI.');

  const how = await pick([
    { label: 'Set it up for me', value: 'agent', primary: true },
    { label: 'Let me choose', value: 'manual' },
  ]);

  // The only decision with a real alternative is where projects land. The
  // rest has one right answer, so "let me choose" asks that and does the rest.
  if (how === 'manual') {
    const where = await pick([
      { label: '~/eai', value: 'default', primary: true },
      { label: 'Pick a folder…', value: 'pick' },
    ], { hint: 'Where should your apps live?' });

    if (where === 'pick') {
      await new Promise((resolve) => pickFolder((parent) => {
        project.root = parent;
        resolve();
      }));
    }
  }

  await runSetup();
}

/** What the wizard's steps 1, 2 and 4 used to be, done rather than asked. */
async function runSetup() {
  const d = decisions('Setting up');

  d.open('tenant', 'Workspace');
  await sleep(620);
  d.settle('tenant', 'Northwind Group', {
    label: 'Switch',
    onClick: () => {
      coach('One workspace', "This account has a direct membership in Northwind Group only. With two or more, I'd have asked.");
      setTimeout(hideCoach, 3600);
    },
  });

  d.open('folder', 'Apps live in');
  await sleep(540);
  d.settle('folder', shortPath(project.root), {
    label: 'Change',
    onClick: (row) => pickFolder((parent) => {
      project.root = parent;
      row.querySelector('.val').textContent = shortPath(parent);
      labelProject();
    }),
  });

  // The row carrying the whole argument: there was no "detect this Mac"
  // step, and no install, because nothing on this machine had to change.
  d.open('runtime', 'Runtime');
  await sleep(760);
  d.settle('runtime', 'bundled — nothing installed on your Mac');

  d.open('platform', 'Platform');
  await sleep(600);
  d.settle('platform', 'connected · hosted in Australia');

  labelProject();
}

/** The end of this prototype: ready, and waiting on a person. */
async function ready() {
  await say(
    "<b>Ready.</b> That's setup done — nothing else to install, nothing else to choose.\n\n"
    + 'Tell me what you want to build and I\'ll name the app and create its folder from that.');

  const brief = await ask({
    placeholder: 'Describe the app you want to build…',
    suggestions: [
      // Phrased subject-last, the way people actually write it, so the name
      // comes out as contract-renewals rather than renewals-ops.
      { label: 'Track supplier contract renewals', value: 'I need my ops team to track supplier contract renewals', primary: true },
      { label: 'Onboard new starters', value: 'A checklist for onboarding new starters' },
    ],
  });

  // Naming from the first sentence is the last piece of setup, so it stays.
  const name = nameFromBrief(brief);
  project.name = name;
  project.path = `${project.root}/${name}`;
  project.named = true;
  labelProject();

  const d = decisions('Creating the app');
  d.open('name', 'Name');
  await sleep(520);
  d.settle('name', name, {
    label: 'Rename',
    onClick: (row) => editRow(row, project.name, (next) => {
      project.name = next;
      project.path = `${project.root}/${next}`;
      labelProject();
    }),
  });
  d.open('created', 'Folder');
  await sleep(560);
  d.settle('created', shortPath(project.path));

  await say(
    "Done. This is where the prototype stops — building the app comes next, "
    + 'and that\'s a different prototype.');

  setState('Ready');
}

/**
 * contract-renewals, from a sentence about contract renewals.
 *
 * Only the first clause is read: people put the subject first and the
 * qualifications after the comma, so "track supplier contract renewals,
 * with reminders and an approval step" is about renewals, not approvals.
 */
function nameFromBrief(brief) {
  const stop = new Set(['i', 'need', 'my', 'a', 'an', 'the', 'for', 'with', 'and', 'to', 'of',
    'app', 'want', 'build', 'me', 'our', 'team', 'that', 'this', 'across', 'new', 'some']);
  const words = String(brief).toLowerCase().split(',')[0]
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  return words.slice(-2).join('-') || 'new-app';
}

/* ============== 5. WHAT THE SPIKE IS ACTUALLY MEASURING ============ */

/* ⌘K prints this. It's the honest accounting: six steps in the real
   wizard, what happened to each one here, and what that costs. */

const SIX_STEPS = [
  ['0 · Welcome', 'gone', 'Folded into the sign-in screen. There was nothing to promise that being one click from useful doesn\'t say better.'],
  ['1 · Detect this Mac', 'gone', 'Nothing to detect. The app brings its own runtime, so Git, Node and npm are not this journey\'s business.'],
  ['2 · Install what\'s missing', 'deferred', 'Moved to the moment you ask for your own editor — the only thing that needs them. Most people never arrive there.'],
  ['3 · Sign in', 'kept', 'Only a person can do this. It is the one screen in the app.'],
  ['4 · Workspace, app, name, folder', 'answered', 'Decided from your first sentence and shown with an undo, rather than asked as a form.'],
  ['5 · Choose how to work with AI', 'gone', 'You are already in it. The choice becomes "Open in…", available whenever, needed never.'],
];

function showSkipped() {
  toggleSheet(false);
  if (!chatStarted) {
    coach('Not started yet', 'Sign in first — the accounting only means something once you\'ve seen the flow.');
    setTimeout(hideCoach, 3200);
    return;
  }
  focusWin('chat');

  const el = block('ch-card', '<div class="hd">The six steps, and what happened to them<span class="sub">the spike</span></div>');
  SIX_STEPS.forEach(([step, verdict, why]) => {
    const row = document.createElement('div');
    row.className = 'ch-row done stack';
    row.innerHTML = `<i class="mk ${verdict === 'kept' ? 'done' : 'skip'}">${verdict === 'kept' ? '&#10003;' : '&#8722;'}</i>`
      + `<span class="lbl"><b>${escapeHtml(step)}</b><em>${escapeHtml(why)}</em></span>`
      + `<span class="val">${escapeHtml(verdict)}</span>`;
    el.appendChild(row);
  });
  toBottom();
}

document.getElementById('showSkipped').addEventListener('click', showSkipped);

/* ========== 6. MOVING OUT — WHERE STEPS 1 AND 2 WENT =============== */

/* The deferred half of the bet. The real wizard installs Git, Node, npm
   and the CLI for everyone, up front, before anyone has said what they
   want — and that is where most of the real failures live: the macOS
   password dialog, Windows PATH not refreshing after winget, an old Node
   already on PATH, fixed timeouts firing on a slow corporate link.

   None of it is needed to chat. So it happens here instead: at the
   moment someone asks for their own editor, for a reason they just
   chose, on a machine they've already got value out of. Most people
   never reach this code, which is the point. */

const MOVE_LABELS = {
  copilot: 'GitHub Copilot',
  claude: 'Claude Code',
  codex: 'Codex',
  vscode: 'VS Code',
  gemini: 'Gemini CLI',
  terminal: 'Terminal',
};

/* What the wizard would have installed on step 2, for everybody. */
const DEV_TOOLS = [
  ['Apple Command Line Tools', 'Git — macOS will ask you to approve this', 1500],
  ['Node.js', 'v24.3.0', 1100],
  ['EAI CLI', 'v2.4.0', 900],
];

let moved = false;
let toolsReady = false;
let hostInput = null;

const moveMenu = document.getElementById('chatMoveMenu');

function openMoveMenu() {
  moveMenu.hidden = false;
  focusWin('chat');
}

document.getElementById('chatMove').addEventListener('click', (e) => {
  e.stopPropagation();
  moveMenu.hidden = !moveMenu.hidden;
});

document.addEventListener('click', (e) => {
  if (moveMenu.hidden) return;
  if (e.target.closest('#chatMoveMenu') || e.target.closest('#chatMove')) return;
  moveMenu.hidden = true;
});

document.querySelectorAll('[data-move]').forEach((btn) => {
  btn.addEventListener('click', () => {
    moveMenu.hidden = true;
    toggleSheet(false);
    requestMove(btn.dataset.move);
  });
});

document.getElementById('backToChat').addEventListener('click', () => {
  toggleSheet(false);
  focusWin('chat');
  syncDock();
});

document.getElementById('chatNew').addEventListener('click', () => {
  coach('One app at a time', 'This prototype only builds the one — the real app keeps them in this list.');
  setTimeout(hideCoach, 2600);
});

/** Asked for an editor. Now, and only now, does this Mac need tools. */
async function requestMove(app) {
  const label = MOVE_LABELS[app] || app;

  if (!chatStarted) {
    coach('Nothing to move yet', `Sign in and say what you're building — then ${label} gets the whole conversation.`);
    setTimeout(hideCoach, 3200);
    return;
  }

  if (toolsReady) { moveTo(app); return; }

  // The journey may be mid-question. Hold it, have this conversation,
  // then hand the question back exactly as it was.
  const resume = holdPrompt();

  focusWin('chat');
  await say(
    `<b>${escapeHtml(label)} works on the files directly</b>, so this Mac needs Git and Node — `
    + 'Enterprise AI has been running its own copies, which is why you\'ve not been asked before.\n\n'
    + '<em>About a minute. macOS will ask you to approve the Apple developer tools; Enterprise AI '
    + 'never asks for your password itself.</em>');

  const go = await pick([
    { label: `Install and open ${label}`, value: 'go', primary: true },
    { label: 'Not now', value: 'no' },
  ]);

  if (go === 'no') {
    await say('Left alone. Nothing was installed, and everything still works here.');
    resume();
    return;
  }

  const work = card('Setting up developer tools', 'once, for this Mac');
  for (const [name, detail, ms] of DEV_TOOLS) {
    await work.run(name, detail, ms);
  }
  toolsReady = true;

  await say(`Done. Opening ${escapeHtml(label)} on <code>${escapeHtml(shortPath(project.path))}</code>.`);

  // Hand the question back before the move, not after: the mirrored prompt
  // is written from whatever is pending, and it should arrive in the editor
  // already asking what the chat is asking.
  resume();
  moveTo(app);
}

function moveTo(app) {
  const label = MOVE_LABELS[app] || app;
  const first = !moved;

  setHost(app);
  labelProject();
  focusWin('host');
  syncDock();

  moved = true;
  writeHostTranscript(label);
  chat.hint.textContent = `Also open in ${label}. Whatever you type lands in both.`;

  if (first) {
    coach(`Session open in ${label}`,
      'Same conversation, both places. Enterprise AI is still open behind this — click it in the dock, or ⌘K.');
    setTimeout(hideCoach, 5200);
  }
}

/** Everything said so far, plus a prompt that answers what's pending. */
const transcript = [];

/**
 * Take the plain text from the node the browser already parsed, rather than
 * stripping tags off the HTML string with a regex. A regex can't reliably
 * un-write HTML, and unescaping the entities by hand double-unescapes —
 * `&amp;lt;` came back out as a real `<`. textContent has already done both,
 * correctly. Callers that pass a plain string are passing plain text.
 */
function mirror(who, source) {
  const text = source instanceof Node
    ? source.textContent.replace(/ /g, ' ')
    : String(source);
  transcript.push({ who, text });
  if (moved) hostLine(who, text);
}

function hostBodyEl() { return document.getElementById('termBody'); }

function hostLine(who, text) {
  const body = hostBodyEl();
  if (!body) return;
  const line = document.createElement('span');
  line.className = who === 'You' ? 'ln' : 'ln dim';
  line.innerHTML = who === 'You'
    ? `<span class="pfx">❯</span> <span class="user">${escapeHtml(text)}</span>`
    : escapeHtml(text);
  body.insertBefore(line, hostInput ? hostInput.row : null);
  body.scrollTop = body.scrollHeight;
}

function writeHostTranscript(label) {
  const body = hostBodyEl();
  body.replaceChildren();
  hostInput = null;

  const line = (html, cls = '') => {
    const el = document.createElement('span');
    el.className = `ln ${cls}`.trim();
    el.innerHTML = html;
    body.appendChild(el);
    return el;
  };

  line(`Workspace: ${escapeHtml(shortPath(project.path || project.name))}`, 'dim');
  line('', 'spacer');
  line(`Continued from Enterprise AI · ${transcript.length} messages`, 'head');
  line('The same session, mirrored here. Enterprise AI stays open — use whichever you prefer.', 'dim');
  line('', 'spacer');

  transcript.forEach(({ who, text }) => {
    if (who === 'You') {
      line(`<span class="pfx">❯</span> <span class="user">${escapeHtml(text)}</span>`);
    } else {
      line(escapeHtml(text), 'dim');
    }
  });
  line('', 'spacer');

  // A prompt that actually answers whatever the chat is waiting on.
  const row = document.createElement('span');
  row.className = 'ln tin';
  row.innerHTML = '<span class="pfx">❯</span>';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = promptHint();
  input.autocomplete = 'off';
  input.spellcheck = false;
  row.appendChild(input);
  body.appendChild(row);
  hostInput = { row, input };
  input.focus();

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const value = input.value.trim();
    if (!value) return;
    input.value = '';

    if (!pending) {
      const note = document.createElement('span');
      note.className = 'ln dim';
      note.textContent = 'Nothing waiting on you — Enterprise AI is working. It lands here too.';
      body.insertBefore(note, row);
      body.scrollTop = body.scrollHeight;
      return;
    }

    if (pending.kind === 'pick') {
      const understood = pending.submit(value);
      if (!understood) {
        const opts = pending.options.map((o) => o.label.replace(/^[^\w]+\s*/, '')).join(' / ');
        const note = document.createElement('span');
        note.className = 'ln err';
        note.textContent = `Try one of: ${opts}`;
        body.insertBefore(note, row);
        body.scrollTop = body.scrollHeight;
      }
      return;
    }

    pending.submit(value);
  });

  body.scrollTop = body.scrollHeight;
}

function promptHint() {
  if (!pending) return 'nothing waiting — output lands here';
  if (pending.kind === 'pick') return pending.options.map((o) => o.label.replace(/^[^\w]+\s*/, '').toLowerCase()).join(' / ');
  return 'type your answer and press enter';
}


/* --- skipping the install ------------------------------------------------
   Straight to the part being designed. The install and the one sign-in
   screen are quick, but not on the tenth run. */

document.getElementById('skipSetup').addEventListener('click', () => {
  toggleSheet(false);
  if (chatStarted) { focusWin('chat'); syncDock(); return; }

  installed = true;
  dockItem('setup').classList.remove('tucked');
  hideWin('dmg');
  hideWin('browser');
  openChat();
});

/* Booting the desktop puts the CLI in Terminal, which lands a Terminal icon
   in the dock. Nothing here runs in a terminal unless you move it there. */
Object.keys(MOVE_LABELS).forEach((app) => dockItem(app)?.classList.add('tucked'));
syncDock();

/* ========================= 7. ERROR STATES ========================= */

/* Only one is left worth wiring: the network. The others this flow used
   to carry — "that name is taken", "the initialise step failed" — belong
   to screens that no longer exist. Where they can still happen, they
   happen in the conversation, which is a different design problem and
   the next thing to draw. */

const FAILURES = {
  signin() {
    showScreen('signin');
    document.querySelector('[data-screen="signin"] .eai-head p').textContent =
      "Sign-in needs a connection to EAI, and this Mac can't reach it.";
    document.getElementById('signinPromise').hidden = true;
    document.getElementById('signinNote').hidden = false;
    document.getElementById('setupCreate').textContent = 'Retry';
    document.getElementById('setupSignin').classList.add('off');
  },
};

function clearFailures() {
  document.querySelector('[data-screen="signin"] .eai-head p').textContent =
    'Sign in and start building. Setup happens as you go.';
  document.getElementById('signinPromise').hidden = false;
  document.getElementById('signinNote').hidden = true;
  document.getElementById('setupCreate').textContent = 'Create an EAI account';
  document.getElementById('setupSignin').classList.remove('off');
  showScreen('signin');
}

document.querySelectorAll('button[data-err]').forEach((btn) => {
  btn.addEventListener('click', () => {
    toggleSheet(false);
    clearFailures();
    if (btn.dataset.err !== 'clear') FAILURES[btn.dataset.err]();
    focusWin('setup');
    syncDock();
  });
});
