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

/* ======================== 7. DONE, AND ONE BUTTON ================== */

function finish(name, path) {
  labelProject();
  document.getElementById('donePath').textContent = shortPath(path);
  document.getElementById('doneWorkspace').textContent = workspaceName();
  showScreen('done');
  focusWin('setup');
  // The big one is what they came for, so it starts focused.
  setTimeout(() => document.getElementById('openCopilot').focus(), 240);
}

document.getElementById('doneFolder').addEventListener('click', () => {
  coach('The project folder', `${shortPath(project.path)} — the app's files are in there now.`);
  setTimeout(hideCoach, 3000);
});

/* ==================== 8. HAND OVER TO COPILOT ====================== */

let handedOver = false;

/** Name the workspace after the project, however Copilot got opened. */
function labelHost() {
  if (!project.name) return;
  document.getElementById('hostTitle').textContent = `${project.name} — GitHub Copilot`;
  document.querySelectorAll('[data-project-folder]').forEach((n) => { n.textContent = `📁 ${project.name}`; });
  document.querySelectorAll('#winHost [data-project-name]').forEach((n) => { n.textContent = project.name; });
}

window.addEventListener('host-changed', labelHost);

function openInCopilot(name, path) {
  project = { name, path };

  const item = dockItem('copilotProject');
  if (!handedOver) {
    item.classList.add('landing');
    setTimeout(() => item.classList.remove('landing'), 600);
  }
  item.classList.remove('tucked');

  setHost('copilotProject');
  labelHost();
  focusWin('host');
  syncDock();

  if (handedOver) return;
  handedOver = true;
  writeWelcome(name, path);
}

document.getElementById('openCopilot').addEventListener('click', () => {
  openInCopilot(projName.value.trim() || 'customer-portal', projFolder.value || '');
});
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
