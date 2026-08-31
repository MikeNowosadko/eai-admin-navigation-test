/* ------------------------------------------------------------------
   App — the state machine.

   Every screen the no-code builder can be on: from the opening animation
   through plan, build, publish, and the auth/credit forks. One page,
   one control rail, one live builder lifted out of /build-web.

   Oct 16 release scope: marketing site → builder. No macOS shell, no app
   install. Smart blocks is a rail setting (?blocks=1), not a second app.
------------------------------------------------------------------- */

const PROMPT = 'supplier invoice approval for anything over $10,000';
const PROJECT = 'Supplier invoice approval for anything over $10,000';
const START_CREDITS = 100;
const AUTH_CREDITS_USED = 50;
const TOPUP = { credits: 500, price: '$49' };

const WORKFLOW_MVP = [
  {
    id: 'submit', tab: 'Submit', badge: 'Captured once', badgeTone: 'blue',
    title: 'Supplier submits the invoice',
    blurb: 'Emailed invoice re-keyed into a spreadsheet → captured once, at submission',
    problem: '"Supplier submits the invoice" re-collected information the user had already provided.',
    solution: 'The data is captured once and pre-filled everywhere it is needed downstream.',
    impact: ['No duplicate data entry', 'Fewer transcription errors', 'A faster experience'],
    previewTitle: 'Supplier submits the invoice',
    previewSub: 'Replaces the email inbox — every invoice is tracked from the moment it arrives.',
    fields: [
      { label: 'Supplier name', type: 'Text', req: true, placeholder: 'Supplier name' },
      { label: 'Supplier email', type: 'Email', req: true, placeholder: 'name@example.com' },
      { label: 'Invoice number', type: 'Text', req: true, placeholder: 'Invoice number' },
      { label: 'Invoice amount', type: 'Text', req: true, placeholder: 'Invoice amount' },
      { label: 'Invoice document', type: 'File', req: true },
    ],
  },
  {
    id: 'review', tab: 'Review', badge: 'Off-platform → monitored', badgeTone: 'purple',
    title: 'Accounts checks it against the purchase order',
    blurb: 'PO check by eye, chased over email → matched on-platform and tracked',
    problem: 'PO matching happens in email threads — nobody can see status until someone asks.',
    solution: 'Matching runs on submit and the queue shows matched, partial, or exception.',
    impact: ['One queue instead of inbox archaeology', 'Exceptions surfaced immediately'],
    previewTitle: 'Accounts checks it against the purchase order',
    previewSub: 'PO match status is visible before anyone approves.',
    fields: [
      { label: 'PO match status', type: 'Select', req: true, opts: ['Matched', 'Partial match', 'No PO found'] },
      { label: 'Variance notes', type: 'Long text', req: false },
    ],
  },
  {
    id: 'approval', tab: 'Approval', badge: 'Manual → automated', badgeTone: 'green',
    title: 'Finance director signs off anything over $10,000',
    blurb: 'Printed again and hand-signed → routed on amount and nudged automatically',
    problem: 'High-value approvals sit on desks because routing depends on someone remembering the threshold.',
    solution: 'Amount rules route to the right approver with reminders until decided.',
    impact: ['No invoices stuck below the radar', 'Approvers see only what needs them'],
    previewTitle: 'Finance director signs off anything over $10,000',
    previewSub: 'Routing and reminders are built into the step.',
    fields: [
      { label: 'Approval decision', type: 'Select', req: true, opts: ['Approve', 'Send back', 'Decline'] },
      { label: 'Approver notes', type: 'Long text', req: false },
    ],
  },
  {
    id: 'payment', tab: 'Payment', badge: 'Sequential → collapsed', badgeTone: 'amber',
    title: 'Payment is scheduled and the supplier is notified',
    blurb: 'Finance marks paid in a separate system → payment status and notice sent together',
    problem: 'Suppliers chase payment status because nothing tells them when money is on the way.',
    solution: 'Payment scheduling and supplier notification are one outcome step.',
    impact: ['Fewer status-chasing emails', 'Closed loop on every invoice'],
    previewTitle: 'Payment is scheduled and the supplier is notified',
    previewSub: 'The supplier gets notified when payment is scheduled.',
    fields: [
      { label: 'Payment date', type: 'Text', req: true, placeholder: 'Scheduled date' },
      { label: 'Notify supplier', type: 'Yes / no', req: false },
    ],
  },
];

const WORKFLOW_BLOCKS = [
  {
    id: 'submit', title: 'Submit', blurb: 'Everything captured once.',
    fields: [
      { label: 'Contact name', type: 'Text', req: true },
      { label: 'Work email', type: 'Email', req: true },
      { label: 'Supporting documents', type: 'File', req: false },
    ],
  },
  {
    id: 'checks', title: 'Automated checks', blurb: 'Smart blocks that run on submit.',
    transform: 'Off-platform review → on-platform and monitored',
    fields: [
      { label: 'Document Analysis', type: 'Smart block', blockType: 'document-analysis', req: false, block: true },
      { label: 'Compliance Rules', type: 'Smart block', blockType: 'compliance-rules', req: false, block: true },
    ],
  },
  {
    id: 'review', title: 'Review and approve', blurb: 'One decision, with the checks already done.',
    transform: 'Manual approval → auto-extract, human decides the exception',
    fields: [
      { label: 'Approvals', type: 'Smart block', blockType: 'approvals', req: false, block: true },
      { label: 'Reviewer notes', type: 'Long text', req: false },
    ],
  },
  {
    id: 'outcome', title: 'Outcome', blurb: 'The applicant is told without anybody remembering.',
    transform: 'Sequential handoffs → collapsed into the decision',
    fields: [
      { label: 'Outcome letter', type: 'Generated', req: false },
      { label: 'Notify by email', type: 'Yes / no', req: false },
    ],
  },
];

const SMART_BLOCKS = {
  'document-analysis': { name: 'Document Analysis', backedBy: 'LLM + OCR' },
  'compliance-rules': { name: 'Compliance Rules', backedBy: 'Rule engine' },
  approvals: { name: 'Approvals', backedBy: 'Workflow state machine' },
};

const QUESTIONS = [
  { q: 'Who starts this process?', opts: ['A customer or applicant', 'Someone in your team', 'Another system, automatically'] },
  { q: 'Does anyone have to approve it before it completes?', opts: ['Yes — one approver', 'Yes — more than one', 'No approval needed'] },
  { q: 'What has to come out the other end?', opts: ['A decision on record', 'A document or letter', 'A record in another system'] },
];

const state = {
  screen: 'understand',
  blocks: false,
  authed: false,
  credits: START_CREDITS,
  stage: 1,
  faults: [],
};

const SCREENS = [
  {
    id: 'enter',
    name: 'Opening',
    note: 'The hand-off from the marketing site — prompt carried in the URL, enter animation, then the builder.',
    uses: [],
    faults: [],
  },
  {
    id: 'understand',
    name: 'Understand',
    note: 'First AI turn: structured business process card. Confirm or refine before anything is built.',
    uses: [],
    faults: [],
  },
  {
    id: 'clarify',
    name: 'Clarify',
    note: 'Three free questions, one at a time, anchored above the composer — not dropped into the transcript.',
    uses: ['stage'],
    stageLabel: 'Question',
    stages: [['1 of 3', 1], ['2 of 3', 2], ['3 of 3', 3]],
    faults: [],
  },
  {
    id: 'workshop',
    name: 'Workshop',
    note: 'Process map on the left, live form preview on the right. The core build experience for Oct 16.',
    uses: ['stage'],
    stageLabel: 'Step expanded',
    stages: [], /* filled from workflow() in renderRail */
    faults: [],
  },
  {
    id: 'improve',
    name: 'Improve',
    note: 'Suggested improvements card in the transcript — apply changes without re-describing the whole process.',
    uses: [],
    faults: [],
  },
  {
    id: 'published',
    name: 'Published',
    note: 'Live link, analytics attribution, republish available. The success state for the no-code path.',
    uses: [],
    faults: [],
  },
  {
    id: 'auth',
    name: 'Sign up gate',
    note: 'Late auth — appears after ~50 credits of value, not at the door. Two-step: email, then workspace.',
    uses: ['stage'],
    stageLabel: 'Step',
    stages: [['Email', 1], ['Workspace', 2]],
    faults: [],
  },
  {
    id: 'credits',
    name: 'Credits fork',
    note: 'Halfway through free credits or empty — top up in-product or exit to CLI on your machine.',
    uses: [],
    faults: [
      {
        id: 'empty',
        name: 'Out of credits',
        note: 'The workflow is safe and stays published. Building more needs credits or the CLI path.',
        out: 'Top up, or switch to building on their machine.',
      },
    ],
  },
  {
    id: 'fit',
    name: 'Fit fork',
    note: 'Triggered when the prompt mentions app, portal, API, integration — this is bigger than a form.',
    uses: [],
    faults: [],
  },
];

function workflow() { return state.blocks ? WORKFLOW_BLOCKS : WORKFLOW_MVP; }
function screen(id = state.screen) { return SCREENS.find((s) => s.id === id); }
function screenStages(s = screen()) {
  if (s.id === 'workshop') {
    return workflow().map((step, i) => [`${i + 1}. ${step.tab || step.title}`, i + 1]);
  }
  return s.stages || [];
}

function stageCount() {
  const stages = screenStages();
  return stages.length || 1;
}

function stage() {
  const stages = screenStages();
  if (!stages.length) return 0;
  return Math.min(Math.max(1, state.stage), stages.length);
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function sentence(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

const stageEl = document.getElementById('stage');
const rail = document.getElementById('rail');
let shell = null;
let lifted = false;

function $(id) { return shell?.querySelector(`#${id}`) || document.getElementById(id); }

async function lift() {
  const res = await fetch('../build-web/builder.html', { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ../build-web/builder.html`);

  const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
  const frame = stageEl.querySelector('.as-frame');

  const take = (sel) => {
    const node = doc.querySelector(sel);
    if (!node) throw new Error(`no ${sel} in build-web/builder.html`);
    frame.appendChild(node);
    return node;
  };

  take('#bdEnter');
  shell = take('.nb-shell');
  take('#authGate');
  lifted = true;

  shell.querySelector('.nb-side')?.removeAttribute('hidden');
  shell.querySelector('.nb-side')?.removeAttribute('aria-hidden');

  document.body.classList.add('nb', 'bd-builder', 'bd-web-app');
  applyVariant();
}

function applyVariant() {
  document.body.dataset.bdBlocks = state.blocks ? 'on' : 'off';
  document.body.classList.toggle('bd-has-blocks', state.blocks);
  document.body.classList.toggle('bd-no-blocks', !state.blocks);
  document.body.classList.toggle('bd-mvp-workshop', !state.blocks);
}

function reset() {
  if (!shell) return;
  document.body.classList.remove('bd-gate', 'bd-fork-open', 'bd-has-preview');
  $('bdEnter').hidden = true;
  $('authGate').hidden = true;
  shell.querySelector('.bd-fork-overlay')?.remove();
  $('bdLog').innerHTML = '';
  $('bdAnchor').innerHTML = '';
  $('bdProcessMap').innerHTML = '';
  $('bdFrame').innerHTML = '';
  $('bdSay').value = '';
  $('bdSay').disabled = true;
  $('bdSend').disabled = true;
  $('bdSuggest').hidden = true;
  $('bdPublish').disabled = true;
  $('bdPublish').textContent = 'Publish';
  document.body.classList.remove('bd-has-preview');
  document.body.dataset.mode = 'editor';
}

function paintMeter() {
  const pct = Math.max(0, Math.round((state.credits / START_CREDITS) * 100));
  $('crLeft').textContent = Math.max(0, state.credits);
  $('crBar').style.width = `${pct}%`;
  const card = $('creditCard');
  card.classList.toggle('warn', state.credits <= 50 && state.credits > 0);
  card.classList.toggle('out', state.credits <= 0);
  $('crLbl').textContent = state.credits <= 0
    ? 'Out of credits'
    : state.credits <= 50
      ? `About ${state.credits >= 40 ? 'one more workflow' : 'half a workflow'} left`
      : state.authed ? 'Builder preview · free' : `${AUTH_CREDITS_USED} free · no account yet`;
}

function paintAccount() {
  if (state.authed) {
    $('wsName').textContent = 'Northwind Group';
    $('wsInitial').textContent = 'N';
    $('wsPlan').textContent = 'Builder preview';
    $('userName').textContent = 'Gareth';
    $('userAv').textContent = 'G';
    $('userName').nextElementSibling.textContent = 'Owner';
  } else {
    $('wsName').textContent = 'Preview';
    $('wsInitial').textContent = '?';
    $('wsPlan').textContent = 'No account yet';
    $('userName').textContent = 'Guest';
    $('userAv').textContent = '?';
    $('userName').nextElementSibling.textContent = 'Sign in to save';
  }
}

function setHeaderStep(uiAt) {
  const uiOrder = ['plan', 'build', 'deploy'];
  shell.querySelectorAll('#bdSteps .st').forEach((el) => {
    const i = uiOrder.indexOf(el.dataset.step);
    el.classList.toggle('on', i === uiAt);
    el.classList.toggle('done', i < uiAt);
  });
}

function bubble(role, html) {
  const row = document.createElement('div');
  row.className = `bd-msg ${role}`;
  row.innerHTML = role === 'user'
    ? `<div class="bd-bub">${html}</div>`
    : `<div class="bd-av">AI</div><div class="bd-bub">${html}</div>`;
  $('bdLog').appendChild(row);
}

function card(html) {
  const row = document.createElement('div');
  row.className = 'bd-msg ai';
  row.innerHTML = `<div class="bd-av">AI</div><div class="bd-card">${html}</div>`;
  $('bdLog').appendChild(row);
  return row;
}

function mvpFieldHtml(f) {
  if (f.type === 'File') {
    return `<div class="bd-pv-field"><label>${esc(f.label)}${f.req ? '<i>*</i>' : ''}</label><div class="ctl file"><span>Choose File</span><span>No file chosen</span></div></div>`;
  }
  return `<div class="bd-pv-field"><label>${esc(f.label)}${f.req ? '<i>*</i>' : ''}</label><div class="ctl">${esc(f.placeholder || f.label)}</div></div>`;
}

function mvpStepperHtml(index) {
  const check = '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const wf = workflow();
  return `<div class="bd-pv-stepper" role="group">${wf.map((s, i) => {
    const cls = ['bd-pv-step', i === index ? 'on' : i < index ? 'done' : 'upcoming'].join(' ');
    const icon = i < index ? `<span class="bd-pv-step-ico">${check}</span>` : i === index ? '<span class="bd-pv-step-dot"></span>' : '<span class="bd-pv-step-ring"></span>';
    return `<button type="button" class="${cls}">${icon}<span class="bd-pv-step-label">${esc(s.tab || s.title)}</span></button>`;
  }).join('')}</div>`;
}

function paintMvpWorkshop(index) {
  const wf = workflow();
  const step = wf[index];
  if (!step) return;
  const fields = step.fields.map(mvpFieldHtml).join('');
  $('bdFrame').innerHTML = `
    <div class="bd-pv-doc bd-pv-mvp">
      <div class="bd-pv-hd"><b>${esc(PROJECT)}</b><span>Draft · only you</span></div>
      <div class="bd-pv-body">
        ${mvpStepperHtml(index)}
        <div class="bd-pv-step-view">
          <div class="bd-pv-step-hd"><h2>${esc(step.previewTitle || step.title)}</h2><p class="sub">${esc(step.previewSub || step.blurb)}</p></div>
          <div class="bd-pv-step-fields">${fields}</div>
        </div>
      </div>
      <span class="bd-pv-watermark">${state.blocks ? 'Smart blocks · prototype' : 'MVP · prototype'}</span>
    </div>`;

  $('bdProcessMap').innerHTML = `
    <div class="bd-pmap-hd">Process</div>
    <div class="bd-pmap-scroll">
      ${wf.map((s, i) => `
        <article class="bd-pstep${i === index ? ' on' : ''}">
          <button class="bd-pstep-head" type="button">
            <span class="bd-pstep-meta">
              ${s.badge ? `<span class="bd-pstep-badge bd-pstep-badge--${s.badgeTone || 'blue'}">${esc(s.badge)}</span>` : ''}
              <span class="bd-pstep-title">${i + 1}. ${esc(s.title)}</span>
            </span>
          </button>
          <p class="bd-pstep-blurb">${esc(s.blurb)}</p>
          ${s.problem ? `<div class="bd-pstep-body"><div class="bd-pstep-block bd-pstep-block--problem"><span class="bd-pstep-block-label">Problem</span><p>${esc(s.problem)}</p></div></div>` : ''}
        </article>`).join('')}
    </div>`;
}

function paintBlocksPreview() {
  const wf = workflow();
  const steps = wf.map((s, i) => `
    <section class="bd-pv-step">
      <header><span class="n">${i + 1}</span><b>${esc(s.title)}</b></header>
      ${s.fields.map((f) => {
        if (f.block) {
          const meta = SMART_BLOCKS[f.blockType] || { name: f.label, backedBy: 'Runs automatically' };
          return `<div class="bd-fld block"><label>${esc(f.label)}</label><div class="ctl blk"><span class="spark">◆</span><span class="blk-body"><b>${esc(meta.name)}</b><span>${esc(meta.backedBy)} · runs automatically</span></span></div></div>`;
        }
        return `<div class="bd-fld"><label>${esc(f.label)}</label><div class="ctl"></div></div>`;
      }).join('')}
    </section>`).join('');
  $('bdFrame').innerHTML = `
    <div class="bd-pv-doc">
      <div class="bd-pv-hd"><b>${esc(PROJECT)}</b><span>Draft · only you</span></div>
      ${steps}
    </div>`;
}

function paintWorkshop(index) {
  document.body.classList.add('bd-has-preview');
  $('bdProjectName').textContent = PROJECT;
  if (state.blocks) paintBlocksPreview();
  else paintMvpWorkshop(index);
  setHeaderStep(1);
  $('bdSay').disabled = false;
  $('bdSend').disabled = false;
  $('bdSuggest').hidden = false;
  $('bdPublish').disabled = false;
}

const PAINT = {
  enter() {
    $('bdEnter').hidden = false;
    $('bdEnterPrompt').textContent = PROMPT;
    $('bdProjectName').textContent = 'New process';
    setHeaderStep(0);
    paintMeter();
    paintAccount();
  },

  understand() {
    $('bdProjectName').textContent = PROJECT;
    setHeaderStep(0);
    paintMeter();
    paintAccount();
    bubble('user', esc(PROMPT));
    bubble('ai', `Right — ${PROMPT}. Here's what I think you're describing. Correct me before I build anything.`);
    card(`
      <div class="bd-bu">
        <div class="hd"><b>Business process card</b><span>My structured understanding — confirm or refine it.</span></div>
        <div class="quote">${esc(sentence(PROMPT))} — today this runs on email and a shared inbox.</div>
        <div class="kv"><span class="i goal">◎</span><div><b>Goal</b><span>Get to a decision without anybody chasing the paperwork.</span></div></div>
        <div class="kv"><span class="i aud">◍</span><div><b>Audience</b><span>The person submitting, and the one or two people who review it.</span></div></div>
        <div class="kv"><span class="i out">✓</span><div><b>Outcome</b><span>A decision on record, with everything it was based on attached.</span></div></div>
        <div class="acts"><button class="nb-btn" type="button">Make changes</button><button class="nb-btn primary" type="button">Looks good — continue</button></div>
      </div>`);
  },

  clarify() {
    $('bdProjectName').textContent = PROJECT;
    setHeaderStep(0);
    paintMeter();
    paintAccount();
    bubble('user', esc(PROMPT));
    bubble('ai', 'Two or three questions, then I\'ll build it. They\'re free — asking you something isn\'t work.');
    const q = QUESTIONS[stage() - 1];
    $('bdAnchor').innerHTML = `
      <div class="bd-clarify bd-clarify--shadcn">
        <div class="bd-cl-hd"><b>Quick questions</b><span>${stage()} of ${QUESTIONS.length} · free</span></div>
        <p class="bd-cl-q">${esc(q.q)}</p>
        <div class="bd-cl-radio">${q.opts.map((o) => `<button type="button">${esc(o)}</button>`).join('')}</div>
        <div class="bd-cl-ft"><input type="text" placeholder="Something else…" /><button class="bd-cl-skip" type="button">Skip — just build it</button></div>
      </div>`;
  },

  workshop() {
    paintWorkshop(stage() - 1);
    bubble('user', esc(PROMPT));
    bubble('ai', state.blocks
      ? 'Here\'s your workflow — smart blocks replace the manual checks step.'
      : 'Here\'s your workflow — expand each step to see the problem, solution, and impact.');
  },

  improve() {
    paintWorkshop(0);
    bubble('user', esc(PROMPT));
    bubble('ai', 'Two things worth changing, both from what usually goes wrong with this shape of process.');
    card(`
      <div class="bd-sugg">
        <b>Suggested improvements</b>
        <div class="s"><div><b>Ask for the reference number up front</b><span>Reviewers look it up 8 times out of 10.</span></div><button class="nb-btn" type="button">Apply</button></div>
        <div class="s"><div><b>Auto-decline after 30 days of no response</b><span>Stops the queue filling with requests nobody is chasing.</span></div><button class="nb-btn" type="button">Apply</button></div>
      </div>`);
    setHeaderStep(1);
  },

  published() {
    paintWorkshop(0);
    $('bdFrame').querySelector('.bd-pv-hd span').textContent = 'Published · anyone with the link';
    $('bdPublish').textContent = 'Republish';
    setHeaderStep(2);
    bubble('ai', 'Published. It\'s on a link you can send to anybody, and every submission is logged against your workspace.');
  },

  auth() {
    paintWorkshop(0);
    const gate = $('authGate');
    gate.hidden = false;
    document.body.classList.add('bd-gate');
    if (stage() === 1) {
      $('wizardStep1').hidden = false;
      $('wizardStep2').hidden = true;
      $('gateLede').textContent = 'Sign up to keep building';
      $('gateEmail').value = '';
    } else {
      $('wizardStep1').hidden = true;
      $('wizardStep2').hidden = false;
      $('wsNameInput').value = 'Northwind Group';
      $('wsCountry').value = 'Australia';
    }
  },

  credits() {
    paintWorkshop(0);
    const empty = state.faults?.includes('empty') || state.credits <= 0;
    const overlay = document.createElement('div');
    overlay.className = 'bd-fork-overlay';
    overlay.innerHTML = `<div class="bd-fork-dialog"><div class="bd-fork-body"><div class="bd-fork" data-fork-step="choose">
      <h4>${empty ? 'You\'re out of credits' : 'You\'re halfway through your free credits'}</h4>
      <p>${empty ? 'The workflow you built is safe and stays published.' : `<b>${state.credits} of ${START_CREDITS}</b> left — about one more workflow.`} Two ways to carry on.</p>
      <div class="bd-opts">
        <a class="bd-opt" href="#"><span class="k">Top up</span><b>${TOPUP.credits} credits · ${TOPUP.price}</b><span class="d">Carry on exactly as you are.</span></a>
        <button class="bd-opt" type="button"><span class="k">Build on your machine</span><b>Your own AI harness · free</b><span class="d">Enterprise AI runs inside Claude Code, Copilot or Codex.</span></button>
      </div>
    </div></div></div>`;
    shell.parentElement.appendChild(overlay);
    document.body.classList.add('bd-fork-open');
  },

  fit() {
    paintWorkshop(0);
    bubble('user', 'Build a supplier portal with a custom dashboard');
    card(`
      <div class="bd-fork fit">
        <h4>This is bigger than a form</h4>
        <p>I can build a process up to four steps and publish it as a form. But <b>portal</b> wants its own code: screens, a repository, integrations. That is what the CLI is for.</p>
        <div class="bd-fork-acts"><button class="nb-btn" type="button">Keep building here</button><button class="nb-btn primary" type="button">Show me the CLI</button></div>
      </div>`);
  },
};

function renderCaption() {
  const s = screen();
  document.getElementById('capName').textContent = s.name;
  document.getElementById('capNote').textContent = s.note;
}

function group(label, note) {
  const g = document.createElement('div');
  g.className = 'rl-group';
  g.innerHTML = `<div class="rl-label">${esc(label)}</div>${note ? `<div class="rl-note">${esc(note)}</div>` : ''}`;
  return g;
}

function renderRail() {
  const s = screen();
  rail.replaceChildren();

  const g1 = group('Screen');
  const sel = document.createElement('select');
  sel.className = 'rl-select';
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
    if (screen().stages) state.stage = 1;
    paint();
  });
  g1.appendChild(sel);
  const keys = document.createElement('div');
  keys.className = 'rl-note';
  keys.innerHTML = '<kbd>←</kbd> <kbd>→</kbd> steps through in order';
  g1.appendChild(keys);
  rail.appendChild(g1);

  const gBlocks = group('Smart blocks', 'Stretch goal — toggle without a second app copy.');
  const pillBlocks = document.createElement('div');
  pillBlocks.className = 'rl-pill';
  [['MVP', false], ['Smart blocks', true]].forEach(([text, on]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rl-chip${state.blocks === on ? ' on' : ''}`;
    b.textContent = text;
    b.addEventListener('click', () => { state.blocks = on; applyVariant(); state.stage = Math.min(state.stage, stageCount()); paint(); });
    pillBlocks.appendChild(b);
  });
  gBlocks.appendChild(pillBlocks);
  rail.appendChild(gBlocks);

  const gAcct = group('Account');
  const pillAcct = document.createElement('div');
  pillAcct.className = 'rl-pill';
  [['Guest', false], ['Signed in', true]].forEach(([text, on]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rl-chip${state.authed === on ? ' on' : ''}`;
    b.textContent = text;
    b.addEventListener('click', () => { state.authed = on; paint(); });
    pillAcct.appendChild(b);
  });
  gAcct.appendChild(pillAcct);
  rail.appendChild(gAcct);

  const gCred = group('Credits');
  const pillCred = document.createElement('div');
  pillCred.className = 'rl-pill';
  [[`${START_CREDITS}`, START_CREDITS], ['50', 50], ['0', 0]].forEach(([text, val]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rl-chip${state.credits === val ? ' on' : ''}`;
    b.textContent = text;
    b.addEventListener('click', () => { state.credits = val; paint(); });
    pillCred.appendChild(b);
  });
  gCred.appendChild(pillCred);
  rail.appendChild(gCred);

  if (s.stages || s.id === 'workshop') {
    const stages = screenStages(s);
    const gStage = group(s.stageLabel || 'Stage');
    const pillStage = document.createElement('div');
    pillStage.className = 'rl-pill';
    stages.forEach(([text, val]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `rl-chip${stage() === val ? ' on' : ''}`;
      b.textContent = text;
      b.addEventListener('click', () => { state.stage = val; paint(); });
      pillStage.appendChild(b);
    });
    gStage.appendChild(pillStage);
    rail.appendChild(gStage);
  }

  if (s.id === 'credits') {
    const gFault = group('State');
    const pill = document.createElement('div');
    pill.className = 'rl-pill';
    [['Halfway', false], ['Empty', true]].forEach(([text, empty]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `rl-chip${(state.faults?.includes('empty') || state.credits <= 0) === empty ? ' on' : ''}`;
      b.textContent = text;
      b.addEventListener('click', () => {
        state.credits = empty ? 0 : 50;
        state.faults = empty ? ['empty'] : [];
        paint();
      });
      pill.appendChild(b);
    });
    gFault.appendChild(pill);
    rail.appendChild(gFault);
  }
}

function writeUrl() {
  const q = new URLSearchParams({ screen: state.screen });
  if (state.blocks) q.set('blocks', '1');
  if (state.authed) q.set('email', 'gareth@northwind.com');
  if (state.credits !== START_CREDITS) q.set('credits', state.credits);
  if (screen().stages || screen().id === 'workshop') q.set('stage', stage());
  history.replaceState(null, '', `?${q}`);
}

function readUrl() {
  const q = new URLSearchParams(location.search);
  const s = screen(q.get('screen'));
  if (s) state.screen = s.id;
  state.blocks = q.get('blocks') === '1';
  state.authed = !!q.get('email');
  const cred = Number(q.get('credits'));
  if (cred >= 0) state.credits = cred;
  if (screen().stages || screen().id === 'workshop') {
    const st = Number(q.get('stage'));
    if (st >= 1) state.stage = st;
  }
}

function paint() {
  reset();
  applyVariant();
  PAINT[state.screen]();
  paintMeter();
  paintAccount();
  renderRail();
  renderCaption();
  writeUrl();
}

function stepBy(n) {
  const i = SCREENS.indexOf(screen()) + n;
  if (i < 0 || i >= SCREENS.length) return;
  state.screen = SCREENS[i].id;
  state.faults = [];
  if (screen().stages) state.stage = 1;
  paint();
}

window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'ArrowLeft') stepBy(-1);
  if (e.key === 'ArrowRight') stepBy(1);
});

function showDead(err) {
  const server = !lifted;
  stageEl.querySelector('.as-frame').innerHTML =
    `<div class="as-dead"><b>${server ? 'This page needs a static server.' : "The app loaded, but this page couldn't drive it."}</b>`
    + (server
      ? '<span>It lifts the real builder out of <code>/build-web</code>. Run <code>python3 serve.py</code> from the repo root.</span>'
      : '<span><code>build-web/builder.html</code> loaded but something it expects is missing.</span>')
    + `<span class="why">${esc(err.message)}</span></div>`;
  console.error('[app-states]', err);
}

lift().then(() => {
  readUrl();
  paint();
}).catch(showDead);
