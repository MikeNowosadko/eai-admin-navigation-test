/* ------------------------------------------------------------------
   /build-sugar — the sugar-hit iteration.

   Same harness as /build, but sign-up waits until ~50 credits of value:
   prompt → builder opens with no auth → plan, generate, iterate — gate
   only when the next billable turn would pass 50 credits used.

   Forked from assets/builder.js so /build stays frozen for comparison.
------------------------------------------------------------------- */

/* ============================ prices ============================== */

/* Credits buy units of work, not words. Nobody can act on "50% used"
   unless they can price the next thing they were about to do, so every
   billable control carries its own number and every charge is shown
   against the message that caused it.

   The arithmetic is deliberate. Understanding (5) plus generating (25)
   is 30, so the first workflow appears with 70 left and the meter has
   said nothing. Two changes at 10 takes it to 50 — which is the first
   moment a person has built something, seen it work, and might have a
   second thing in mind. That is where the fork belongs: after the first
   success, before the second build. Earlier is a toll booth. */
const PRICE = {
  understand: 5,
  clarify: 0,      // asking somebody a question is not billable
  generate: 25,
  change: 10,
  improve: 15,
  publish: 10,
};

const START_CREDITS = 100;
const AUTH_CREDITS_USED = 50; /* free preview — sign in after this much work */
const TOPUP = { credits: 500, price: '$49' };

/** Never show per-action credit prices in the UI (CTAs, message chips). */
const SHOW_CREDIT_COSTS = false;

/* Six planned smart blocks — mirrors eaiNoCodeBuilder `data/smart-blocks.ts`. */
const SMART_BLOCKS = {
  'document-analysis': {
    name: 'Document Analysis',
    purpose: 'Extract structured data, summaries, or criteria from uploaded docs.',
    backedBy: 'LLM + OCR',
    example: 'Pre-filling forms, summarising proposals, tender criteria extraction',
  },
  'ai-chat': {
    name: 'AI Chat',
    purpose: 'Conversational step — gather input, clarify intent, multi-turn tasks.',
    backedBy: 'LLM + workflow context',
    example: 'Builder chat, helping users articulate applications',
  },
  'comparison-table': {
    name: 'Comparison Table',
    purpose: 'Side-by-side scoring against weighted criteria with rationale per cell.',
    backedBy: 'LLM evaluator',
    example: 'RFP evaluation, job screening, grant assessment',
  },
  'document-checklist': {
    name: 'Document Checklist',
    purpose: 'Required docs list, upload tracking, file type/content validation.',
    backedBy: 'Rule engine + classifier',
    example: 'Onboarding ID bundle, development application drawings',
  },
  'compliance-rules': {
    name: 'Compliance Rules',
    purpose: 'Run declared rules → pass/fail with explanation.',
    backedBy: 'Rule engine',
    example: 'Tender mandatory requirements, planning controls',
  },
  approvals: {
    name: 'Approvals',
    purpose: 'Role-based sign-off, comments, resubmit lifecycle, digital signatures.',
    backedBy: 'Workflow state machine',
    example: 'Peer review, determination sign-off, referee approval',
  },
};

function blockMeta(f) {
  return SMART_BLOCKS[f.blockType] || { name: f.label, backedBy: 'Runs automatically', purpose: '' };
}

/* ============================ state =============================== */

const params = new URLSearchParams(location.search);
const BUILDER_STORAGE_PREFIX = 'eai-local-admin:';
const activeAppId = params.get('app') || 'vendor-onboarding';
const buildSurface = params.get('surface') === 'cli' ? 'cli' : 'ncb';

const smartBlocks = params.get('blocks') === '1'
  || params.get('variant') === 'blocks'
  || document.body.dataset.bdBlocks === 'on';

const state = {
  prompt: (params.get('prompt') || 'a new business process').trim(),
  ws: params.get('ws') || 'Preview',
  email: params.get('email') || '',
  authed: !!params.get('email'),
  credits: Number(params.get('credits') || START_CREDITS),
  step: 'describe',
  published: params.get('published') === '1',
  costForkShown: false,
  fitForkShown: false,
  turnsSinceFork: 99,
  extraFields: [],
  busy: false,
  pendingAuth: null,
  authNudgeShown: false,
  runStarted: false,
  continuing: false,
  planRefined: false,
  builderConversationStarted: false,
  inlineReplyHandler: null,
  appChatOpen: true,
  appChatMessages: [
    { role: 'assistant', text: 'Hi! I can help you complete this application or answer questions about onboarding.' },
  ],
  appChatWidth: 405,
  appChatPosition: null,
  buildSurface,
  viewMode: buildSurface === 'cli' ? 'dashboard' : 'preview',
  dashboardSection: ['overview', 'submissions', 'analytics', 'settings', 'users', 'workflow', 'resources', 'ai', 'connections', 'readiness', 'deploy'].includes(params.get('section'))
    ? params.get('section')
    : 'overview',
  dashboardAccess: 'Anyone in workspace',
  dashboardBadge: true,
  activeStep: 0,
  expandedStep: 0,
  previewReady: false,
};

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* What somebody typed is the name of the thing. Asking them to name it
   again, having just described it, is a question with one answer. */
function appNameFromPrompt(prompt) {
  if (/\b(suppliers?|vendors?|procurement)\b/i.test(prompt)) return 'Vendor Onboarding';
  const cleaned = prompt
    .replace(/^(please\s+)?(help\s+me\s+)?(improve|build|create|make|automate)\s+/i, '')
    .replace(/^(how\s+)?(we|our\s+team)\s+/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();
  const words = (cleaned || 'New app').split(/\s+/).slice(0, 6);
  return words.map((word) => /^(and|or|of|the|to|for|in)$/i.test(word)
    ? word.toLowerCase()
    : word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const projectName = params.get('project') || appNameFromPrompt(state.prompt);
const supplierScenario = /\b(suppliers?|vendors?|procurement)\b/i.test(state.prompt);

/* ====================== the workflow it builds ===================== */

/* Four steps with smart blocks (stretch — desirability tests). MVP drops
   the automated-checks step and stays manual review only. */
const WORKFLOW_BLOCKS = [
  {
    id: 'submit', title: 'Submit', blurb: 'Everything captured once, by the person who has it.',
    fields: [
      { label: 'Contact name', type: 'Text', req: true },
      { label: 'Work email', type: 'Email', req: true },
      { label: 'What do you need?', type: 'Select', req: true, opts: ['New request', 'Renewal', 'Change to an existing one'] },
      { label: 'Supporting documents', type: 'File', req: false },
    ],
  },
  {
    id: 'checks', title: 'Automated checks', blurb: 'Was a manual review inbox. Now smart blocks that run on submit.',
    transform: 'Off-platform review → on-platform and monitored',
    fields: [
      { label: 'Document Analysis', type: 'Smart block', blockType: 'document-analysis', req: false, block: true },
      { label: 'Compliance Rules', type: 'Smart block', blockType: 'compliance-rules', req: false, block: true },
    ],
  },
  {
    id: 'review', title: 'Review and approve', blurb: 'One decision, with the checks already done and attached.',
    transform: 'Manual approval → auto-extract, human decides the exception',
    fields: [
      { label: 'Approvals', type: 'Smart block', blockType: 'approvals', req: false, block: true },
      { label: 'Reviewer notes', type: 'Long text', req: false },
    ],
  },
  {
    id: 'outcome', title: 'Outcome', blurb: 'The applicant is told without anybody remembering to tell them.',
    transform: 'Sequential handoffs → collapsed into the decision',
    fields: [
      { label: 'Outcome letter', type: 'Generated', req: false },
      { label: 'Notify by email', type: 'Yes / no', req: false },
    ],
  },
];

const VENDOR_WORKFLOW = [
  {
    id: 'submit',
    tab: 'Supplier details',
    badge: 'Captured once',
    badgeTone: 'blue',
    title: 'Supplier provides their details',
    blurb: 'Scattered forms and email attachments → one guided supplier submission',
    problem: 'Supplier information arrives across email, documents and spreadsheets, creating duplicate entry and incomplete records.',
    solution: 'The supplier provides everything once in a guided form that can be reused throughout onboarding.',
    impact: ['One complete supplier record', 'Less duplicate data entry', 'Clear ownership from the first submission'],
    previewTitle: 'Tell us about your organisation',
    previewSub: 'Create one supplier record that follows the application through every review.',
    fields: [
      { label: 'Supplier name', type: 'Text', req: true, placeholder: 'Supplier name' },
      { label: 'Supplier email', type: 'Email', req: true, placeholder: 'name@example.com', hint: 'Status updates are sent here.' },
      { label: 'Business number', type: 'Text', req: true, placeholder: 'ABN or company number' },
      { label: 'Goods or services supplied', type: 'Long text', req: true, placeholder: 'Describe what you provide' },
      { label: 'Supporting documents', type: 'File', req: true },
    ],
  },
  {
    id: 'review',
    tab: 'Checks',
    badge: 'Off-platform → monitored',
    badgeTone: 'purple',
    title: 'Run supplier checks',
    blurb: 'Manual checks across several systems → one visible compliance stage',
    problem: 'Compliance checks are completed in different places, so progress and missing evidence are difficult to see.',
    solution: 'Each required check is tracked in one stage, with exceptions clearly identified for review.',
    impact: ['Faster compliance review', 'Missing documents surfaced early', 'A complete audit trail'],
    previewTitle: 'Supplier checks',
    previewSub: 'Track the checks required before this supplier can be approved.',
    fields: [
      { label: 'Identity check', type: 'Select', req: true, opts: ['Passed', 'Needs review', 'Not started'] },
      { label: 'Insurance verified', type: 'Select', req: true, opts: ['Verified', 'Missing', 'Not required'] },
      { label: 'Compliance notes', type: 'Long text', req: false, placeholder: 'Record any exceptions' },
    ],
  },
  {
    id: 'approval',
    tab: 'Review',
    badge: 'Manual → automated',
    badgeTone: 'green',
    title: 'Procurement reviews the application',
    blurb: 'Email chains and manual handoffs → one assigned review with a recorded decision',
    problem: 'Applications wait in shared inboxes because it is unclear who owns the next decision.',
    solution: 'The application is routed to the right reviewer with its checks and supporting evidence attached.',
    impact: ['A clear review owner', 'Fewer status-chasing emails', 'Decisions recorded with their evidence'],
    previewTitle: 'Procurement review',
    previewSub: 'Review the supplier record and every completed check in one place.',
    fields: [
      { label: 'Recommendation', type: 'Select', req: true, opts: ['Approve', 'Request more information', 'Decline'] },
      { label: 'Reviewer notes', type: 'Long text', req: false },
    ],
  },
  {
    id: 'outcome',
    tab: 'Outcome',
    badge: 'Sequential → collapsed',
    badgeTone: 'amber',
    title: 'Supplier is approved and notified',
    blurb: 'Separate system updates and manual messages → one recorded outcome',
    problem: 'The supplier and internal teams often receive different or delayed status updates.',
    solution: 'Approval, activation and notification happen together from one recorded decision.',
    impact: ['One source of truth', 'Immediate supplier notification', 'A closed onboarding record'],
    previewTitle: 'Confirm the outcome',
    previewSub: 'Record the decision and notify the supplier from the same step.',
    fields: [
      { label: 'Final decision', type: 'Select', req: true, opts: ['Approved', 'More information required', 'Declined'] },
      { label: 'Supplier ID', type: 'Text', req: false, placeholder: 'Generated when approved' },
      { label: 'Notify supplier', type: 'Yes / no', req: false },
    ],
  },
];

const GENERIC_WORKFLOW = [
  {
    id: 'submit', tab: 'Submit', badge: 'Captured once', badgeTone: 'blue',
    title: 'Someone submits a request', blurb: 'Email and disconnected forms → one guided submission',
    problem: 'Information arrives in different formats and has to be entered more than once.',
    solution: 'The requester supplies the required information once in a consistent form.',
    impact: ['A complete request from the start', 'Less duplicate entry', 'A visible starting point'],
    previewTitle: 'Submit your request', previewSub: 'Provide the information the team needs to begin.',
    fields: [
      { label: 'Requester name', type: 'Text', req: true, placeholder: 'Full name' },
      { label: 'Work email', type: 'Email', req: true, placeholder: 'name@example.com' },
      { label: 'Request details', type: 'Long text', req: true, placeholder: 'Describe what you need' },
      { label: 'Supporting documents', type: 'File', req: false },
    ],
  },
  {
    id: 'review', tab: 'Review', badge: 'Off-platform → monitored', badgeTone: 'purple',
    title: 'The team reviews the details', blurb: 'Shared inbox triage → one owned review stage',
    problem: 'Requests can wait without a clear owner or visible status.',
    solution: 'Each request is assigned and reviewed with its supporting information attached.',
    impact: ['Clear ownership', 'Faster review', 'Visible progress'],
    previewTitle: 'Review the request', previewSub: 'Check the details and record anything that needs attention.',
    fields: [
      { label: 'Review status', type: 'Select', req: true, opts: ['Ready', 'More information needed', 'On hold'] },
      { label: 'Reviewer notes', type: 'Long text', req: false },
    ],
  },
  {
    id: 'approval', tab: 'Decision', badge: 'Manual → automated', badgeTone: 'green',
    title: 'An owner makes the decision', blurb: 'Manual chasing → a routed, recorded decision',
    problem: 'Approvals depend on someone knowing who to chase next.',
    solution: 'The request is routed to the right decision-maker with reminders and context.',
    impact: ['Fewer handoffs', 'Decisions made with context', 'A reliable audit trail'],
    previewTitle: 'Make a decision', previewSub: 'Record the outcome and any conditions.',
    fields: [
      { label: 'Decision', type: 'Select', req: true, opts: ['Approve', 'Request changes', 'Decline'] },
      { label: 'Decision notes', type: 'Long text', req: false },
    ],
  },
  {
    id: 'outcome', tab: 'Outcome', badge: 'Sequential → collapsed', badgeTone: 'amber',
    title: 'The requester is notified', blurb: 'Manual follow-up → an automatic, recorded outcome',
    problem: 'People chase updates because decisions and notifications happen separately.',
    solution: 'The recorded decision triggers a clear notification and closes the request.',
    impact: ['Immediate status updates', 'One source of truth', 'A closed record'],
    previewTitle: 'Send the outcome', previewSub: 'Confirm the final status and notify the requester.',
    fields: [
      { label: 'Outcome summary', type: 'Long text', req: true, placeholder: 'Explain the outcome' },
      { label: 'Notify requester', type: 'Yes / no', req: false },
    ],
  },
];

const WORKFLOW_MVP = supplierScenario ? VENDOR_WORKFLOW : GENERIC_WORKFLOW;

const WORKFLOW = smartBlocks ? WORKFLOW_BLOCKS : WORKFLOW_MVP;

if (smartBlocks) document.body.classList.add('bd-has-blocks');
else document.body.classList.add('bd-no-blocks');

/* Words that mean "this is not a form". Deliberately literal: the fit
   fork should fire on what somebody actually typed, not on a guess
   about what they meant. */
const APP_WORDS = /\b(app|application|portal|dashboard|website|web site|mobile|ios|android|api|integration|integrate|sync|crm|erp|database|repo|repository|custom (ui|screen|code)|microservice|platform)\b/i;

/* ============================ chrome ============================== */

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
    $('wsName').textContent = state.ws;
    $('wsInitial').textContent = state.ws.charAt(0).toUpperCase();
    $('wsPlan').textContent = 'Builder preview';
    const name = state.email.split('@')[0].replace(/\./g, ' ');
    $('userName').textContent = name.charAt(0).toUpperCase() + name.slice(1);
    $('userAv').textContent = name.charAt(0).toUpperCase();
    $('userName').nextElementSibling.textContent = 'Owner';
    $('crLbl').textContent = state.credits <= 50 && state.credits > 0
      ? `About ${state.credits >= 40 ? 'one more workflow' : 'half a workflow'} left`
      : 'Builder preview · free';
  } else {
    $('wsName').textContent = 'Preview';
    $('wsInitial').textContent = '?';
    $('wsPlan').textContent = 'No account yet';
    $('userName').textContent = 'Guest';
    $('userAv').textContent = '?';
    $('userName').nextElementSibling.textContent = 'Sign in to save';
  }
}

function setStep(step) {
  state.step = step;
  const order = ['describe', 'generate', 'improve', 'publish'];
  const uiOrder = ['plan', 'build', 'deploy'];
  const at = order.indexOf(step);

  /* Header breadcrumb — Plan · Build · Deploy (gopher stages) */
  const uiAt = step === 'describe' ? 0 : step === 'publish' ? 2 : 1;
  document.querySelectorAll('#bdSteps .st').forEach((el) => {
    const i = uiOrder.indexOf(el.dataset.step);
    el.classList.toggle('on', i === uiAt);
    el.classList.toggle('done', i < uiAt);
  });

  /* Hero stage cards when present in builder chrome */
  document.querySelectorAll('.bd-stage-card[data-stage]').forEach((el) => {
    const i = uiOrder.indexOf(el.dataset.stage);
    el.classList.toggle('on', i === uiAt);
    el.classList.toggle('done', i < uiAt);
  });
}

/* ============================ transcript ========================== */

const log = () => $('bdLog');

function assistantAvatar(extraClass = '') {
  return `<div class="bd-av bd-av-eai${extraClass ? ` ${extraClass}` : ''}" aria-label="Enterprise AI">
    <img src="../assets/logos/eai-mark-dark.svg" alt="" />
  </div>`;
}

function scroll() {
  const l = log();
  l.scrollTop = l.scrollHeight;
}

function bubble(role, html, cost) {
  const row = document.createElement('div');
  row.className = `bd-msg ${role}`;
  row.innerHTML = role === 'user'
    ? `<div class="bd-bub">${html}</div>`
    : `${assistantAvatar()}<div class="bd-bub">${html}</div>`;
  if (cost && SHOW_CREDIT_COSTS) {
    const chip = document.createElement('span');
    chip.className = 'bd-spent';
    chip.textContent = `−${cost}`;
    chip.title = `${cost} credits`;
    row.querySelector('.bd-bub').appendChild(chip);
  }
  log().appendChild(row);
  scroll();
  return row;
}

/** An assistant message whose body is a card rather than a sentence. */
function card(html) {
  const row = document.createElement('div');
  row.className = 'bd-msg ai';
  row.innerHTML = `${assistantAvatar()}<div class="bd-card">${html}</div>`;
  log().appendChild(row);
  scroll();
  return row;
}

function showAssistantWaiting() {
  const row = document.createElement('div');
  row.className = 'bd-msg ai bd-thinking';
  row.innerHTML = assistantAvatar('bd-av-waiting');
  log().appendChild(row);
  scroll();
  return row;
}

async function thinking(ms = 900) {
  const row = showAssistantWaiting();
  await wait(ms);
  row.remove();
}

/** Type an assistant line out, the way a stream arrives. */
async function say(text, cost) {
  const row = bubble('ai', '', cost);
  const b = row.querySelector('.bd-bub');
  const chip = b.querySelector('.bd-spent');
  const t = document.createElement('span');
  b.insertBefore(t, chip || null);
  for (let i = 0; i < text.length; i += 2) {
    t.textContent = text.slice(0, i + 2);
    if (i % 12 === 0) scroll();
    await wait(9);
  }
  t.textContent = text;
  scroll();
  return row;
}

/* ============================ the ledger ========================== */

/* Spend, repaint, nudge when the free preview is used up. */
function creditsUsed() {
  return START_CREDITS - state.credits;
}

/** True when the next billable turn would exceed the free preview. */
function authRequiredFor(cost) {
  return !state.authed && state.previewReady;
}

function requireAuth(cost, resume) {
  if (state.authed || !authRequiredFor(cost)) return true;
  state.pendingAuth = resume;
  showAuthGate();
  return false;
}

function charge(kind) {
  const cost = PRICE[kind] || 0;
  state.credits = Math.max(0, state.credits - cost);
  state.turnsSinceFork += 1;
  paintMeter();
  maybeAuthNudge();
  return cost;
}

async function maybeAuthNudge() {
  if (state.authed || state.authNudgeShown || creditsUsed() < AUTH_CREDITS_USED) return;
  state.authNudgeShown = true;
  await wait(400);
  await say('That\'s the free preview — sign in when you\'re ready to keep going. Your workflow stays here.');
}

function forkDue() {
  if (state.credits <= 0) return 'empty';
  if (!state.costForkShown && state.credits <= START_CREDITS / 2) return 'cost';
  return null;
}

/* ============================ forks =============================== */

/* Two forks, one destination, and they must never fire on the same
   turn — a person told in one breath that they are running out of
   credits and that they are building the wrong kind of thing hears
   neither. The fit fork yields; the cost fork is time-critical. */

let creditsDialog = null;

const FORK_CLOSE = `
  <button type="button" class="bd-fork-close" data-dismiss aria-label="Close">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </button>`;

function wrapForkDialog(body, foot = '') {
  return `${FORK_CLOSE}<div class="bd-fork-body">${body}</div>${foot ? `<div class="bd-fork-foot">${foot}</div>` : ''}`;
}

function creditsForkHtml(empty) {
  return wrapForkDialog(`
    <div class="bd-fork" data-fork-step="choose">
      <h4>${empty ? 'You&rsquo;re out of credits' : 'You&rsquo;re halfway through your free credits'}</h4>
      <p>
        ${empty
          ? 'The workflow you built is safe and stays published. Building more needs credits.'
          : `<b>${state.credits} of ${START_CREDITS}</b> left &mdash; about one more workflow like this one.`}
        Two ways to carry on, and one of them is free.
      </p>

      <div class="bd-opts">
        <a class="bd-opt" href="plans.html" data-keep>
          <span class="k">Top up</span>
          <b>${TOPUP.credits} credits &middot; ${TOPUP.price}</b>
          <span class="d">Carry on exactly as you are. Nothing to install, nothing to move.</span>
        </a>

        <button class="bd-opt" type="button" data-go-cli>
          <span class="k">Build on your machine</span>
          <b>Your own AI harness &middot; free</b>
          <span class="d">
            Enterprise AI runs inside Claude Code, Copilot or Codex, so the AI
            subscription you already pay for does the work &mdash; not ours.
            <i>${esc(projectName)}</i> comes with you.
          </span>
        </button>
      </div>

      ${empty ? '' : '<button class="bd-later" type="button" data-dismiss-soft>Not now &mdash; keep building</button>'}
    </div>`);
}

const NPX_CMD = 'npx install eai';

function creditsInstallHtml() {
  return wrapForkDialog(`
    <div class="bd-fork bd-fork-install" data-fork-step="install">
      <h4>Get started with the EAI Setup app</h4>

      <div class="nb-note bd-fork-alert">
        <span class="ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.9"/><path d="M12 11v5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.8" r="1.15" fill="currentColor"/></svg>
        </span>
        <span class="tx">
          <span><i>${esc(projectName)}</i> comes with you into Claude Code, Copilot or Codex.</span>
        </span>
      </div>

      <div class="bd-fork-cli">
        <div class="nb-get">
          <div class="nb-row">
            <span class="tx">Download the app</span>
            <button class="nb-btn primary" type="button" data-download-app>Download EAI Setup app &middot; 84 MB</button>
          </div>
        </div>

        <div class="nb-install">
          <span class="lbl">Or install it yourself</span>
          <div class="nb-cmd">
            <span class="pfx">$</span>
            <code>${NPX_CMD}</code>
            <button class="copy" type="button" data-copy-cmd>COPY</button>
          </div>
        </div>
      </div>
    </div>`, `
    <button type="button" class="bd-fork-back" data-back>Back</button>`);
}

function wireCreditsChooseStep(overlay, empty) {
  const topup = overlay.querySelector('[data-keep]');
  topup.setAttribute('href', window.bdCarry('plans.html', { ws: state.ws, email: state.email, project: projectName }));

  overlay.querySelector('[data-go-cli]').addEventListener('click', () => {
    showCreditsInstallStep(overlay, empty);
  });

  const later = overlay.querySelector('[data-dismiss-soft]');
  if (later) later.addEventListener('click', () => closeCreditsDialog());

  overlay.querySelector('[data-dismiss]').addEventListener('click', () => closeCreditsDialog());
}

function wireCreditsInstallStep(overlay, empty) {
  overlay.querySelector('[data-back]').addEventListener('click', () => {
    showCreditsChooseStep(overlay, empty);
  });

  const download = overlay.querySelector('[data-download-app]');
  const downloadLabel = download.textContent;
  download.addEventListener('click', () => {
    const r = download.getBoundingClientRect();
    tell({
      action: 'download-app',
      data: { app: 'EAI Setup', rect: { left: r.left, top: r.top, width: r.width, height: r.height } },
    });
    tell({ action: 'context', data: { workspace: state.ws, email: state.email, project: projectName } });
    download.textContent = 'Downloading…';
    download.disabled = true;
    setTimeout(() => {
      download.textContent = downloadLabel;
      download.disabled = false;
    }, 2600);
  });

  const copy = overlay.querySelector('[data-copy-cmd]');
  copy.addEventListener('click', () => {
    navigator.clipboard?.writeText(NPX_CMD).catch(() => {});
    tell({ action: 'copied', data: { text: NPX_CMD } });
    copy.textContent = 'COPIED';
    setTimeout(() => { copy.textContent = 'COPY'; }, 1600);
  });

  overlay.querySelector('[data-dismiss]').addEventListener('click', () => closeCreditsDialog());
}

function showCreditsChooseStep(overlay, empty) {
  const dialog = overlay.querySelector('.bd-fork-dialog');
  dialog.classList.remove('bd-fork-dialog--install');
  dialog.innerHTML = creditsForkHtml(empty);
  dialog.querySelector('h4').id = 'bdForkTitle';
  wireCreditsChooseStep(overlay, empty);
}

function showCreditsInstallStep(overlay, empty) {
  const dialog = overlay.querySelector('.bd-fork-dialog');
  dialog.classList.add('bd-fork-dialog--install');
  dialog.innerHTML = creditsInstallHtml();
  dialog.querySelector('h4').id = 'bdForkTitle';
  wireCreditsInstallStep(overlay, empty);
}

function closeCreditsDialog(then) {
  if (!creditsDialog) {
    then?.();
    return;
  }
  document.body.classList.add('bd-fork-leaving');
  setTimeout(() => {
    creditsDialog.remove();
    creditsDialog = null;
    document.body.classList.remove('bd-fork-open', 'bd-fork-leaving');
    then?.();
  }, 320);
}

/** Credits fork — a dialog over the builder, not a card in the transcript. */
function costFork() {
  if (creditsDialog) return;
  state.costForkShown = true;
  state.turnsSinceFork = 0;
  const empty = state.credits <= 0;

  const overlay = document.createElement('div');
  overlay.className = 'bd-fork-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'bdForkTitle');
  overlay.innerHTML = '<div class="bd-fork-dialog"></div>';

  document.body.appendChild(overlay);
  document.body.classList.add('bd-fork-open');
  creditsDialog = overlay;

  showCreditsChooseStep(overlay, empty);
}

function fitFork(trigger) {
  state.fitForkShown = true;
  state.turnsSinceFork = 0;
  const el = card(`
    <div class="bd-fork fit">
      <h4>This is bigger than a form</h4>
      <p>
        I can turn a process of up to four steps into an app with
        analytics behind it &mdash; that part I&rsquo;ll finish here.
        ${trigger ? `But <b>${esc(trigger)}</b> wants its own code:` : 'But what you&rsquo;ve described wants its own code:'}
        screens of its own, a repository, integrations that don&rsquo;t exist as a
        smart block yet. That is what the CLI is for.
      </p>
      <p class="bd-fine">
        You&rsquo;d be building in Claude Code, Copilot or Codex against a folder on
        your Mac, with <i>${esc(projectName)}</i> already in it &mdash; not starting again.
      </p>
      <div class="bd-fork-acts">
        <button class="nb-btn" type="button" data-dismiss>Keep building here</button>
        <button class="nb-btn primary" type="button" data-go-cli>Show me the CLI</button>
      </div>
    </div>
  `);
  el.querySelector('[data-go-cli]').addEventListener('click', () => goCli('fit'));
  el.querySelector('[data-dismiss]').addEventListener('click', () => {
    el.classList.add('bd-dismissed');
    el.querySelector('.bd-fork-acts').remove();
    void say('Fair enough — staying here. Say the word if it stops fitting.');
  });
}

/** The exit. Everything a person built is named in the URL, because the
    whole offer depends on it arriving at the other end. */
function goCli(why) {
  const appHandoff = state.buildSurface === 'ncb' && why !== 'workspace-drawer';
  location.href = window.bdCarry(appHandoff ? 'builder.html' : 'ws-cli.html', {
    demo: 'michael',
    ws: state.ws,
    email: state.email,
    project: projectName,
    ...(appHandoff ? { app: activeAppId, surface: 'ncb', view: 'dashboard', section: 'overview', cliSetup: '1', drawer: 'open', published: state.published ? '1' : '0' } : {}),
    from: why,
  });
}

/* ============================ preview ============================= */

function mvpFieldHtml(f) {
  const ph = f.placeholder || f.label;
  if (f.type === 'File') {
    return `
      <div class="bd-pv-field">
        <label>${esc(f.label)}${f.req ? '<i>*</i>' : ''}</label>
        <div class="ctl file"><span>Choose File</span><span>No file chosen</span></div>
      </div>`;
  }
  return `
    <div class="bd-pv-field">
      <label>${esc(f.label)}${f.req ? '<i>*</i>' : ''}</label>
      ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}
      <div class="ctl">${esc(ph)}</div>
    </div>`;
}

function appChatWidgetHtml() {
  const star = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2Z" fill="currentColor"/></svg>';
  const messages = state.appChatMessages.map((message) => `
    <div class="bd-app-chat-message ${message.role}">${esc(message.text)}</div>`).join('');
  return `
    <aside class="bd-app-chat${state.appChatOpen ? '' : ' is-closed'}" style="--bd-app-chat-width:${state.appChatWidth}px" aria-label="Supplier assistant chatbot" data-app-chat>
      <button class="bd-app-chat-launcher" type="button" data-app-chat-open aria-label="Open supplier assistant">${star}</button>
      <div class="bd-app-chat-panel">
        <span class="bd-app-chat-resize" data-app-chat-resize role="separator" aria-label="Resize supplier assistant" title="Drag to resize"></span>
        <div class="bd-app-chat-head" data-app-chat-drag title="Drag to move">
          <span class="bd-app-chat-mark">${star}</span>
          <div><b>Supplier assistant</b></div>
          <button class="bd-app-chat-close" type="button" data-app-chat-close aria-label="Close supplier assistant">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="bd-app-chat-messages" data-app-chat-messages>${messages}</div>
        <form class="bd-app-chat-input" data-app-chat-form>
          <input type="text" aria-label="Ask the supplier assistant" placeholder="Ask a question&hellip;" />
          <button type="submit" aria-label="Send question">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </div>
    </aside>`;
}

function appAssistantResponse(text) {
  if (/document|certificate|insurance|upload/i.test(text)) {
    return 'You’ll need the supplier’s registration details, insurance certificates and any required compliance documents. I can help you check each one.';
  }
  if (/status|progress|where|track/i.test(text)) {
    return 'You can track each stage at the top of the app. I’ll also let you know if anything is missing before it moves to review.';
  }
  if (/bank|payment|tax|abn/i.test(text)) {
    return 'Add the supplier’s business number, tax details and verified payment information. Sensitive payment details can be collected in a protected step.';
  }
  if (/name|email|contact|field|form/i.test(text)) {
    return 'Start with the supplier name and work email, then add any business details your review team needs. I can explain what belongs in each field.';
  }
  if (/check|review|approve|decision/i.test(text)) {
    return 'This app moves from supplier details through checks and review to a recorded outcome. Select a stage above to preview what happens there.';
  }
  return 'I can help with that. Tell me what you’re trying to complete, and I’ll guide you to the right part of the application.';
}

function renderAppChatMessages(host) {
  const list = host?.querySelector('[data-app-chat-messages]');
  if (!list) return;
  list.innerHTML = state.appChatMessages.map((message) => `
    <div class="bd-app-chat-message ${message.role}">${esc(message.text)}</div>`).join('');
  list.scrollTop = list.scrollHeight;
}

function wireAppChatWidget() {
  const host = $('bdFrame').querySelector('[data-app-chat]');
  const form = $('bdFrame').querySelector('[data-app-chat-form]');
  if (!host || !form) return;
  const input = form.querySelector('input');
  const frame = $('bdFrame');
  const launcher = host.querySelector('[data-app-chat-open]');
  let suppressLauncherClick = false;

  const isMobileFullscreen = () => frame.dataset.device === 'mobile' && !host.classList.contains('is-closed');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const constrainPosition = () => {
    if (!state.appChatPosition || isMobileFullscreen()) return;
    const parent = host.offsetParent;
    if (!parent) return;
    const maxLeft = Math.max(8, parent.clientWidth - host.offsetWidth - 8);
    const maxTop = Math.max(8, parent.clientHeight - host.offsetHeight - 8);
    const left = clamp(state.appChatPosition.left, 8, maxLeft);
    const top = clamp(state.appChatPosition.top, 8, maxTop);
    state.appChatPosition = { left, top };
    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
  };

  const makeDraggable = (handle) => {
    handle.addEventListener('pointerdown', (event) => {
      const pressedControl = event.target.closest('button, input');
      if (event.button !== 0 || (pressedControl && handle !== launcher) || isMobileFullscreen()) return;
      event.preventDefault();
      const parent = host.offsetParent;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = hostRect.left - parentRect.left;
      const startTop = hostRect.top - parentRect.top;
      let moved = false;

      handle.setPointerCapture(event.pointerId);
      host.classList.add('is-dragging');

      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        const maxLeft = Math.max(8, parent.clientWidth - host.offsetWidth - 8);
        const maxTop = Math.max(8, parent.clientHeight - host.offsetHeight - 8);
        const left = clamp(startLeft + dx, 8, maxLeft);
        const top = clamp(startTop + dy, 8, maxTop);
        state.appChatPosition = { left, top };
        host.style.left = `${left}px`;
        host.style.top = `${top}px`;
        host.style.right = 'auto';
        host.style.bottom = 'auto';
      };

      const onUp = () => {
        host.classList.remove('is-dragging');
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        if (moved && handle === launcher) {
          suppressLauncherClick = true;
          window.setTimeout(() => { suppressLauncherClick = false; }, 120);
        }
      };

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    });
  };

  const resizeHandle = host.querySelector('[data-app-chat-resize]');
  resizeHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || isMobileFullscreen()) return;
    event.preventDefault();
    const parent = host.offsetParent;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const startX = event.clientX;
    const startWidth = hostRect.width;
    const fixedRight = hostRect.right - parentRect.left;
    const maxWidth = Math.max(320, Math.min(680, fixedRight - 8));

    resizeHandle.setPointerCapture(event.pointerId);
    host.classList.add('is-resizing');

    const onMove = (moveEvent) => {
      const width = clamp(startWidth + startX - moveEvent.clientX, 320, maxWidth);
      const left = fixedRight - width;
      state.appChatWidth = Math.round(width);
      state.appChatPosition = { left, top: hostRect.top - parentRect.top };
      host.style.setProperty('--bd-app-chat-width', `${width}px`);
      host.style.left = `${left}px`;
      host.style.top = `${state.appChatPosition.top}px`;
      host.style.right = 'auto';
      host.style.bottom = 'auto';
    };

    const onUp = () => {
      host.classList.remove('is-resizing');
      resizeHandle.removeEventListener('pointermove', onMove);
      resizeHandle.removeEventListener('pointerup', onUp);
      resizeHandle.removeEventListener('pointercancel', onUp);
      constrainPosition();
    };

    resizeHandle.addEventListener('pointermove', onMove);
    resizeHandle.addEventListener('pointerup', onUp);
    resizeHandle.addEventListener('pointercancel', onUp);
  });

  makeDraggable(host.querySelector('[data-app-chat-drag]'));
  makeDraggable(launcher);
  constrainPosition();

  host.querySelector('[data-app-chat-close]').addEventListener('click', () => {
    state.appChatOpen = false;
    host.classList.add('is-closed');
    window.requestAnimationFrame(constrainPosition);
  });
  launcher.addEventListener('click', () => {
    if (suppressLauncherClick) {
      suppressLauncherClick = false;
      return;
    }
    state.appChatOpen = true;
    host.classList.remove('is-closed');
    window.requestAnimationFrame(() => {
      constrainPosition();
      input.focus();
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    state.appChatMessages.push({ role: 'user', text: question });
    input.value = '';
    renderAppChatMessages(host);
    window.setTimeout(() => {
      state.appChatMessages.push({ role: 'assistant', text: appAssistantResponse(question) });
      renderAppChatMessages($('bdFrame').querySelector('[data-app-chat]'));
    }, 420);
  });
}

/** Pill stepper — matches WorkflowStepper in eaiNoCodeBuilder workflow-form. */
function mvpStepperHtml(index) {
  const check = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const steps = WORKFLOW.map((s, i) => {
    const isComplete = i < index;
    const isCurrent = i === index;
    const label = esc(s.tab || s.shortTitle || s.title);
    const cls = ['bd-pv-step'];
    if (isCurrent) cls.push('on');
    else if (isComplete) cls.push('done');
    else cls.push('upcoming');

    const icon = isComplete
      ? `<span class="bd-pv-step-ico">${check}</span>`
      : isCurrent
        ? '<span class="bd-pv-step-dot" aria-hidden="true"></span>'
        : '<span class="bd-pv-step-ring" aria-hidden="true"></span>';

    return `<button type="button" class="${cls.join(' ')}" data-step="${i}"${
      isCurrent ? ' aria-current="step"' : ''
    } aria-label="Step ${i + 1}: ${label}">${icon}<span class="bd-pv-step-label">${label}</span></button>`;
  }).join('');

  return `<div class="bd-pv-stepper" role="group" aria-label="Form steps">${steps}</div>`;
}

function paintMvpPreviewStep(index) {
  const step = WORKFLOW[index];
  if (!step) return;
  state.activeStep = index;

  const extra = state.extraFields.filter((f) => f.stepId === step.id);
  const fields = [...step.fields, ...extra].map(mvpFieldHtml).join('');

  $('bdFrame').innerHTML = `
    <div class="bd-pv-doc bd-pv-mvp">
      <div class="bd-pv-hd">
        <b>${esc(projectName)}</b>
        <span>${state.published ? 'Published · anyone with the link' : 'Draft · only you'}</span>
      </div>
      <div class="bd-pv-body">
        ${mvpStepperHtml(index)}
        <div class="bd-pv-step-view">
          <div class="bd-pv-step-hd">
            <h2>${esc(step.previewTitle || step.title)}</h2>
            <p class="sub">${esc(step.previewSub || step.blurb)}</p>
          </div>
          <div class="bd-pv-step-fields">${fields}</div>
        </div>
      </div>
      ${appChatWidgetHtml()}
      <span class="bd-pv-watermark">MVP · prototype</span>
    </div>`;

  wireAppChatWidget();

  $('bdFrame').querySelectorAll('.bd-pv-step').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.step);
      state.activeStep = i;
      state.expandedStep = i;
      paintMvpPreviewStep(i);
      paintProcessMap();
    });
  });
}

function paintProcessMap() {
  const host = $('bdProcessMap');
  if (!host) return;

  host.innerHTML = `
    <div class="bd-pmap-hd">Process</div>
    <div class="bd-pmap-scroll" id="bdPmapScroll">
      ${WORKFLOW.map((s, i) => `
        <article class="bd-pstep${i === state.expandedStep ? ' on' : ''}" data-step="${i}">
          <button class="bd-pstep-head" type="button" data-toggle="${i}">
            <span class="bd-pstep-meta">
              <span class="bd-pstep-badge bd-pstep-badge--${s.badgeTone || 'blue'}">${esc(s.badge || '')}</span>
              <span class="bd-pstep-title">${i + 1}. ${esc(s.title)}</span>
            </span>
            <svg class="bd-pstep-chev" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <p class="bd-pstep-blurb">${esc(s.blurb)}</p>
          <div class="bd-pstep-body">
            <div class="bd-pstep-block bd-pstep-block--problem">
              <span class="bd-pstep-block-label">Problem</span>
              <p>${esc(s.problem || '')}</p>
            </div>
            <div class="bd-pstep-block bd-pstep-block--solution">
              <span class="bd-pstep-block-label">Solution</span>
              <p>${esc(s.solution || '')}</p>
            </div>
            ${s.impact ? `
            <div class="bd-pstep-block bd-pstep-block--impact">
              <span class="bd-pstep-block-label">Impact</span>
              <ul>${s.impact.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>` : ''}
          </div>
        </article>`).join('')}
    </div>`;

  host.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.toggle);
      state.expandedStep = state.expandedStep === i ? -1 : i;
      state.activeStep = i;
      paintProcessMap();
      paintMvpPreviewStep(i);
    });
  });
}

async function enterMvpWorkshop() {
  document.body.classList.add('bd-workshop-transition');
  state.previewReady = true;
  state.activeStep = 0;
  state.expandedStep = 0;
  paintMvpPreviewStep(0);
  if ($('bdProjectName')) $('bdProjectName').textContent = state.authed ? projectName : 'Process';

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.body.classList.add('bd-has-preview', 'bd-mvp-workshop');
  await wait(860);

  document.body.classList.add('bd-workshop-content-swap');
  await wait(200);
  startBuilderConversation();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  document.body.classList.remove('bd-workshop-content-swap');
  await wait(260);
  document.body.classList.remove('bd-workshop-transition');
}

function startBuilderConversation() {
  if (state.builderConversationStarted) return;
  state.builderConversationStarted = true;
  $('bdLog').innerHTML = '';
  $('bdAnchor').innerHTML = '';

  bubble('ai', 'Your first version is ready. I&rsquo;ve organised the app below so we can improve it together. What would you like to change?');
  const guide = card(`
    <div class="bd-builder-guide">
      <div class="bd-builder-guide-head">
        <b>Current app</b>
        <span>${WORKFLOW.length} stages</span>
      </div>
      <ol class="bd-builder-stage-list">
        ${WORKFLOW.map((step) => `<li><span>${esc(step.tab || step.shortTitle || step.title)}</span><small>${esc(step.previewSub || step.blurb)}</small></li>`).join('')}
      </ol>
    </div>`);
  guide.classList.add('bd-builder-guide-row');

  const suggestions = document.createElement('div');
  suggestions.className = 'bd-chat-suggestions';
  suggestions.innerHTML = `
    <span>Try a next step</span>
    <div class="bd-builder-suggestion-pills">
      <button type="button" data-builder-suggestion="Add automatic compliance checks before the procurement review.">Automate compliance checks</button>
      <button type="button" data-builder-suggestion="Route high-risk suppliers to a separate procurement approval step.">Add approval rules</button>
      <button type="button" data-builder-suggestion="Send automatic status updates to the supplier and internal owner.">Improve status updates</button>
    </div>`;
  $('bdAnchor').appendChild(suggestions);

  suggestions.querySelectorAll('[data-builder-suggestion]').forEach((button) => {
    button.addEventListener('click', () => {
      $('bdSay').value = button.dataset.builderSuggestion;
      $('bdSay').focus();
    });
  });
  $('bdSay').placeholder = 'What would you like to improve?';
}

function fieldRow(f) {
  const cls = ['bd-fld'];
  if (f.block) cls.push('block');
  if (f.isNew) cls.push('new');
  const meta = f.block ? blockMeta(f) : null;
  return `
    <div class="${cls.join(' ')}">
      <label>${esc(f.label)}${f.req ? '<i>*</i>' : ''}</label>
      ${f.opts
        ? `<div class="ctl select">${esc(f.opts[0])}<svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>`
        : f.block
          ? `<div class="ctl blk">
              <span class="spark">◆</span>
              <span class="blk-body">
                <b>${esc(meta.name)}</b>
                <span>${esc(meta.backedBy)} · runs automatically</span>
              </span>
            </div>`
          : `<div class="ctl">${f.type === 'Long text' ? '' : ''}</div>`}
      ${f.isNew ? '<span class="tag">New</span>' : ''}
    </div>`;
}

function paintPreview() {
  if (state.buildSurface === 'ncb' && activeAppId === 'vendor-onboarding') {
    const url = new URL('../../build-web/builder-chat-first.html', location.href);
    url.search = new URLSearchParams({ prompt: projectName, ws: state.ws, email: state.email, previewOnly: '1' });
    $('bdFrame').innerHTML = `<iframe title="${esc(projectName)} app preview" src="${esc(url.href)}" style="width:100%;height:100%;min-height:600px;border:0;display:block"></iframe>`;
    return;
  }
  if (!smartBlocks) {
    paintMvpPreviewStep(state.activeStep);
    return;
  }
  const steps = WORKFLOW.map((s, i) => {
    const extra = state.extraFields.filter((f) => f.stepId === s.id);
    return `
      <section class="bd-pv-step">
        <header><span class="n">${i + 1}</span><b>${esc(s.title)}</b></header>
        ${[...s.fields, ...extra].map(fieldRow).join('')}
      </section>`;
  }).join('');

  $('bdFrame').innerHTML = `
    <div class="bd-pv-doc">
      <div class="bd-pv-hd">
        <b>${esc(projectName)}</b>
        <span>${state.published ? 'Published · anyone with the link' : 'Draft · only you'}</span>
      </div>
      ${steps}
      ${state.published ? `
        <div class="bd-pv-live">
          <b>It&rsquo;s live</b>
          <code>forms.enterpriseaigroup.com/n/${esc(projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24))}</code>
          <span>Every submission lands in Analytics, attributed and logged.</span>
        </div>` : ''}
      ${appChatWidgetHtml()}
    </div>`;

  wireAppChatWidget();
}

function showBuilderToast(message) {
  const existing = document.querySelector('.bd-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'bd-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function dashboardIcon(name) {
  const paths = {
    home: '<path d="M4 10.5 12 4l8 6.5V20H5V10.5M9 20v-6h6v6"/>',
    file: '<path d="M7 3h7l4 4v14H7zM14 3v5h5"/>',
    building: '<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M3 21h18M10 7h4M10 11h4M10 15h4"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    template: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M10 9v12"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6L10.5 3h-3l-.7 2-1.4.6-1.9-.9-2.1 2.1.9 1.9-.6 1.4L0 10.5v3l2 .7.6 1.4-.9 1.9 2.1 2.1 1.9-.9 1.4.6.7 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4z" transform="translate(2 -1) scale(.83)"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    activity: '<path d="M4 14h3l2.2-6 3.3 10 2.2-6H20"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M3 20h18"/>',
    users: '<path d="M16 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H7.7A3.7 3.7 0 0 0 4 18.2V20M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8v6M14 11h6"/>',
    workflow: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 6h8M6 8v8M8 18c6 0 10-4 10-10"/>',
    resources: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
    sparkle: '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
    plug: '<path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v5"/>',
    checklist: '<path d="M9 6h11M9 12h11M9 18h11M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    rocket: '<path d="M8 16 5 13c2-5 7-9 14-10 0 7-4 12-9 14l-2-1ZM14 8h.01M5 16c-2 1-2 4-2 4s3 0 4-2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    terminal: '<path d="m5 7 4 4-4 4M11 17h8"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths[name] || paths.activity}</svg>`;
}

function adminHref(file, extra = {}) {
  return window.bdCarry(file, {
    app: activeAppId,
    demo: 'michael',
    created: '1',
    ...extra,
  });
}

function builderDashboardHref(section = state.dashboardSection || 'overview') {
  const extra = {
    prompt: state.prompt,
    app: activeAppId,
    ws: state.ws,
    email: state.email,
    surface: state.buildSurface,
    view: 'dashboard',
    source: 'workspace',
    drawer: document.body.classList.contains('bd-workspace-drawer-open') ? 'open' : null,
  };
  if (section && section !== 'overview') extra.section = section;
  else extra.section = null;
  return window.bdCarry('builder.html', extra);
}

function builderAppDashboardHref(appId, name, appSurface = 'ncb') {
  return window.bdCarry('builder.html', {
    prompt: name,
    project: name,
    app: appId,
    ws: state.ws,
    email: state.email,
    surface: appSurface,
    view: appSurface === 'ncb' ? 'preview' : 'dashboard',
    source: 'workspace',
    drawer: 'open',
  });
}

function mountWorkspaceDrawer() {
  if (document.querySelector('[data-workspace-drawer-layer]')) return;
  const displayName = state.email
    ? state.email.split('@')[0].replace(/[._+-]+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Michael Nowosadko';
  const initial = (displayName || 'M').charAt(0).toUpperCase();
  let savedCreatedApp = null;
  try {
    savedCreatedApp = JSON.parse(localStorage.getItem(`${BUILDER_STORAGE_PREFIX}created-app`) || 'null');
  } catch {
    savedCreatedApp = null;
  }
  const primaryApp = savedCreatedApp?.name
    ? {
        id: savedCreatedApp.id || 'vendor-onboarding',
        name: String(savedCreatedApp.name),
        initial: String(savedCreatedApp.initial || savedCreatedApp.name.charAt(0)).toUpperCase(),
        status: savedCreatedApp.status === 'Live' ? 'live' : 'draft',
        buildSurface: 'NCB',
      }
    : { id: 'vendor-onboarding', name: 'Vendor Onboarding', initial: 'V', status: 'draft', buildSurface: 'NCB' };
  const recentApps = [
    primaryApp,
    { id: 'leave-approval', name: 'Leave approval', initial: 'L', status: 'live', buildSurface: 'NCB' },
    primaryApp.name === 'Vendor Onboarding'
      ? { id: 'kyc-onboarding', name: 'KYC Onboarding', initial: 'K', status: 'live', buildSurface: 'CLI' }
      : { id: 'vendor-onboarding', name: 'Vendor Onboarding', initial: 'V', status: 'draft', buildSurface: 'CLI' },
  ];

  document.body.insertAdjacentHTML('beforeend', `
    <div class="bd-workspace-drawer-layer" data-workspace-drawer-layer aria-hidden="true">
      <button class="bd-workspace-drawer-backdrop" type="button" data-workspace-drawer-close aria-label="Close workspace navigation"></button>
      <aside class="bd-workspace-drawer" id="bdWorkspaceDrawer" aria-label="Workspace navigation">
        <div class="bd-workspace-drawer-head">
          <a class="bd-workspace-company" href="${adminHref('ws-home.html')}">
            <span class="bd-workspace-company-icon">${dashboardIcon('building')}</span>
            <span><b>${esc(state.ws)}</b><small>Company platform</small></span>
            <svg class="bd-workspace-swap" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 9 4-4 4 4M8 15l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <div class="bd-workspace-build-tabs" role="tablist" aria-label="How you build">
            <button class="on" type="button" role="tab" aria-selected="true">No Code Builder</button>
            <button type="button" role="tab" aria-selected="false" data-workspace-drawer-cli>${dashboardIcon('terminal')}CLI</button>
          </div>
        </div>

        <div class="bd-workspace-drawer-body">
          <nav class="bd-workspace-primary-nav" aria-label="Workspace">
            <a href="${adminHref('ws-home.html')}">${dashboardIcon('home')}<span>Home</span></a>
            <a href="${adminHref('ws-processes.html')}">${dashboardIcon('grid')}<span>All apps</span><i>${recentApps.length}</i></a>
            <a href="${adminHref('ws-templates.html')}">${dashboardIcon('template')}<span>Templates</span></a>
            <a href="${adminHref('ws-integrations.html')}">${dashboardIcon('plug')}<span>Integrations</span></a>
          </nav>

          <section class="bd-workspace-recents" aria-labelledby="bdWorkspaceRecentsTitle">
            <h2 id="bdWorkspaceRecentsTitle">Recent apps</h2>
            ${recentApps.map((app) => `
              <a href="${builderAppDashboardHref(app.id, app.name, app.buildSurface.toLowerCase())}">
                <span class="bd-workspace-app-icon">${esc(app.initial)}</span>
                <b>${esc(app.name)}</b>
                <span class="bd-workspace-app-kind" title="${app.buildSurface === 'NCB' ? 'No Code Builder' : 'Command line interface'}">${app.buildSurface}</span>
                <i class="${app.status}" aria-label="${app.status === 'live' ? 'Live' : 'Draft'}"></i>
              </a>`).join('')}
          </section>
        </div>

        <footer class="bd-workspace-drawer-foot">
          <a class="bd-workspace-settings-link" href="${adminHref('ws-home.html', { settings: 'users' })}">${dashboardIcon('gear')}<span>Workspace settings</span></a>
          <a class="bd-workspace-user-link" href="${adminHref('ws-home.html', { profile: '1' })}">
            <span class="bd-workspace-user-avatar">${esc(initial)}</span>
            <span><b>${esc(displayName)}</b><small>Owner</small></span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 10 4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </footer>
      </aside>
    </div>`);

  const layer = document.querySelector('[data-workspace-drawer-layer]');
  const opener = document.querySelector('[data-workspace-drawer-open]');
  let closeTimer = null;

  function setOpen(open, restoreFocus = false) {
    clearTimeout(closeTimer);
    layer.classList.toggle('is-open', open);
    layer.setAttribute('aria-hidden', String(!open));
    opener.classList.toggle('is-open', open);
    opener.setAttribute('aria-expanded', String(open));
    opener.setAttribute('aria-label', open ? 'Close workspace navigation' : 'Open workspace navigation');
    document.body.classList.toggle('bd-workspace-drawer-open', open);
    if (!open && restoreFocus) {
      closeTimer = setTimeout(() => opener.focus({ preventScroll: true }), 260);
    }
  }

  opener.addEventListener('click', () => setOpen(!layer.classList.contains('is-open')));
  layer.querySelectorAll('[data-workspace-drawer-close]').forEach((button) => {
    button.addEventListener('click', () => setOpen(false, true));
  });
  layer.querySelector('[data-workspace-drawer-cli]').addEventListener('click', () => {
    setOpen(false);
    goCli('workspace-drawer');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && layer.classList.contains('is-open')) {
      event.preventDefault();
      setOpen(false, true);
    }
  });

  if (params.get('drawer') === 'open') {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.remove('bd-workspace-drawer-preopen');
    }));
  }
}

function paintAuthenticatedChrome() {
  const crumbs = document.querySelector('.bd-crumbs');
  if (!crumbs) return;
  crumbs.classList.add('bd-platform-crumbs');
  crumbs.innerHTML = `
    <button class="bd-platform-mark" type="button" data-workspace-drawer-open aria-label="Open workspace navigation" aria-controls="bdWorkspaceDrawer" aria-expanded="false">
      <img src="../assets/logos/eai-mark-dark.svg" alt="" />
    </button>
    <span class="sep">/</span>
    <b>${esc(projectName)}</b>`;

  document.querySelector('.bd-platform-actions')?.remove();

  if (state.buildSurface === 'ncb' && !document.querySelector('[data-view-ncb]')) {
    const view = document.createElement('button');
    view.type = 'button';
    view.className = 'nb-btn';
    view.dataset.viewNcb = '';
    view.textContent = 'View app';
    view.addEventListener('click', () => setBuilderMode('preview'));
    $('bdPublish').before(view);
  }

  mountWorkspaceDrawer();
}

function paintDashboard() {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'new-app';
  const appUrl = `${slug}.enterpriseai.app`;
  const isNoCodeApp = state.buildSurface === 'ncb';
  const sections = {
    overview: { label: 'Overview', icon: 'home' },
    submissions: { label: 'Submissions', icon: 'file', page: 'app-submissions.html' },
    analytics: { label: isNoCodeApp ? 'Analytics' : 'Analytics & reports', icon: 'chart', page: 'app-analytics.html' },
    settings: { label: 'Settings', icon: 'gear' },
    users: { label: 'Users', icon: 'users', page: 'app-users.html' },
    workflow: { label: 'Workflow', icon: 'workflow', page: 'app-configure.html' },
    resources: { label: 'Resources', icon: 'resources', page: 'app-configure.html' },
    ai: { label: 'AI & prompts', icon: 'sparkle', page: 'app-configure.html' },
    connections: { label: 'Connections', icon: 'plug', page: 'app-configure.html' },
    readiness: { label: 'Readiness', icon: 'checklist' },
    deploy: { label: 'Deploy', icon: 'rocket' },
  };
  const availableSections = isNoCodeApp
    ? ['overview', 'submissions', 'analytics', 'settings']
    : ['overview', 'submissions', 'analytics', 'users', 'workflow', 'resources', 'ai', 'connections', 'readiness', 'deploy'];
  if (!availableSections.includes(state.dashboardSection)) state.dashboardSection = 'overview';
  const activeSection = state.dashboardSection;
  const railLink = (id, simple = false) => {
    const item = sections[id];
    return `<button class="bd-dashboard-rail-link${activeSection === id ? ' on' : ''}" type="button" data-dashboard-section="${id}">${dashboardIcon(item.icon)}<span>${item.label}</span>${simple ? '' : '<i>›</i>'}</button>`;
  };
  const overviewPane = `
    <div class="bd-dashboard-pane">
      <header class="bd-dashboard-head">
        <div>
          <span class="bd-dashboard-eyebrow">Overview</span>
          <h2>${esc(projectName)}</h2>
          <p>Manage this app and everything it needs from one place.</p>
        </div>
        <button class="nb-btn primary" type="button" data-dashboard-save>Save changes</button>
      </header>

      <div class="bd-dashboard-grid">
        ${params.get('cliSetup') === '1' ? `
        <article class="bd-dashboard-card bd-dashboard-wide bd-cli-download">
          <h3>Download EAI app to continue building with the CLI</h3>
          <button class="nb-btn primary" type="button" data-cli-download>Download EAI Setup app · 84 MB</button>
        </article>` : ''}
        <article class="bd-dashboard-card bd-dashboard-wide bd-dashboard-overview">
          <div class="bd-dashboard-title">${dashboardIcon('activity')}<div><h3>App overview</h3><p>A quick view of how this app is set up and being used.</p></div></div>
          <div class="bd-dashboard-stats">
            <span><b>${state.published ? 'Live' : 'Draft'}</b><small>Status</small></span>
            <span><b>${WORKFLOW.length}</b><small>Stages</small></span>
            <span><b>0</b><small>Submissions</small></span>
          </div>
        </article>

        <article class="bd-dashboard-card">
          <div class="bd-dashboard-title">${dashboardIcon('users')}<div><h3>Who can access</h3><p>Control who can open and use this app.</p></div></div>
          <label class="bd-dashboard-label" for="bdDashboardAccess">App access</label>
          <select id="bdDashboardAccess" class="bd-dashboard-select">
            <option>Anyone in workspace</option>
            <option>Only invited people</option>
            <option>Anyone with the link</option>
          </select>
        </article>

        <article class="bd-dashboard-card">
          <div class="bd-dashboard-title">${dashboardIcon('link')}<div><h3>Share this app</h3><p>Send the app to people who need to use it.</p></div></div>
          <div class="bd-dashboard-share">
            <code>${esc(appUrl)}</code>
            <button class="nb-btn" type="button" data-dashboard-copy>Copy link</button>
          </div>
        </article>

        <article class="bd-dashboard-card bd-dashboard-wide">
          <div class="bd-dashboard-toggle-row compact">
            <div><b>“Built with EAI” badge</b><span>Show the badge in the footer of the published app.</span></div>
            <button class="bd-dashboard-toggle${state.dashboardBadge ? ' on' : ''}" type="button" data-dashboard-badge aria-label="Show Built with EAI badge" aria-pressed="${state.dashboardBadge}"><i></i></button>
          </div>
        </article>
      </div>
    </div>`;
  const settingsPane = `
    <div class="bd-dashboard-pane">
      <header class="bd-dashboard-head">
        <div>
          <span class="bd-dashboard-eyebrow">Configure</span>
          <h2>Settings</h2>
          <p>Update the essential settings for this app.</p>
        </div>
        <button class="nb-btn primary" type="button" data-dashboard-save>Save changes</button>
      </header>

      <div class="bd-dashboard-grid">
        <article class="bd-dashboard-card bd-dashboard-wide">
          <div class="bd-dashboard-title">${dashboardIcon('gear')}<div><h3>General settings</h3><p>Manage how this app is named and accessed.</p></div></div>
          <label class="bd-dashboard-label" for="bdDashboardAppName">App name</label>
          <input id="bdDashboardAppName" class="bd-dashboard-input" type="text" value="${esc(projectName)}" />
        </article>

        <article class="bd-dashboard-card bd-dashboard-wide">
          <div class="bd-dashboard-title">${dashboardIcon('users')}<div><h3>Who can access</h3><p>Control who can open and use this app.</p></div></div>
          <label class="bd-dashboard-label" for="bdDashboardAccess">App access</label>
          <select id="bdDashboardAccess" class="bd-dashboard-select">
            <option>Anyone in workspace</option>
            <option>Only invited people</option>
            <option>Anyone with the link</option>
          </select>
        </article>

        <article class="bd-dashboard-card bd-dashboard-wide">
          <div class="bd-dashboard-toggle-row compact">
            <div><b>“Built with EAI” badge</b><span>Show the badge in the footer of the published app.</span></div>
            <button class="bd-dashboard-toggle${state.dashboardBadge ? ' on' : ''}" type="button" data-dashboard-badge aria-label="Show Built with EAI badge" aria-pressed="${state.dashboardBadge}"><i></i></button>
          </div>
        </article>
      </div>
    </div>`;
  const embeddedPane = (section) => {
    const item = sections[section];
    const extra = { embedded: '1', ui: 'polish1' };
    if (item.page === 'app-configure.html') extra.section = section;
    return `<div class="bd-dashboard-pane is-embedded"><iframe class="bd-dashboard-embed" title="${esc(item.label)}" src="${adminHref(item.page, extra)}"></iframe></div>`;
  };
  const simplePane = (section) => {
    const item = sections[section];
    const isDeploy = section === 'deploy';
    return `
      <div class="bd-dashboard-pane">
        <header class="bd-dashboard-head">
          <div>
            <span class="bd-dashboard-eyebrow">Launch</span>
            <h2>${item.label}</h2>
            <p>${isDeploy ? 'Publish this app when it is ready for people to use.' : 'Review the checks that help this app launch safely.'}</p>
          </div>
          <button class="nb-btn primary" type="button" data-dashboard-launch-action>${isDeploy ? 'Publish app' : 'Run checks'}</button>
        </header>
        <article class="bd-dashboard-card bd-dashboard-wide bd-dashboard-launch-card">
          <div class="bd-dashboard-title">${dashboardIcon(item.icon)}<div><h3>${isDeploy ? 'Ready to publish' : 'App readiness'}</h3><p>${isDeploy ? 'Your draft has four stages and can be published when you are ready.' : 'Workflow, access and required fields are ready to review.'}</p></div></div>
        </article>
      </div>`;
  };
  const pane = activeSection === 'overview'
    ? overviewPane
    : activeSection === 'settings'
      ? settingsPane
      : sections[activeSection].page
        ? embeddedPane(activeSection)
        : simplePane(activeSection);
  const railNavigation = isNoCodeApp
    ? `
      ${railLink('overview', true)}
      ${railLink('submissions', true)}
      ${railLink('analytics', true)}
      ${railLink('settings', true)}`
    : `
      <strong>Manage</strong>
      ${railLink('overview')}
      ${railLink('submissions')}
      ${railLink('analytics')}
      ${railLink('users')}
      <strong>Configure</strong>
      ${railLink('workflow')}
      ${railLink('resources')}
      ${railLink('ai')}
      ${railLink('connections')}
      <strong>Launch</strong>
      ${railLink('readiness')}
      ${railLink('deploy')}`;
  $('bdFrame').innerHTML = `
    <section class="bd-dashboard" aria-label="${esc(projectName)} dashboard">
      <aside class="bd-dashboard-rail${isNoCodeApp ? ' is-simple' : ''}">
        <div class="bd-dashboard-rail-head">
          <div class="bd-dashboard-app-icon">${esc(projectName.charAt(0).toUpperCase())}</div>
          <span><b>${esc(projectName)}</b><small>App settings</small></span>
        </div>
        <nav aria-label="App administration">
          ${railNavigation}
        </nav>
        <button class="bd-dashboard-cli-link${isNoCodeApp ? ' is-primary' : ''}" type="button" data-dashboard-cli>
          ${dashboardIcon('terminal')}
          <span>
            <b>${isNoCodeApp ? 'Move to CLI' : 'Continue in CLI'}</b>
            <small>${isNoCodeApp ? 'Unlock advanced changes' : 'For advanced changes'}</small>
          </span>
          ${isNoCodeApp ? '<span class="bd-dashboard-cli-arrow" aria-hidden="true">→</span>' : ''}
        </button>
      </aside>
      ${pane}
    </section>`;

  const dashboardEmbed = $('bdFrame').querySelector('.bd-dashboard-embed');
  if (dashboardEmbed) {
    dashboardEmbed.addEventListener('load', () => {
      requestAnimationFrame(() => dashboardEmbed.classList.add('is-ready'));
    }, { once: true });
  }

  $('bdFrame').querySelectorAll('[data-dashboard-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const section = button.dataset.dashboardSection;
      if (!sections[section] || section === state.dashboardSection) return;
      state.dashboardSection = section;
      history.replaceState({}, '', builderDashboardHref(section));
      paintDashboard();
    });
  });

  const access = $('bdDashboardAccess');
  if (access) {
    access.value = state.dashboardAccess;
    access.addEventListener('change', () => { state.dashboardAccess = access.value; });
  }
  const badge = $('bdFrame').querySelector('[data-dashboard-badge]');
  if (badge) {
    badge.addEventListener('click', (event) => {
      state.dashboardBadge = !state.dashboardBadge;
      event.currentTarget.classList.toggle('on', state.dashboardBadge);
      event.currentTarget.setAttribute('aria-pressed', String(state.dashboardBadge));
    });
  }
  const save = $('bdFrame').querySelector('[data-dashboard-save]');
  if (save) {
    save.addEventListener('click', () => {
      if (access) state.dashboardAccess = access.value;
      showBuilderToast('App settings saved.');
    });
  }
  const copy = $('bdFrame').querySelector('[data-dashboard-copy]');
  if (copy) {
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(appUrl);
        showBuilderToast('App link copied.');
      } catch {
        showBuilderToast('Copy isn’t available here — select the link manually.');
      }
    });
  }

  const launchAction = $('bdFrame').querySelector('[data-dashboard-launch-action]');
  if (launchAction) {
    launchAction.addEventListener('click', () => {
      if (state.dashboardSection === 'deploy') void publish();
      else showBuilderToast('Readiness checks complete.');
    });
  }
  $('bdFrame').querySelector('[data-dashboard-cli]')?.addEventListener('click', () => goCli('dashboard'));
  $('bdFrame').querySelector('[data-cli-download]')?.addEventListener('click', () => {
    showBuilderToast('Download isn’t wired in this prototype.');
  });
}

function setBuilderMode(mode) {
  if (state.buildSurface === 'cli') mode = 'dashboard';
  if (mode === 'dashboard' && !state.authed) {
    state.pendingAuth = () => setBuilderMode('dashboard');
    showAuthGate();
    return;
  }

  state.viewMode = mode === 'dashboard' ? 'dashboard' : 'preview';
  document.body.classList.toggle('bd-saved-ncb-preview', state.viewMode === 'preview' && state.buildSurface === 'ncb' && activeAppId === 'vendor-onboarding');
  document.body.dataset.mode = state.viewMode;
  document.querySelectorAll('#bdMode button').forEach((button) => {
    const selected = button.dataset.mode === state.viewMode;
    button.classList.toggle('on', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  if (state.viewMode === 'dashboard') paintDashboard();
  else paintPreview();
}

function openPreview() {
  document.body.classList.add('bd-has-preview');
  state.previewReady = true;
  paintPreview();
  startBuilderConversation();
}

/* ====================== the clarification stepper ================= */

/* clarification-card.tsx: 3–4 questions, one at a time, anchored above
   the input rather than dropped into the transcript. Options plus a way
   to type your own, and a way out — nothing here blocks. */

const QUESTIONS = [
  {
    q: 'What information should the app collect at the start?',
    opts: [
      'Supplier and contact details',
      'Compliance documents and certifications',
      'Banking and tax information',
      'All of the above',
    ],
  },
  {
    q: 'What should happen before a supplier can be approved?',
    opts: [
      'One person reviews everything',
      'Different teams review different parts',
      'Run automatic checks, then review exceptions',
      'No approval — just collect the information',
    ],
  },
  {
    q: 'What should happen when onboarding is complete?',
    opts: [
      'Notify the supplier and internal owner',
      'Create or update a supplier record',
      'Generate an approval summary',
      'All of the above',
    ],
  },
];

function askBuildPreference() {
  return new Promise((resolve) => {
    let done = false;
    $('bdAnchor').innerHTML = '';
    const box = document.createElement('div');
    box.className = 'bd-clarify bd-clarify--assistant';
    $('bdAnchor').appendChild(box);
    document.body.classList.add('bd-assistant-question-open');
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;
    $('bdSay').placeholder = 'Choose an option or reply here…';

    requestAnimationFrame(() => requestAnimationFrame(scroll));

    box.innerHTML = `
      <section class="bd-assistant-card" aria-labelledby="bdBuildPreference">
        <header class="bd-assistant-head">
          <h3 id="bdBuildPreference">How would you like to continue?</h3>
          <span class="bd-assistant-choice-label">Choose one</span>
        </header>
        <p class="bd-assistant-intro">I can ask three quick questions to make the first version more accurate, or build it now using what we have.</p>
        <div class="bd-assistant-options" role="listbox" aria-label="How would you like to continue?">
          <button type="button" class="bd-assistant-option bd-assistant-option--detail" data-choice="questions" role="option">
            <span class="bd-assistant-key">1</span>
            <span class="bd-assistant-option-copy"><b>Ask me three questions</b><small>Improve the inputs, decision process and final actions.</small></span>
          </button>
          <button type="button" class="bd-assistant-option bd-assistant-option--detail" data-choice="build" role="option">
            <span class="bd-assistant-key">2</span>
            <span class="bd-assistant-option-copy"><b>Build the first version now</b><small>Use the goal, audience and outcome above.</small></span>
          </button>
        </div>
      </section>`;

    function finish(choice) {
      if (done) return;
      done = true;
      state.inlineReplyHandler = null;
      box.remove();
      document.body.classList.remove('bd-assistant-question-open');
      $('bdSay').placeholder = 'Ask or add context…';
      resolve(choice);
    }

    state.inlineReplyHandler = (text) => {
      bubble('user', esc(text));
      if (/\b(build|start|now|ready)\b/i.test(text)) {
        finish('build');
      } else if (/\b(question|ask|improve|better|more)\b/i.test(text)) {
        finish('questions');
      } else {
        bubble('ai', 'Choose “Ask me three questions” or “Build the first version now”, or type either choice below.');
      }
    };

    box.querySelectorAll('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => finish(button.dataset.choice));
    });
  });
}

function askClarify() {
  return new Promise((resolve) => {
    let at = 0;
    let done = false;
    const answers = Array(QUESTIONS.length).fill(null);
    $('bdAnchor').innerHTML = '';
    const box = document.createElement('div');
    box.className = 'bd-clarify bd-clarify--assistant';
    $('bdAnchor').appendChild(box);
    document.body.classList.add('bd-assistant-question-open');
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;

    function paint() {
      const q = QUESTIONS[at];
      box.innerHTML = `
        <section class="bd-assistant-card" aria-labelledby="bdAssistantQuestion">
          <header class="bd-assistant-head">
            <h3 id="bdAssistantQuestion">${esc(q.q)}</h3>
            <div class="bd-assistant-progress" aria-label="Question ${at + 1} of ${QUESTIONS.length}">
              <button type="button" data-prev aria-label="Previous question" ${at === 0 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <span>${at + 1} of ${QUESTIONS.length}</span>
              <button type="button" data-next aria-label="Next question" ${at === QUESTIONS.length - 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" data-close aria-label="Close questions">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>
          </header>
          <div class="bd-assistant-options" role="listbox" aria-label="${esc(q.q)}">
            ${q.opts.map((o, i) => `
              <button type="button" class="bd-assistant-option" data-i="${i}" role="option">
                <span class="bd-assistant-key">${i + 1}</span>
                <span>${esc(o)}</span>
              </button>`).join('')}
          </div>
          <div class="bd-assistant-other-row">
            <button type="button" class="bd-assistant-other" data-other-toggle>
              <span class="bd-assistant-key">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <span>Something else</span>
            </button>
            <button class="bd-assistant-skip" type="button" data-skip>Skip</button>
          </div>
        </section>
        <div class="bd-assistant-hints" aria-hidden="true">
          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> to navigate</span>
          <i>&middot;</i>
          <span><kbd>&crarr;</kbd> to select</span>
          <i>&middot;</i>
          <span>or type below</span>
        </div>`;

      const choices = [...box.querySelectorAll('.bd-assistant-option')];
      choices.forEach((b) => {
        b.addEventListener('click', () => pick(q.opts[Number(b.dataset.i)]));
      });
      $('bdSay').placeholder = `Answer question ${at + 1} of ${QUESTIONS.length}…`;
      state.inlineReplyHandler = (text) => {
        bubble('user', esc(text));
        pick(text);
      };
      box.querySelector('[data-other-toggle]').addEventListener('click', () => $('bdSay').focus());
      box.querySelector('[data-prev]').addEventListener('click', () => {
        if (at > 0) { at -= 1; paint(); }
      });
      box.querySelector('[data-next]').addEventListener('click', () => {
        if (at < QUESTIONS.length - 1) { at += 1; paint(); }
      });
      box.querySelector('[data-close]').addEventListener('click', () => finish(true));
      box.querySelector('[data-skip]').addEventListener('click', () => finish(true));

      box.onkeydown = (e) => {
        if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const current = choices.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown'
          ? Math.min(choices.length - 1, current + 1)
          : Math.max(0, current < 0 ? 0 : current - 1);
        choices[next].focus();
      };

      requestAnimationFrame(() => requestAnimationFrame(scroll));
    }

    function pick(value) {
      answers[at] = { q: QUESTIONS[at].q, a: value };
      at += 1;
      if (at >= QUESTIONS.length) return finish(false);
      paint();
    }

    function finish(skipped) {
      if (done) return;
      done = true;
      state.inlineReplyHandler = null;
      box.remove();
      document.body.classList.remove('bd-assistant-question-open');
      $('bdSay').placeholder = 'Ask or add context…';
      const completed = answers.filter(Boolean);
      if (!skipped && completed.length) {
        /* clarification-answers-card.tsx: a read-only record of what was
           confirmed, not a chat bubble pretending they typed it. */
        card(`
          <div class="bd-answers">
            <b>What you told me</b>
            ${completed.map((a) => `<span><i>${esc(a.q)}</i>${esc(a.a)}</span>`).join('')}
          </div>`);
      }
      resolve(completed);
    }

    paint();
  });
}

/* ============================ the run ============================= */

async function generate() {
  if (!requireAuth(PRICE.generate, () => generate())) return;
  const cost = charge('generate');
  await thinking(700);

  if (!smartBlocks) {
    setStep('improve');
    await enterMvpWorkshop();
    $('bdPublish').disabled = false;
    $('bdSuggest').hidden = false;
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;
    $('bdSay').placeholder = 'What would you like to improve?';
    await afterTurn();
    return;
  }

  const stepCount = WORKFLOW.length;
  const intro = smartBlocks
    ? `Designing it now — ${stepCount} steps, and I'm taking two things off the manual pile as I go.`
    : `Designing it now — ${stepCount} steps, focused on capture and a clear approval path.`;
  const row = await say(intro, cost);
  void row;

  const progress = smartBlocks
    ? [
        'Mapping the process your app will support',
        'Collapsing four handoffs into one submission',
        'Adding Document Analysis and Compliance Rules blocks',
        'Building your app',
      ]
    : [
        'Mapping the process your app will support',
        'Collapsing handoffs into one submission',
        'Building your app',
      ];

  const prog = card(`
    <div class="bd-run">
      ${progress.map((label, i) => `<span class="r" data-r="${i + 1}">${label}</span>`).join('')}
    </div>`);
  for (let n = 1; n <= progress.length; n += 1) {
    await wait(620);
    prog.querySelector(`[data-r="${n}"]`).classList.add('done');
  }

  await wait(300);
  const automated = WORKFLOW.filter((s) => s.fields.some((f) => f.block)).length;
  const summaryMeta = smartBlocks
    ? `${stepCount} steps · ${automated} automated`
    : `${stepCount} steps · manual review`;
  card(`
    <div class="bd-summary">
      <div class="hd"><b>${esc(projectName)}</b><span>${summaryMeta}</span></div>
      ${WORKFLOW.map((s, i) => `
        <div class="st">
          <span class="n">${i + 1}</span>
          <div>
            <b>${esc(s.title)}</b>
            <span>${esc(s.blurb)}</span>
            ${s.transform ? `<i class="tr">${esc(s.transform)}</i>` : ''}
          </div>
        </div>`).join('')}
      <p class="fine">${smartBlocks
        ? 'Smart blocks replace manual fields — Document Analysis, Compliance Rules, Approvals, and three more in the catalog.'
        : 'MVP keeps it simple: submit, review, outcome — no smart blocks yet.'}</p>
    </div>`);

  openPreview();
  setStep('improve');
  $('bdPublish').disabled = false;
  $('bdSuggest').hidden = false;
  $('bdSay').disabled = false;
  $('bdSend').disabled = false;
  $('bdSay').placeholder = 'What would you like to improve?';
  await afterTurn();
}

/** Every billable turn ends here: it is the one place a fork can fire. */
async function afterTurn() {
  const due = forkDue();
  if (due === 'empty' || due === 'cost') {
    await wait(500);
    costFork();
    return;
  }
  if (state.pendingFit && !state.fitForkShown && state.turnsSinceFork >= 2) {
    const trigger = state.pendingFit;
    state.pendingFit = null;
    await wait(500);
    fitFork(trigger);
  }
}

async function run() {
  if (state.runStarted) return;
  state.runStarted = true;
  paintMeter();
  if ($('bdProjectName')) $('bdProjectName').textContent = state.authed ? projectName : 'Process';
  paintAccount();
  document.title = `Prototype — ${projectName}`;

  /* The prompt is already the first message. On /build-sugar nobody
     signed up to get here — they typed on the homepage and landed. */
  bubble('user', esc(state.prompt));

  await thinking(1100);
  charge('understand');
  $('bdAnchor').innerHTML = '';
  const response = document.createElement('div');
  response.className = 'bd-msg ai bd-goal-response-row';
  const bu = document.createElement('section');
  bu.className = 'bd-goal-card';
  bu.setAttribute('aria-labelledby', 'bdGoalTitle');
  bu.innerHTML = `
    <div class="bd-bu">
      <p class="bd-goal-response-intro">Here&rsquo;s what I think you&rsquo;re describing. Review it before I build anything.</p>
      <header class="bd-goal-head">
        <div class="hd">
          <b id="bdGoalTitle">App goal</b>
          <span>The AI&rsquo;s understanding of the process your app will support.</span>
        </div>
      </header>
      <div class="quote">${esc(sentence(state.prompt))} — today this runs on email and a shared inbox, with the same details re-keyed at least twice.</div>
      <div class="bd-goal-grid">
        <div class="kv">
          <span class="i goal">◎</span><div><b>Goal</b><span>Get to a decision without anybody chasing the paperwork.</span></div>
        </div>
        <div class="kv">
          <span class="i aud">◍</span><div><b>Audience</b><span>The person submitting, and the one or two people who review it.</span></div>
        </div>
        <div class="kv">
          <span class="i out">✓</span><div><b>Outcome</b><span>A decision on record, with everything it was based on attached to it.</span></div>
        </div>
      </div>
      <div class="bd-goal-improvement" data-goal-improvement hidden><b>Your improvement</b><span></span></div>
      <div class="acts">
        <span class="bd-goal-guidance" data-goal-guidance>Does this look right?</span>
        <div class="bd-goal-actions">
          <button class="nb-btn" type="button" data-refine>Make a change</button>
          <button class="nb-btn primary" type="button" data-confirm>Yes, continue</button>
        </div>
      </div>
    </div>`;
  response.innerHTML = assistantAvatar();
  response.appendChild(bu);
  log().appendChild(response);
  scroll();
  document.body.classList.add('bd-goal-review-open');
  $('bdSay').disabled = false;
  $('bdSend').disabled = false;
  $('bdSay').placeholder = 'Ask or tell the AI what to change…';

  bu.querySelector('[data-refine]').addEventListener('click', () => {
    document.body.classList.add('bd-goal-editing');
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;
    $('bdSay').placeholder = 'Tell the AI what to change…';
    $('bdSay').focus();
  });

  /* The fit fork is decided here, on what they typed, but it is not shown
     here — the business card is the first thing that has to land. */
  if (APP_WORDS.test(state.prompt)) {
    state.pendingFit = (state.prompt.match(APP_WORDS) || [])[0];
    state.turnsSinceFork = 0;
  }

  bu.querySelector('[data-confirm]').addEventListener('click', async () => {
    if (state.continuing) return;
    state.continuing = true;
    document.body.classList.remove('bd-goal-review-open', 'bd-goal-editing');
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;
    $('bdSay').placeholder = 'Ask or add context…';
    bu.querySelector('.acts').innerHTML = '<span class="bd-confirmed">Confirmed</span>';
    await continueAfterConfirm();
  });
}

async function continueAfterConfirm() {
  if (state.step !== 'describe') return;
  setStep('generate');
  await wait(400);
  const waiting = showAssistantWaiting();
  const preference = await askBuildPreference();
  if (preference === 'questions') {
    await askClarify();
  }
  waiting.remove();
  await generate();
}

/* ============================ the composer ======================== */

async function send() {
  const input = $('bdSay');
  const text = input.value.trim();
  if (!text) return;
  if (state.inlineReplyHandler) {
    input.value = '';
    state.inlineReplyHandler(text);
    return;
  }
  if (state.busy) return;
  if (state.credits <= 0) { costFork(); return; }
  if (!requireAuth(PRICE.change, () => send())) return;

  state.busy = true;
  input.value = '';
  bubble('user', esc(text));

  if (APP_WORDS.test(text) && !state.fitForkShown) {
    state.pendingFit = (text.match(APP_WORDS) || [])[0];
  }

  const cost = charge('change');
  await thinking(800);

  if (state.step === 'describe') {
    state.planRefined = true;
    const goalCard = document.querySelector('.bd-goal-card');
    const improvement = goalCard?.querySelector('[data-goal-improvement]');
    if (goalCard && improvement) {
      improvement.hidden = false;
      improvement.querySelector('span').textContent = text;
      goalCard.classList.add('is-improved');
      goalCard.querySelector('[data-goal-guidance]').textContent = 'Review the improvement, then continue.';
      goalCard.querySelector('[data-confirm]').disabled = false;
    }
    $('bdSay').placeholder = 'Add another improvement…';
    await say('I\'ve improved the goal using that feedback. Review it below, then continue.', cost);
  } else {
    const f = { stepId: 'submit', label: sentence(text).slice(0, 42), type: 'Text', req: false, isNew: true };
    state.extraFields.push(f);
    paintPreview();
    await say(`Done — ${text.replace(/\.$/, '')}. It's in the form on the right, marked as new.`, cost);
  }

  state.busy = false;
  await afterTurn();
}

async function suggest() {
  if (state.busy) return;
  if (!requireAuth(PRICE.improve, () => suggest())) return;
  state.busy = true;
  const cost = charge('improve');
  await thinking(900);
  await say('Two things worth changing, both from what usually goes wrong with this shape of process.', cost);
  const el = card(`
    <div class="bd-sugg">
      <b>Suggested improvements</b>
      <div class="s">
        <div><b>Ask for the reference number up front</b><span>Reviewers look it up 8 times out of 10. Capturing it once removes a round trip.</span></div>
        <button class="nb-btn" type="button" data-apply="Reference number">Apply</button>
      </div>
      <div class="s">
        <div><b>Auto-decline after 30 days of no response</b><span>Stops the queue filling with requests nobody is chasing.</span></div>
        <button class="nb-btn" type="button" data-apply="Auto-close after 30 days">Apply</button>
      </div>
    </div>`);
  el.querySelectorAll('[data-apply]').forEach((b) => {
    b.addEventListener('click', () => {
      state.extraFields.push({ stepId: 'submit', label: b.dataset.apply, type: 'Text', req: false, isNew: true });
      paintPreview();
      b.outerHTML = '<span class="bd-applied">Applied</span>';
    });
  });
  state.busy = false;
  await afterTurn();
}

async function publish() {
  if (state.busy) return;
  if (state.credits < PRICE.publish) { costFork(); return; }
  if (!requireAuth(PRICE.publish, () => publish())) return;
  state.busy = true;
  const cost = charge('publish');
  await thinking(900);
  state.published = true;
  paintPreview();
  setStep('publish');
  $('bdPublish').textContent = 'Republish';
  await say('Published. It\'s on a link you can send to anybody, and every submission is logged against your workspace.', cost);
  state.busy = false;
  await afterTurn();
}

/* ============================ late auth gate ====================== */

const COUNTRY_BY_REGION = {
  AU: 'Australia', NZ: 'New Zealand', SG: 'Singapore', GB: 'United Kingdom',
  US: 'United States', CA: 'Canada', DE: 'Germany', FR: 'France', JP: 'Japan', IN: 'India',
};
const FREE_MAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'me.com', 'live.com', 'proton.me', 'protonmail.com',
  'users.noreply.github.com',
]);
const OAUTH_LABELS = {
  google: 'Sign in with Google',
  github: 'Sign in with GitHub',
  microsoft: 'Sign in with Microsoft',
};

function guessCountry() {
  try {
    const region = new Intl.Locale(navigator.language || 'en-AU').maximize().region;
    if (region && COUNTRY_BY_REGION[region]) return COUNTRY_BY_REGION[region];
  } catch (_) {}
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz.startsWith('Australia/')) return 'Australia';
  if (tz.startsWith('Pacific/Auckland')) return 'New Zealand';
  if (tz.startsWith('Asia/Singapore')) return 'Singapore';
  if (tz.startsWith('Europe/London')) return 'United Kingdom';
  if (tz.startsWith('America/')) return 'United States';
  return 'Australia';
}

function workspaceFromEmail(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase();
  if (!domain || FREE_MAIL_DOMAINS.has(domain)) return '';
  const part = domain.split('.')[0];
  if (!part || part.length < 2) return '';
  return part.charAt(0).toUpperCase() + part.slice(1);
}

const validEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim());

function syncWorkspaceGo() {
  const go = $('wsGo');
  if (go) go.disabled = !($('wsNameInput').value.trim() && $('wsCountry').value);
}

let signedUpEmail = '';

function showAuthGate() {
  const gate = $('authGate');
  const lede = $('gateLede');
  if (lede) lede.textContent = 'Sign in to continue editing';
  gate.hidden = false;
  document.body.classList.add('bd-gate');
  showSignUpPanel();
  $('gateEmail').focus();
}

function hideAuthGate() {
  const gate = $('authGate');
  gate.hidden = true;
  document.body.classList.remove('bd-gate');
}

function showSignUpPanel() {
  $('wizardStep1').hidden = false;
  $('wizardStepOAuth').hidden = true;
  $('wizardStep2').hidden = true;
}

function showOAuthPanel(provider) {
  $('oauthTitle').textContent = OAUTH_LABELS[provider] || 'Sign in';
  $('oauthEmail').value = $('gateEmail').value.trim();
  $('oauthGo').disabled = !validEmail($('oauthEmail').value);
  $('wizardStep1').hidden = true;
  $('wizardStepOAuth').hidden = false;
  $('wizardStep2').hidden = true;
  $('oauthEmail').focus();
}

function setWizardStep(step) {
  $('wizardStep1').hidden = step !== 1;
  $('wizardStepOAuth').hidden = true;
  $('wizardStep2').hidden = step !== 2;
}

function goToWorkspaceStep(email) {
  signedUpEmail = email.trim();
  finishAuth();
}

function finishAuth() {
  state.email = signedUpEmail;
  state.ws = 'Amazing Pet Store';
  state.authed = true;
  const userName = state.email.split('@')[0].replace(/[._+-]+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Workspace owner';
  localStorage.setItem(`${BUILDER_STORAGE_PREFIX}active-company`, JSON.stringify('northwind-ops'));
  localStorage.setItem(`${BUILDER_STORAGE_PREFIX}signed-in-user`, JSON.stringify({ name: userName, email: state.email }));
  localStorage.setItem(`${BUILDER_STORAGE_PREFIX}created-app`, JSON.stringify({
    id: 'vendor-onboarding',
    name: projectName,
    prompt: state.prompt,
    initial: projectName.charAt(0).toUpperCase(),
    status: 'Draft',
    seen: 'Just now',
  }));
  state.pendingAuth = null;
  hideAuthGate();
  paintAccount();
  paintMeter();
  document.body.classList.add('bd-authenticated', 'bd-has-preview', 'bd-mvp-workshop');
  document.body.classList.toggle('bd-cli-app', state.buildSurface === 'cli');
  paintAuthenticatedChrome();
  setBuilderMode(state.buildSurface === 'cli' ? 'dashboard' : 'preview');
  requestAnimationFrame(() => {
    document.querySelector('[data-workspace-drawer-open]')?.click();
  });
  showBuilderToast(state.buildSurface === 'cli'
    ? 'Signed in — your app settings are ready.'
    : 'Signed in — your app preview is ready.');
}

function wireAuthGate() {
  const syncGate = () => { $('gateGo').disabled = !validEmail($('gateEmail').value); };
  const syncOAuth = () => { $('oauthGo').disabled = !validEmail($('oauthEmail').value); };

  $('gateEmail').addEventListener('input', syncGate);
  $('oauthEmail').addEventListener('input', syncOAuth);

  $('gateGo').addEventListener('click', () => {
    if (validEmail($('gateEmail').value)) goToWorkspaceStep($('gateEmail').value);
  });
  $('gateEmail').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && validEmail($('gateEmail').value)) goToWorkspaceStep($('gateEmail').value);
  });

  document.querySelectorAll('.bd-oauth-btn').forEach((btn) => {
    btn.addEventListener('click', () => showOAuthPanel(btn.dataset.provider));
  });

  $('oauthBack').addEventListener('click', showSignUpPanel);
  $('oauthGo').addEventListener('click', () => {
    if (validEmail($('oauthEmail').value)) {
      $('gateEmail').value = $('oauthEmail').value.trim();
      syncGate();
      goToWorkspaceStep($('oauthEmail').value);
    }
  });
  $('oauthEmail').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && validEmail($('oauthEmail').value)) $('oauthGo').click();
  });

  $('authClose').addEventListener('click', () => {
    state.pendingAuth = null;
    hideAuthGate();
  });

}

function wirePreviewAuthBoundary() {
  document.addEventListener('click', (event) => {
    if (state.authed || !state.previewReady || !$('authGate').hidden) return;
    const button = event.target.closest('button');
    if (!button || button.closest('#authGate')) return;
    const isPreviewControl = button.closest('#bdDevice, #bdMode, [data-app-chat]')
      || button.matches('.bd-pv-step');
    if (isPreviewControl) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.pendingAuth = null;
    showAuthGate();
  }, true);
}

/* ============================ wiring ============================== */

$('bdSend').addEventListener('click', () => void send());
$('bdLogin').addEventListener('click', () => {
  state.pendingAuth = null;
  showAuthGate();
});
$('bdSay').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void send();
  }
});
$('bdSuggest').addEventListener('click', () => void suggest());
$('bdPublish').addEventListener('click', () => void publish());

/* The CLI tab is the same fork, reachable at any time — which is the
   point of it sitting above everything else in the sidebar. */
$('tabCli')?.addEventListener('click', () => goCli('tab'));

document.querySelectorAll('#bdMode button, #bdDevice button').forEach((b) => {
  b.addEventListener('click', () => {
    if (b.dataset.mode) {
      setBuilderMode(b.dataset.mode);
      return;
    }
    const group = b.parentElement;
    group.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    if (b.dataset.device) $('bdFrame').dataset.device = b.dataset.device;
  });
});

// Placeholder nav says what it is rather than scrolling the page to the top.
document.querySelectorAll('[data-stub]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const t = document.createElement('div');
    t.className = 'bd-toast';
    t.textContent = `${a.textContent.trim()} isn't in this prototype.`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  });
});
document.querySelectorAll('[data-keep]').forEach((a) => {
  a.setAttribute('href', window.bdCarry(a.getAttribute('href'), { ws: state.ws, email: state.email, project: projectName }));
});

wireAuthGate();
wirePreviewAuthBoundary();

if (state.authed) {
  document.body.classList.add('bd-authenticated');
  paintAuthenticatedChrome();
}

function bootBuilder() {
  if (['dashboard', 'preview'].includes(params.get('view')) && state.authed) {
    state.runStarted = true;
    state.previewReady = true;
    paintMeter();
    paintAccount();
    setStep('improve');
    document.title = `Prototype — ${projectName}`;
    document.body.classList.add('bd-has-preview', 'bd-mvp-workshop');
    document.body.classList.toggle('bd-cli-app', state.buildSurface === 'cli');
    if (state.buildSurface !== 'cli') startBuilderConversation();
    setBuilderMode(params.get('view'));
    $('bdPublish').disabled = false;
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;
    $('bdSay').placeholder = 'What would you like to improve?';
    return;
  }
  void run();
}

if (new URLSearchParams(location.search).get('enter') === '1') {
  window.addEventListener('bd-enter-done', bootBuilder, { once: true });
} else {
  bootBuilder();
}
