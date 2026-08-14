/* ------------------------------------------------------------------
   EAI Setup, as the CLI flow's starting point.

   The setup-app study (/setup) covers finding and installing this app.
   Here it's already in Applications and open on the desktop, because
   what this prototype is about starts after that: sign in, create the
   app, and hand over to whichever coding app you use.

   Sign in → name it, choose a folder → initialise → hand over.
   Everything after the hand-off is cli.js.

   The folder chooser and the initialise log are lifted from setup.js.
   The two flows have separate copies on purpose — /setup is finished
   and shouldn't move when this one does.
------------------------------------------------------------------- */

const setupWin = document.getElementById('winSetup');
const projName = document.getElementById('projName');
const projFolder = document.getElementById('projFolder');
const projHost = document.getElementById('projHost');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** What each coding app is called, on the button and in the log. */
const HOST_LABELS = {
  copilot: 'GitHub Copilot',
  claude: 'Claude Code',
  terminal: 'Terminal',
  vscode: 'Visual Studio Code',
  codex: 'Codex',
  gemini: 'Gemini CLI',
};

/* --- boot: the app is open, nothing else is --------------------------- */

// desktop.js opens Safari on boot, which is right for a flow that starts at a
// Google search. This one starts at an app that's already installed.
hideWin('browser');
focusWin('setup');
syncDock();
setTimeout(() => projName.focus(), 100);

/* ============================ 1. SIGN IN ========================== */

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
  await pause(1100);
  hideWin('browser');
  showScreen('start');
  focusWin('setup');
  syncDock();
  projName.focus();
}

document.getElementById('setupSignin').addEventListener('click', signIn);
document.getElementById('setupCreate').addEventListener('click', signIn);

/* ================== 2. NAME IT, PICK A FOLDER ===================== */

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

/* ======================== 3. INITIALISE =========================== */

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

// The hand-off button names the app you picked, as soon as you pick it.
const openBtn = document.getElementById('openHost');
projHost.addEventListener('change', () => {
  openBtn.textContent = `Open in ${HOST_LABELS[projHost.value]}`;
});

document.getElementById('createApp').addEventListener('click', async () => {
  const name = projName.value.trim() || 'customer-portal';
  const folder = projFolder.value.trim();
  const status = document.getElementById('startStatus');

  if (!folder) {
    status.textContent = 'Choose a parent folder first.';
    return;
  }

  const host = projHost.value;
  const hostLabel = HOST_LABELS[host];
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
    ['READY', `Opening ${escapeHtml(hostLabel)} with your project folder.`, 100],
  ];

  for (const [state, message, pct] of steps) {
    logLine(state, message);
    runBar.style.width = `${pct}%`;
    await pause(700);
  }

  document.getElementById('runSpin').classList.add('done');
  document.getElementById('runSpin').textContent = '✅';
  document.getElementById('runTitle').lastChild.textContent = ' App ready';
  document.getElementById('runSub').textContent = `${name} is set up and connected to your tenant.`;
  document.getElementById('runState').textContent = 'Done';
  document.getElementById('runElapsed').textContent = 'Finished in 24s';
  document.getElementById('runResult').textContent = 'Completed';

  openBtn.textContent = `Open in ${hostLabel}`;
  openBtn.hidden = false;
  await pause(900);
  handOver(host, name, path);
});

/* ==================== 4. HAND OVER TO THE CLI ===================== */

/** Name the window and the sidebar after the project, whenever the skin is rebuilt. */
function labelProject() {
  if (!cliProject.name) return;
  // Which app you're in now, not the one you picked during setup — the dock
  // switches between them and the title bar has to keep up.
  const app = desktop.wins.host.dataset.app;
  document.getElementById('hostTitle').textContent = `${cliProject.name} — ${HOST_LABELS[app] || HOST_LABELS[cliProject.host]}`;
  document.querySelectorAll('[data-project-folder]').forEach((n) => { n.textContent = `📁 ${cliProject.name}`; });
  document.querySelectorAll('[data-project-name]').forEach((n) => { n.textContent = cliProject.name; });
  document.querySelectorAll('[data-project-dir]').forEach((n) => { n.textContent = cliProject.name; });
}

// setHost rebuilds the chrome from a static template, so re-apply the naming
// whenever it happens — including when the app is reopened from the dock.
window.addEventListener('host-changed', labelProject);

/** Setup is done: open the coding app on the new project and start the CLI. */
function handOver(host, name, path) {
  cliProject.host = host;
  cliProject.name = name;
  cliProject.path = path;

  hideWin('setup');
  setHost(host);
  labelProject();
  focusWin('host');
  syncDock();
  startCli();
}

document.getElementById('openHost').addEventListener('click', () => {
  handOver(projHost.value, projName.value.trim() || 'customer-portal', projFolder.value || '');
});

// ⌘K → skip setup. Seeing the app once is enough; the CLI is the point.
document.getElementById('skipSetup').addEventListener('click', () => {
  toggleSheet(false);
  handOver('copilot', 'customer-portal', '/Users/gareth/Downloads/customer-portal');
});
