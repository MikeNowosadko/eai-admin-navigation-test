/* ------------------------------------------------------------------
   EAI Setup, one page — at /install-3.

   The second pass at the simpler form. /install-2 answered "what if the
   prerequisites were invisible and every screen asked one thing"; the
   answer was fewer decisions per screen but four Continues to get
   through them. This keeps the first half of that and drops the second.

   What changed, and why:

   1. The window opens big enough for the whole form. Growing a window
      under someone mid-task is worse than starting roomy.

   2. The wordmark sits centred above the title, so the first screen
      says whose app this is before it says what it wants.

   3. The check is stated, not listed. /install shows four green ticks;
      /install-2 showed nothing at all. Both are wrong in the same way —
      one makes you read a report, the other leaves you wondering
      whether anything happened. So: one line saying the machine is
      ready, in the same row component the complex form uses, and the
      full list only when something in it failed.

   4. Sign-in lands on a tick rather than a screen swap, and hands its
      title to "Let's get set up".

   5. Setup is one page. Choosing a workspace reveals the name field;
      naming reveals the folder; choosing a folder reveals the button.
      No Continue anywhere — a click whose only meaning is "yes, I did
      just answer that" is a click worth deleting. Everything above
      stays on screen and stays editable.

   6. Nothing opens itself at the end. Finishing setup and leaving for
      your editor are two intentions, and the second one is the user's,
      so it gets a success state and one big button.

   Sections 1, the folder chooser and the hand-off are /install-2's.
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
  browser.go('pages/signin.html');
  await browser.waitFor('signin');
  browser.go('pages/signed-in.html');
  await wait(900);

  // The beat: the tick lands, and holds long enough to be read as an
  // answer rather than a flicker.
  showScreen('welcome');
  focusWin('setup');
  await wait(1500);

  renderWorkspaces();
  showScreen('setup');
  focusWin('setup');
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
const STEP_NUMBERS = { workspace: '1', name: '2', folder: '3' };

function markAnswered(step, yes = true) {
  const el = steps[step];
  if (!el) return;
  el.classList.toggle('answered', yes);
  const num = el.querySelector('.i3-num');
  if (num) num.textContent = yes ? '\u2713' : STEP_NUMBERS[step];
}

/* --- 1 · workspace ---------------------------------------------------- */

const WORKSPACES = [
  { id: 'northwind', name: 'Northwind Group', meta: 'Australia · 240 people' },
  { id: 'northwind-retail', name: 'Northwind Retail', meta: 'Australia · 60 people' },
];

const wsRows = document.getElementById('wsRows');
let chosenWorkspace = null;

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
    row.addEventListener('click', () => {
      chosenWorkspace = ws.id;
      renderWorkspaces();
      markAnswered('workspace');
      reveal(steps.name);
      // Picking a workspace is the whole answer, so the next field gets
      // the cursor without being asked for.
      setTimeout(() => projName.focus(), 220);
    });
    wsRows.appendChild(row);
  });
}

function workspaceName() {
  return (WORKSPACES.find((w) => w.id === chosenWorkspace) || WORKSPACES[0]).name;
}

/* --- 2 · name --------------------------------------------------------- */

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
    ['App template downloaded', 'eai init'],
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

/* The question the real installer asks last, done properly.

   Three facts make it more than a list:

   1. Some of these are on this Mac and some are not, and the app can
      tell — the CLI already reports it (`eai ai-surfaces`).

   2. Of the ones that are missing, most are npm packages, and setup
      installed npm twenty seconds ago. So "you need to go and get this"
      is usually a lie: we can fetch it. The CLI has the hook already
      (`eai start --surface <id> --install`). VS Code is the exception —
      an app download, not a package — and that difference has to be
      visible, because it changes what the button can promise.

   3. What we cannot do, for any of them, is get the user an account.
      Installing Claude Code does not sign anyone in to Anthropic. So
      the line under the button always says what it will ask for next,
      and says that EAI never sees it. Offering to install something is
      only honest if you are equally clear about the half you can't do.

   And the org gets an opinion. A workspace can name a preferred
   harness; it sorts first and carries the only chip on the screen.
   Recommending is not installing — a managed Mac may forbid it — so a
   recommended-but-missing tool still goes through the same install
   affordance as any other. */

let ORG_PREFERS = 'claude';

const HARNESSES = [
  {
    id: 'claude',
    name: 'Claude Code',
    kind: 'npm',
    pkg: '@anthropic-ai/claude-code',
    account: 'Anthropic',
    installed: true,
    version: 'v2.1.4',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    kind: 'npm',
    pkg: '@github/copilot',
    account: 'GitHub',
    installed: true,
    version: 'v0.4.1',
  },
  {
    id: 'codex',
    name: 'Codex',
    kind: 'npm',
    pkg: '@openai/codex',
    account: 'OpenAI',
    installed: false,
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    kind: 'npm',
    pkg: '@google/gemini-cli',
    account: 'Google',
    installed: false,
  },
  {
    id: 'vscode',
    name: 'VS Code',
    kind: 'download',
    site: 'code.visualstudio.com',
    installed: false,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    kind: 'builtin',
    installed: true,
  },
];

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
const harnessNoStandard = document.getElementById('harnessNoStandard');
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
  if (h.kind === 'builtin') return 'built in';
  if (h.installed) return h.version || 'installed';
  if (h.kind === 'download') return 'needs download';
  return 'npm · ~30s';
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
  harnessNoStandard.hidden = !!h;
  harnessNoStandard.classList.add('muted');
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
    ['SETUP CAN INSTALL THESE', 'npm is already on this Mac', shown.filter((h) => !h.installed && h.kind === 'npm')],
    ['NEEDS A DOWNLOAD', '', shown.filter((h) => !h.installed && h.kind === 'download')],
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
    harnessGo.textContent = `Open ${project.name || 'your app'} in ${h.name}`;
    if (h.kind === 'builtin') {
      sayNext('Opens in Terminal, at the /eai prompt',
        ['Your project is at ', { code: shortPath(project.path) }, '.']);
    } else {
      sayNext(`${h.name} will ask you to sign in`,
        ['It signs in to ', { b: h.account }, ' the first time you open it. '
          + 'Enterprise AI never sees that account.']);
    }
    return;
  }

  if (h.kind === 'npm') {
    harnessGo.textContent = `Install and open ${h.name}`;
    sayNext('About 30 seconds — npm is already here',
      ['Setup installs ', { code: h.pkg }, `, then ${h.name} asks you to sign in to `,
        { b: h.account }, ', which Enterprise AI never sees.']);
    return;
  }

  // A real application, not a package. Say so rather than pretending.
  harnessGo.textContent = `Get ${h.name}`;
  sayNext(`${h.name} is an app download, not a package`,
    ["It can't be installed from here. We'll open ", { b: h.site }, " — come back when it's done."]);
}

/* --- the button -------------------------------------------------------- */

harnessGo.addEventListener('click', async () => {
  const h = harness(chosenHarness);
  if (!h) return;

  if (h.installed) { openInHarness(h); return; }

  if (h.kind === 'download') {
    waitingFor = h.id;
    showWaiting(h);
    browser.go('pages/harness.html');
    return;
  }

  await installHarness(h);
});

/** npm install -g, with the app already finished behind it. */
async function installHarness(h) {
  harnessGo.disabled = true;
  harnessGo.textContent = `Installing ${h.name}…`;
  sayNext(`Installing ${h.name}`, [{ code: `npm install -g ${h.pkg}` }]);
  document.getElementById('harnessNote').hidden = true;

  await wait(2200);

  if (failInstall) {
    harnessGo.disabled = false;
    harnessGo.textContent = `Try installing ${h.name} again`;
    sayNext('Your app is finished either way',
      'Nothing about the failure touched it — it is created and connected.');
    document.getElementById('harnessNoteTitle').textContent = `Couldn't install ${h.name}`;
    document.getElementById('harnessNoteBody').textContent =
      'npm refused to write to its global folder on this Mac, which usually means it is managed by IT. '
      + 'Your app is finished and safe to use — install the tool yourself, or ask for permission and try again.';
    document.getElementById('harnessNote').hidden = false;
    return;
  }

  h.installed = true;
  h.version = 'just installed';
  renderHarnesses();
  openInHarness(h);
}

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
    `${h.site} is open in your browser. Install it, then come back here and choose Check again — `
    + 'your app is already created, so nothing is lost if you close this window.';
  el.hidden = false;

  harnessGo.disabled = true;
  harnessGo.textContent = `Waiting for ${h.name}…`;
  sayNext('Nothing else is needed from you here',
    [`${project.name || 'Your app'} is already created and connected.`]);
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
  // The "your app is ready" strip came off this screen, so there is no
  // path or workspace to write into here any more.
  renderStandard();
  renderHarnesses();
  selectHarness(chosenHarness || ORG_PREFERS || harnessOrder()[0].id);
  showScreen('done');
  focusWin('setup');
  setTimeout(() => harnessGo.focus(), 240);
}

document.getElementById('doneFolder').addEventListener('click', () => {
  coach('The project folder', `${shortPath(project.path)} — the app's files are in there now.`);
  setTimeout(hideCoach, 3000);
});
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
  terminal: 'terminal',
};
/** The end of the journey: Copilot open on the project, waiting for /eai. */
function writeWelcome(name, path) {
  const body = document.getElementById('termBody');
  const line = (html, cls = '') => {
    const el = document.createElement('span');
    el.className = `ln ${cls}`.trim();
    el.innerHTML = html;
    body.appendChild(el);
  };

  line(`Workspace: ${escapeHtml(path || name)}`, 'dim');
  line('', 'spacer');
  line('  ███████  █████  ██\n  ██      ██   ██ ██\n  █████   ███████ ██\n  ██      ██   ██ ██\n  ███████ ██   ██ ██', 'banner');
  line('', 'spacer');
  line('Welcome to the EAI CLI', 'head');
  line('Your app is created, your tenant is connected, and the Gofer assets are in place.', 'dim');
  line('', 'spacer');
  line('Type <span class="kbd">/eai</span> to get started.', 'blue');
  line('', 'spacer');

  const row = document.createElement('span');
  row.className = 'ln tin';
  row.innerHTML = '<span class="pfx">❯</span>';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'type /eai and press enter';
  input.autocomplete = 'off';
  input.spellcheck = false;
  row.appendChild(input);
  body.appendChild(row);
  input.focus();

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const value = input.value.trim();
    if (!value) return;
    if (!/^\/eai\b/i.test(value)) {
      const err = document.createElement('span');
      err.className = 'ln err';
      err.textContent = `Unknown command: ${value} — type /eai to start.`;
      body.insertBefore(err, row);
      input.value = '';
      return;
    }
    row.outerHTML = `<span class="ln"><span class="pfx">❯</span> <span class="user">${escapeHtml(value)}</span></span>`;
    finish();
  });

  // Clicking the chip is the same as typing it.
  const chips = document.createElement('span');
  chips.className = 'ln chips';
  const chip = document.createElement('button');
  chip.className = 'chip primary';
  chip.textContent = '/eai';
  chip.addEventListener('click', () => {
    input.value = '/eai';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  chips.appendChild(chip);
  body.appendChild(chips);

  function finish() {
    chips.remove();
    const done = document.createElement('span');
    done.className = 'ln ok';
    done.textContent = '  ✓ Ready — tell me what you want to build.';
    body.appendChild(done);
    body.scrollTop = body.scrollHeight;
  }
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
    steps.name.hidden = true;
    steps.folder.hidden = true;
    setupActs.hidden = true;
    document.getElementById('setupSub').textContent =
      'Signed in as gareth@northwind.com. One thing is in the way.';
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
    markDone(addRow('Workspace connected', 'Northwind Group'));
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
    "Sign in, or create an account if you don't have one yet.";
  document.getElementById('signinNote').hidden = true;
  document.getElementById('signinNoteTitle').textContent = "Can't reach api.eai.com";
  document.getElementById('signinNoteBody').textContent =
    'Your network blocked the request, or EAI is unreachable from here. Check your connection or VPN, then retry.';
  document.getElementById('setupCreate').textContent = 'Create an EAI account';
  document.getElementById('setupSignin').classList.remove('off');

  document.getElementById('setupSub').textContent =
    'Signed in as gareth@northwind.com. Three things, and your app exists.';
  document.getElementById('wsNote').hidden = true;
  chosenWorkspace = null;
  renderWorkspaces();
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

document.querySelectorAll('button[data-err]').forEach((btn) => {
  btn.addEventListener('click', () => {
    toggleSheet(false);
    clearFailures();
    if (btn.dataset.err !== 'clear') FAILURES[btn.dataset.err]();
    focusWin('setup');
    syncDock();
  });
});

/* =============== 10. THE HARNESS STATES, FROM ⌘K =================== */

/* Four situations the happy path hides, each reachable without having
   to own the machine they happen on. They rewrite HARNESSES and then
   re-enter the done screen, so what you see is the real component in a
   different world rather than a drawing of one. */

let failInstall = false;

const INSTALLED_BY_DEFAULT = HARNESSES.map((h) => h.installed);

function resetHarnesses() {
  failInstall = false;
  ORG_PREFERS = 'claude';
  listOpen = false;
  harnessMore.setAttribute('aria-expanded', 'false');
  HARNESSES.forEach((h, i) => {
    h.installed = INSTALLED_BY_DEFAULT[i];
    if (!h.installed) delete h.version;
  });
  HARNESSES.find((h) => h.id === 'claude').version = 'v2.1.4';
  HARNESSES.find((h) => h.id === 'copilot').version = 'v0.4.1';
  document.getElementById('harnessWait')?.setAttribute('hidden', '');
  document.getElementById('harnessNote').hidden = true;
  document.getElementById('harnessSub').textContent = ORG_PREFERS
    ? "Northwind Group has a standard for this, so it's already chosen."
    : 'Pick the one you use — or let setup add one.';
  chosenHarness = null;
}

const HARNESS_STATES = {
  /* The interesting one. The org has a preference and the machine
     doesn't have it — which is exactly when being able to install it
     stops being a nicety. */
  'preferred-missing': () => {
    harness('claude').installed = false;
    document.getElementById('harnessSub').textContent =
      "Northwind recommends Claude Code, and it isn't on this Mac yet. Setup can install it.";
  },

  /* A machine with nothing on it. The list still leads with the
     recommendation rather than apologising for being empty. */
  none: () => {
    HARNESSES.forEach((h) => { if (h.kind !== 'builtin') h.installed = false; });
    document.getElementById('harnessSub').textContent =
      "None of these are on this Mac yet. Setup can install all but one of them for you.";
  },

  /* The one we can't do for them. */
  download: () => {
    HARNESSES.forEach((h) => { if (h.kind !== 'builtin') h.installed = false; });
    document.getElementById('harnessSub').textContent =
      'VS Code is an app download rather than a package, so this one needs a trip to the browser.';
  },

  /* No administrator has set one. There is no box, the list opens, and
     the note points at the person who could fix it. */
  'no-standard': () => {
    ORG_PREFERS = null;
    listOpen = true;
    document.getElementById('harnessSub').textContent =
      'Pick the one you use — or let setup add one.';
  },

  /* npm exists but won't write — the managed-Mac case. */
  failed: () => {
    harness('claude').installed = false;
    failInstall = true;
    document.getElementById('harnessSub').textContent =
      "Northwind recommends Claude Code, and it isn't on this Mac yet. Setup can install it.";
  },
};

document.querySelectorAll('button[data-harness]').forEach((btn) => {
  btn.addEventListener('click', () => {
    toggleSheet(false);
    resetHarnesses();
    HARNESS_STATES[btn.dataset.harness]();

    // Land on the finished screen with a project, however you got here.
    if (!project.name) {
      projName.value = projName.value || 'contract-renewals';
      projFolder.value = projFolder.value || '/Users/gareth/eai';
      project = { name: projName.value, path: `${projFolder.value}/${projName.value}` };
    }
    chosenHarness = btn.dataset.harness === 'download'
      ? 'vscode'
      : (ORG_PREFERS || harnessOrder().find((h) => h.installed)?.id || 'terminal');
    finish(project.name, project.path);
    syncDock();
  });
});
