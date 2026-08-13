/* ------------------------------------------------------------------
   EAI Setup app flow.

   Where the npx flow hands you a command, this one hands you an app:
   download from the site → the disk image opens → drag it to Applications
   → open it → sign in in the browser → name the app and pick a folder →
   initialise → Copilot opens on the new project, ready for /eai.
------------------------------------------------------------------- */

const setupWin = document.getElementById('winSetup');
const dmgWin = document.getElementById('winDmg');
const dmgApp = document.getElementById('dmgApp');
const dmgTarget = document.getElementById('dmgApplications');
const dmgHint = document.getElementById('dmgHint');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================ 1. INSTALL ========================== */

let installed = false;

// A finished download opens the disk image, the way Safari does.
setDownloadHandler(() => {
  setTimeout(() => { resetDmg(); focusWin('dmg'); }, 420);
  return 'handled';
});

function resetDmg() {
  installed = false;
  dmgApp.style.transform = '';
  dmgApp.hidden = false;
  dmgTarget.classList.remove('over', 'filled');
  dmgHint.textContent = 'Drag EAI Setup onto the Applications folder — or double-click it.';
}

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

const runLines = document.getElementById('runLines');
const runBar = document.getElementById('runBar');

// A fixed clock: the prototype can't use the real one and stay reproducible.
let clock = 21 * 3600 + 55 * 60 + 42;
function stamp() {
  clock += 2 + Math.round(clock % 3);
  const h = Math.floor(clock / 3600) % 24;
  const m = Math.floor((clock % 3600) / 60);
  const s = clock % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${suffix}`;
}

function logLine(status, message) {
  const row = document.createElement('div');
  row.className = 'run-line';
  row.innerHTML = `<span class="t">${stamp()}</span><span class="s ${status.toLowerCase()}">${status}</span><span class="m">${message}</span>`;
  runLines.prepend(row);
}

document.getElementById('createApp').addEventListener('click', async () => {
  const name = projName.value.trim() || 'customer-portal';
  const folder = projFolder.value.trim();
  const status = document.getElementById('startStatus');

  if (!folder) {
    status.textContent = 'Choose a parent folder first.';
    return;
  }

  projName.value = name;
  showScreen('running');
  runLines.replaceChildren();
  document.getElementById('runResult').textContent = '';

  const path = `${folder}/${name}`;
  const steps = [
    ['UPDATE', 'Opening secure sign-in: your browser handles EAI authentication. The installer never sees your password.', 12],
    ['READY', 'Sign-in complete: continuing to app setup.', 24],
    ['READY', 'Folder selected: your app will be created in this folder.', 36],
    ['UPDATE', `Creating your EAI app: initialising <b>${escapeHtml(name)}</b> and fetching the supported Gofer assets.`, 52],
    ['WORKING', 'Installing the EAI CLI and the EAI app template.', 68],
    ['READY', 'Tenant connected: Northwind Group (AU).', 82],
    ['READY', `App created at <b>${escapeHtml(path)}</b>.`, 94],
    ['READY', 'Opening GitHub Copilot with your project folder.', 100],
  ];

  for (const [state, message, pct] of steps) {
    logLine(state, message);
    runBar.style.width = `${pct}%`;
    await wait(700);
  }

  // finished
  document.getElementById('runSpin').classList.add('done');
  document.getElementById('runSpin').textContent = '✅';
  document.getElementById('runTitle').lastChild.textContent = ' App ready';
  document.getElementById('runSub').textContent = `${name} is set up and connected to your tenant.`;
  document.getElementById('runState').textContent = 'Done';
  document.getElementById('runElapsed').textContent = 'Finished in 24s';
  document.getElementById('runResult').textContent = 'Completed';

  const openBtn = document.getElementById('openCopilot');
  openBtn.hidden = false;
  await wait(900);
  openInCopilot(name, path);
});

/* ==================== 5. HAND OVER TO COPILOT ====================== */

let handedOver = false;

function openInCopilot(name, path) {
  const item = dockItem('copilotProject');
  item.classList.remove('tucked');
  if (!handedOver) {
    item.classList.add('landing');
    setTimeout(() => item.classList.remove('landing'), 600);
  }

  setHost('copilotProject');
  document.getElementById('hostTitle').textContent = `${name} — Visual Studio Code`;
  focusWin('host');
  syncDock();

  // Point the explorer and the README at the folder that was just created.
  document.querySelectorAll('[data-project-folder]').forEach((n) => { n.textContent = `▾ ${name.toUpperCase()}`; });
  document.querySelectorAll('[data-project-name]').forEach((n) => { n.textContent = name; });

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
    // Reaching /eai is the finish line for this experiment.
    setTimeout(endOfExperiment, 700);
  }
}
