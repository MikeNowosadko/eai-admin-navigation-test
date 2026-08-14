/* ------------------------------------------------------------------
   EAI onboarding prototype — the "npx flow" journey.

   This is the flow the onboarding study runs on: search → install →
   sign in → /EAI. It ends at the experiment gate; everything after
   that is kept for demos.

   Runs inside the desktop shell (desktop.js) on the printing and
   prompting helpers in term-runtime.js — out, ask, choose, progress,
   inBrowser. The flow is one readable async function so the sequence
   can be reordered or reworded without touching the plumbing.

   Extending the CLI itself? That's cli/ — this flow is live for user
   testing, so leave it alone.
------------------------------------------------------------------- */

const CMD = 'npx install eai';

let started = false;

// Copying happens inside the browser. A web page can't bounce a dock icon or
// pop a system prompt, so nothing on the desktop reacts — the page's own
// "Copied" confirmation is the only feedback, exactly as it would be.
// Opening any CLI app from the dock is what starts the journey.

window.addEventListener('terminal-opened', () => {
  if (started) return;
  started = true;
  hideCoach();
  journey();
});

/* ============================ THE FLOW ============================ */

async function journey() {
  /* --- 1. npx install eai ---------------------------------------- */
  stage('install');
  await out('Last login: Wed 12 Aug 16:41 on ttys004', 'dim');
  await gap();

  // Paste whatever the user actually copied — the command from the site, or
  // the setup prompt from the docs. Anything else gets the shell's answer.
  const pasted = await ask({
    prefix: '~/work $',
    placeholder: 'paste what you copied  (⌘V)',
    chips: [{ label: '📋  Paste  ⌘V', value: () => clipboardText() || CMD, primary: true }],
    validate: (v) => /eai/i.test(v)
      ? null
      : `zsh: command not found: ${v.split(/\s+/)[0] || '?'}`,
  });

  await gap();

  // The docs hand you a prompt for a coding agent, not a shell command — so
  // the agent answers first, then runs the same install.
  if (/enterprise ai project|business_scenario/i.test(pasted)) {
    await out('◇ Setting this folder up as an Enterprise AI project.', 'blue');
    await out('  1 · install the CLI   2 · sign you in   3 · eai init   4 · wait for /0_business_scenario', 'dim');
    await gap();
    await out(`  Running: ${CMD}`, 'dim');
    await gap();
  }
  await out('Need to install the following packages:', 'dim');
  await out('  @enterpriseai/cli@2.4.0', 'dim');
  await confirmKey('Ok to proceed? (y)', 'y', 'press y');
  await progress('Installing', 1100);
  await gap();
  await tick('Node v24.3.0 detected');
  await tick('No Docker, no database, no keys to configure');
  await gap();

  await banner();
  await out('  EAI welcome', 'head');
  await gap();

  /* --- 2. Sign in (press enter) ---------------------------------- */
  stage('auth');
  await out('  Sign in by pressing enter.', 'blue');
  await out('  Your password never touches the terminal — it stays in your browser.', 'dim');
  await confirmKey('', 'Enter', 'press enter');
  await out('  Opening enterpriseaigroup.com/signin ...', 'dim');
  await inBrowser('pages/signin.html', 'signin', 'Browser opened.', 'Sign in there — the terminal is waiting.');
  await tick('Signed in as gareth.chainey@northwind.com');
  await gap();

  /* --- 3. Choose a plan ------------------------------------------ */
  stage('plan');
  await out('  You don\'t have a workspace yet — pick a plan to create one.', 'blue');
  await inBrowser('pages/plans.html', 'plan', 'Choose a plan.', 'Builder is free while it\'s in preview.');
  await tick('Plan: Builder (Free preview) — no credit card required');
  await gap();

  /* --- 4. Name your builder workspace ---------------------------- */
  stage('workspace');
  await out('  Last step in the browser: name your workspace.', 'blue');
  const wsData = await inBrowser('pages/workspace.html', 'workspace', 'Name your workspace.', 'Country and workspace name, then Continue.');
  const ws = (wsData && wsData.workspace) || 'My builder workspace';
  const country = (wsData && wsData.country) || 'Australia';
  await tick('Sign in successful');
  await tick(`Workspace: ${ws} (${country})`);
  await out('  1 sandbox tenant · 2 users · audit on by default', 'dim');
  await gap();

  /* --- 5. Say what you want to build ----------------------------- */
  stage('describe');
  await out('Ready. Type /EAI followed by what you want to build.', 'head');
  await out('Nothing else to set up — data, auth, tenancy and hosting are already yours.', 'dim');
  await gap();

  await ask({
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

  // Reaching /EAI is the finish line for the experiment. The rest of the
  // journey stays available for demos, behind "keep exploring".
  await new Promise((resume) => {
    setTimeout(() => endOfExperiment({ onContinue: resume }), 600);
  });

  /* --- 6 & 7. Clarify → prototype → approve (with feedback loop) -- */
  let approvedPrototype = false;
  let round = 0;

  while (!approvedPrototype) {
    stage('clarify');
    if (round === 0) {
      await gap();
      await out('◇ Two questions — they change what I build, so they\'re worth asking.', 'blue');
      await gap();

      const approver = await ask({
        prefix: '?',
        label: 'Who signs off a renewal before it\'s actioned?',
        placeholder: 'type an answer...',
        chips: [
          { label: 'Ops manager', value: 'The ops manager' },
          { label: 'Ops manager, then Finance over $50k', value: 'Ops manager, then Finance if over $50k', primary: true },
          { label: 'No approval needed', value: 'No approval needed' },
        ],
      });

      const source = await ask({
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
      await tick(`Approvals: ${approver}`);
      await tick(`Source of truth today: ${source}`);
      await out('  That\'s everything I need. No more questions.', 'dim');
    } else {
      await gap();
      await out('◇ Got it — reworking the prototype with that change.', 'blue');
    }

    stage('proto');
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
      browser.go('pages/preview.html');
      coach('Preview open in Safari.', `Have a look, then click ${hostName()} in the dock to approve or give feedback.`);
      const after = await choose([
        { label: '✓ Approve', value: 'approve', primary: true },
        { label: 'Give feedback', value: 'feedback' },
      ]);
      hideCoach();
      if (after === 'approve') approvedPrototype = true;
    } else if (verdict === 'approve') {
      approvedPrototype = true;
    }

    if (!approvedPrototype) {
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

  /* --- 8. AI builds the real app (with its own feedback loop) ----- */
  stage('build');
  await gap();
  await out('◇ Prototype approved — building the real application', 'blue');

  let approvedBuild = false;
  let buildRound = 0;

  while (!approvedBuild) {
    if (buildRound === 0) {
      await progress('Scaffolding', 700);
      await tick('Data model: suppliers, contracts, renewals, approvals');
      await tick(`Auth + tenancy: scoped to ${ws}`);
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

    const v = await choose([
      { label: '✓ Approve', value: 'approve', primary: true },
      { label: 'Give feedback', value: 'feedback' },
    ]);

    if (v === 'approve') {
      approvedBuild = true;
    } else {
      await ask({
        prefix: '❯',
        placeholder: 'what needs to change?',
        chips: [
          { label: 'Notify the owner, not just the approver', value: 'Notify the contract owner as well as the approver', primary: true },
          { label: 'Add a "do not renew" outcome', value: 'Add a "do not renew" outcome with a reason field' },
        ],
      });
      buildRound += 1;
      await gap();
    }
  }

  /* --- 9. Admin screens + testing -------------------------------- */
  stage('admin');
  await gap();
  await out('◇ Your app is ready to manage', 'blue');
  await out('  Admin: https://admin.enterpriseaigroup.com/contract-renewals');
  await choose([{ label: 'Open admin screens', value: 'go', primary: true }]);
  browser.go(`pages/admin.html?ws=${encodeURIComponent(ws)}&country=${encodeURIComponent(country)}`);
  coach('Admin open in Safari.', `Click ${hostName()} in the dock when you're ready to test and deploy.`);
  await choose([{ label: 'Back to the terminal', value: 'back', primary: true }]);
  hideCoach();
  focusWin('host');
  await gap();

  await out('◇ Running tests', 'blue');
  await progress('Unit + data rules', 800);
  await tick('42 unit tests passed');
  await progress('End-to-end journeys', 900);
  await tick('9 end-to-end journeys passed (create → approve → renew)');
  await tick('Access control verified — no cross-tenant reads');
  await gap();

  /* --- 10. Deploy ------------------------------------------------- */
  stage('deploy');
  const go = await choose([
    { label: '🚀  Deploy to the web', value: 'go', primary: true },
    { label: 'Not yet', value: 'wait' },
  ]);

  if (go === 'wait') {
    await out('  No problem — run `eai deploy` when you\'re ready.', 'dim');
  } else {
    await progress('Deploying', 1400);
    await tick(`Hosted in ${country}, inside your workspace`);
    await tick('Custom domain available in the admin screens');
    await gap();
    await out('  Live:  https://contract-renewals.eai.app', 'ok');
  }

  stage('done');
  await gap();
  await out('  Done. From paste to production in one session.', 'head');
  await out('  Next: `eai invite` to add your ops team, `eai logs` to watch it run.', 'dim');
  await gap();
  const end = await choose([
    { label: '↺  Run the journey again', value: 'restart' },
    { label: '← Back to the flows', value: 'flows' },
  ]);
  window.location.href = end === 'restart' ? 'index.html' : '../index.html';
}
