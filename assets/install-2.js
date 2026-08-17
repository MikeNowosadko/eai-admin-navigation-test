/* ------------------------------------------------------------------
   EAI Setup, one question at a time — at /install-2.

   The same journey as /install, drawn from the flow on the board:

     download the app
     install it        ← Node, Git, npm and the EAI CLI come down here,
                         behind the scenes. Nothing is shown unless one
                         of them fails
     log in / create account
     choose a workspace
     choose an app name
     choose a folder
     eai init          ← the template lands in that folder
     /eai inside your tool

   Two things make it simpler than /install, and they pull in opposite
   directions on purpose:

   1. The prerequisites disappear. /install opens on a checklist of four
      green ticks, which is four lines of reassurance about work the user
      never asked to see. Here it happens during the app install and is
      only ever mentioned when it breaks — which is the only time it is
      the user's problem. ⌘K has that state.

   2. Every screen asks one thing. /install puts name, folder and coding
      app on a single screen; this asks them one at a time, and adds the
      workspace question the real installer has and /install skipped.

   So it is fewer decisions per screen and more screens — the trade the
   two prototypes exist to settle. Both end in the same place: Copilot,
   open on the new project, at the /eai prompt.

   Sections 1 and 3 and the hand-off are /install's, unchanged.
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


/* ================= 2. THE PREREQUISITES, BEHIND THE SCENES ========= */

/* Node, Git, npm and the EAI CLI. In /install these are a checklist you
   read before signing in. Here they come down while the app is being
   copied to Applications, and the user is told nothing — there is
   nothing they can do about it, and it finishes before they have found
   the icon in the dock.

   The state that matters is the failure. ⌘K → "Prereq install failed"
   is that screen: what broke, and the one thing that fixes it. */

const PREREQS = ['Node.js', 'Git', 'npm', 'EAI CLI'];
let prereqsReady = false;

function installPrereqsQuietly() {
  // No UI. The only reason this exists as a function is so the failure
  // state has something true to contradict.
  setTimeout(() => { prereqsReady = true; }, 1200);
}

/* ============================ 3. SIGN IN ========================== */

/** Five screens now, and only one is ever visible. */
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
  renderWorkspaces();
  showScreen('workspace');
  focusWin('setup');
}

document.getElementById('setupSignin').addEventListener('click', signIn);
document.getElementById('setupCreate').addEventListener('click', signIn);

/* ======================= 4. CHOOSE A WORKSPACE ===================== */

/* The question /install never asked and the real installer does: which
   company workspace owns this app. Two here, so the choice is real —
   with one, the installer picks it and says so rather than asking. */

const WORKSPACES = [
  { id: 'northwind', name: 'Northwind Group', meta: 'Australia · 240 people' },
  { id: 'northwind-retail', name: 'Northwind Retail', meta: 'Australia · 60 people' },
];

const wsRows = document.getElementById('wsRows');
let chosenWorkspace = WORKSPACES[0].id;

function renderWorkspaces() {
  wsRows.replaceChildren();
  WORKSPACES.forEach((ws) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'eai-row pick';
    row.dataset.ws = ws.id;
    row.innerHTML = `<i class="mk ${ws.id === chosenWorkspace ? 'done' : 'pending'}">${ws.id === chosenWorkspace ? '&#10003;' : ''}</i>`
      + `<span class="lbl">${escapeHtml(ws.name)}</span>`
      + `<span class="val">${escapeHtml(ws.meta)}</span>`;
    row.addEventListener('click', () => {
      chosenWorkspace = ws.id;
      renderWorkspaces();
    });
    wsRows.appendChild(row);
  });
}

function workspaceName() {
  return (WORKSPACES.find((w) => w.id === chosenWorkspace) || WORKSPACES[0]).name;
}

document.getElementById('wsBack').addEventListener('click', () => showScreen('signin'));
document.getElementById('wsNext').addEventListener('click', () => {
  showScreen('name');
  document.getElementById('projName').focus();
});

/* ======================== 5. NAME THE APP ========================== */

const projName = document.getElementById('projName');
const projFolder = document.getElementById('projFolder');

document.getElementById('nameBack').addEventListener('click', () => showScreen('workspace'));

document.getElementById('nameNext').addEventListener('click', () => {
  const name = projName.value.trim();
  if (!name) {
    setFieldError('name', 'Give the app a name — it becomes the folder too.');
    return;
  }
  clearFieldError('name');
  labelProject();
  showScreen('folder');
});

// Typing resolves whatever the error was about, so it shouldn't linger.
projName.addEventListener('input', () => clearFieldError('name'));

/** The name is shown on the folder screen, so keep the two in step. */
function labelProject() {
  const name = projName.value.trim() || 'your app';
  document.querySelectorAll('[data-project-name]').forEach((n) => { n.textContent = name; });
}

/* ======================= 6. CHOOSE A FOLDER ======================== */

document.getElementById('folderBack').addEventListener('click', () => showScreen('name'));
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


/* ==================== 7. eai init, INTO THAT FOLDER ================ */

/* The flow board calls this "run eai init to download app template into
   selected folder", so the rows say that rather than talking about
   tenants and CLIs — the CLI was installed an hour ago as far as the
   user is concerned, and they never saw it. */

const runLines = document.getElementById('runLines');

function runSteps(path) {
  return [
    ['Workspace connected', workspaceName()],
    ['Folder created', shortPath(path)],
    ['App template downloaded', 'eai init'],
    ['Dependencies installed', 'in progress'],
  ];
}

/** ~/Downloads/thing reads better than /Users/gareth/Downloads/thing. */
function shortPath(path) {
  return path.replace(/^\/Users\/[^/]+/, '~');
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

document.getElementById('folderNext').addEventListener('click', async () => {
  const name = projName.value.trim() || 'customer-portal';
  const folder = projFolder.value.trim();

  if (!folder) {
    setFieldError('folder', 'Pick where the app should live before we create it.');
    return;
  }
  clearAllFieldErrors();

  projName.value = name;
  const path = `${folder}/${name}`;

  document.getElementById('runTitle').textContent = `Creating ${name}`;
  document.getElementById('runSub').textContent = 'Downloading the app template into your folder.';

  const openBtn = document.getElementById('openCopilot');
  openBtn.textContent = 'Create app';
  openBtn.disabled = true;

  document.getElementById('runNote').hidden = true;
  document.getElementById('runBack').textContent = 'Back';

  showScreen('running');
  runLines.replaceChildren();

  const rows = runSteps(path).map(([label, value]) => addRow(label, value));

  for (let i = 0; i < rows.length; i += 1) {
    setRowState(rows[i], 'active');
    await wait(850);
    markDone(rows[i], i === rows.length - 1 ? 'ready' : undefined);
  }

  document.getElementById('runSub').textContent = `${name} is ready in ${shortPath(path)}.`;
  openBtn.textContent = 'Open in GitHub Copilot';
  openBtn.disabled = false;

  await wait(700);
  openInCopilot(name, path);
});

document.getElementById('runBack')?.addEventListener('click', () => showScreen('folder'));

/* ==================== 8. HAND OVER TO COPILOT ====================== */

let handedOver = false;
let project = { name: '', path: '' };

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

/* The prerequisites are silent right up until they aren't, so the first
   of these is the one this variation exists to get right: the user has
   installed an app, opened it, and is being told about a dependency
   they never knew it had. Name the actor, say the one thing that fixes
   it, and keep the journey open. */

const FAILURES = {
  prereq() {
    prereqsReady = false;
    showScreen('signin');
    document.querySelector('[data-screen="signin"] .eai-head p').textContent =
      'One thing EAI needs could not be installed.';
    document.getElementById('signinNoteTitle').textContent = 'Apple needs your approval to install Git';
    document.getElementById('signinNoteBody').textContent =
      'macOS blocked the Command Line Tools install, so Git is missing. Open it from the App Store prompt, '
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
    showScreen('workspace');
    document.querySelector('[data-screen="workspace"] .eai-head p').textContent =
      'This account has no workspace to build in yet.';
    document.getElementById('wsNote').hidden = false;
    document.getElementById('wsNext').classList.add('off');
  },

  name() {
    if (!projName.value) projName.value = 'contract-renewals';
    showScreen('name');
    setFieldError('name',
      `A folder called ${projName.value} already exists in /Users/gareth/Downloads. `
      + 'Pick another name, or choose a different folder.');
    document.querySelector('[data-screen="name"] .eai-head p').textContent =
      'That name is already taken in the folder you picked.';
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
    document.getElementById('runBack').textContent = 'Open logs';
    const retry = document.getElementById('openCopilot');
    retry.textContent = 'Retry this step';
    retry.disabled = false;
  },
};

/** Put every screen back the way it started. */
function clearFailures() {
  prereqsReady = true;

  document.querySelector('[data-screen="signin"] .eai-head p').textContent =
    "Sign in, or create an account if you don't have one yet.";
  document.getElementById('signinNote').hidden = true;
  document.getElementById('signinNoteTitle').textContent = "Can't reach api.eai.com";
  document.getElementById('signinNoteBody').textContent =
    'Your network blocked the request, or EAI is unreachable from here. Check your connection or VPN, then retry.';
  document.getElementById('setupCreate').textContent = 'Create an EAI account';
  document.getElementById('setupSignin').classList.remove('off');

  document.querySelector('[data-screen="workspace"] .eai-head p').textContent =
    'Where this app is managed, and who it belongs to.';
  document.getElementById('wsNote').hidden = true;
  document.getElementById('wsNext').classList.remove('off');
  renderWorkspaces();

  clearAllFieldErrors();
  document.querySelector('[data-screen="name"] .eai-head p').textContent = 'The name your team will see.';

  document.getElementById('runNote').hidden = true;
  document.getElementById('runBack').textContent = 'Back';
  document.getElementById('runTitle').textContent = 'Creating your EAI app';
  document.getElementById('runSub').textContent = 'Downloading the app template into your folder.';
  document.getElementById('openCopilot').textContent = 'Create app';
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
