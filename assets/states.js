/* ------------------------------------------------------------------
   EAI Setup — the state machine.

   Every screen the setup app can be on, every way each of them can
   break, and the two facts about the machine that change what the last
   screen even looks like. One page, one control rail, one live app.

   **The app on the right is not a drawing of the app.** It is the app:
   `#winSetup` is lifted out of /signup at load, markup and stylesheets
   and all, and this file only ever sets state on it. So a change to the
   sign-in screen in /signup shows up here on the next reload, and
   nothing on this page can drift away from what testers are given.

   What this file owns is the *state*, and it owns it in one direction
   only. `paint()` resets the window to its base and then applies the
   current selection from scratch — there is no "undo the failure"
   path, because nothing is ever half-applied. That is the whole reason
   this exists as its own page rather than as more ⌘K entries: ⌘K
   mutates a running flow and has to remember how to put it back, and
   the list of things it has to remember is the list of bugs.

   The rail is three questions, and only the first one is about screens:

     Screen      · which of the seven
     State       · working, or the specific thing that broke
     This Mac    · is there a harness on it — the question the last
                   screen exists to answer

   "This Mac" only reaches the harness screens, so the rail offers it
   only there. Workspace standard is out of scope — /install-4 explores
   it; self-serve signup shows the full list and everyone picks.

   State is a list rather than one answer: two things can be wrong at
   once, and the screen that has to hold both is a different screen from
   either on its own.
------------------------------------------------------------------- */

/* ===================== 1. WHAT THE APP KNOWS ======================
   The same fixtures /signup runs on. Values that appear in more than
   one screen live here so the machine tells one story end to end. */

const ACCOUNT = 'gareth@northwind.com';
const WORKSPACE = { name: 'Northwind Group', meta: 'Australia · just created' };
const PROJECT = { name: 'contract-renewals', path: '~/Downloads/contract-renewals' };

const PREREQS = [
  ['Node.js', 'v24.3.0'],
  ['Git', '2.46.0'],
  ['npm', '10.9.0'],
  ['EAI CLI', 'v2.4.0'],
];

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

const HARNESSES = [
  { id: 'claude', name: 'Claude Code', account: 'Anthropic', site: 'claude.com/product/claude-code', version: 'v2.1.4' },
  { id: 'copilot', name: 'GitHub Copilot', account: 'GitHub', site: 'github.com/features/copilot' },
  { id: 'codex', name: 'Codex', account: 'OpenAI', site: 'openai.com/codex' },
  { id: 'gemini', name: 'Gemini CLI', account: 'Google', site: 'geminicli.com' },
  { id: 'vscode', name: 'VS Code', account: 'GitHub Copilot', site: 'code.visualstudio.com' },
];

/* Lifted from signup.js. Six tools rendered as six lines of text was the
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
};

const TICK_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SPINNER = '<s></s><s></s><s></s><s></s><s></s><s></s><s></s><s></s>';

const SUB_INSTALLED = 'Claude Code is already on this Mac. Pick it, or use something else.';
const SUB_EMPTY = "None of these are on this Mac yet. Pick the one you'd like and we'll send you to its makers.";

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ======================= 2. THE STATE ITSELF ======================

   Four fields, and everything on screen is a function of them. Nothing
   else is remembered between paints, which is what makes a state here
   reachable by URL as well as by clicking.

   `faults` is a list, not one id. Things do not break politely one at a
   time: a Mac that could not install Git is often a Mac behind the
   proxy that is also blocking api.eai.com, and the screen that has to
   hold both is a different screen from either on its own. A tool that
   can only show one failure at a time cannot be used to ask whether the
   second one fits. */

const state = {
  screen: 'signin',
  faults: [],       // empty = working; otherwise fault ids owned by the screen
  mac: 'installed', // installed · none · waiting
  harnessPick: 'claude',
  stage: 99,        // how far through a screen that has stages; clamped on read
};

/* ==================== 3. THE SEVEN SCREENS =======================

   In flow order, which is the only order they happen in — left and
   right walk this array.

   `note` is what the screen is for, in one line — the thing a reviewer
   needs before they can say whether the design is right. `uses` names
   the controls the screen actually reads, and is what decides whether
   the rail offers them.

   `faults` is the honest list of ways each screen breaks. Screens with
   an empty list are the ones with nothing to get wrong, and saying so
   is worth more than leaving them off. Each fault carries `out`: how
   somebody gets past it, which is the thing a picture of an error can
   never show and half of these do not have.

   Faults combine unless the screen says they cannot. `exclusive: true`
   means two of them could not be true at the same moment — not that we
   would rather not draw it — and the rail offers radios there instead
   of checkboxes, because a checkbox that unchecks its neighbour is a
   control lying about the model underneath it. */

const SCREENS = [
  /* Before the app exists there is a Finder window, and it is the first
     thing EAI ever shows anybody. It is also the only screen here that
     is not the setup app: a disk image is macOS's window, borrowed, and
     the only things in it we chose are a wordmark, two icons and one
     sentence. Worth reviewing beside the rest precisely because it is
     the one screen where we have almost no control and the whole job is
     making a drag obvious. */
  {
    id: 'dmg',
    name: 'Disk image',
    window: 'dmg',
    height: 566,
    note: 'The downloaded .dmg, opened. Not the app — a Finder window with our wordmark in it, where the entire design is making one drag obvious. The opening is a sequence: the wordmark lands, lifts into a title, and the icons arrive under it.',
    uses: ['stage'],
    stageLabel: 'Moment',
    stages: [
      ['Opening', 'opening'],
      ['Ready to drag', 'ready'],
      ['Over Applications', 'over'],
      ['Copied', 'copied'],
    ],
    faults: [],
  },
  {
    id: 'signin',
    name: 'Sign in',
    note: 'The app opens here. One status, with two faces: a tick saying the Mac is ready, or a row for each thing in the way. Never both — "ready" is a claim that sign-in can proceed, so nothing that stops it may sit beside it.',

    /* The one screen where two things can be wrong at once, which is why
       it is the one worth ticking two boxes on. Both come from the same
       kind of machine — a locked-down laptop behind a proxy — so the
       pair is not a contrived combination, it is the likely one. */
    comboHead: 'Two things are in the way.',
    combo: 'A managed Mac that would not let Git install is often the same Mac that cannot reach api.eai.com. Two rows, one list, and one Retry that has to be honest about fixing two different things.',

    faults: [
      {
        id: 'prereq',
        name: 'A prerequisite would not install',
        // Chronologically first: this happens while the app is being copied
        // to Applications, before anyone presses anything.
        head: 'One thing EAI needs could not be installed.',
        problem: [
          'Apple needs your approval to install Git',
          'macOS blocked the Command Line Tools install, so Git is missing. Approve it from the prompt macOS showed, '
            + 'or run xcode-select --install in Terminal, then choose Retry. Nothing else is waiting on it.',
        ],
        note: 'macOS blocked the Command Line Tools install, so the quiet fix-up could not finish. The row takes the tick\u2019s place rather than sitting under it — the app cannot call itself ready and refuse to continue in the same breath.',
        out: 'Approve the prompt macOS showed, or run xcode-select --install, then Retry.',
      },
      {
        id: 'network',
        name: 'Cannot reach EAI',
        head: "Sign-in needs a connection to EAI, and this Mac can't reach it.",
        problem: [
          "Can't reach api.eai.com",
          'Your network blocked the request, or EAI is unreachable from here. Check your connection or VPN, then Retry.',
        ],
        note: 'Sign-in is the first thing that needs the network, so this is where a VPN or a blocked domain shows up. It replaces the tick for the same reason: a Mac that cannot reach us is not ready to sign in, whatever is installed on it.',
        out: 'Fix the connection or the VPN, then Retry.',
      },
    ],
  },
  {
    id: 'welcome',
    name: 'Signed in',
    note: 'A beat, not a screen, on the happy path — nobody acts on it, it confirms what just happened and hands its title to the form behind it. It is also the only screen that reports on something the app does not control, so it is the one that has to say when the browser never came back.',
    faults: [
      {
        id: 'callback',
        name: "The browser didn't come back",
        head: "Sign-in didn't finish",
        note: 'The app waits on a tab it cannot see — closed early, expired, or a callback eaten by a proxy. Try again is the primary because the usual cause is a closed tab; the link is for when pressing it again does the same nothing twice.',
        out: 'Try again, or take the link to the browser yourself.',
      },
    ],
  },
  {
    id: 'setup',
    name: 'Set up',
    note: 'Four questions on one page, revealed downwards as each is answered, with no Continue between them. No numerals and no ticks: the answer sits under its own heading, so a tick saying "answered" is reporting something already on screen. Back and Create app hold the bottom rail from the first question.',

    /* Setup is not one state, it is four.

       The screen reveals downwards: answer a question and the next one
       appears under it, so "Set up" means any of four shapes depending
       on how far somebody has got. Showing only the finished one — every
       question answered, every tick green — hides the three a real
       person spends most of their time looking at, and those are the
       ones where the reveal either feels like progress or feels like the
       form growing under their hands.

       Matches the four frames in Paper's "Get set up · progressive
       reveal", including where it starts: the workspace is already
       answered on arrival, because there is only one and a question with
       one possible answer is not a question. */
    uses: ['stage'],
    stageLabel: 'Answered so far',
    // Named as Paper names them — what has just appeared, rather than what
    // has been done. It is the reveal that is being reviewed.
    stages: [
      ['Workspace only', 'workspace'],
      ['Name appears', 'name'],
      ['Location — choose', 'folder-choose'],
      ['Location — chosen', 'folder-chosen'],
    ],

    /* These two genuinely cannot co-occur. With no workspace, questions
       two to four never appear — so there is no name to have been taken
       yet, and no screen on which to say so. */
    exclusive: true,
    why: "One at a time: with no workspace, there's no name field to have a name taken in.",

    faults: [
      {
        id: 'workspace',
        name: 'No workspace for this account',
        note: 'The account exists but belongs to nobody. Everything below question one stays down, because there is nothing to answer it about.',
        out: 'Nothing they can do here — an EAI admin adds them, then they sign in again.',
      },
      {
        id: 'name',
        name: 'That name is taken',
        note: 'A folder of that name already exists where they pointed us. Caught in the field, before anything is written.',
        out: 'Type a different name and it clears — no retry, because nothing was attempted.',
      },
    ],
  },
  {
    id: 'running',
    name: 'Creating',
    note: 'eai init, said in the words of the flow board — workspace, folder, template, dependencies — rather than tenants and CLIs.',
    faults: [
      {
        id: 'init',
        name: 'The template would not download',
        note: 'The tenant is connected but this account cannot read the asset library. The screen has to say what was left behind: an empty folder, and nothing half-written.',
        out: 'An EAI admin grants the asset library, then Retry this step.',
      },
    ],
  },
  {
    id: 'done',
    name: 'Choose a harness',
    note: 'Everyone picks for themselves — there is no workspace standard in self-serve signup (/install-4 explores that separately). What changes is whether Claude Code is already on the Mac.',
    uses: ['mac', 'stage'],
    stageLabel: 'Selection',
    stages: [
      ['Claude · installed (no alert)', 'installed'],
      ['Claude · not on Mac (alert)', 'missing'],
      ['Copilot · not installed (alert)', 'other'],
    ],
    faults: [
      {
        id: 'install',
        name: 'Setup could not install it',
        note: 'npm refused to write to its global folder. The app is finished either way, which is the sentence that has to survive.',
        out: 'Get it from its makers instead — the button already offers that.',
      },
    ],
  },
  {
    id: 'handoff',
    name: 'Hand-off',
    note: 'One instruction, on its own screen, because it has to survive a trip into a window we do not control. Everything that is not "type /eai" was taken off it.',
    uses: ['mac'],
    faults: [],
  },
  {
    id: 'built',
    name: 'Built',
    note: 'The harness opened, /eai ran, and it came back. The only screen that is not the app — it lands on the desktop, over everything.',
    faults: [],
  },
];

function screen(id = state.screen) { return SCREENS.find((s) => s.id === id); }
function harness(id) { return HARNESSES.find((h) => h.id === id); }

/**
 * The faults in force, in the screen's own order.
 *
 * Ordered by the table rather than by the order they were ticked, so the
 * same set of boxes always draws the same screen. On sign-in that order
 * is chronological — the install-time failure above the one that only
 * happens when you press the button.
 */
function faults() {
  return screen().faults.filter((f) => state.faults.includes(f.id));
}

function broken(id) { return state.faults.includes(id); }

/**
 * How far through a staged screen we are, clamped to what it has.
 *
 * Held as a plain number and clamped on read rather than corrected on
 * write, so moving between two staged screens with different lengths —
 * the disk image has four moments, setup has four questions — never
 * needs the two to agree about what "3" means. A screen with no stages
 * ignores it entirely.
 */
function stage() {
  const stages = screen().stages;
  if (!stages) return 0;
  return Math.min(Math.max(1, state.stage), stages.length);
}

/** On the harness screen, stage presets map to mac + selection. */
function syncHarnessFromStage() {
  const view = screen().stages?.[stage() - 1]?.[1];
  const presets = {
    installed: { mac: 'installed', pick: 'claude' },
    missing: { mac: 'none', pick: 'claude' },
    other: { mac: 'none', pick: 'copilot' },
  };
  const p = presets[view];
  if (!p) return;
  state.mac = p.mac;
  state.harnessPick = p.pick;
}

/** Which harnesses are on the Mac, per the control rather than per a flag. */
function isInstalled(h) { return state.mac === 'installed' && h.id === 'claude'; }

/** The one the screen is talking about. Always Claude Code in this round. */
function subject() { return harness('claude'); }

/* ===================== 4. LIFTING THE REAL APP ====================

   /signup owns the markup. Fetching it means this page cannot fall
   behind: there is no second copy of the sign-in screen to update.

   The cost is that this page needs a server — `file://` will not fetch
   a sibling. Everything in this repo is run behind one already, and the
   catch at the bottom says which of the two things went wrong rather
   than guessing. */

const stageEl = document.getElementById('stage');

/* Two windows, because the journey uses two. `win` is the setup app and
   is what almost everything here drives; `dmgWin` is the disk image,
   which is a Finder window and shares none of the app's markup. Only one
   is on screen at a time — the screen says which. */
let win = null;
let dmgWin = null;

/** True once the markup is on the page, so a later crash isn't blamed on
    the fetch. The old catch reported everything as "you need a server",
    which is a lie the moment the server is running and the bug is mine. */
let lifted = false;

async function lift() {
  /* `no-store`, and it matters more here than anywhere else on this page.
     The whole claim is that this is the live app rather than a copy of
     it — but a cached response makes it a copy, just one nobody chose.
     A browser holding yesterday's /signup gives you yesterday's app with
     today's state code driving it, which fails as a missing element
     somewhere far from the cause. Ask for it fresh, every load. */
  const res = await fetch('../signup/index.html', { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ../signup/index.html`);

  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  const frame = stageEl.querySelector('.st-frame');

  /* Both windows, prepared identically: they were positioned on a
     desktop and here they fill the frame instead. */
  const take = (id) => {
    const node = doc.getElementById(id);
    if (!node) throw new Error(`no #${id} in signup/index.html`);
    node.removeAttribute('style');
    node.classList.remove('hidden');
    node.classList.add('focused');
    frame.appendChild(node);
    return node;
  };

  win = take('winSetup');
  dmgWin = take('winDmg');
  lifted = true;

  // The hand-off screen's player is drawn, not filmed, and mounts itself
  // from a global that eai-video.js hangs on the window.
  const film = win.querySelector('#harnessVideo');
  if (film && window.mountVideo) window.mountVideo(film, 'setup-app');
}

/**
 * An element of the lifted app, by id.
 *
 * Throws with the id in it rather than returning null. This page drives
 * markup it does not own, so the way it breaks is always the same: a
 * screen in /signup gains or loses an element and the state code reaches
 * for something that is no longer there. "Cannot read properties of
 * null" sends you hunting; "signup/index.html has no #welcomeMark" is
 * the answer.
 */
function el(id) {
  const node = win.querySelector(`#${id}`);
  if (!node) throw new Error(`signup/index.html has no #${id} — /states and /signup have drifted apart`);
  return node;
}

/** For the one box the app builds at runtime rather than ships in markup. */
function maybe(id) { return win.querySelector(`#${id}`); }

/** The same, for the disk image's window. */
function dmgEl(id) {
  const node = dmgWin.querySelector(`#${id}`);
  if (!node) throw new Error(`signup/index.html has no #${id} — /states and /signup have drifted apart`);
  return node;
}
function step(name) { return win.querySelector(`.i3-step[data-step="${name}"]`); }

/* ==================== 5. DRAWING THE PIECES ======================

   These are signup.js's renderers, kept to the same markup because the
   CSS that styles them is the same CSS. Where they differ it is only
   that these take their answer as an argument instead of reading a
   module-level variable — a renderer that cannot be asked "draw the
   other one" is a renderer you have to reset. */

/* One row either way. The happy path never enumerates what it checked,
   so the failure has no reason to either — it names the thing that is
   missing and says it is the only one. */
function renderCheck(problems = []) {
  const rows = el('checkRows');
  rows.replaceChildren();

  if (!problems.length) {
    const row = document.createElement('div');
    row.className = 'eai-row';
    row.innerHTML = '<i class="mk done">&#10003;</i>'
      + '<span class="lbl">This Mac is ready'
      + `<span class="sub">Checked ${PREREQS.length} things — ${PREREQS.map((p) => p[0]).join(', ')} — and installed what was missing.</span>`
      + '</span>';
    rows.appendChild(row);
    return;
  }

  problems.forEach(([title, body]) => {
    const row = document.createElement('div');
    row.className = 'eai-row failed';
    row.innerHTML = '<i class="mk fail bang">!</i>'
      + `<span class="lbl">${escapeHtml(title)}`
      + `<span class="sub">${escapeHtml(body)}</span>`
      + '</span>';
    rows.appendChild(row);
  });
}

function renderWorkspaces(chosen) {
  const rows = el('wsRows');
  rows.replaceChildren();
  if (!chosen) return;

  const row = document.createElement('div');
  row.className = 'eai-row pick';
  row.innerHTML = '<i class="mk done">&#10003;</i>'
    + `<span class="lbl">${escapeHtml(WORKSPACE.name)}</span>`;
  rows.appendChild(row);
}

function renderTemplates(chosen) {
  const cards = maybe('tplCards');
  if (!cards) return;
  cards.replaceChildren();
  TEMPLATES.forEach((t) => {
    const on = t.id === chosen;
    const card = document.createElement('div');
    card.className = `i3-card${on ? ' on' : ''}`;
    card.innerHTML = '<span class="dot"></span>'
      + '<span class="tx">'
      + `<b>${escapeHtml(t.name)}${t.meta ? `<i>${escapeHtml(t.meta)}</i>` : ''}</b>`
      + `<span>${escapeHtml(t.desc)}</span>`
      + '</span>';
    cards.appendChild(card);
  });
}

/** A step is answered when its numeral becomes a tick. */
const STEP_NUMBERS = { workspace: '1', name: '2', folder: '3' };

function setStep(name, { shown = true, answered = false } = {}) {
  const s = step(name);
  if (!s) return;
  s.hidden = !shown;
  s.classList.toggle('answered', answered);
  const num = s.querySelector('.i3-num');
  if (num) num.textContent = answered ? '✓' : STEP_NUMBERS[name];
}

function setFieldError(name, message) {
  const f = win.querySelector(`.eai-field[data-field="${name}"]`);
  if (!f) return;
  const err = f.querySelector('.eai-err');
  err.querySelector('span').textContent = message;
  err.hidden = false;
  f.classList.add('invalid');
}

function addRunRow(label, value, mark) {
  const row = document.createElement('div');
  row.className = `eai-row ${mark === 'fail' ? 'failed' : mark}`;
  const mk = mark === 'done' ? '<i class="mk done">&#10003;</i>'
    : mark === 'active' ? `<i class="mk busy">${SPINNER}</i>`
      : mark === 'fail' ? '<i class="mk fail">&#10005;</i>'
        : '<i class="mk pending"></i>';
  row.innerHTML = mk
    + `<span class="lbl">${escapeHtml(label)}</span>`
    + `<span class="val">${escapeHtml(value)}</span>`;
  el('runLines').appendChild(row);
  return row;
}

/* --- the harness screen ------------------------------------------------

   Three parts, and which of them are on screen is the design: the box
   is the administrator's answer, the list is everyone else's, and the
   alert above the button is what the button is about to do. */

function renderStandard() {
  el('harnessStandard').hidden = true;
}

const ALERT_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">'
  + '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.9"/>'
  + '<path d="M12 11v5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  + '<circle cx="12" cy="7.8" r="1.15" fill="currentColor"/></svg>';

function makeHarnessAlert() {
  const alert = document.createElement('div');
  alert.className = 'i4-alert i4-pick-alert';
  alert.hidden = true;
  alert.innerHTML = `${ALERT_ICON}<div class="tx"><b></b><span></span></div>`;
  return alert;
}

function fillHarnessAlert(alert, title, parts) {
  if (!alert) return;
  alert.hidden = false;
  alert.querySelector('b').textContent = title;
  alert.querySelector('span').replaceChildren(...[].concat(parts).map((part) => {
    if (typeof part === 'string') return document.createTextNode(part);
    const node = document.createElement(part.code === undefined ? 'b' : 'code');
    node.textContent = part.code === undefined ? part.b : part.code;
    return node;
  }));
}

function hideHarnessAlerts() {
  win.querySelectorAll('.i4-pick-alert').forEach((a) => { a.hidden = true; });
}

function renderHarnesses(chosen) {
  const rows = el('harnessRows');
  rows.replaceChildren();

  el('harnessStandard').hidden = true;
  el('harnessMore').hidden = true;

  const shown = [...HARNESSES]
    .sort((a, b) => Number(isInstalled(b)) - Number(isInstalled(a)));

  [
    ['Ready on this Mac', '', shown.filter(isInstalled)],
    ['Not installed', 'you get these from their makers', shown.filter((h) => !isInstalled(h))],
  ].forEach(([label, note, items]) => {
    if (!items.length) return;
    const head = document.createElement('div');
    head.className = 'i4-group';
    head.innerHTML = `<b>${label}</b>${note ? `<span>${note}</span>` : ''}`;
    rows.appendChild(head);

    items.forEach((h) => {
      const pick = document.createElement('div');
      pick.className = 'i4-pick' + (h.id === chosen ? ' on' : '');

      const row = document.createElement('div');
      row.className = `eai-row i4-row${isInstalled(h) ? ' ready' : ' missing'}${h.id === chosen ? ' on' : ''}`;
      row.innerHTML = `<span class="mark">${TICK_SVG}</span>`
        + `<span class="tile" style="background:${HARNESS_ICONS[h.id].bg}">${HARNESS_ICONS[h.id].svg}</span>`
        + `<span class="nm">${escapeHtml(h.name)}</span>`
        + `<span class="state">${isInstalled(h) ? h.version || 'installed' : 'not installed'}</span>`;
      pick.appendChild(row);

      const alert = makeHarnessAlert();
      if (h.id === chosen && !isInstalled(h)) {
        fillHarnessAlert(alert, `${h.name} comes from ${h.site.split('/')[0]}`,
          ["We'll open their site. Install it and make a ", { b: h.account },
            ' account there, then come back here — your app is already created either way.']);
      }
      pick.appendChild(alert);
      rows.appendChild(pick);
    });
  });

  rows.hidden = false;
}

/** The alert inside the selected option. */
function sayNext(title, parts) {
  hideHarnessAlerts();
  const pick = win.querySelector('.i4-pick.on');
  fillHarnessAlert(pick?.querySelector('.i4-pick-alert'), title, parts);
}

/** The state the app cannot resolve on its own — yet. */
function showWaiting(h) {
  let box = maybe('harnessWait');
  if (!box) {
    box = document.createElement('div');
    box.className = 'i4-wait';
    box.id = 'harnessWait';
    box.innerHTML = '<i class="mk pending" style="flex:0 0 16px;width:16px;height:16px;border:2px solid var(--color-border);border-radius:50%;"></i>'
      + '<div class="tx"><b></b><span></span></div>';
    el('harnessRows').after(box);
  }
  box.querySelector('.tx b').textContent = `Waiting for ${h.name}`;
  box.querySelector('.tx span').textContent =
    `${h.site} is open in your browser. Download ${h.name}, install it and sign in — this will `
    + 'update by itself when it lands. Your app is already created, so nothing is lost if you '
    + 'close this window.';
  box.hidden = false;

  el('harnessGo').disabled = true;
  el('harnessGo').textContent = `Waiting for ${h.name}…`;
  hideHarnessAlerts();
}

/* ======================== 6. THE RESET ===========================

   Everything `paint()` is allowed to change, put back. This is the only
   reason the machine is trustworthy: a state is what the screen paints
   on top of this, never what the last state happened to leave behind. */

const DMG_HINT = 'To install, drag <b>EAI Setup</b> to <b>Applications</b>';

function reset() {
  win.querySelectorAll('[data-screen]').forEach((s) => { s.hidden = true; });
  document.querySelector('.st-overlay')?.remove();

  /* The disk image, back to the frame before its sequence starts. Its
     whole state is three classes on the stage plus two on the icons, so
     putting it back is putting those back. */
  dmgEl('dmgStage').className = 'skin-dmg dmg-anim';
  dmgEl('dmgApp').hidden = false;
  dmgEl('dmgApplications').classList.remove('over', 'filled');
  dmgEl('dmgHint').innerHTML = DMG_HINT;

  renderCheck();
  win.querySelector('[data-screen="signin"] .eai-head p').textContent =
    'Use the account you signed up with. Your browser is still signed in, so this takes one click.';
  el('setupCreate').textContent = 'Use a different account';
  el('setupSignin').classList.remove('off');

  const mark = el('welcomeMark');
  mark.classList.remove('failed');
  mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none">'
    + '<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  el('welcomeTitle').textContent = 'Signed in';
  el('welcomeSub').textContent = ACCOUNT;
  el('welcomeSub').classList.remove('wide');
  el('welcomeActs').hidden = true;
  el('welcomeCopy').textContent = 'Copy the sign-in link';

  el('setupSub').textContent =
    `Signed in as ${ACCOUNT}. Your workspace came with you — two things, and your app exists.`;
  renderWorkspaces(WORKSPACE.name);
  el('wsNote').hidden = true;
  el('wsNote').querySelector('span').textContent =
    `${ACCOUNT} isn't a member of a company workspace yet. An EAI admin can add you, then sign in again.`;
  renderTemplates('eai');
  el('projName').value = PROJECT.name;
  const projFolder = maybe('projFolder');
  const locCombo = maybe('locCombo');
  const locStart = maybe('chooseFolderStart');
  if (projFolder && locCombo && locStart) {
    projFolder.value = '';
    locCombo.hidden = true;
    locStart.hidden = false;
  }
  win.querySelectorAll('.eai-field').forEach((f) => {
    f.querySelector('.eai-err').hidden = true;
    f.classList.remove('invalid', 'shake');
  });
  ['workspace', 'name', 'folder'].forEach((n) => setStep(n, { shown: false }));
  el('createApp').disabled = true;

  el('runTitle').textContent = `Creating ${PROJECT.name}`;
  el('runSub').textContent = 'Downloading the app template into your folder.';
  el('runLines').replaceChildren();
  el('runNote').hidden = true;
  el('runActs').hidden = true;

  el('harnessNote').hidden = true;
  maybe('harnessWait')?.setAttribute('hidden', '');
  el('harnessGo').disabled = false;
  el('harnessStandard').hidden = true;
  el('harnessMore').hidden = true;
  hideHarnessAlerts();

  el('handoffTitle').textContent = 'One last thing';
}

/* ====================== 7. THE SEVEN PAINTS ======================

   One function per screen. Each is handed the faults in force — a list,
   possibly empty — and is responsible for the whole screen either way.
   No function here reads what another one did. */

const PAINT = {
  /**
   * The disk image, at one of the four moments it has.
   *
   * Everything here is classes the CSS already reacts to — `play`,
   * `lift`, `reveal` are the opening sequence's three beats, and `over`
   * and `filled` are what the drag does to the folder. Setting them
   * directly is how you hold a beat still long enough to look at it;
   * played at speed the whole sequence is over in 1.3 seconds.
   *
   * The lift is deliberately not one of the four. It is a 360ms tween
   * between the wordmark landing and the icons arriving, and a state you
   * cannot act in is a frame of an animation rather than a state.
   */
  dmg() {
    const at = stage();
    const cls = ['skin-dmg', 'dmg-anim', 'play'];
    if (at >= 2) cls.push('lift', 'reveal');
    dmgEl('dmgStage').className = cls.join(' ');

    if (at === 3) dmgEl('dmgApplications').classList.add('over');

    if (at === 4) {
      // Dropped: the app is gone from the image, the folder has it, and
      // the sentence stops instructing and starts reporting.
      dmgEl('dmgApp').hidden = true;
      dmgEl('dmgApplications').classList.add('filled');
      dmgEl('dmgHint').innerHTML = 'Copied to <b>Applications</b>';
    }
  },

  /**
   * Sign in, with none, one or both of its failures.
   *
   * The two are independent, so the screen is built out of them rather
   * than switched between them: the check row is prereq's doing, each
   * failure contributes one alert, and the title is the count.
   *
   * The pair is worth looking at rather than assuming. Prereq's alert
   * ends "Nothing else is waiting on it" — true on its own, and beside a
   * second alert saying the network is down it is a sentence about the
   * wrong thing. One Retry now stands for two unrelated fixes, and the
   * screen does not say which one it will attempt.
   */
  signin(fs) {
    if (!fs.length) return;

    const head = win.querySelector('[data-screen="signin"] .eai-head p');
    head.textContent = fs.length > 1 ? screen().comboHead : fs[0].head;

    // The tick does not survive a failure. It is replaced by it.
    renderCheck(fs.map((f) => f.problem));

    el('setupCreate').textContent = 'Retry';
    el('setupSignin').classList.add('off');
  },

  /* The tick and the address are the whole screen — until they aren't. */
  welcome(fs) {
    if (!fs.length) return;

    const mark = el('welcomeMark');
    mark.classList.add('failed');
    mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none">'
      + '<path d="M12 6.5v7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'
      + '<circle cx="12" cy="17.6" r="1.45" fill="currentColor"/></svg>';

    el('welcomeTitle').textContent = fs[0].head;
    el('welcomeSub').textContent =
      'Your browser opened, but nothing came back. The tab was probably closed before it finished, '
      + 'or the link expired. Nothing was saved either way, so trying again is safe.';
    el('welcomeSub').classList.add('wide');
    el('welcomeActs').hidden = false;
  },

  setup(fs) {
    const f = fs[0] || null;   // exclusive: there is never a second

    if (f?.id === 'workspace') {
      el('setupSub').textContent = `Signed in as ${ACCOUNT}. One thing is in the way.`;
      renderWorkspaces(null);
      setStep('workspace', { shown: true });
      el('wsNote').hidden = false;
      return;
    }

    if (f?.id === 'name') {
      setStep('workspace', { shown: true, answered: true });
      setStep('name', { shown: true });
      setStep('folder', { shown: true, answered: false });
      const projFolder = maybe('projFolder');
      const locCombo = maybe('locCombo');
      const locStart = maybe('chooseFolderStart');
      if (projFolder && locCombo && locStart) {
        projFolder.value = '/Users/gareth/Downloads';
        locCombo.hidden = false;
        locStart.hidden = true;
      }
      setFieldError('name',
        `A folder called ${PROJECT.name} already exists there. `
        + 'Pick another name, or choose a different location below.');
      return;
    }

    const upto = stage();
    setStep('workspace', { shown: upto >= 1, answered: upto >= 1 });
    setStep('name', { shown: upto >= 2, answered: upto >= 3 });
    setStep('folder', { shown: upto >= 3, answered: upto >= 4 });

    const projFolder = maybe('projFolder');
    const locCombo = maybe('locCombo');
    const locStart = maybe('chooseFolderStart');
    if (projFolder && locCombo && locStart) {
      if (upto >= 4) {
        projFolder.value = '/Users/gareth/Downloads';
        locCombo.hidden = false;
        locStart.hidden = true;
      } else {
        projFolder.value = '';
        locCombo.hidden = true;
        locStart.hidden = false;
      }
    }

    el('createApp').disabled = upto < screen().stages.length;
  },

  running(fs) {
    const f = fs[0] || null;
    addRunRow('Workspace connected', WORKSPACE.name, 'done');
    addRunRow('Folder created', PROJECT.path, 'done');

    if (f) {
      addRunRow('App template downloaded', 'failed', 'fail');
      el('runTitle').textContent = `Couldn't finish creating ${PROJECT.name}`;
      el('runSub').textContent = 'The folder was created and is empty. Nothing was left half-written.';
      el('runNote').hidden = false;
      el('runActs').hidden = false;
      return;
    }

    addRunRow('Template downloaded', TEMPLATES[0].name, 'active');
    addRunRow('Dependencies installed', 'in progress', 'pending');
  },

  done(fs) {
    const f = fs[0] || null;
    if (state.mac !== 'waiting') syncHarnessFromStage();
    const h = harness(state.harnessPick) || subject();
    const here = isInstalled(h);

    /* Everyone picks from the list — no workspace standard in this flow. */
    el('harnessSub').hidden = true;
    renderStandard();
    renderHarnesses(state.harnessPick);

    if (f?.id === 'install') {
      el('harnessNote').hidden = false;
      el('harnessGo').textContent = `Get ${h.name}`;
      sayNext(`${h.name} comes from ${h.site.split('/')[0]}`,
        ["We'll open their site. Install it and make a ", { b: h.account },
          ' account there, then come back here — your app is already created either way.']);
      return;
    }

    if (state.mac === 'waiting') { showWaiting(h); return; }

    if (here) {
      el('harnessGo').textContent = 'Next';
      hideHarnessAlerts();
      return;
    }

    el('harnessGo').textContent = `Get ${h.name}`;
    sayNext(`${h.name} comes from ${h.site.split('/')[0]}`,
      ["We'll open their site. Install it and make a ", { b: h.account },
        ' account there, then come back here — your app is already created either way.']);
  },

  handoff() {
    const h = subject();
    el('handoffSub').textContent = `${h.name} is ready. Here's what to do the moment it opens.`;
    el('harnessEaiBody').innerHTML =
      `${escapeHtml(h.name)} opens on your app with an empty prompt — it doesn't know about EAI until you `
      + 'say so. Typing <code>/eai</code> is what starts it.';
    el('handoffGo').textContent = `Open in ${h.name}`;
  },

  built() {
    // The hand-off is what it lands on top of, so paint that first.
    PAINT.handoff();
    win.querySelector('[data-screen="handoff"]').hidden = false;

    const over = document.createElement('div');
    over.className = 'eai-done st-overlay';
    over.innerHTML = `
      <div class="eai-done-card">
        <span class="tick">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <h3>That's it — you're building</h3>
        <p><b>${escapeHtml(PROJECT.name)}</b> is connected to ${escapeHtml(WORKSPACE.name)} and EAI is running inside your AI tool. Tell it what you want to build.</p>
        <button class="eai-btn primary" type="button">Done</button>
      </div>`;
    stageEl.querySelector('.st-frame').appendChild(over);
    requestAnimationFrame(() => over.classList.add('on'));
  },
};

/* ======================== 8. PAINT ==============================

   Reset, show the one screen, hand it whichever of its failures are in
   force. Then the rail and the caption, which are the same state said in
   words. */

function paint({ animate = true } = {}) {
  const s = screen();

  reset();

  /* One window on screen, and the frame takes its height. Two different
     windows being two different sizes is not the resizing we removed —
     that was one window changing under you between its own states. A
     disk image is a Finder window and simply is a different shape. */
  const onDmg = s.window === 'dmg';
  win.hidden = onDmg;
  dmgWin.hidden = !onDmg;
  stageEl.querySelector('.st-frame').style.height = `${s.height || 720}px`;

  if (onDmg) {
    PAINT.dmg();
  } else {
    // "Built" paints the hand-off underneath itself, so it opens its own.
    if (s.id !== 'built') win.querySelector(`[data-screen="${s.id}"]`).hidden = false;
    PAINT[s.id](faults());
    win.querySelector('.skin-setup')?.scrollTo({ top: 0 });
  }

  if (animate) {
    const frame = stageEl.querySelector('.st-frame');
    frame.classList.remove('st-in');
    void frame.offsetWidth;
    frame.classList.add('st-in');
  }

  renderRail();
  renderCaption();
  writeUrl();
}

/* ======================= 9. THE CONTROL RAIL =====================

   Groups of one question each. The screen is a dropdown; everything
   else is a list you read down, because none of the rest is a toggle.

   A group the screen does not read is not offered. The rail is what
   applies here, and nothing else. */

const rail = document.getElementById('rail');

function group(label, note) {
  const g = document.createElement('div');
  g.className = 'rl-group';
  g.innerHTML = `<div class="rl-label">${escapeHtml(label)}</div>`
    + (note ? `<div class="rl-note">${escapeHtml(note)}</div>` : '');
  return g;
}

function option(text, on, onPick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `rl-opt${on ? ' on' : ''}`;
  b.textContent = text;
  b.addEventListener('click', onPick);
  return b;
}

/**
 * A fault, with a box in front of it.
 *
 * Checkbox or radio, decided by the screen rather than by taste: a
 * checkbox promises the others are independent of it, so the two on
 * Set up — which cannot both be true — get radios instead of a
 * checkbox that silently unticks its neighbour.
 */
function tickbox(text, on, kind, onToggle) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `rl-tick${on ? ' on' : ''}`;
  b.setAttribute('role', kind);
  b.setAttribute('aria-checked', String(on));
  b.innerHTML = `<span class="box ${kind}">${TICK_SVG}</span><span class="tx"></span>`;
  b.querySelector('.tx').textContent = text;
  b.addEventListener('click', onToggle);
  return b;
}

function renderRail() {
  const s = screen();
  rail.replaceChildren();

  /* --- which screen ---

     A dropdown rather than seven stacked names. The list was the longest
     thing in the rail and it was permanent: six of its seven lines were
     never the answer, and they pushed the controls that change what you
     are looking at below the fold. Closed, it says where you are; open,
     it is the same seven names. */
  const g1 = group('Screen');
  const sel = document.createElement('select');
  sel.className = 'rl-select';
  sel.setAttribute('aria-label', 'Screen');
  SCREENS.forEach((sc) => {
    const opt = document.createElement('option');
    opt.value = sc.id;
    opt.textContent = sc.name;
    opt.selected = sc.id === state.screen;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    state.screen = sel.value;
    state.faults = [];
    const sc = screen();
    if (sc.stages) {
      state.stage = sc.id === 'done' ? 1 : sc.stages.length;
      if (sc.id === 'done') syncHarnessFromStage();
    } else {
      state.stage = 99;
    }
    paint();
  });
  g1.appendChild(sel);

  // The shortcut belongs next to the control it drives, not in a bar
  // across the bottom of the page advertising itself.
  const keys = document.createElement('div');
  keys.className = 'rl-note';
  keys.innerHTML = '<kbd>&larr;</kbd> <kbd>&rarr;</kbd> steps through them in order';
  g1.appendChild(keys);

  rail.appendChild(g1);

  /* --- working, or which of the breaks ---

     The pill is still the fast way back to the happy path — one click,
     rather than untangling whatever is ticked. Under it, the failures
     themselves, and they are not a menu of one: ticking two is how you
     find out whether a screen that was designed one error at a time can
     hold both. */
  const g2 = group('State');
  const pill = document.createElement('div');
  pill.className = 'rl-pill';
  [['Working', false], ['Broken', true]].forEach(([text, wantBroken]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rl-chip${(state.faults.length > 0) === wantBroken ? ' on' : ''}`;
    b.disabled = wantBroken && !s.faults.length;
    b.textContent = text;
    b.addEventListener('click', () => {
      state.faults = wantBroken ? [s.faults[0].id] : [];
      paint();
    });
    pill.appendChild(b);
  });
  g2.appendChild(pill);

  if (!s.faults.length) {
    const none = document.createElement('div');
    none.className = 'rl-note';
    none.textContent = 'Nothing on this screen can fail — it has no network call and nothing to answer.';
    g2.appendChild(none);
  } else if (state.faults.length) {
    const kind = s.exclusive ? 'radio' : 'checkbox';
    s.faults.forEach((f) => {
      g2.appendChild(tickbox(f.name, broken(f.id), kind, () => {
        if (s.exclusive) {
          state.faults = [f.id];
        } else if (broken(f.id)) {
          // Unticking the last one is the same thing as saying "working".
          state.faults = state.faults.filter((id) => id !== f.id);
        } else {
          state.faults = [...state.faults, f.id];
        }
        paint();
      }));
    });

    if (s.why) {
      const why = document.createElement('div');
      why.className = 'rl-note';
      why.textContent = s.why;
      g2.appendChild(why);
    }
  }
  rail.appendChild(g2);

  /* --- the machine, which only the last screens read ---

     These used to sit here dimmed on every screen, with a line
     explaining which screens read them. That is two groups and two
     sentences of apology on five of the seven screens, to keep a control
     visible that has nothing to change. The rail now shows what applies
     and nothing else — the harness screens grow two questions, and
     everywhere else the rail is two.

     Nothing is lost by setting them elsewhere: they only ever reach the
     screens that show them, and both survive a change of screen. */

  if ((s.uses || []).includes('mac')) {
    const g3 = group('This Mac');
    [
      ['Claude Code is here', 'installed'],
      ['Nothing installed', 'none'],
      ['Waiting for it to land', 'waiting'],
    ].forEach(([text, value]) => {
      g3.appendChild(option(text, state.mac === value, () => {
        state.mac = value;
        paint();
      }));
    });
    rail.appendChild(g3);
  }

  /* How far through the reveal. Offered only on the working path: a
     failure decides the shape of this screen by itself, and a control
     claiming to also decide it would be a control with no effect. */
  if ((s.uses || []).includes('stage') && !state.faults.length) {
    const g = group(s.stageLabel);
    s.stages.forEach(([label], i) => {
      g.appendChild(option(label, stage() === i + 1, () => {
        state.stage = i + 1;
        if (s.id === 'done') syncHarnessFromStage();
        paint();
      }));
    });
    rail.appendChild(g);
  }
}

/* ==================== 10. WHAT THE STATE IS ======================

   The name of the state, and what it is for, above the app. There was a
   bar under the app too — previous, next, and a sentence narrating how
   you arrive and leave — and it is gone. It was navigation for a rail
   that already navigates, wrapped around a sentence nobody was reading
   because the app above it was saying the same thing better.

   What did belong there was the way out of a failure, which is the one
   thing a screenshot of an error cannot tell you and half of these do
   not have. That moves up here, onto the end of the caption. */

function renderCaption() {
  const s = screen();
  const fs = faults();

  const name = document.getElementById('capName');
  const note = document.getElementById('capNote');

  if (!fs.length) {
    name.textContent = s.name;
    note.textContent = s.note;
    return;
  }

  if (fs.length === 1) {
    name.textContent = `${s.name} — ${fs[0].name}`;
    note.textContent = `${fs[0].note} Way out: ${fs[0].out}`;
    return;
  }

  /* More than one. The names go in the title because which two it is
     matters, and the screen's own line about the combination replaces
     the individual notes — a paragraph per failure is the thing the
     screen underneath is already being judged for. */
  // Names verbatim: lowercasing them to make the join read as a sentence
  // turns "Cannot reach EAI" into "cannot reach eai".
  name.textContent = `${s.name} — ${fs.map((f) => f.name).join(' + ')}`;
  note.textContent = s.combo
    || `${fs.length} failures at once. ${fs.map((f) => f.note).join(' ')}`;
}

/* ===================== 11. STATES HAVE ADDRESSES =================

   A state worth discussing is a state worth linking to. The URL is
   written on every paint and read on load, so "the one where nothing is
   installed and the standard is set" is a link rather than four
   instructions. */

function writeUrl() {
  const q = new URLSearchParams({ screen: state.screen });
  // Comma-separated, so ?fault=prereq still means what it always did.
  if (state.faults.length) q.set('fault', faults().map((f) => f.id).join(','));
  if (state.mac !== 'installed') q.set('mac', state.mac);
  if (screen().stages && stage() !== screen().stages.length) q.set('stage', stage());
  history.replaceState(null, '', `?${q}`);
}

function readUrl() {
  const q = new URLSearchParams(location.search);
  const s = screen(q.get('screen'));
  if (s) state.screen = s.id;

  const asked = (q.get('fault') || '').split(',').filter(Boolean);
  const known = screen().faults.filter((f) => asked.includes(f.id)).map((f) => f.id);
  // A screen that cannot hold two takes the first one asked for.
  state.faults = screen().exclusive ? known.slice(0, 1) : known;

  if (['installed', 'none', 'waiting'].includes(q.get('mac'))) state.mac = q.get('mac');

  const wantStage = Number(q.get('stage'));
  if (wantStage >= 1) {
    state.stage = wantStage;
  } else {
    state.stage = screen().id === 'done' ? 1 : 99;
  }

  if (screen().id === 'done') syncHarnessFromStage();
}

/* ========================= 12. GO ================================

   Left and right still walk the flow in order. The bar that advertised
   them is gone, but the shortcut is the fast way to read seven screens
   in a row and costs nothing to keep. Not while the dropdown has focus:
   arrows belong to a select that is open. */

function stepBy(n) {
  const i = SCREENS.indexOf(screen()) + n;
  if (i < 0 || i >= SCREENS.length) return;
  state.screen = SCREENS[i].id;
  state.faults = [];
  const sc = screen();
  if (sc.stages) {
    state.stage = sc.id === 'done' ? 1 : sc.stages.length;
    if (sc.id === 'done') syncHarnessFromStage();
  } else {
    state.stage = 99;
  }
  paint();
}

window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'ArrowLeft') stepBy(-1);
  if (e.key === 'ArrowRight') stepBy(1);
});

/**
 * When it doesn't come up, say which of the two things went wrong.
 *
 * There are exactly two, and they want opposite responses. Either the
 * app never arrived — no server, wrong folder, moved file — or it
 * arrived and the state code fell over driving it, which means /states
 * and /signup have drifted and the fix is in this repo.
 *
 * The old version printed "this page needs a static server" for both. On
 * a machine that was already running one, that sent somebody to check a
 * server that was fine while the real message — a missing element — sat
 * underneath in grey. A diagnostic that can be wrong about which half
 * broke is worse than no diagnostic, because it is believed.
 */
function showDead(err) {
  const server = !lifted;
  stageEl.querySelector('.st-frame').innerHTML =
    '<div class="st-dead">'
    + `<b>${server ? 'This page needs a static server.' : "The app loaded, but this page couldn't drive it."}</b>`
    + (server
      ? '<span>It lifts the real app out of <code>/signup</code> rather than keeping a second copy, '
        + 'and a browser will not fetch a sibling file over <code>file://</code>. Run '
        + '<code>npx serve .</code> from the repo root and open <code>/states</code>.</span>'
      : '<span><code>signup/index.html</code> loaded fine, so the server is not the problem. '
        + 'This page reaches into that markup by id, and something it expects is not there — '
        + '<code>/states</code> and <code>/signup</code> have drifted apart. If you have just '
        + 'changed the setup app, the element it names below is the one to look at.</span>')
    + `<span class="why">${escapeHtml(err.message)}</span>`
    + '</div>';
  // The stack is worth more than the panel can show, so it goes to the console.
  console.error('[states]', err);
}

lift().then(() => {
  readUrl();
  paint({ animate: false });
}).catch(showDead);
