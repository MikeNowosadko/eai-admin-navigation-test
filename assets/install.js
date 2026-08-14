/* ------------------------------------------------------------------
   EAI app install — the prototype where getting the app onto the
   machine gets improved, at /install.

   Started life as a copy of the setup-app study (/setup), which is
   finished and keeps its URL. This is the mutable one: change it here
   and that study stays as it was when people used it.

   The journey, end to end: marketing site → install button → the disk
   image opens → drag it to Applications → open it → sign in in the
   browser → name the app and pick a folder → initialise → Copilot
   opens on the new project, ready to build.

   It starts at the marketing site rather than a search: whether people
   can find EAI is the onboarding study's question, already answered.
   It ends at "ready to build", where /cli picks up.

   Starting a new iteration? Copy the folder — install/ to install-2/,
   plus a journey file beside this one — so the old one keeps its URL.
------------------------------------------------------------------- */

const setupWin = document.getElementById('winSetup');
const dmgWin = document.getElementById('winDmg');
const dmgApp = document.getElementById('dmgApp');
const dmgTarget = document.getElementById('dmgApplications');
const dmgHint = document.getElementById('dmgHint');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================ 1. INSTALL ========================== */

let installed = false;

// A finished download lands in Downloads and stops there. Safari can be set
// to open safe files automatically, but it isn't by default any more — and
// whether people find their way from the badge to the disk image on their own
// is exactly what this prototype should be testing, not papering over.
setDownloadHandler(() => 'handled');

// Opening it is the user's move: click the Downloads stack. Captured on the
// dock so desktop.js's own "nothing to see here" handler never runs.
document.querySelector('.dock')?.addEventListener('click', (e) => {
  if (!e.target.closest('.item[data-app="downloads"]')) return;
  if (!downloadCount) return;               // nothing downloaded yet
  e.stopPropagation();
  const badge = document.querySelector('.dock .item[data-app="downloads"] .badge');
  if (badge) badge.hidden = true;
  resetDmg();
  focusWin('dmg');
  syncDock();
}, true);

function resetDmg() {
  installed = false;
  dmgApp.style.transform = '';
  dmgApp.hidden = false;
  dmgTarget.classList.remove('over', 'filled');
  dmgHint.textContent = 'Drag EAI Setup onto the Applications folder — or double-click it.';
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
  dmgHint.textContent = 'Copied to Applications.';

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

/** The app has three screens; only one is ever visible. */
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function chooseFolder() {
  if (!selected) return;
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

/* Frame 1GL-0 has no progress bar, no timestamps and no "recent activity"
   header — it reuses the same row component as the sign-in checks, ticking
   each line as it lands. So the run is a fixed list of rows that start
   pending and turn done in order, rather than a log that grows. */

const runLines = document.getElementById('runLines');

function runSteps(name, path) {
  return [
    ['Tenant connected', 'Northwind Group'],
    ['Project folder created', shortPath(path)],
    ['EAI CLI installed', 'v2.4.0'],
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

document.getElementById('createApp').addEventListener('click', async () => {
  const name = projName.value.trim() || 'customer-portal';
  const folder = projFolder.value.trim();
  const status = document.getElementById('startStatus');

  if (!folder) {
    status.hidden = false;
    status.textContent = 'Choose a parent folder first.';
    return;
  }
  status.hidden = true;

  projName.value = name;
  const path = `${folder}/${name}`;

  document.getElementById('runTitle').textContent = `Creating ${name}`;
  document.getElementById('runSub').textContent = 'Setting up the project and connecting your tenant.';

  const openBtn = document.getElementById('openCopilot');
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
  openBtn.textContent = 'Open in GitHub Copilot';
  openBtn.disabled = false;

  await wait(700);
  openInCopilot(name, path);
});

// Both Back buttons step the flow back rather than doing nothing.
document.getElementById('startBack')?.addEventListener('click', () => showScreen('signin'));
document.getElementById('runBack')?.addEventListener('click', () => showScreen('start'));

// "Change app" is display-only in the design; say so rather than fake it.
document.getElementById('changeApp')?.addEventListener('click', () => {
  coach('Your coding app', 'Only GitHub Copilot is wired up in this prototype.');
  setTimeout(hideCoach, 2400);
});

/* ==================== 5. HAND OVER TO COPILOT ====================== */

let handedOver = false;

let project = { name: '', path: '' };

/** Name the workspace after the project, however Copilot got opened. */
function labelProject() {
  if (!project.name) return;
  document.getElementById('hostTitle').textContent = `${project.name} — GitHub Copilot`;
  document.querySelectorAll('[data-project-folder]').forEach((n) => { n.textContent = `📁 ${project.name}`; });
  document.querySelectorAll('[data-project-name]').forEach((n) => { n.textContent = project.name; });
}

// setHost rebuilds the chrome from a static template, so re-apply the naming
// whenever it happens — including when Copilot is reopened from the dock.
window.addEventListener('host-changed', labelProject);

function openInCopilot(name, path) {
  project = { name, path };

  const item = dockItem('copilotProject');
  if (!handedOver) {
    item.classList.add('landing');
    setTimeout(() => item.classList.remove('landing'), 600);
  }
  item.classList.remove('tucked');

  setHost('copilotProject');
  labelProject();
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

/* ========================= 6. ERROR STATES ========================= */

/* Three failures worth designing for, each a different kind: the machine
   (no network), the input (name already taken), and the organisation (no
   permission to read the asset library) — the last being the one nothing
   here can fix on its own.

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
    const err = document.getElementById('nameErr');
    err.querySelector('span').textContent =
      `A folder called ${projName.value} already exists in /Users/gareth/Downloads. `
      + 'Pick another name, or choose a different folder.';
    err.hidden = false;
    document.querySelector('[data-screen="start"] .eai-head p').textContent =
      'That name is already taken in this folder.';
    document.getElementById('createApp').classList.add('off');
  },

  running() {
    showScreen('running');
    runLines.replaceChildren();
    markDone(addRow('Tenant connected', 'Northwind Group'));
    markDone(addRow('Project folder created', '~/Downloads/contract-renewals'));
    markDone(addRow('EAI CLI installed', 'v2.4.0'));

    const row = addRow('Fetching Gofer assets', 'failed');
    row.className = 'eai-row failed';
    row.querySelector('.mk').className = 'mk fail';
    row.querySelector('.mk').innerHTML = '&#10005;';

    document.getElementById('runTitle').textContent = "Couldn't finish creating contract-renewals";
    document.getElementById('runSub').textContent =
      'Three steps completed. The last one failed, so nothing was left half-written.';
    document.getElementById('runNote').hidden = false;
    document.getElementById('runBack').textContent = 'Open logs';
    const retry = document.getElementById('openCopilot');
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

  document.getElementById('nameErr').hidden = true;
  document.querySelector('[data-screen="start"] .eai-head p').textContent =
    'Name your app and choose where it lives.';
  document.getElementById('createApp').classList.remove('off');

  document.getElementById('runNote').hidden = true;
  document.getElementById('runBack').textContent = 'Back';
  document.getElementById('runTitle').textContent = 'Creating your EAI app';
  document.getElementById('runSub').textContent = 'Setting up the project and connecting your tenant.';
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
