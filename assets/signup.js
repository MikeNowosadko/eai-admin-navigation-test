/* ------------------------------------------------------------------
   Sign up first, download second — at /signup.

   Same setup app as /install-4, reached a different way. Everything up
   to the disk image is new (see signup/pages/): the marketing site with
   no download on it, an account made through Microsoft, a plan, a
   workspace, and then the product itself — where the download lives now.

   Only three things in here differ from /install-4, and all three are
   consequences of that change rather than new design:

   1. The workspace is not a question any more. They created one on the
      web twenty minutes ago and it is the only one they are in, so the
      app pre-answers step 1 with it and opens on "name your app".
      The list stays — a second workspace makes it a choice again.

   2. Sign-in is a confirmation, not a form. The browser session is
      still live, so signin.html asks "which account, and is it you"
      rather than for a password. Same round trip, a tenth of the work.

   3. The app is told who signed up. The portal posts the workspace,
      country and email up to the shell, so the name in the native app
      is the one the person typed themselves.

   Everything else — the check, the one-page form, eai init, choosing a
   harness, and every error state — is /install-4's, unchanged, so the
   two journeys can be compared without wondering what else moved.
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

/** ~/Downloads/thing reads better than /Users/gareth/Downloads/thing. */
function shortPath(path) {
  return path.replace(/^\/Users\/[^/]+/, '~');
}

/* ============================ 1. INSTALL ========================== */

let installed = false;

/* --- the download, the way Safari does it ------------------------------

   No flight to the dock: macOS hasn't done that in years. The file flies
   into the browser's downloads button, which pops into the toolbar and
   fills a progress ring. Opening the disk image is then the user's move —
   whether people find their way there unaided is the thing worth watching.
*/

const dlBtn = document.getElementById('dlBtn');
const dlRing = document.getElementById('dlRing');
const dlPop = document.getElementById('dlPop');

/* Two things get downloaded in this flow now: our installer, and
   whichever harness they were sent to fetch. Both arrive the same way —
   into Safari's toolbar and then the download list — because that is
   where a person has to go to find them. */

let pendingHarness = null;

setDownloadStartHandler((data) => {
  const app = data && data.app;
  const h = HARNESSES.find((x) => x.name === app);

  if (h) {
    pendingHarness = h;
    const row = document.getElementById('dlHarnessItem');
    document.getElementById('dlHarnessName').textContent = data.installer || `${h.name}.dmg`;
    const ico = document.getElementById('dlHarnessIco');
    ico.style.background = HARNESS_ICONS[h.id].bg;
    ico.innerHTML = HARNESS_ICONS[h.id].svg;
    row.hidden = false;
  }

  startBrowserDownload(data && data.rect, h);
  return 'handled';
});

function startBrowserDownload(rect, harnessApp) {
  dlBtn.hidden = false;
  dlBtn.classList.remove('done', 'bounce');
  dlRing.style.setProperty('--p', 0);

  flyToToolbar(rect, harnessApp);

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
function flyToToolbar(rect, harnessApp) {
  if (!rect) return;
  const frame = desktop.frame.getBoundingClientRect();
  const target = dlBtn.getBoundingClientRect();

  const fly = document.createElement('div');
  fly.className = 'dl-fly';
  fly.innerHTML = harnessApp
    ? `<span class="dl-fly-mark" style="background:${HARNESS_ICONS[harnessApp.id].bg}">${HARNESS_ICONS[harnessApp.id].svg}</span>`
    : '<img src="../assets/logos/eai-mark-dark.svg" alt="" />';
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
// the wordmark writes itself, lifts into a title, then the icons arrive.
// The numbers are here rather than in the CSS so the whole rhythm can be
// retimed in one place.
// The wordmark arrives whole, so the lift can come sooner than it could
// if we were waiting for a last letter to be drawn.
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

  // Node, Git, npm and the CLI come down from here — while the icon is still
  // bouncing into the dock, and without a word about it. See section 2.
  installPrereqsQuietly();

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



/* =============== 2. THE CHECK, AND THE PREREQUISITES =============== */

/* Node, Git, npm and the EAI CLI come down while the app is being copied
   to Applications, exactly as in /install-2. What's new is that the app
   admits it: one row saying the machine was checked and is ready.

   The difference between that and /install's four ticks is who the line
   is for. Four ticks ask you to audit the machine. One line tells you
   the audit happened and that you are not needed. */

const PREREQS = [
  ['Node.js', 'v24.3.0'],
  ['Git', '2.46.0'],
  ['npm', '10.9.0'],
  ['EAI CLI', 'v2.4.0'],
];

const checkRows = document.getElementById('checkRows');
let prereqsReady = true;

function installPrereqsQuietly() {
  // No UI. It exists so the failure state has something true to contradict.
  prereqsReady = true;
}

/** The happy path: one row, and nothing to do about it. */
function renderCheck() {
  checkRows.replaceChildren();
  const row = document.createElement('div');
  row.className = 'eai-row';
  row.innerHTML = '<i class="mk done">&#10003;</i>'
    + '<span class="lbl">This Mac is ready'
    + `<span class="sub">Checked ${PREREQS.length} things — ${PREREQS.map((p) => p[0]).join(', ')} — and installed what was missing.</span>`
    + '</span>';
  checkRows.appendChild(row);
}

/** The unhappy path: the list, with the one that broke marked. */
function renderCheckFailure(failed) {
  checkRows.replaceChildren();
  PREREQS.forEach(([name, version]) => {
    const bad = name === failed;
    const row = document.createElement('div');
    row.className = `eai-row${bad ? ' failed' : ''}`;
    row.innerHTML = `<i class="mk ${bad ? 'fail' : 'done'}">${bad ? '&#10005;' : '&#10003;'}</i>`
      + `<span class="lbl">${escapeHtml(name)}</span>`
      + `<span class="val">${bad ? 'not installed' : escapeHtml(version)}</span>`;
    checkRows.appendChild(row);
  });
}

renderCheck();

/* ============================ 3. SIGN IN ========================== */

function showScreen(name) {
  setupWin.querySelectorAll('[data-screen]').forEach((s) => {
    s.hidden = s.dataset.screen !== name;
  });
}

async function signIn() {
  // The browser already knows this person; tell the page which account the
  // app is asking about so the two halves agree on who is signing in.
  browser.go(`pages/signin.html?email=${encodeURIComponent(account)}`);
  await browser.waitFor('signin');
  browser.go('pages/signed-in.html');
  await wait(900);

  // The beat: the tick lands, and holds long enough to be read as an
  // answer rather than a flicker.
  showScreen('welcome');
  focusWin('setup');
  await wait(1500);

  sayAccount();
  renderWorkspaces();
  showScreen('setup');
  focusWin('setup');

  // One workspace means there was never a question. It is answered on
  // screen rather than behind it — the row is there, ticked, and can be
  // changed — and the form opens on the first thing that is actually
  // being asked.
  if (WORKSPACES.length === 1 && !chosenWorkspace) {
    chooseWorkspace(WORKSPACES[0].id);
  }
}

document.getElementById('setupSignin').addEventListener('click', signIn);
document.getElementById('setupCreate').addEventListener('click', signIn);

/* ==================== 4. SETUP, ON ONE PAGE ======================== */

/* Three steps in a column. Answering one reveals the next below it, and
   the primary appears when the last is answered. Steps never disappear
   and never lock: an answered step keeps its control, so changing your
   mind is editing a field rather than walking backwards. */

const steps = {
  workspace: setupWin.querySelector('[data-step="workspace"]'),
  template: setupWin.querySelector('[data-step="template"]'),
  name: setupWin.querySelector('[data-step="name"]'),
  folder: setupWin.querySelector('[data-step="folder"]'),
};
const setupActs = document.getElementById('setupActs');

/** Bring a step in, once, and put it where the eye can find it. */
function reveal(el) {
  if (!el || !el.hidden) return;
  el.hidden = false;
  el.classList.add('i3-in');
  el.addEventListener('animationend', () => el.classList.remove('i3-in'), { once: true });
  // The window grows downwards, so the new thing can be below the fold.
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

/* An answered step swaps its numeral for a tick. The number is only
   useful while it's telling you where you are. */
const STEP_NUMBERS = { workspace: '1', template: '2', name: '3', folder: '4' };

function markAnswered(step, yes = true) {
  const el = steps[step];
  if (!el) return;
  el.classList.toggle('answered', yes);
  const num = el.querySelector('.i3-num');
  if (num) num.textContent = yes ? '\u2713' : STEP_NUMBERS[step];
}

/* --- 1 · workspace ----------------------------------------------------

   The step this journey changes. /install-4 asks which workspace this
   app belongs to, because the app has no idea who is signing in. Here
   the person made one on the web on the way to the download, and it is
   the only one they are in — so the question is already answered and
   the screen says so rather than asking it again.

   The list is still a list. A second workspace, or an account that
   belongs to a company as well as its own, and this is a choice again
   with nothing rewritten. */

let WORKSPACES = [
  { id: 'signed-up', name: 'Northwind Group', meta: 'Australia · just created' },
];

/** Whoever signed up on the web, as far as this app knows. */
let account = 'sam.taylor@company.com';

const wsRows = document.getElementById('wsRows');
let chosenWorkspace = null;

/** Answering step 1, from a click or from the web having answered it. */
function chooseWorkspace(id, { focusNext = true } = {}) {
  chosenWorkspace = id;
  renderWorkspaces();
  markAnswered('workspace');
  reveal(steps.template);
}

function renderWorkspaces() {
  wsRows.replaceChildren();
  WORKSPACES.forEach((ws) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'eai-row pick';
    row.dataset.ws = ws.id;
    const on = ws.id === chosenWorkspace;
    row.innerHTML = `<i class="mk ${on ? 'done' : 'pending'}">${on ? '&#10003;' : ''}</i>`
      + `<span class="lbl">${escapeHtml(ws.name)}</span>`
      + `<span class="val">${escapeHtml(ws.meta)}</span>`;
    row.addEventListener('click', () => chooseWorkspace(ws.id));
    wsRows.appendChild(row);
  });
}

/* The provider's site, reporting back.

   Variation 2 sends somebody to claude.com to install the tool and make
   an account with Anthropic. When they finish, that page says so, and
   the setup app stops waiting — whether or not they remember to press
   "Check again". Pressing it still works, and still checks. */

window.addEventListener('message', (e) => {
  if (e.source !== desktop.frame.contentWindow) return;
  const msg = e.data;
  if (!msg || !msg.eai) return;

  // Nothing to hear here any more: a tool's website can't install
  // anything, and it certainly can't send anyone back to us. Both of
  // those happen on the machine now — see the harness app, below.
});

/* What the portal knows and the app doesn't. The page posts it up when it
   loads; desktop.js ignores actions nothing is waiting on, so this listens
   for its own. Same guard it uses: only our own browser frame may speak. */
window.addEventListener('message', (e) => {
  if (e.source !== desktop.frame.contentWindow) return;
  const msg = e.data;
  if (!msg || !msg.eai || msg.action !== 'context') return;

  const data = msg.data || {};
  if (data.workspace) {
    WORKSPACES = [{
      id: 'signed-up',
      name: String(data.workspace).slice(0, 60),
      meta: `${String(data.country || 'Australia').slice(0, 40)} · just created`,
    }];
    chosenWorkspace = null;
    renderWorkspaces();
  }
  if (data.email) {
    account = String(data.email).slice(0, 80);
    sayAccount();
  }
});

/** Every line that names the person who signed up. */
function sayAccount() {
  document.getElementById('welcomeSub').textContent = account;
  document.getElementById('setupSub').textContent =
    `Signed in as ${account}. Your workspace came with you — two things, and your app exists.`;
  document.getElementById('wsNote').querySelector('span').textContent =
    `${account} isn't a member of a company workspace yet. An EAI admin can add you, then sign in again.`;
}

function workspaceName() {
  return (WORKSPACES.find((w) => w.id === chosenWorkspace) || WORKSPACES[0]).name;
}

/* --- 2 · template -----------------------------------------------------

   Asked before the name, because it is the only answer that changes what
   gets built — a name is a label, a folder is a location, a template is
   the app. One is pre-selected: most people want the common shape, and
   an unanswered first question is a wall.

   "Nothing" is last and says what it costs. An empty project is the
   right answer for someone who knows exactly what they want, and the
   wrong one for everybody else, so it is offered rather than defaulted. */

const TEMPLATES = [
  {
    id: 'eai',
    name: 'EAI template',
    desc: 'A working app to start from: intake, an approval chain, an audit trail and screens. Change any of it.',
    meta: 'Recommended',
  },
  {
    id: 'scratch',
    name: 'Start from scratch',
    desc: "An empty project with your workspace connected. Nothing is set up, so there's more to configure yourself.",
  },
];

const tplCards = document.getElementById('tplCards');
let chosenTemplate = 'eai';

function renderTemplates() {
  tplCards.replaceChildren();
  TEMPLATES.forEach((t) => {
    const on = t.id === chosenTemplate;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `i3-card${on ? ' on' : ''}`;
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', String(on));
    card.dataset.template = t.id;
    card.innerHTML = '<span class="dot"></span>'
      + '<span class="tx">'
      + `<b>${escapeHtml(t.name)}${t.meta ? `<i>${escapeHtml(t.meta)}</i>` : ''}</b>`
      + `<span>${escapeHtml(t.desc)}</span>`
      + '</span>';
    card.addEventListener('click', () => chooseTemplate(t.id));
    tplCards.appendChild(card);
  });
}

function templateName() {
  return (TEMPLATES.find((t) => t.id === chosenTemplate) || TEMPLATES[0]).name;
}

function chooseTemplate(id, { focusNext = true } = {}) {
  chosenTemplate = id;
  renderTemplates();
  markAnswered('template');
  reveal(steps.name);
  if (focusNext) setTimeout(() => projName.focus(), 220);
}

renderTemplates();

/* --- 3 · name ---------------------------------------------------------- */

const projName = document.getElementById('projName');
const projFolder = document.getElementById('projFolder');

/* A name is "answered" when they stop typing, not when they press a
   button — but a pause is a guess, so Enter and Tab settle it too. Once
   the folder step is up it stays up; nothing retracts under the cursor. */
let nameTimer = null;

function nameSettled() {
  const name = projName.value.trim();
  if (name.length < 2) return;
  clearFieldError('name');
  markAnswered('name');
  labelProject();
  reveal(steps.folder);
}

projName.addEventListener('input', () => {
  clearFieldError('name');
  clearTimeout(nameTimer);
  nameTimer = setTimeout(nameSettled, 700);
});
projName.addEventListener('blur', nameSettled);
projName.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  clearTimeout(nameTimer);
  nameSettled();
  document.getElementById('chooseFolder').focus();
});

/** The name appears in the done screen and the dock label. */
function labelProject() {
  const name = projName.value.trim() || 'Your app';
  document.querySelectorAll('#winSetup [data-project-name]').forEach((n) => { n.textContent = name; });
}

/* --- 3 · folder ------------------------------------------------------- */

/** Called by the chooser (section 5) once a folder is picked. */
function folderChosen() {
  clearFieldError('folder');
  markAnswered('folder');
  reveal(setupActs);
}
/* ====================== 3. NAME IT, PICK A FOLDER ================== */

// projName and projFolder are declared with the screens that own them.
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function chooseFolder() {
  if (!selected) return;
  clearFieldError('folder');
  const base = currentDir === 'gareth' ? '/Users/gareth' : `/Users/gareth/${currentDir}`;
  projFolder.value = `${base}/${selected}`;
  hideWin('finder');
  focusWin('setup');
  syncDock();
  folderChosen();
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



/* ================== 6. eai init, THEN A FULL STOP ================== */

/* The rows say what the flow board says — the template is downloaded
   into the folder you picked — rather than talking about tenants and
   CLIs, which were installed an hour ago and never mentioned.

   When it finishes, nothing opens. The done screen does. */

const runLines = document.getElementById('runLines');

function runSteps(path) {
  return [
    ['Workspace connected', workspaceName()],
    ['Folder created', shortPath(path)],
    // The template they chose, said back to them, because it is the one
    // answer that changed what is being written into the folder.
    [chosenTemplate === 'scratch' ? 'Empty project created' : 'Template downloaded', templateName()],
    ['Dependencies installed', 'in progress'],
  ];
}

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

/* --- create ------------------------------------------------------------ */

let project = { name: '', path: '' };

document.getElementById('createApp').addEventListener('click', async () => {
  const name = projName.value.trim() || 'customer-portal';
  const folder = projFolder.value.trim();

  if (!folder) {
    setFieldError('folder', 'Pick where the app should live before we create it.');
    return;
  }
  clearAllFieldErrors();

  projName.value = name;
  const path = `${folder}/${name}`;
  project = { name, path };

  document.getElementById('runTitle').textContent = `Creating ${name}`;
  document.getElementById('runSub').textContent = 'Downloading the app template into your folder.';
  document.getElementById('runNote').hidden = true;
  document.getElementById('runActs').hidden = true;

  showScreen('running');
  runLines.replaceChildren();

  const rows = runSteps(path).map(([label, value]) => addRow(label, value));
  for (let i = 0; i < rows.length; i += 1) {
    setRowState(rows[i], 'active');
    await wait(850);
    markDone(rows[i], i === rows.length - 1 ? 'ready' : undefined);
  }

  await wait(520);
  finish(name, path);
});

document.getElementById('runBack').addEventListener('click', () => showScreen('setup'));
document.getElementById('runRetry').addEventListener('click', () => document.getElementById('createApp').click());

/* ================ 7. DONE, AND CHOOSING A HARNESS ================== */

/* The question the installer asks last, narrowed for this round.

   Two things came off it deliberately, because they are not what is
   being tested:

   1. **The workspace standard.** /install-4 leads with the tool an
      administrator chose, which is the right design for a tenant that
      has one. These are new users signing themselves up, so there is no
      administrator and no standard — everyone picks for themselves.

   2. **Installing it for them.** npm installs were the clever half of
      the old screen, and they hid the case this round is about: a
      person who has never used any of these tools has to go to the
      tool's own website, install it, and make an account there before
      they can come back. That round trip is the experiment. So a
      missing harness sends you to its makers, and setup waits.

   What we still cannot do, for any of them, is get somebody an account.
   Installing Claude Code does not sign anyone in to Anthropic — the
   line under the button says so either way. */

let ORG_PREFERS = null;

const HARNESSES = [
  {
    id: 'claude',
    name: 'Claude Code',
    account: 'Anthropic',
    site: 'claude.com/product/claude-code',
    installed: true,
    version: 'v2.1.4',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    account: 'GitHub',
    site: 'github.com/features/copilot',
    installed: false,
  },
  {
    id: 'codex',
    name: 'Codex',
    account: 'OpenAI',
    site: 'openai.com/codex',
    installed: false,
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    account: 'Google',
    site: 'geminicli.com',
    installed: false,
  },
  {
    id: 'vscode',
    name: 'VS Code',
    account: 'GitHub Copilot',
    site: 'code.visualstudio.com',
    installed: false,
  },
];

/* Terminal used to be on this list — built into macOS, always ready, and
   able to run /eai without anyone going anywhere. That made it a hole in
   variation 2: the trip out to a tool's own website is the thing being
   measured, and one row offered a way around it. It is gone. */

/* The brand marks. Six tools rendered as six lines of text was the
   reason the list could not be scanned. */
const HARNESS_ICONS = {
  claude: {
    bg: '#d97757',
    svg: '<svg viewBox="0 0 24 24" fill="none"><g stroke="#ffffff" stroke-width="2.6" stroke-linecap="round">'
      + '<path d="M12 4v16"/><path d="M4 12h16"/><path d="M6.3 6.3l11.4 11.4"/><path d="M17.7 6.3L6.3 17.7"/></g></svg>',
  },
  copilot: {
    bg: '#0d1117',
    svg: '<svg viewBox="0 0 64 64" fill="none">'
      + '<path d="M32 20c8 0 12 3 12 3s4-1 6 1c1.6 1.6 1.4 6 1.4 6s2.6 1.4 2.6 5.6c0 6-4 9.4-8 11.2-4 1.8-9 2.2-14 2.2s-10-.4-14-2.2c-4-1.8-8-5.2-8-11.2 0-4.2 2.6-5.6 2.6-5.6s-.2-4.4 1.4-6c2-2 6-1 6-1s4-3 12-3z" fill="#ffffff"/>'
      + '<ellipse cx="24" cy="37" rx="5.4" ry="6.4" fill="#0d1117"/><ellipse cx="40" cy="37" rx="5.4" ry="6.4" fill="#0d1117"/></svg>',
  },
  codex: {
    bg: '#0b0b0d',
    svg: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.5" stroke="#ffffff" stroke-width="2.2"/></svg>',
  },
  gemini: {
    bg: '#4285f4',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2c.6 5.2 4.2 8.8 9.4 9.4-5.2.6-8.8 4.2-9.4 9.4-.6-5.2-4.2-8.8-9.4-9.4C7.8 10.8 11.4 7.2 12 2z" fill="#ffffff"/></svg>',
  },
  vscode: {
    bg: '#0065a9',
    svg: '<svg viewBox="0 0 64 64" fill="none"><path d="M46 9 30 26l-9-7-5 3.4 7.6 6.6L16 36l5 3.4 9-7 16 17 8-4V13z" fill="#ffffff"/></svg>',
  },
  terminal: {
    bg: '#1c1c1e',
    svg: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 7l5 5-5 5" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M12.5 17h6" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  },
};

const harnessRows = document.getElementById('harnessRows');
const harnessGo = document.getElementById('harnessGo');
const harnessFineTitle = document.getElementById('harnessFineTitle');
const harnessFineBody = document.getElementById('harnessFineBody');

/**
 * The alert above the button: the point in the title, the detail under.
 *
 * The detail is built from nodes rather than an HTML string. Some of what
 * goes into it has been read back out of the DOM — the folder the user
 * picked — and concatenating that into innerHTML is how a path stops
 * being a path. A text node cannot be re-read as markup.
 *
 * Parts are plain strings, {b} for emphasis, or {code} for a command.
 */
function sayNext(title, parts) {
  document.getElementById('harnessFine').hidden = false;
  harnessFineTitle.textContent = title;
  harnessFineBody.replaceChildren(...[].concat(parts).map((part) => {
    if (typeof part === 'string') return document.createTextNode(part);
    const el = document.createElement(part.code === undefined ? 'b' : 'code');
    el.textContent = part.code === undefined ? part.b : part.code;
    return el;
  }));
}
const harnessMore = document.getElementById('harnessMore');
const harnessStandard = document.getElementById('harnessStandard');
let chosenHarness = null;
let waitingFor = null;
let listOpen = false;

function harness(id) { return HARNESSES.find((h) => h.id === id); }
function standard() { return ORG_PREFERS ? harness(ORG_PREFERS) : null; }

/** Preferred first, then what's installed, then the rest. */
function harnessOrder() {
  return [...HARNESSES].sort((a, b) => {
    if (a.id === ORG_PREFERS) return -1;
    if (b.id === ORG_PREFERS) return 1;
    return Number(b.installed) - Number(a.installed);
  });
}

/** What the trailing lane says. Short enough to scan down. */
function stateLabel(h) {
  if (h.installed) return h.version || 'installed';
  return 'not installed';
}

const TICK_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------------------------------------------------------------------
   The standard, as its own box.

   An administrator picked this in workspace settings. Whether it happens
   to be installed changes the state on the right and the verb on the
   button — never the shape of the screen. */

function renderStandard() {
  const h = standard();
  harnessStandard.hidden = !h;
  if (!h) return;

  const icon = document.getElementById('stdIcon');
  icon.style.background = HARNESS_ICONS[h.id].bg;
  icon.innerHTML = HARNESS_ICONS[h.id].svg;

  document.getElementById('stdName').textContent = h.name;
  document.getElementById('stdWhy').textContent = h.installed
    ? `Set as the standard for ${WORKSPACES.find((w) => w.id === chosenWorkspace)?.name || 'your workspace'} by an administrator.`
    : `Set as the standard by an administrator. Setup can install it — npm is already here.`;

  const state = document.getElementById('stdState');
  state.className = `i4-box-state${h.installed ? ' ready' : ''}`;
  state.innerHTML = h.installed
    ? `<span class="dot">${TICK_SVG}</span>installed · ${escapeHtml(h.version || '')}`
    : '<span class="glyph"><svg viewBox="0 0 24 24" fill="none">'
      + '<path d="M12 4v11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
      + '<path d="M7.5 10.5L12 15l4.5-4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M5 19h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
      + '</svg></span>not on this Mac';
}

/* ---------------------------------------------------------------------
   The list. Grouped, because the question underneath "which one?" is
   "which of these do I already have?" — and structure answers that
   faster than six identical rows with a word on the end. */

function renderHarnesses() {
  harnessRows.replaceChildren();

  const shown = harnessOrder().filter((h) => !(standard() && h.id === ORG_PREFERS));
  const groups = [
    ['READY ON THIS MAC', '', shown.filter((h) => h.installed)],
    ['NOT INSTALLED', 'you get these from their makers', shown.filter((h) => !h.installed)],
  ];

  groups.forEach(([label, note, items]) => {
    if (!items.length) return;
    const head = document.createElement('div');
    head.className = 'i4-group';
    head.innerHTML = `<b>${label}</b>${note ? `<span>${note}</span>` : ''}`;
    harnessRows.appendChild(head);

    items.forEach((h) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'eai-row i4-row'
        + (h.installed ? ' ready' : ' missing')
        + (h.id === chosenHarness ? ' on' : '');
      row.dataset.harness = h.id;
      row.innerHTML = `<span class="mark">${TICK_SVG}</span>`
        + `<span class="tile" style="background:${HARNESS_ICONS[h.id].bg}">${HARNESS_ICONS[h.id].svg}</span>`
        + `<span class="nm">${escapeHtml(h.name)}</span>`
        + `<span class="state">${escapeHtml(stateLabel(h))}</span>`;
      row.addEventListener('click', () => selectHarness(h.id));
      harnessRows.appendChild(row);
    });
  });

  harnessMore.hidden = !standard();
  document.getElementById('harnessMoreCount').textContent = `${shown.length} other options`;
  harnessRows.hidden = !!standard() && !listOpen;
}

/* The disclosure. With a standard set, most people never open this. */
harnessMore.addEventListener('click', () => {
  listOpen = !listOpen;
  harnessMore.setAttribute('aria-expanded', String(listOpen));
  harnessMore.querySelector('.count').textContent = listOpen
    ? 'Hide'
    : `${harnessOrder().filter((h) => h.id !== ORG_PREFERS).length} other options`;
  harnessRows.hidden = !listOpen;
});

/* Removing the "your app is ready" confirmation turned this screen from
   an ending into a step, and a step can be left. */
document.getElementById('harnessBack').addEventListener('click', () => showScreen('setup'));

/* --- what the button promises ------------------------------------------

   One primary, and its verb is the whole design. "Open" when the thing
   is there, "Install and open" when we can fetch it, "Get" when the
   user has to. Never the same word for three different amounts of work. */

function selectHarness(id) {
  chosenHarness = id;
  waitingFor = null;
  document.getElementById('harnessWait')?.setAttribute('hidden', '');
  document.getElementById('harnessNote').hidden = true;
  renderStandard();
  renderHarnesses();

  const h = harness(id);
  harnessGo.disabled = false;

  if (h.installed) {
    // Installed: nothing left to fetch, so the button moves them on.
    harnessGo.textContent = 'Next';
    sayNext(`${h.name} is ready`,
      ['Next: what to do the moment it opens on ', { b: project.name || 'your app' }, '.']);
    return;
  }

  /* Not installed. We cannot fetch it, and we cannot make them an account
     with its makers either — both happen on somebody else's website. Say
     the whole trip up front rather than discovering it a step at a time. */
  harnessGo.textContent = `Get ${h.name}`;
  sayNext(`${h.name} comes from ${h.site.split('/')[0]}`,
    ["We'll open their site. Install it and make a ", { b: h.account },
      ' account there, then come back here — your app is already created either way.']);
}

/* --- the button --------------------------------------------------------

   Two outcomes only, which is the point of narrowing this round: open
   the thing, or go and get the thing. */

harnessGo.addEventListener('click', () => {
  const h = harness(chosenHarness);
  if (!h) return;

  // Installed: on to the hand-off, which is its own screen now.
  if (h.installed) { showHandoff(h); return; }

  waitingFor = h.id;
  showWaiting(h);
  browser.go('pages/harness.html'
    + `?app=${encodeURIComponent(h.name)}`
    + `&site=${encodeURIComponent(h.site)}`
    + `&account=${encodeURIComponent(h.account || h.name)}`);
});

/* =========== THE HARNESS'S OWN APP, AND THE WAY BACK ==============

   Downloaded from its makers, opened from the download list, installed
   by dragging it to Applications, and signed in to with an email
   address. Every screen here is theirs, and not one of them has heard
   of Enterprise AI.

   That is deliberate and it is the measurement. The old version of this
   ended with a button reading "Open EAI Setup", which is both a lie —
   Anthropic's installer would never say that — and a way of answering
   the only question we are asking: **do they remember to come back?**
   Nothing here reminds them. EAI Setup is behind this window, still
   waiting, with its own way to carry on when they find it again.
================================================================== */

const harnessWin = document.getElementById('winHarnessApp');

/** Which harness's app is on screen — set when its download is opened. */
let openHarness = null;

function haScreen(name) {
  harnessWin.querySelectorAll('[data-ha]').forEach((s) => {
    s.hidden = s.dataset.ha !== name;
  });
}

/** Opening the download: the disk image, with the app to drag across. */
document.getElementById('dlHarnessItem').addEventListener('click', () => {
  if (!pendingHarness) return;
  openHarness = pendingHarness;
  dlPop.hidden = true;

  const icon = HARNESS_ICONS[openHarness.id];
  document.getElementById('harnessAppTitle').textContent = openHarness.name;
  document.getElementById('haAppName').textContent = openHarness.name;
  document.getElementById('haDmgName').textContent = openHarness.name;
  document.getElementById('haWelcomeTitle').textContent = `${openHarness.name} for Mac`;
  document.getElementById('haReadyTitle').textContent = "You're signed in";
  document.getElementById('haReadySub').textContent = `${openHarness.name} is ready to use.`;
  document.getElementById('haMaker').textContent = openHarness.account || openHarness.name;

  [['haAppIcon', 46], ['haMark', 56], ['haMark2', 56]].forEach(([id, size]) => {
    const el = document.getElementById(id);
    el.style.background = icon.bg;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.innerHTML = icon.svg;
  });

  document.getElementById('haEmail').value = '';
  document.getElementById('haDmgHint').innerHTML =
    `To install, drag <b>${escapeHtml(openHarness.name)}</b> to <b>Applications</b>`;

  haScreen('install');
  focusWin('harnessApp');
  syncDock();
});

/* --- dragging it to Applications, the same as ours ------------------ */

const haApp = document.getElementById('haApp');
const haTarget = document.getElementById('haApplications');

function haInstall() {
  if (!openHarness) return;
  haApp.style.transform = '';
  haTarget.classList.remove('over');

  // On the machine now. EAI Setup finds it whenever they go back.
  openHarness.installed = true;
  openHarness.version = 'just installed';
  if (waitingFor === openHarness.id) waitingFor = null;
  renderHarnesses();

  const item = dockItem(HOST_FOR[openHarness.id]);
  if (item) {
    item.classList.remove('tucked');
    item.classList.add('landing');
    setTimeout(() => item.classList.remove('landing'), 600);
  }
  syncDock();

  haScreen('welcome');
}

haApp.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const start = { x: e.clientX, y: e.clientY };
  let moved = false;

  const move = (ev) => {
    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    moved = true;
    haApp.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
    haTarget.classList.toggle('over', hitTest(ev.clientX, ev.clientY, haTarget));
  };

  const up = (ev) => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    if (moved && hitTest(ev.clientX, ev.clientY, haTarget)) haInstall();
    else { haApp.style.transform = ''; haTarget.classList.remove('over'); }
  };

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});

// Dragging is fiddly in a prototype; double-clicking either side does it too.
haApp.addEventListener('dblclick', haInstall);
haTarget.addEventListener('dblclick', haInstall);

/* --- their welcome, and their sign-in -------------------------------- */

document.getElementById('haStart').addEventListener('click', () => haScreen('signin'));

const haEmail = document.getElementById('haEmail');

function haSignIn() {
  const value = haEmail.value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    haEmail.classList.add('bad');
    haEmail.focus();
    setTimeout(() => haEmail.classList.remove('bad'), 700);
    return;
  }
  haScreen('ready');
  // And then nothing. No prompt, no hand-back, no mention of us.
}

document.getElementById('haEmailGo').addEventListener('click', haSignIn);
haEmail.addEventListener('keydown', (e) => { if (e.key === 'Enter') haSignIn(); });
// Google is somebody else's account too; it just doesn't need a form.
document.getElementById('haGoogle').addEventListener('click', () => haScreen('ready'));

/* --- the hand-off, on its own screen ---------------------------------

   Everything here is about a window we are about to open and cannot
   write into. It used to live at the bottom of the harness list, under
   six rows and two alerts, which is the worst place on the screen for
   the one instruction that has to survive the trip. */

const handoffGo = document.getElementById('handoffGo');

function showHandoff(h) {
  document.getElementById('handoffTitle').textContent = 'One last thing';
  document.getElementById('handoffSub').textContent =
    `${h.name} is ready. Here's what to do the moment it opens.`;

  // Name the tool. "Your AI tool" is the sort of phrase people read past.
  document.getElementById('harnessEaiBody').innerHTML =
    `${escapeHtml(h.name)} opens on your app with an empty prompt — it doesn't `
    + 'know about EAI until you say so. Typing <code>/eai</code> is what starts it.';

  // Nothing else is written on this screen. The sign-in alert used to be
  // filled in here, and it was one more thing to read on the screen that
  // carries the only instruction we can't repeat later.

  handoffGo.textContent = `Open ${project.name || 'your app'} in ${h.name}`;

  // The window in the film is the one they are about to be handed to.
  const film = document.getElementById('harnessVideo');
  film.dataset.app = h.name;
  film.dataset.project = project.name || 'your app';
  film.querySelector('.eai-vid-title').textContent = `${h.name} — ${project.name || 'your app'}`;

  showScreen('handoff');
  focusWin('setup');
  setupWin.querySelector('.skin-setup')?.scrollTo({ top: 0 });
}

handoffGo.addEventListener('click', () => {
  const h = harness(chosenHarness);
  if (h) openInHarness(h);
});

document.getElementById('handoffBack').addEventListener('click', () => {
  showScreen('done');
  setupWin.querySelector('.skin-setup')?.scrollTo({ top: 0 });
});

/** The state the app can't resolve on its own. */
function showWaiting(h) {
  let el = document.getElementById('harnessWait');
  if (!el) {
    el = document.createElement('div');
    el.className = 'i4-wait';
    el.id = 'harnessWait';
    el.innerHTML = '<i class="mk pending" style="flex:0 0 16px;width:16px;height:16px;border:2px solid var(--color-border);border-radius:50%;"></i>'
      + '<div class="tx"><b></b><span></span></div>';
    const btn = document.createElement('button');
    btn.className = 'eai-btn';
    btn.type = 'button';
    btn.textContent = "I've installed it — check again";
    btn.addEventListener('click', () => recheck(h));
    el.appendChild(btn);
    harnessRows.after(el);
  }
  el.querySelector('.tx b').textContent = `Waiting for ${h.name}`;
  el.querySelector('.tx span').textContent =
    `${h.site} is open in your browser. Download ${h.name}, install it and sign in — then come `
    + 'back here and choose Check again. Your app is already created, so nothing is lost if you '
    + 'close this window.';
  el.hidden = false;

  harnessGo.disabled = true;
  harnessGo.textContent = `Waiting for ${h.name}…`;
  // No fine print while waiting: the waiting box above says everything,
  // and a second panel repeating "nothing else is needed" underneath it
  // was answering a question nobody had asked yet.
  document.getElementById('harnessFine').hidden = true;
}

/** They say it's installed; the app checks rather than takes their word. */
async function recheck(h) {
  const el = document.getElementById('harnessWait');
  el.querySelector('.tx b').textContent = `Checking for ${h.name}`;
  el.querySelector('.tx span').textContent = 'Looking for it on this Mac.';
  await wait(1200);

  h.installed = true;
  h.version = 'found';
  waitingFor = null;
  el.hidden = true;
  renderHarnesses();
  selectHarness(h.id);
  focusWin('setup');
}

function finish(name, path) {
  labelProject();
  // The line under the title says which world we're in — unless a ⌘K
  // variation has already replaced it with its own.
  if (!harnessSubCustom) {
    const anyReady = HARNESSES.some((h) => h.installed);
    document.getElementById('harnessSub').textContent = anyReady ? SUB_INSTALLED : SUB_EMPTY;
  }
  renderStandard();
  renderHarnesses();
  // Pick the first thing that can actually run /eai, or the first row.
  selectHarness(chosenHarness || harnessOrder().find((h) => h.installed)?.id || harnessOrder()[0].id);
  showScreen('done');
  focusWin('setup');
  /* The window used to open scrolled to the bottom: focusing the primary
     button asks the browser to scroll it into view, and it is the last
     thing on a tall screen. The top of the screen is where the question
     is, so start there. */
  setupWin.querySelector('.skin-setup')?.scrollTo({ top: 0 });
}

/* The hand-off screen has one button. "Show me the folder instead" used
   to sit under it and pointed the coach mark at the project folder — a
   second exit at the one moment the round is measuring. */
/* ==================== 8. HAND OVER TO COPILOT ====================== */

let handedOver = false;

/** Name the workspace after the project, however Copilot got opened. */
let hostLabel = 'GitHub Copilot';

function labelHost() {
  if (!project.name) return;
  document.getElementById('hostTitle').textContent = `${project.name} — ${hostLabel}`;
  document.querySelectorAll('[data-project-folder]').forEach((n) => { n.textContent = `📁 ${project.name}`; });
  document.querySelectorAll('#winHost [data-project-name]').forEach((n) => { n.textContent = project.name; });
}

window.addEventListener('host-changed', labelHost);

function openInCopilot(name, path, app = 'copilotProject', label = 'GitHub Copilot') {
  project = { name, path };
  hostLabel = label;

  const item = dockItem(app) || dockItem('copilotProject');
  if (!handedOver) {
    item.classList.add('landing');
    setTimeout(() => item.classList.remove('landing'), 600);
  }
  item.classList.remove('tucked');

  setHost(app);
  labelHost();
  focusWin('host');
  syncDock();

  if (handedOver) return;
  handedOver = true;
  writeWelcome(name, path);
}

/** Whichever one they picked, opened on the project. */
function openInHarness(h) {
  const app = HOST_FOR[h.id] || 'terminal';
  openInCopilot(projName.value.trim() || 'customer-portal', projFolder.value || '', app, h.name);
}

/* The desktop's app skins, by harness. Copilot has a skin already set up
   on the project folder; the others share the agent skin. */
const HOST_FOR = {
  claude: 'claude',
  copilot: 'copilotProject',
  codex: 'codex',
  gemini: 'gemini',
  vscode: 'vscode',
};
/* The end of the journey — and the part we do not control.

   Assume nothing can be written into an external harness. Claude Code,
   Copilot and the rest open on the folder with an empty prompt and no
   idea that EAI exists; we cannot print a banner, a hint or a chip in
   somebody else's window, and pretending we can would make this
   prototype answer a question nobody asked.

   So the harness opens empty and typeable. Everything a person needs to
   know was said before they got here — in the web app's CLI tab and on
   the setup app's last screen — and whether that was enough is the
   experiment. Typing /eai is the finish line. */

function writeWelcome(name, path) {
  const body = document.getElementById('termBody');
  body.replaceChildren();

  const row = document.createElement('span');
  row.className = 'ln tin';
  row.innerHTML = '<span class="pfx">&#10095;</span>';

  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  // No placeholder. A placeholder is a hint, and a hint is the thing we
  // are testing the absence of.
  row.appendChild(input);
  body.appendChild(row);
  input.focus();

  // Clicking anywhere in the window puts the cursor back in the prompt,
  // which is what a real terminal does.
  body.addEventListener('click', () => input.focus());

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const value = input.value.trim();
    if (!value) return;

    const echo = document.createElement('span');
    echo.className = 'ln';
    echo.innerHTML = `<span class="pfx">&#10095;</span> <span class="user">${escapeHtml(value)}</span>`;
    body.insertBefore(echo, row);
    input.value = '';

    if (!/^\/eai\b/i.test(value)) {
      // Whatever else they type, the harness answers as itself.
      const err = document.createElement('span');
      err.className = 'ln dim';
      err.textContent = `Unknown slash command: ${value}`;
      body.insertBefore(err, row);
      body.scrollTop = body.scrollHeight;
      return;
    }

    row.remove();
    const ok = document.createElement('span');
    ok.className = 'ln ok';
    ok.textContent = '  \u2713 EAI is running.';
    body.appendChild(ok);
    body.scrollTop = body.scrollHeight;
    setTimeout(congratulations, 700);
  });
}

/** The finish line, said plainly, because a test needs an end. */
function congratulations() {
  if (document.querySelector('.eai-done')) return;

  const overlay = document.createElement('div');
  overlay.className = 'eai-done';
  overlay.innerHTML = `
    <div class="eai-done-card">
      <span class="tick">
        <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <h3>That's it — you're building</h3>
      <p><b>${escapeHtml(project.name || 'Your app')}</b> is connected to ${escapeHtml(workspaceName())} and EAI is running inside your AI tool. Tell it what you want to build.</p>
      <button class="eai-btn primary" type="button">Done</button>
    </div>`;

  document.getElementById('desktop').appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('on'));
  overlay.querySelector('button').addEventListener('click', () => overlay.remove());
}

/* ========================= 9. ERROR STATES ========================= */

/* The check is a single confident line right up until it isn't. When a
   prerequisite fails, that line becomes the list — the same rows the
   complex form shows — with the one that broke marked, and the note
   says the one thing that fixes it. */

const FAILURES = {
  prereq() {
    prereqsReady = false;
    renderCheckFailure('Git');
    showScreen('signin');
    document.querySelector('[data-screen="signin"] .eai-head p').textContent =
      'One thing EAI needs could not be installed.';
    document.getElementById('signinNoteTitle').textContent = 'Apple needs your approval to install Git';
    document.getElementById('signinNoteBody').textContent =
      'macOS blocked the Command Line Tools install, so Git is missing. Approve it from the prompt macOS showed, '
      + 'or run xcode-select --install in Terminal, then choose Retry. Nothing else is waiting on it.';
    document.getElementById('signinNote').hidden = false;
    document.getElementById('setupCreate').textContent = 'Retry';
    document.getElementById('setupSignin').classList.add('off');
  },

  signin() {
    showScreen('signin');
    document.querySelector('[data-screen="signin"] .eai-head p').textContent =
      "Sign-in needs a connection to EAI, and this Mac can't reach it.";
    document.getElementById('signinNote').hidden = false;
    document.getElementById('setupCreate').textContent = 'Retry';
    document.getElementById('setupSignin').classList.add('off');
  },

  workspace() {
    renderWorkspaces();
    wsRows.replaceChildren();
    showScreen('setup');
    steps.template.hidden = true;
    steps.name.hidden = true;
    steps.folder.hidden = true;
    setupActs.hidden = true;
    document.getElementById('setupSub').textContent =
      `Signed in as ${account}. One thing is in the way.`;
    document.getElementById('wsNote').hidden = false;
  },

  name() {
    renderWorkspaces();
    showScreen('setup');
    steps.name.hidden = false;
    if (!projName.value) projName.value = 'contract-renewals';
    setFieldError('name',
      `A folder called ${projName.value} already exists there. `
      + 'Pick another name, or choose a different folder below.');
  },

  running() {
    showScreen('running');
    runLines.replaceChildren();
    markDone(addRow('Workspace connected', workspaceName()));
    markDone(addRow('Folder created', '~/Downloads/contract-renewals'));

    const row = addRow('App template downloaded', 'failed');
    row.className = 'eai-row failed';
    row.querySelector('.mk').className = 'mk fail';
    row.querySelector('.mk').innerHTML = '&#10005;';

    document.getElementById('runTitle').textContent = "Couldn't finish creating contract-renewals";
    document.getElementById('runSub').textContent =
      'The folder was created and is empty. Nothing was left half-written.';
    document.getElementById('runNote').hidden = false;
    document.getElementById('runActs').hidden = false;
  },
};

/** Put every screen back the way it started. */
function clearFailures() {
  prereqsReady = true;
  renderCheck();
  // The harness list is a world of its own (section 10) and has its own
  // way back — "happy path" has to mean both.
  resetHarnesses();

  document.querySelector('[data-screen="signin"] .eai-head p').textContent =
    'Use the account you signed up with. Your browser is still signed in, so this takes one click.';
  document.getElementById('signinNote').hidden = true;
  document.getElementById('signinNoteTitle').textContent = "Can't reach api.eai.com";
  document.getElementById('signinNoteBody').textContent =
    'Your network blocked the request, or EAI is unreachable from here. Check your connection or VPN, then retry.';
  document.getElementById('setupCreate').textContent = 'Use a different account';
  document.getElementById('setupSignin').classList.remove('off');

  sayAccount();
  document.getElementById('wsNote').hidden = true;
  chosenWorkspace = null;
  renderWorkspaces();
  chosenTemplate = 'eai';
  renderTemplates();
  steps.template.hidden = true;
  steps.name.hidden = true;
  steps.folder.hidden = true;
  setupActs.hidden = true;
  Object.keys(steps).forEach((k) => markAnswered(k, false));

  clearAllFieldErrors();

  document.getElementById('runNote').hidden = true;
  document.getElementById('runActs').hidden = true;
  document.getElementById('runTitle').textContent = 'Creating your EAI app';
  document.getElementById('runSub').textContent = 'Downloading the app template into your folder.';
  runLines.replaceChildren();
  showScreen('signin');
}

/* The web half, from ⌘K. Five pages is a long way back for a moderator
   who only wanted to see the download again. */
document.querySelectorAll('button[data-goto]').forEach((btn) => {
  btn.addEventListener('click', () => {
    toggleSheet(false);
    browser.go(btn.dataset.goto);
  });
});

document.querySelectorAll('button[data-err]').forEach((btn) => {
  btn.addEventListener('click', () => {
    toggleSheet(false);
    clearFailures();
    if (btn.dataset.err !== 'clear') FAILURES[btn.dataset.err]();
    focusWin('setup');
    syncDock();
  });
});

/* ============ 10. THE TWO VARIATIONS, FROM ⌘K ====================

   The round has one question — can somebody get from the web app to
   typing /eai in a window we don't control — and two worlds to ask it
   in:

   1. **A harness is already installed.** The likely case for a
      developer, and the short road: pick it, open it, type the thing.

   2. **Nothing is installed.** The likely case for everybody else, and
      the long road: out to the tool's own website, install it, make an
      account with its makers, come back, check again, then type the
      thing. Every extra step is a place to lose someone, which is why
      it is worth watching rather than assuming.

   The administrator-chose-one case is deliberately absent. These are
   new users signing themselves up; there is nobody to have chosen. */

/* A ⌘K state writes its own line under the title; the happy path writes
   the workspace's name into it. This says which of the two is in force. */
let harnessSubCustom = false;

const INSTALLED_BY_DEFAULT = HARNESSES.map((h) => h.installed);

const SUB_INSTALLED = 'Claude Code is already on this Mac. Pick it, or use something else.';
const SUB_EMPTY = "None of these are on this Mac yet. Pick the one you'd like and we'll send you to its makers.";

function resetHarnesses() {
  harnessSubCustom = false;
  ORG_PREFERS = null;
  listOpen = true;
  harnessMore.setAttribute('aria-expanded', 'false');
  HARNESSES.forEach((h, i) => {
    h.installed = INSTALLED_BY_DEFAULT[i];
    if (!h.installed) delete h.version;
  });
  HARNESSES.find((h) => h.id === 'claude').version = 'v2.1.4';
  document.getElementById('harnessWait')?.setAttribute('hidden', '');
  document.getElementById('harnessNote').hidden = true;
  document.getElementById('harnessSub').textContent = SUB_INSTALLED;
  chosenHarness = null;
}

const HARNESS_STATES = {
  /* Variation 1 — the short road. */
  installed: () => {
    document.getElementById('harnessSub').textContent = SUB_INSTALLED;
  },

  /* Variation 2 — the long one. An empty Mac, and the only way forward
     is out to somebody else's website. */
  none: () => {
    HARNESSES.forEach((h) => {
      h.installed = false;
      delete h.version;
    });
    document.getElementById('harnessSub').textContent = SUB_EMPTY;
  },
};

/* --- picking a variation before the flow starts ----------------------

   The launch pad hands a tester one URL and nothing else, so which world
   they're in has to travel in it: /signup?scenario=none. Applied here,
   at load, rather than on the harness screen — the machine's state is
   true from the first second, not arranged behind them at the end.

   It also becomes the new baseline, so "back to the happy path" in ⌘K
   returns to the scenario they were sent to rather than the file's
   defaults. */

const SCENARIO = new URLSearchParams(window.location.search).get('scenario');

/* Called by name rather than looked up by one. `HARNESS_STATES[SCENARIO]()`
   reads better and is a dynamic dispatch on a string from the address bar —
   ?scenario=constructor finds something truthy on any object. Two literal
   branches can't be talked into calling anything else. */
function applyScenario(name) {
  if (name === 'installed') HARNESS_STATES.installed();
  else if (name === 'none') HARNESS_STATES.none();
  else return false;

  HARNESSES.forEach((h, i) => { INSTALLED_BY_DEFAULT[i] = h.installed; });
  renderHarnesses();

  // Mark it in ⌘K, so a moderator can see which one is running.
  document.querySelector(`button[data-harness="${name}"]`)?.classList.add('on');
  return true;
}

applyScenario(SCENARIO);

document.querySelectorAll('button[data-harness]').forEach((btn) => {
  btn.addEventListener('click', () => {
    toggleSheet(false);
    resetHarnesses();
    HARNESS_STATES[btn.dataset.harness]();
    harnessSubCustom = true;
    document.querySelectorAll('button[data-harness]').forEach((b) => {
      b.classList.toggle('on', b === btn);
    });

    // Land on the finished screen with a project, however you got here.
    if (!project.name) {
      projName.value = projName.value || 'contract-renewals';
      projFolder.value = projFolder.value || '/Users/gareth/eai';
      project = { name: projName.value, path: `${projFolder.value}/${projName.value}` };
    }
    // Terminal is always here and can always run /eai, but it is not what
    // this round is about — lead with a real harness either way.
    chosenHarness = harnessOrder().find((h) => h.installed)?.id || harnessOrder()[0].id;
    finish(project.name, project.path);
    syncDock();
  });
});

/* --- the video, on the hand-off screen -------------------------------

   Mounted rather than bound: it is a player sitting in the page at the
   size it plays, not a thumbnail that opens something. */

mountVideo(document.getElementById('harnessVideo'), 'setup-app');
