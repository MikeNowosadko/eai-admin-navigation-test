/* ------------------------------------------------------------------
   EAI in-app chat — the second app prototype, at /chat.

   The pair to /install. Both install the same app the same way and
   sign you in the same way; they fork on the question underneath the
   study: where does the building actually happen?

     /install   the app sets your project up and hands you to a coding
                app — GitHub Copilot — and that's where you talk to EAI
     /chat      you never leave. The app opens a chat, and building
                happens there. Moving to Copilot, Claude, Codex, VS
                Code, Gemini or Terminal is offered, kept one click
                away, and never required

   So everything up to "signed in and initialised" is /install's, on
   purpose: if the two flows differed before the fork, the fork wouldn't
   be what people were reacting to. Sections 1-4 below are that shared
   half. Section 5 onwards is this prototype's.

   What "move it" means here: the session is mirrored, not handed over.
   The coding app shows the same transcript, its prompt feeds the same
   conversation, and the chat window stays open behind it — so leaving
   costs nothing and coming back costs nothing.

   Starting a new iteration? Copy the folder — chat/ to chat-2/, plus a
   journey file beside this one — so the old one keeps its URL.
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

/* ============================ 2. SIGN IN ========================== */

/** The setup half of the app has three screens; only one is ever visible. */
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
  showScreen('start');
  focusWin('setup');
  document.getElementById('projName').focus();
}

document.getElementById('setupSignin').addEventListener('click', signIn);
document.getElementById('setupCreate').addEventListener('click', signIn);

/* ====================== 3. NAME IT, PICK A FOLDER ================== */

const projName = document.getElementById('projName');
const projFolder = document.getElementById('projFolder');
const fndList = document.getElementById('fndList');
const fndCrumb = document.getElementById('fndCrumb');
const fndOpen = document.getElementById('fndOpen');

// What the chooser shows. Folders are selectable, files are not — same as
// a real "choose a folder" dialog.
const FOLDERS = {
  Downloads: [
    { name: '11-Big-Sur-Color-Day-6k.jpg', size: '4.2 MB', kind: 'JPEG image', date: 'Today at 5:37 pm' },
    { name: 'hiring-candidates-workflow', dir: true, date: 'Yesterday at 9:38 pm' },
    { name: 'eai-cli-setup-with-copilot.pdf', size: '344 KB', kind: 'PDF Document', date: 'Yesterday at 8:59 pm' },
    { name: 'eaicliproject', dir: true, date: 'Yesterday at 8:25 pm' },
    { name: 'EAI-Setup.dmg', size: '84 MB', kind: 'Disk Image', date: 'Yesterday at 8:22 pm' },
    { name: 'printtomorrow', dir: true, date: '6 Aug 2026 at 3:18 am' },
    { name: 'printtomorrow.zip', size: '668 KB', kind: 'ZIP archive', date: '6 Aug 2026 at 3:18 am' },
    { name: 'pet', dir: true, date: '5 Aug 2026 at 12:29 am' },
    { name: 'bubble-teardown.docx', size: '20 KB', kind: 'Word document', date: '3 Aug 2026 at 8:48 am' },
  ],
  Desktop: [
    { name: 'screenshots', dir: true, date: 'Today at 11:02 am' },
    { name: 'client-workshop', dir: true, date: 'Yesterday at 4:15 pm' },
    { name: 'notes.txt', size: '2 KB', kind: 'Plain text', date: '9 Aug 2026 at 9:11 am' },
  ],
  Documents: [
    { name: 'projects', dir: true, date: 'Today at 8:40 am' },
    { name: 'contracts', dir: true, date: '2 Aug 2026 at 2:05 pm' },
    { name: 'invoice-july.pdf', size: '96 KB', kind: 'PDF Document', date: '1 Aug 2026 at 6:30 pm' },
  ],
  gareth: [
    { name: 'Applications', dir: true, date: '12 Jul 2026 at 9:00 am' },
    { name: 'Desktop', dir: true, date: 'Today at 11:02 am' },
    { name: 'Documents', dir: true, date: 'Today at 8:40 am' },
    { name: 'Downloads', dir: true, date: 'Today at 5:37 pm' },
    { name: 'work', dir: true, date: 'Yesterday at 7:12 pm' },
  ],
};

let currentDir = 'Downloads';
let selected = null;

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
  clearFieldError('folder');
  const base = currentDir === 'gareth' ? '/Users/gareth' : `/Users/gareth/${currentDir}`;
  projFolder.value = `${base}/${selected}`;
  hideWin('finder');
  focusWin('setup');
  syncDock();
}

document.getElementById('chooseFolder').addEventListener('click', () => {
  renderFolder(currentDir);
  focusWin('finder');
});
document.getElementById('fndCancel').addEventListener('click', () => { hideWin('finder'); focusWin('setup'); });
fndOpen.addEventListener('click', chooseFolder);

document.getElementById('fndNew').addEventListener('click', () => {
  const name = projName.value.trim() || 'new-folder';
  FOLDERS[currentDir].unshift({ name, dir: true, date: 'Just now' });
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

/* ========================= 4. INITIALISE =========================== */

/* A fixed list of rows that start pending and turn done in order, rather
   than a log that grows — the same component the sign-in checks use, and
   the same one the chat's work cards use later. One app, one way of
   showing that it's busy. */

const runLines = document.getElementById('runLines');

function runSteps(name, path) {
  return [
    ['Tenant connected', 'Northwind Group'],
    ['Project folder created', shortPath(path)],
    ['EAI runtime installed', 'v2.4.0'],
    ['Fetching Gofer assets', 'in progress'],
  ];
}

/** ~/Downloads/thing reads better than /Users/gareth/Downloads/thing. */
function shortPath(path) {
  return path.replace(/^\/Users\/[^/]+/, '~');
}

/** One row of the list. State is 'pending', 'active' or 'done'. */
function addRow(label, value, state = 'pending') {
  const row = document.createElement('div');
  row.className = 'eai-row';
  row.innerHTML = '<i class="mk"></i>'
    + `<span class="lbl">${escapeHtml(label)}</span>`
    + `<span class="val">${escapeHtml(value)}</span>`;
  runLines.appendChild(row);
  setRowState(row, state);
  return row;
}

const SPINNER = '<s></s><s></s><s></s><s></s><s></s><s></s><s></s><s></s>';

function setRowState(row, state, value) {
  row.classList.remove('pending', 'active', 'done');
  row.classList.add(state);
  const mk = row.querySelector('.mk');
  if (state === 'done') {
    mk.className = 'mk done';
    mk.innerHTML = '&#10003;';
  } else if (state === 'active') {
    mk.className = 'mk busy';
    mk.innerHTML = SPINNER;
  } else {
    mk.className = 'mk pending';
    mk.innerHTML = '';
  }
  if (value !== undefined) row.querySelector('.val').textContent = value;
}

function markDone(row, value) { setRowState(row, 'done', value); }

/* --- field errors ----------------------------------------------------- */

function fieldEl(name) {
  return document.querySelector(`#winSetup .eai-field[data-field="${name}"]`);
}

function setFieldError(name, message) {
  const f = fieldEl(name);
  if (!f) return;
  const err = f.querySelector('.eai-err');
  err.querySelector('span').textContent = message;
  err.hidden = false;
  f.classList.add('invalid');

  f.classList.remove('shake');
  void f.offsetWidth;
  f.classList.add('shake');
}

function clearFieldError(name) {
  const f = fieldEl(name);
  if (!f) return;
  f.querySelector('.eai-err').hidden = true;
  f.classList.remove('invalid', 'shake');
}

function clearAllFieldErrors() {
  document.querySelectorAll('#winSetup .eai-field').forEach((f) => {
    f.querySelector('.eai-err').hidden = true;
    f.classList.remove('invalid', 'shake');
  });
}

document.getElementById('createApp').addEventListener('click', async () => {
  const name = projName.value.trim() || 'customer-portal';
  const folder = projFolder.value.trim();

  if (!folder) {
    setFieldError('folder', "Pick where the app should live before we create it.");
    return;
  }
  clearAllFieldErrors();

  projName.value = name;
  const path = `${folder}/${name}`;

  document.getElementById('runTitle').textContent = `Creating ${name}`;
  document.getElementById('runSub').textContent = 'Setting up the project and connecting your tenant.';

  const openBtn = document.getElementById('openChat');
  openBtn.textContent = 'Create and initialise app';
  openBtn.disabled = true;

  // Clear anything a forced error state left behind.
  document.getElementById('runNote').hidden = true;
  document.getElementById('runBack').textContent = 'Back';

  showScreen('running');
  runLines.replaceChildren();

  const steps = runSteps(name, path);
  const rows = steps.map(([label, value]) => addRow(label, value));

  // One step is live at a time: it spins, lands, then the next picks up.
  for (let i = 0; i < rows.length; i += 1) {
    setRowState(rows[i], 'active');
    await wait(850);
    markDone(rows[i], i === rows.length - 1 ? 'ready' : undefined);
  }

  document.getElementById('runSub').textContent = `${name} is set up and connected to your tenant.`;
  openBtn.textContent = 'Start building';
  openBtn.disabled = false;

  await wait(700);
  openChat(name, path);
});

// Both Back buttons step the flow back rather than doing nothing.
document.getElementById('startBack')?.addEventListener('click', () => showScreen('signin'));
document.getElementById('runBack')?.addEventListener('click', () => showScreen('start'));

// Typing resolves the name collision, so the error shouldn't linger.
projName.addEventListener('input', () => clearFieldError('name'));

// The "where you'll build" field has nothing to change — but the question it
// prompts is the whole point of this variation, so answer it properly.
document.getElementById('changeApp')?.addEventListener('click', () => {
  coach('Your editor still works',
    'You build by chatting in this app. Once it opens, "Open in…" moves the same session into Copilot, Claude, Codex, VS Code, Gemini or Terminal — whenever you want, or never.');
  setTimeout(hideCoach, 5200);
});

document.getElementById('openChat').addEventListener('click', () => {
  openChat(projName.value.trim() || 'customer-portal', projFolder.value || '');
});

/* ================== 5. THE CHAT, INSIDE THE APP ==================== */
/* Everything below is what this prototype is for. */

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

let project = { name: '', path: '' };
let chatStarted = false;

/** Name the project everywhere it's shown, in both windows. */
function labelProject() {
  if (!project.name) return;
  document.querySelectorAll('[data-project-name]').forEach((n) => { n.textContent = project.name; });
  document.querySelectorAll('[data-project-path]').forEach((n) => {
    n.textContent = shortPath(project.path || `/Users/gareth/${project.name}`);
  });
  document.querySelectorAll('[data-project-folder]').forEach((n) => { n.textContent = `📁 ${project.name}`; });
  document.querySelectorAll('[data-project-dir]').forEach((n) => {
    n.textContent = shortPath(project.path || `/Users/gareth/${project.name}`);
  });
  document.getElementById('chatTitle').textContent = `${project.name} — Enterprise AI`;

  // Name the moved session after the app the user picked, not the shell's
  // shorter menu name, so the window title matches the menu they chose from.
  const app = desktop.wins.host.dataset.app;
  const label = MOVE_LABELS[app] || HOSTS[app]?.menu;
  if (label) document.getElementById('hostTitle').textContent = `${project.name} — ${label}`;
}

// setHost rebuilds the chrome from a static template, so re-apply the naming
// whenever it happens — including when a coding app is reopened from the dock.
window.addEventListener('host-changed', labelProject);

/**
 * The app opening up. Not a hand-off: the same app, the same window
 * furniture, one window wider.
 */
function openChat(name, path) {
  project = { name, path };
  labelProject();

  hideWin('setup');
  // From here the EAI icon in the dock means the chat, because that's what
  // the app is now.
  setAppWindow('chat');
  focusWin('chat');
  syncDock();

  if (chatStarted) return;
  chatStarted = true;
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
  // Mirror the node, not the markup — see mirror().
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
  setState('Waiting for you');
  chat.input.disabled = false;
  chat.send.disabled = false;
  chat.input.placeholder = placeholder;
  chat.input.focus();

  return new Promise((resolve) => {
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

    pending = { kind: 'ask', submit: finish };
    chips(suggestions.map((s) => ({ label: s.label, primary: s.primary })), (c) => {
      const match = suggestions.find((s) => s.label === c.label);
      finish(match.value || match.label);
    });
  });
}

/** A decision, not a sentence: approve, feed back, open something. */
function pick(options, { hint } = {}) {
  fastForward = false;
  setState('Waiting for you');
  chat.input.disabled = true;
  chat.send.disabled = true;
  chat.input.placeholder = hint || 'Pick one to carry on…';

  return new Promise((resolve) => {
    const finish = (option, { echo = true } = {}) => {
      clearPrompt();
      if (echo) me(option.label.replace(/^[^\w]+\s*/, ''));
      setState('Working', true);
      resolve(option.value);
    };

    pending = {
      kind: 'pick',
      options,
      submit: (text) => {
        const t = String(text).trim().toLowerCase();
        const hit = options.find((o) => o.value === t)
          || options.find((o) => o.label.toLowerCase().includes(t));
        if (hit) finish(hit);
        return !!hit;
      },
    };
    chips(options, finish);
  });
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

/* --- the journey --------------------------------------------------------- */

/** The running order. Everything below is one of these, in this order. */
const STEPS = [
  hello,
  describe,
  clarify,
  buildPrototype,
  buildApp,
  offerToMove,
  adminScreens,
  runTests,
  deployIt,
  finish,
];

/** What each step learns, for the ones after it. */
const said = { brief: '', approver: '', source: '' };

async function runChat() {
  for (const step of STEPS) await step();
}

/** No slash command, no prompt to learn: the app just starts talking. */
async function hello() {
  await say(
    `<b>You're in, and ${escapeHtml(project.name)} is ready.</b>\n`
    + 'Tenant: Northwind Group (AU). Data, auth, tenancy, governance and hosting are already yours.',
    { thinking: 300 });

  await say(
    "Tell me what you want to build, in your own words. I'll ask about anything I need "
    + "and show you the thing itself as soon as there's something to look at.\n\n"
    + '<em>Prefer your own editor? <b>Open in…</b>, top right, moves this session into Copilot, '
    + 'Claude, Codex, VS Code, Gemini or Terminal. You never have to.</em>');
}

async function describe() {
  said.brief = await ask({
    placeholder: 'Describe the app you want to build…',
    suggestions: [
      {
        label: 'Track supplier contract renewals',
        value: 'I need my ops team to track supplier contract renewals, with reminders and an approval step',
        primary: true,
      },
      {
        label: 'Onboard new starters',
        value: 'A checklist app for onboarding new starters across IT, HR and facilities',
      },
    ],
    validate: (v) => (v.split(/\s+/).length < 4
      ? 'Give me a sentence or two — what the app is for, and who uses it. That\'s enough to start.'
      : null),
  });
}

async function clarify() {
  await say(
    'Two questions before I build. They change what you get, so they\'re worth asking.\n\n'
    + '<b>Who signs off a renewal before it\'s actioned?</b>');

  said.approver = await ask({
    placeholder: 'Who signs it off?',
    suggestions: [
      { label: 'Ops manager', value: 'The ops manager' },
      { label: 'Ops manager, then Finance over $50k', value: 'Ops manager, then Finance if over $50k', primary: true },
      { label: 'No approval needed', value: 'No approval needed' },
    ],
  });

  await say('Got it. <b>And where do the contracts live today?</b>');

  said.source = await ask({
    placeholder: 'SharePoint, email, a spreadsheet…',
    suggestions: [
      { label: 'SharePoint', value: 'SharePoint' },
      { label: 'Email and a spreadsheet', value: 'Email and a spreadsheet', primary: true },
      { label: 'Nowhere yet', value: 'Nowhere yet' },
    ],
  });

  await say(
    'That\'s everything I need. No more questions.\n\n'
    + `<em>Approvals: ${escapeHtml(said.approver)} · Source of truth today: ${escapeHtml(said.source)}</em>`);
}

/** Fastest possible prototype, then approve or feed back — loops. */
async function buildPrototype() {
  let approved = false;
  let round = 0;

  while (!approved) {
    await say(round === 0
      ? 'Starting with the fastest thing I can show you — static screens, seconds not minutes.'
      : 'Reworking the prototype with that change.');

    const work = card(round === 0 ? 'Prototype' : 'Prototype, revised', 'static HTML');
    if (round === 0) {
      await work.run('Screens', 'renewals list, detail, approval');
      await work.run('Sample data generated from your description');
    } else {
      await work.run('Change applied', 'and re-generated', 900);
    }

    result('Prototype ready', 'localhost:4310', [
      { label: 'Open preview', onClick: () => showPreview('pages/preview.html', 'Prototype', 'localhost:4310') },
    ]);

    // Opening the preview doesn't interrupt anything: it's a pane in this
    // window, so the question you're being asked is still on screen.
    showPreview('pages/preview.html', 'Prototype', 'localhost:4310');

    await say('Have a look on the right. Close enough to carry on?');

    const verdict = await pick([
      { label: '✓ Approve', value: 'approve', primary: true },
      { label: 'Give feedback', value: 'feedback' },
    ]);

    if (verdict === 'approve') {
      approved = true;
    } else {
      await ask({
        placeholder: 'What should change?',
        suggestions: [
          { label: 'Add a renewal reminder 60 days out', value: 'Add a reminder 60 days before each renewal date', primary: true },
          { label: 'Show total annual value', value: 'Show the total annual value of contracts up for renewal' },
        ],
      });
      round += 1;
    }
  }
  closePreview();
}

/** The real application, with its own approve-or-feed-back loop. */
async function buildApp() {
  await say('Approved. Building the real thing now — same app, real data model, real rules.');

  let approved = false;
  let round = 0;

  while (!approved) {
    const work = card(round === 0 ? 'Building customer app' : 'Applying your change', project.name);
    if (round === 0) {
      await work.run('Data model', 'suppliers, contracts, renewals');
      await work.run('Auth and tenancy', 'scoped to your tenant');
      await work.run('Approval workflow', 'ops → finance over $50k');
      await work.run('Audit trail', 'every status change');
      await work.run('Reminders', '60 / 30 / 7 days');
      await work.run('Import', 'bulk upload from your spreadsheet');
    } else {
      await work.run('Change applied and re-verified', '', 950);
    }

    const previewUrl = `${project.name}.preview.eai.app`;
    result('Preview environment', previewUrl, [
      { label: 'Open preview', onClick: () => showPreview('pages/preview.html', 'Preview environment', previewUrl) },
    ]);

    const verdict = await pick([
      { label: '✓ Approve', value: 'approve', primary: true },
      { label: 'Give feedback', value: 'feedback' },
    ]);

    if (verdict === 'approve') {
      approved = true;
    } else {
      await ask({
        placeholder: 'What needs to change?',
        suggestions: [
          { label: 'Notify the owner, not just the approver', value: 'Notify the contract owner as well as the approver', primary: true },
          { label: 'Add a "do not renew" outcome', value: 'Add a "do not renew" outcome with a reason field' },
        ],
      });
      round += 1;
    }
  }
}

/**
 * The offer, made once and made honestly: there's a real app being built now,
 * so this is the moment someone might want their own editor on it. Staying is
 * the primary action because staying is a complete answer.
 */
async function offerToMove() {
  if (moved) return;

  await say(
    'There\'s real code in <code data-project-path>' + escapeHtml(shortPath(project.path || project.name)) + '</code> now.\n\n'
    + 'Some people want their editor on it at this point. If you do, I\'ll carry this session across — '
    + 'same conversation, same context, and this window stays open behind it. If you don\'t, nothing changes.');

  const answer = await pick([
    { label: 'Stay here', value: 'stay', primary: true },
    { label: 'Open in my editor…', value: 'move' },
  ]);

  if (answer === 'move') {
    openMoveMenu();
    await say('Pick an app from the menu — or close it and we\'ll carry on here.', { thinking: 200 });
    return;
  }

  await say('Suits me. Everything works from here.');
}

async function adminScreens() {
  await say('Your app is ready to manage — users, permissions, domains, the audit log.');

  result('Admin', 'admin.enterpriseaigroup.com', [
    {
      label: 'Open admin',
      onClick: () => showPreview(
        `pages/admin.html?ws=${encodeURIComponent(project.name)}&country=Australia`,
        'Admin', 'admin.enterpriseaigroup.com'),
    },
  ]);

  await pick([{ label: 'Done looking', value: 'ok', primary: true }], { hint: 'Have a look, then carry on…' });
  closePreview();
}

async function runTests() {
  const work = card('Tests', 'before deploy');
  await work.run('Unit and data rules', '42 passed', 800);
  await work.run('End-to-end journeys', '9 passed', 900);
  await work.run('Access control', 'no cross-tenant reads');
}

async function deployIt() {
  await say('Ready to put it in front of your team?');

  const go = await pick([
    { label: '🚀 Deploy to the web', value: 'go', primary: true },
    { label: 'Not yet', value: 'wait' },
  ]);

  if (go === 'wait') {
    await say('No problem — say "deploy" whenever you\'re ready.');
    return;
  }

  const work = card('Deploying', 'Australia');
  await work.run('Built and shipped', '', 1000);
  await work.run('Hosted in Australia, inside your workspace');
  await work.run('Custom domain available in admin');

  const liveUrl = `${project.name}.eai.app`;
  result('Live', liveUrl, [
    { label: 'Open', onClick: () => showPreview('pages/preview.html', project.name, liveUrl) },
    { label: 'Open in Safari', ghost: true, onClick: () => browser.go('pages/preview.html') },
  ]);
}

async function finish() {
  await say(
    '<b>Done — from install to production without leaving this window.</b>\n'
    + 'Next: invite your ops team, or tell me what to change. I\'m still here.');

  const end = await pick([
    { label: 'Keep chatting', value: 'stay', primary: true },
    { label: '↺ Run it again', value: 'restart' },
    { label: '← Back to the flows', value: 'flows' },
  ]);

  if (end === 'restart') { window.location.href = 'index.html'; return; }
  if (end === 'flows') { window.location.href = '../index.html'; return; }

  // "Keep chatting" has to mean something, so the composer stays live rather
  // than the prototype quietly ending under a friendly sentence.
  keepChatting();
}

function keepChatting() {
  chat.input.disabled = false;
  chat.send.disabled = false;
  chat.input.placeholder = 'Ask for a change…';
  chat.input.focus();
  setState('Ready');

  pending = {
    kind: 'ask',
    submit: async (text) => {
      const value = String(text).trim();
      if (!value) return;
      clearPrompt();
      me(value);
      await say("Noted. The real thing would make that change now — the prototype stops here, "
        + 'but the app doesn\'t close and neither does the conversation.');
      keepChatting();
    },
  };
}

/* ============= 6. MOVING IT TO A CODING APP (OPTIONAL) ============= */

/* The promise this variation makes: your editor is one click away, and
   choosing it costs you nothing. So a move mirrors rather than hands over —
   the transcript so far is written into the coding app, everything after it
   lands in both, and its prompt answers whatever the chat is waiting on.
   The chat window is never closed. */

const MOVE_LABELS = {
  copilot: 'GitHub Copilot',
  claude: 'Claude Code',
  codex: 'Codex',
  vscode: 'VS Code',
  gemini: 'Gemini CLI',
  terminal: 'Terminal',
};

let moved = false;
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
    moveTo(btn.dataset.move);
  });
});

// ⌘K's way back, for when the coding app is covering the chat.
document.getElementById('backToChat').addEventListener('click', () => {
  toggleSheet(false);
  focusWin('chat');
  syncDock();
});

document.getElementById('chatNew').addEventListener('click', () => {
  coach('One app at a time', 'This prototype only builds the one — but the real app keeps them in this list.');
  setTimeout(hideCoach, 2600);
});

function moveTo(app) {
  const label = MOVE_LABELS[app] || app;
  const first = !moved;

  // ⌘K can reach this before there's a session to move. Say so rather than
  // opening an editor onto an empty transcript.
  if (!chatStarted) {
    coach('Nothing to move yet', `Sign in and create an app first — then ${label} gets the whole conversation.`);
    setTimeout(hideCoach, 3200);
    return;
  }

  setHost(app);
  labelProject();
  focusWin('host');
  syncDock();

  moved = true;
  writeHostTranscript(label);
  // The chat says so too, so it's clear from either window that both are live.
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
   The chat is the part being designed, and sitting through the download, the
   drag and four screens to reach it gets old on the tenth run. */

document.getElementById('skipSetup').addEventListener('click', () => {
  toggleSheet(false);
  if (chatStarted) { focusWin('chat'); syncDock(); return; }

  installed = true;
  dockItem('setup').classList.remove('tucked');
  hideWin('dmg');
  hideWin('browser');
  projName.value = 'contract-renewals';
  projFolder.value = '/Users/gareth/Downloads';
  openChat('contract-renewals', '/Users/gareth/Downloads/contract-renewals');
});

/* Booting the desktop puts the CLI in Terminal, which lands a Terminal icon in
   the dock. Nothing here runs in a terminal unless you move it there, so take
   it back out — the coding apps stay tucked away until they're asked for. */
Object.keys(MOVE_LABELS).forEach((app) => dockItem(app)?.classList.add('tucked'));
syncDock();

/* ========================= 7. ERROR STATES ========================= */

/* Three failures worth designing for, each a different kind: the machine
   (no network), the input (name already taken), and the organisation (no
   permission to read the asset library).

   Reachable from ⌘K so they can be clicked through, rather than needing a
   real failure to see them. */

const FAILURES = {
  signin() {
    showScreen('signin');
    const row = document.getElementById('rowNetwork');
    row.classList.add('failed');
    row.querySelector('.mk').className = 'mk fail';
    row.querySelector('.mk').innerHTML = '&#10005;';
    row.querySelector('.val').textContent = 'no response';
    document.querySelector('[data-screen="signin"] .eai-head p').textContent =
      "Sign-in needs a connection to EAI. One check didn't pass.";
    document.getElementById('signinNote').hidden = false;
    document.getElementById('setupCreate').textContent = 'Retry checks';
    document.getElementById('setupSignin').classList.add('off');
  },

  start() {
    showScreen('start');
    if (!projName.value) projName.value = 'contract-renewals';
    if (!projFolder.value) projFolder.value = '/Users/gareth/Downloads';
    setFieldError('name',
      `A folder called ${projName.value} already exists in /Users/gareth/Downloads. `
      + 'Pick another name, or choose a different folder.');
    document.querySelector('[data-screen="start"] .eai-head p').textContent =
      'That name is already taken in this folder.';
    document.getElementById('createApp').classList.add('off');
  },

  running() {
    showScreen('running');
    runLines.replaceChildren();
    markDone(addRow('Tenant connected', 'Northwind Group'));
    markDone(addRow('Project folder created', '~/Downloads/contract-renewals'));
    markDone(addRow('EAI runtime installed', 'v2.4.0'));

    const row = addRow('Fetching Gofer assets', 'failed');
    row.className = 'eai-row failed';
    row.querySelector('.mk').className = 'mk fail';
    row.querySelector('.mk').innerHTML = '&#10005;';

    document.getElementById('runTitle').textContent = "Couldn't finish creating contract-renewals";
    document.getElementById('runSub').textContent =
      'Three steps completed. The last one failed, so nothing was left half-written.';
    document.getElementById('runNote').hidden = false;
    document.getElementById('runBack').textContent = 'Open logs';
    const retry = document.getElementById('openChat');
    retry.textContent = 'Retry this step';
    retry.disabled = false;
  },
};

/** Put every screen back the way it started. */
function clearFailures() {
  const row = document.getElementById('rowNetwork');
  row.className = 'eai-row';
  row.querySelector('.mk').className = 'mk done';
  row.querySelector('.mk').innerHTML = '&#10003;';
  row.querySelector('.val').textContent = 'api.eai.com reachable';
  document.querySelector('[data-screen="signin"] .eai-head p').textContent =
    'We checked this machine first. Everything below is ready.';
  document.getElementById('signinNote').hidden = true;
  document.getElementById('setupCreate').textContent = 'Create an EAI account';
  document.getElementById('setupSignin').classList.remove('off');

  clearAllFieldErrors();
  document.querySelector('[data-screen="start"] .eai-head p').textContent =
    'Name your app and choose where it lives.';
  document.getElementById('createApp').classList.remove('off');

  document.getElementById('runNote').hidden = true;
  document.getElementById('runBack').textContent = 'Back';
  document.getElementById('runTitle').textContent = 'Creating your EAI app';
  document.getElementById('runSub').textContent = 'Setting up the project and connecting your tenant.';
  document.getElementById('openChat').textContent = 'Create and initialise app';
  runLines.replaceChildren();
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
