/* ------------------------------------------------------------------
   EAI CLI prototype — the flow being worked on, at /cli.

   Starts where EAI Setup leaves off. The app is already installed and
   has just created the project, so this file is only the CLI: what
   happens in Terminal, VS Code, Claude, Copilot, Codex or Gemini once
   the workspace exists. Finding, downloading and installing the app is
   /setup; the npx route is /npx. Both are finished — this is the one
   that changes.

   STRUCTURE
     STEPS        the running order — reorder, add or comment out here
     cliProject   what EAI Setup handed over: name, path, coding app
     state        what earlier steps learned, for later ones to use
     step fns     one async function each, in the order they run

   Printing and prompting come from term-runtime.js: out, gap, tick,
   banner, progress, confirmKey, ask, choose, inBrowser.

   Starting a new iteration? Copy the folder — cli/ to cli-2/, plus a
   journey file beside this one — so the old one keeps its URL.
------------------------------------------------------------------- */

const PAGE = (file) => `pages/${file}`;

/** The running order. Everything below is one of these, in this order. */
const STEPS = [
  welcome,
  describe,
  clarify,
  prototype,
  build,
  admin,
  test,
  deploy,
  finish,
];

/** Filled in by EAI Setup (cli-setup.js) at the hand-off. */
const cliProject = { host: 'copilot', name: 'customer-portal', path: '' };

/** What each step learns, for the ones after it. */
const state = {
  brief: '',
  approver: '',
  source: '',
};

let started = false;

/** Called by EAI Setup once the coding app is open on the new project. */
function startCli() {
  if (started) return;
  started = true;
  hideCoach();
  run();
}

// Opening a coding app from the dock before setup has finished just opens it —
// the CLI has nothing to run in yet.
window.addEventListener('terminal-opened', hideCoach);

async function run() {
  for (const step of STEPS) await step();
}

/* ====================== WHERE SETUP LEFT OFF ====================== */

/** The CLI, already installed and connected, in the app you chose. */
async function welcome() {
  await out(`Workspace: ${cliProject.path || cliProject.name}`, 'dim');
  await gap();
  await banner();
  await gap();
  await out('  Welcome to the EAI CLI', 'head');
  await out('  Your app is created, your tenant is connected, and the Gofer assets are in place.', 'dim');
  await gap();
  await tick('Tenant: Northwind Group (AU)');
  await tick('Data, auth, tenancy, governance and hosting — already yours');
  await gap();
}

/* ================== THE CLI EXPERIENCE ITSELF ===================== */
/* Everything below is what this prototype is for. */

async function describe() {
  await out('Ready. Type /EAI followed by what you want to build.', 'head');
  await gap();

  state.brief = await ask({
    prefix: '❯',
    placeholder: '/EAI ...',
    chips: [
      { label: 'Track supplier contract renewals', value: '/EAI I need my ops team to track supplier contract renewals, with reminders and an approval step', primary: true },
      { label: 'Onboard new starters', value: '/EAI a checklist app for onboarding new starters across IT, HR and facilities' },
    ],
    validate: (v) => v.trim().toLowerCase().startsWith('/eai')
      ? null
      : 'Unknown input. Start with /EAI so I know you\'re describing an app.',
  });
}

async function clarify() {
  await gap();
  await out('◇ Two questions — they change what I build, so they\'re worth asking.', 'blue');
  await gap();

  state.approver = await ask({
    prefix: '?',
    label: 'Who signs off a renewal before it\'s actioned?',
    placeholder: 'type an answer...',
    chips: [
      { label: 'Ops manager', value: 'The ops manager' },
      { label: 'Ops manager, then Finance over $50k', value: 'Ops manager, then Finance if over $50k', primary: true },
      { label: 'No approval needed', value: 'No approval needed' },
    ],
  });

  state.source = await ask({
    prefix: '?',
    label: 'Where do the contracts live today?',
    placeholder: 'type an answer...',
    chips: [
      { label: 'SharePoint', value: 'SharePoint' },
      { label: 'Email + a spreadsheet', value: 'Email and a spreadsheet', primary: true },
      { label: 'Nowhere yet', value: 'Nowhere yet' },
    ],
  });

  await gap();
  await tick(`Approvals: ${state.approver}`);
  await tick(`Source of truth today: ${state.source}`);
  await out('  That\'s everything I need. No more questions.', 'dim');
}

/** Fastest possible prototype, then approve or feed back — loops until approved. */
async function prototype() {
  let approved = false;
  let round = 0;

  while (!approved) {
    if (round > 0) {
      await gap();
      await out('◇ Got it — reworking the prototype with that change.', 'blue');
    }

    await gap();
    await out('◇ Building the fastest possible prototype (static HTML — seconds, not minutes)', 'blue');
    await progress('Generating', 1200);
    await tick('Screens: renewals list, contract detail, approval');
    await tick('Sample data generated from your description');
    await gap();
    await out('  Preview:  http://localhost:4310', 'head');
    await gap();

    const verdict = await choose([
      { label: 'Open preview', value: 'preview' },
      { label: '✓ Approve', value: 'approve', primary: true },
      { label: 'Give feedback', value: 'feedback' },
    ], { sticky: ['preview'] });

    if (verdict === 'preview') {
      browser.go(PAGE('preview.html'));
      coach('Preview open in Safari.', `Have a look, then click ${hostName()} in the dock to approve or give feedback.`);
      const after = await choose([
        { label: '✓ Approve', value: 'approve', primary: true },
        { label: 'Give feedback', value: 'feedback' },
      ]);
      hideCoach();
      if (after === 'approve') approved = true;
    } else if (verdict === 'approve') {
      approved = true;
    }

    if (!approved) {
      await ask({
        prefix: '❯',
        placeholder: 'what should change?',
        chips: [
          { label: 'Add a renewal reminder 60 days out', value: 'Add a reminder 60 days before each renewal date', primary: true },
          { label: 'Show total annual value', value: 'Show the total annual value of contracts up for renewal' },
        ],
      });
      round += 1;
    }
  }
}

/** The real application, with its own approve-or-feed-back loop. */
async function build() {
  await gap();
  await out('◇ Prototype approved — building the real application', 'blue');

  let approved = false;
  let round = 0;

  while (!approved) {
    if (round === 0) {
      await progress('Scaffolding', 700);
      await tick('Data model: suppliers, contracts, renewals, approvals');
      await tick(`Auth + tenancy: scoped to ${cliProject.name}`);
      await tick('Approval workflow: ops manager → finance over $50k');
      await tick('Audit trail: every status change recorded');
      await tick('Reminders: 60 / 30 / 7 days before renewal');
      await tick('Import: bulk upload from your spreadsheet');
    } else {
      await progress('Applying your changes', 900);
      await tick('Change applied and re-verified');
    }

    await gap();
    await out('  Preview environment:  https://contract-renewals.preview.eai.app', 'head');
    await gap();

    const verdict = await choose([
      { label: '✓ Approve', value: 'approve', primary: true },
      { label: 'Give feedback', value: 'feedback' },
    ]);

    if (verdict === 'approve') {
      approved = true;
    } else {
      await ask({
        prefix: '❯',
        placeholder: 'what needs to change?',
        chips: [
          { label: 'Notify the owner, not just the approver', value: 'Notify the contract owner as well as the approver', primary: true },
          { label: 'Add a "do not renew" outcome', value: 'Add a "do not renew" outcome with a reason field' },
        ],
      });
      round += 1;
      await gap();
    }
  }
}

async function admin() {
  await gap();
  await out('◇ Your app is ready to manage', 'blue');
  await out('  Admin: https://admin.enterpriseaigroup.com/contract-renewals');
  await choose([{ label: 'Open admin screens', value: 'go', primary: true }]);

  browser.go(`${PAGE('admin.html')}?ws=${encodeURIComponent(cliProject.name)}&country=Australia`);
  coach('Admin open in Safari.', `Click ${hostName()} in the dock when you're ready to test and deploy.`);
  await choose([{ label: 'Back to the terminal', value: 'back', primary: true }]);
  hideCoach();
  focusWin('host');
  await gap();
}

async function test() {
  await out('◇ Running tests', 'blue');
  await progress('Unit + data rules', 800);
  await tick('42 unit tests passed');
  await progress('End-to-end journeys', 900);
  await tick('9 end-to-end journeys passed (create → approve → renew)');
  await tick('Access control verified — no cross-tenant reads');
  await gap();
}

async function deploy() {
  const go = await choose([
    { label: '🚀  Deploy to the web', value: 'go', primary: true },
    { label: 'Not yet', value: 'wait' },
  ]);

  if (go === 'wait') {
    await out('  No problem — run `eai deploy` when you\'re ready.', 'dim');
    return;
  }

  await progress('Deploying', 1400);
  await tick('Hosted in Australia, inside your workspace');
  await tick('Custom domain available in the admin screens');
  await gap();
  await out('  Live:  https://contract-renewals.eai.app', 'ok');
}

async function finish() {
  await gap();
  await out('  Done. From setup to production in one session.', 'head');
  await out('  Next: `eai invite` to add your ops team, `eai logs` to watch it run.', 'dim');
  await gap();

  const end = await choose([
    { label: '↺  Run it again', value: 'restart' },
    { label: '← Back to the flows', value: 'flows' },
  ]);
  window.location.href = end === 'restart' ? 'index.html' : '../index.html';
}
