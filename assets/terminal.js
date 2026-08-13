/* ------------------------------------------------------------------
   EAI onboarding prototype — the "npx flow" journey.

   Runs inside the desktop shell (desktop.js). The flow is one readable
   async function so the sequence can be reordered or reworded without
   touching the plumbing underneath it.
------------------------------------------------------------------- */

const body = document.getElementById('termBody');
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

/** Send the user to the browser, wait for them to finish, bring them back. */
async function inBrowser(url, action, coachTitle, coachText) {
  browser.go(url);
  coach(coachTitle, coachText);
  const data = await browser.waitFor(action);
  hideCoach();
  focusWin('host');
  await sleep(220);
  return data;
}

/* ========================= TERMINAL RUNTIME ======================= */

let fastForward = false;
body.addEventListener('click', (e) => {
  // Clicking empty terminal space skips ahead; clicking a control does not.
  if (e.target.closest('.chip, .opt, input')) return;
  fastForward = true;
  const input = body.querySelector('.tin input');
  if (input) input.focus();
});

function sleep(ms) {
  return new Promise((resolve) => {
    if (fastForward) return resolve();
    const t = setTimeout(resolve, ms);
    const poll = setInterval(() => {
      if (fastForward) { clearTimeout(t); clearInterval(poll); resolve(); }
    }, 40);
    setTimeout(() => clearInterval(poll), ms + 60);
  });
}

function scroll() { body.scrollTop = body.scrollHeight; }

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  body.appendChild(node);
  scroll();
  return node;
}

/** Print a line, then pause briefly so output feels like it's streaming. */
async function out(text, cls = '', pause = 90) {
  el('span', `ln ${cls}`.trim(), text);
  await sleep(pause);
}

async function gap() { el('span', 'ln spacer'); }

async function tick(text) { await out(`  ✓ ${text}`, 'ok', 150); }

async function banner() {
  el('span', 'ln banner',
`  ███████  █████  ██
  ██      ██   ██ ██
  █████   ███████ ██
  ██      ██   ██ ██
  ███████ ██   ██ ██`);
  await sleep(200);
}

/** Fake work with a progress bar. */
async function progress(label, ms) {
  const row = el('span', 'ln progress', `  ${label} <span class="bar"><i></i></span> <em class="pct" style="font-style:normal;color:#767d8a"></em>`);
  const fill = row.querySelector('i');
  const pct = row.querySelector('.pct');
  const steps = 24;
  for (let i = 1; i <= steps; i += 1) {
    if (!fastForward) await new Promise((r) => setTimeout(r, ms / steps));
    fill.style.width = `${(i / steps) * 100}%`;
    pct.textContent = `${Math.round((i / steps) * 100)}%`;
  }
  row.innerHTML = `  <span style="color:#4ade80">✓</span> ${label} <span style="color:#767d8a">— done</span>`;
  scroll();
  await sleep(120);
}

/** Single-keystroke confirm, e.g. "Ok to proceed? (y)" or "press enter". */
async function confirmKey(label, key, chipText) {
  fastForward = false;
  const row = el('span', 'ln');
  row.innerHTML = label ? `${label} ` : '  ';
  const chip = document.createElement('button');
  chip.className = 'chip primary';
  chip.textContent = chipText || `press ${key}`;
  row.appendChild(chip);
  scroll();
  await new Promise((resolve) => {
    const done = () => { document.removeEventListener('keydown', onKey); resolve(); };
    const onKey = (e) => {
      if (e.key === key || e.key.toLowerCase() === key.toLowerCase()) { e.preventDefault(); done(); }
    };
    chip.addEventListener('click', done);
    document.addEventListener('keydown', onKey);
  });
  const shown = key === 'Enter' ? '⏎' : key;
  row.innerHTML = label ? `${label} <span class="user">${shown}</span>` : `  <span class="user">${shown}</span>`;
}

/**
 * Prompt for text. Supports real typing, real paste, and shortcut chips
 * (a chip types its value into the prompt, so the terminal still feels live).
 */
function ask({ prefix = '❯', label, placeholder = '', chips = [], validate }) {
  fastForward = false;
  if (label) el('span', 'ln head', `  ${label}`);

  const row = el('span', 'ln tin');
  row.innerHTML = `<span class="pfx">${prefix}</span>`;
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  row.appendChild(input);
  input.focus();

  let chipRow = null;
  if (chips.length) {
    chipRow = el('span', 'ln chips');
    chips.forEach((c) => {
      const b = document.createElement('button');
      b.className = `chip${c.primary ? ' primary' : ''}`;
      b.textContent = c.label;
      // A chip value can be a function, for things resolved at click time
      // (the clipboard, say). Long multi-line text lands as one paste — an
      // <input> would strip the newlines out of it.
      b.addEventListener('click', () => {
        const value = typeof c.value === 'function' ? c.value() : c.value;
        if (value.length > 120 || value.includes('\n')) {
          input.value = `${value.split('\n')[0]} …`;
          setTimeout(() => finish(value), 280);
        } else {
          typeInto(input, value).then(submit);
        }
      });
      chipRow.appendChild(b);
    });
  }
  scroll();

  let resolveWith;
  const promise = new Promise((r) => { resolveWith = r; });

  function submit() { finish(input.value.trim()); }

  function finish(value) {
    if (!value) return;
    if (validate) {
      const problem = validate(value);
      if (problem) {
        // Freeze the bad attempt, print the error, and ask again in place.
        const bad = document.createElement('span');
        bad.className = 'ln';
        bad.innerHTML = `<span class="pfx">${prefix}</span> <span class="user">${escapeHtml(value)}</span>`;
        row.parentNode.insertBefore(bad, row);
        const err = document.createElement('span');
        err.className = 'ln err';
        err.textContent = problem;
        row.parentNode.insertBefore(err, row);
        input.value = '';
        scroll();
        return;
      }
    }
    row.outerHTML = `<span class="ln"><span class="pfx">${prefix}</span> <span class="user">${escapeHtml(value)}</span></span>`;
    if (chipRow) chipRow.remove();
    scroll();
    resolveWith(value);
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  return promise;
}

/**
 * Type text into an input character by character. Anything long — a pasted
 * setup prompt, say — lands in one go, the way a real paste does.
 */
function typeInto(input, text) {
  input.focus();
  input.value = '';
  if (text.length > 120) {
    input.value = text;
    return new Promise((resolve) => setTimeout(resolve, 260));
  }
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      input.value = text.slice(0, i += 1);
      if (i >= text.length) return setTimeout(resolve, 120);
      setTimeout(tick, text.length > 40 ? 9 : 18);
    };
    tick();
  });
}

/** Chip-only decision point (approve / feedback / open something). */
function choose(options, { sticky = [] } = {}) {
  fastForward = false;
  const chipRow = el('span', 'ln chips');
  return new Promise((resolve) => {
    options.forEach((o) => {
      const b = document.createElement('button');
      b.className = `chip${o.primary ? ' primary' : ''}`;
      b.textContent = o.label;
      b.addEventListener('click', () => {
        if (sticky.includes(o.value)) { resolve(o.value); return; }
        chipRow.outerHTML = `<span class="ln"><span class="pfx">❯</span> <span class="user">${escapeHtml(o.label)}</span></span>`;
        scroll();
        resolve(o.value);
      });
      chipRow.appendChild(b);
    });
    scroll();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
