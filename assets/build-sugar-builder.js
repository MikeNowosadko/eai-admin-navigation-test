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

const smartBlocks = params.get('blocks') === '1'
  || params.get('variant') === 'blocks'
  || document.body.dataset.bdBlocks === 'on';

/** Sugarhead — value before account; sign-in only at publish. */
const sugarhead = document.body.dataset.sugarhead === 'on'
  || params.get('flow') === 'sugarhead';

/** Plan-first Sugarhead — same instant preview, then card + questionnaire before branding. */
const planFirst = sugarhead && (
  document.body.dataset.flow === 'plan-first'
  || params.get('flow') === 'plan-first'
);

/** Brand-first Sugarhead — full-screen branding before the editor. */
const brandFirst = sugarhead && (
  document.body.dataset.flow === 'brand-first'
  || params.get('flow') === 'brand-first'
);

/** Chat-first Sugarhead — full-screen questionnaire + card, then split + brand. */
const chatFirst = sugarhead && (
  document.body.dataset.flow === 'chat-first'
  || params.get('flow') === 'chat-first'
);

if (sugarhead) document.body.classList.add('bd-sugarhead');
if (planFirst) document.body.classList.add('bd-plan-first');
if (brandFirst) document.body.classList.add('bd-brand-first');
if (chatFirst) document.body.classList.add('bd-chat-first');

const state = {
  prompt: (params.get('prompt') || 'a new business process').trim(),
  ws: params.get('ws') || 'Preview',
  email: params.get('email') || '',
  authed: !!params.get('email'),
  credits: Number(params.get('credits') || START_CREDITS),
  step: 'describe',
  published: false,
  costForkShown: false,
  fitForkShown: false,
  turnsSinceFork: 99,
  extraFields: [],
  busy: false,
  pendingAuth: null,
  authNudgeShown: false,
  runStarted: false,
  continuing: false,
  activeStep: 0,
  expandedStep: 0,
  branded: false,
  generated: false,
  brandKey: params.get('brand') || 'none',
  device: 'desktop',
};

if (brandFirst && params.get('brand') && window.BrandMatch) {
  window.BrandMatch.setActive(params.get('brand'), params.get('email') || '');
  state.brandKey = params.get('brand');
  state.branded = params.get('brand') !== 'none';
  if (params.get('email')) state.email = params.get('email');
  if (params.get('ws')) state.ws = params.get('ws');
}

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* Keep the original prompt in chat; use a concise process name elsewhere. */
function appNameFromPrompt(prompt) {
  const topics = [
    [/\b(?:supplier|vendor)s?\b.*\bonboard|\bonboard\w*\b.*\b(?:supplier|vendor)s?\b/i, 'Supplier Onboarding'],
    [/\b(?:employee|staff)s?\b.*\bonboard|\bonboard\w*\b.*\b(?:employee|staff)s?\b/i, 'Employee Onboarding'],
    [/\bKYC\b|\bknow your customer\b/i, 'KYC Onboarding'],
    [/\binvoice\w*\b.*\bapprov|\bapprov\w*\b.*\binvoice/i, 'Invoice Approval'],
    [/\binvoice\w*\b/i, 'Invoice Processing'],
    [/\bleave\b.*\bapprov|\bapprov\w*\b.*\bleave\b/i, 'Leave Approval'],
  ];
  const match = topics.find(([pattern]) => pattern.test(prompt));
  if (match) return match[1];
  const topic = prompt
    .replace(/^(?:(?:please|can you|could you|help me|I want to|I'd like to)\s+)+/i, '')
    .replace(/^(?:build|create|make|design)\s+(?:(?:me|us)\s+)?(?:an?\s+)?(?:app(?:lication)?|tool|system|workflow)\s*(?:(?:that|which)\s+)?(?:(?:helps?\s+)?(?:me|us)\s+)?(?:(?:to|for)\s+)?/i, '')
    .replace(/^(?:manages?|tracks?|handles?|automates?|improves?|streamlines?)\s+/i, '')
    .replace(/^(?:my|our|the|an?)\s+/i, '')
    .split(/[.!?\n]/)[0]
    .trim().split(/\s+/).slice(0, 6).join(' ');
  return (topic || 'New App').replace(/\b\w+\b/g, word =>
    /^[A-Z0-9]+$/.test(word) ? word : sentence(word.toLowerCase()));
}
const projectName = params.get('workspaceApp') === '1' && params.get('project') ? params.get('project') : chatFirst ? appNameFromPrompt(state.prompt) : sentence(state.prompt);

/* The live QR button, moved into the preview toolbar on every repaint. */
let mobileQrBtn = null;


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

const WORKFLOW_MVP = [
  {
    id: 'submit',
    tab: 'Submit',
    badge: 'Captured once',
    badgeTone: 'blue',
    title: 'Supplier submits the invoice',
    blurb: 'Emailed invoice re-keyed into a spreadsheet → captured once, at submission',
    problem: '"Supplier submits the invoice" re-collected information the user had already provided, creating rekeying errors and friction.',
    solution: 'The data is captured once and pre-filled everywhere it is needed downstream.',
    impact: ['No duplicate data entry', 'Fewer transcription errors', 'A faster, less repetitive experience for the user'],
    previewTitle: 'Supplier submits the invoice',
    previewSub: 'Replaces the email inbox — every invoice is tracked from the moment it arrives.',
    fields: [
      { label: 'Supplier name', type: 'Text', req: true, placeholder: 'Supplier name' },
      { label: 'Supplier email', type: 'Email', req: true, placeholder: 'name@example.com', hint: 'Status updates are sent here.' },
      { label: 'Invoice number', type: 'Text', req: true, placeholder: 'Invoice number' },
      { label: 'Purchase order number', type: 'Text', req: true, placeholder: 'Purchase order number', hint: 'Used to match the invoice against the PO.' },
      { label: 'Invoice amount', type: 'Text', req: true, placeholder: 'Invoice amount' },
      { label: 'Invoice document', type: 'File', req: true },
    ],
  },
  {
    id: 'review',
    tab: 'Review',
    badge: 'Off-platform → monitored',
    badgeTone: 'purple',
    title: 'Accounts checks it against the purchase order',
    blurb: 'PO check by eye, chased over email → matched on-platform and tracked',
    problem: 'PO matching happens in email threads — nobody can see status until someone asks.',
    solution: 'Matching runs on submit and the queue shows matched, partial, or exception.',
    impact: ['One queue instead of inbox archaeology', 'Exceptions surfaced immediately', 'Audit trail from first touch'],
    previewTitle: 'Accounts checks it against the purchase order',
    previewSub: 'PO match status is visible before anyone approves.',
    fields: [
      { label: 'PO match status', type: 'Select', req: true, opts: ['Matched', 'Partial match', 'No PO found'] },
      { label: 'Variance notes', type: 'Long text', req: false, placeholder: 'Explain any mismatch' },
    ],
  },
  {
    id: 'approval',
    tab: 'Approval',
    badge: 'Manual → automated',
    badgeTone: 'green',
    title: 'Finance director signs off anything over $10,000',
    blurb: 'Printed again and hand-signed, then chased → routed on amount and nudged automatically',
    problem: 'High-value approvals sit on desks because routing depends on someone remembering the threshold.',
    solution: 'Amount rules route to the right approver with reminders until decided.',
    impact: ['No invoices stuck below the radar', 'Approvers see only what needs them', 'SLA nudges without email ping-pong'],
    previewTitle: 'Finance director signs off anything over $10,000',
    previewSub: 'Routing and reminders are built into the step — not a side spreadsheet.',
    fields: [
      { label: 'Approval decision', type: 'Select', req: true, opts: ['Approve', 'Send back', 'Decline'] },
      { label: 'Approver notes', type: 'Long text', req: false },
    ],
  },
  {
    id: 'payment',
    tab: 'Payment',
    badge: 'Sequential → collapsed',
    badgeTone: 'amber',
    title: 'Payment is scheduled and the supplier is notified',
    blurb: 'Finance marks paid in a separate system → payment status and notice sent together',
    problem: 'Suppliers chase payment status because nothing tells them when money is on the way.',
    solution: 'Payment scheduling and supplier notification are one outcome step.',
    impact: ['Fewer status-chasing emails', 'Supplier sees the same truth as finance', 'Closed loop on every invoice'],
    previewTitle: 'Payment is scheduled and the supplier is notified',
    previewSub: 'The supplier gets notified when payment is scheduled — not when someone remembers.',
    fields: [
      { label: 'Payment date', type: 'Text', req: true, placeholder: 'Scheduled date' },
      { label: 'Notify supplier', type: 'Yes / no', req: false },
    ],
  },
];

const WORKFLOW = smartBlocks ? WORKFLOW_BLOCKS : WORKFLOW_MVP;

/* Exposed for the inline preview painter in builder.html. Must come after
   WORKFLOW is declared — reading it earlier throws on the temporal dead
   zone and kills the whole script. */
if (sugarhead) {
  window.__BD_WORKFLOW__ = WORKFLOW;
  window.__BD_PROJECT__ = projectName;
}

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
      : state.authed ? 'Builder preview · free'
        : sugarhead ? 'Preview · no account yet'
          : `${AUTH_CREDITS_USED} free · no account yet`;
}

function paintAccount() {
  if (chatFirst && params.get('experience') === 'full') {
    document.body.classList.add('bd-full-header');
    if (state.authed && $('bdCliOffer')) $('bdCliOffer').hidden = true;
    if (!$('bdSidebarToggle')) {
      const logo = document.createElement('img');
      logo.className = 'bd-full-wordmark';
      logo.src = '../assets/logos/eai-wordmark.svg';
      logo.alt = 'Enterprise AI';
      document.querySelector('.bd-top').appendChild(logo);
      const toggle = document.createElement('button');
      toggle.id = 'bdSidebarToggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Open sidebar');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 4v16" stroke="currentColor" stroke-width="1.6"/></svg>';
      document.querySelector('.bd-crumbs').prepend(toggle);
      toggle.setAttribute('data-workspace-drawer-open', '');
    }
    $('bdSidebarToggle').hidden = !state.authed;
    if (state.authed) {
      const adminHref = (file, extra = {}) => window.bdCarry('../admin/build-web/' + file, {
        demo: 'michael', handoff: params.get('workspaceApp') === '1' ? null : '1', project: projectName, prompt: state.prompt,
        ws: state.ws, email: state.email, experience: 'full', published: state.published ? '1' : '0', ...extra,
      });
      try { if (params.get('workspaceApp') !== '1') localStorage.setItem('eai-local-admin:created-app', JSON.stringify({id:'vendor-onboarding', name:projectName, initial:projectName.charAt(0), status:state.published ? 'Live' : 'Draft'})); } catch {}
      window.mountEaiWorkspaceDrawer({state, params, esc, adminHref,
        builderAppDashboardHref: (id, name, surface) => id === (params.get('app') || 'vendor-onboarding') && surface === 'ncb'
          ? location.href : adminHref('builder.html', {app:id, project:name, handoff:null, surface, view:surface === 'ncb' ? 'preview' : 'dashboard', drawer:'open'}),
        goCli: () => { saveNcbPreview(); location.href = adminHref('ws-cli.html'); },
      });
      const drawer = document.querySelector('#bdWorkspaceDrawer');
      if (drawer && !drawer.dataset.localBound) {
        drawer.dataset.localBound = '1';
        drawer.addEventListener('click', (event) => {
          const link = event.target.closest('a');
          if (!link) return;
          if (link.href === location.href) { event.preventDefault(); return; }
          saveNcbPreview();
        });
      }
    }
    if ($('bdHeaderAuth')) document.querySelector('.bd-crumbs').prepend($('bdHeaderAuth'));
    if ($('bdPublish')) document.querySelector('.bd-top-acts').appendChild($('bdPublish'));
  }
  if ($('bdHeaderAuth')) {
    $('bdHeaderAuth').hidden = chatFirst && params.get('experience') === 'full' && state.authed;
    const button = $('bdHeaderAuth').querySelector('[data-header-auth]');
    if (button) button.textContent = state.authed ? 'Manage apps' : 'Sign In / Sign Up';
  }
  if ($('bdHeaderAccount')) {
    $('bdHeaderAccount').hidden = !state.authed;
    $('bdHeaderAccount').textContent = state.ws;
  }
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
let activeChatMessage = null;
let followChatMessage = true;
let chatScrollFrame = null;
let chatScrollTarget = 0;

function moveChatTo(top) {
  chatScrollTarget = Math.max(0, top);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cancelAnimationFrame(chatScrollFrame);
    chatScrollFrame = null;
    log().scrollTop = chatScrollTarget;
    return;
  }
  if (chatScrollFrame !== null) return;
  let previousTime;
  function step(time) {
    if (!followChatMessage || !activeChatMessage?.isConnected) {
      chatScrollFrame = null;
      return;
    }
    const elapsed = previousTime === undefined ? 16 : Math.min(time - previousTime, 64);
    previousTime = time;
    const remaining = chatScrollTarget - log().scrollTop;
    if (Math.abs(remaining) < 1) {
      log().scrollTop = chatScrollTarget;
      chatScrollFrame = null;
      return;
    }
    const distance = Math.max(1, Math.abs(remaining) * (1 - Math.exp(-elapsed / 100)));
    log().scrollTop += Math.sign(remaining) * distance;
    chatScrollFrame = requestAnimationFrame(step);
  }
  chatScrollFrame = requestAnimationFrame(step);
}

if (chatFirst) {
  const pauseFollowing = () => { followChatMessage = false; };
  log().addEventListener('wheel', pauseFollowing, { passive: true });
  log().addEventListener('touchstart', pauseFollowing, { passive: true });
  log().addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) pauseFollowing();
  });
  new ResizeObserver(() => scroll()).observe(log());
  new MutationObserver(() => scroll()).observe(log(), { childList: true, subtree: true, characterData: true });
}

function scroll() {
  const l = log();
  if (chatFirst) {
    if (!activeChatMessage?.isConnected) return;
    const logTop = l.getBoundingClientRect().top;
    // Align the row boundary, not an inset above it: that inset exposed
    // the clipped bottom of the preceding message. Rows own their spacing.
    const top = Math.max(0, activeChatMessage.getBoundingClientRect().top - logTop + l.scrollTop);
    const children = [...l.children];
    const bottom = Math.max(...children.map((child) => child.getBoundingClientRect().bottom - l.getBoundingClientRect().top + l.scrollTop));
    l.style.setProperty('--bd-scroll-space', `${Math.max(0, l.clientHeight - (bottom - top) - 16)}px`);
    if (followChatMessage) moveChatTo(top);
    return;
  }
  l.scrollTop = l.scrollHeight;
}

function bubble(role, html, cost) {
  const row = document.createElement('div');
  row.className = `bd-msg ${role}`;
  row.innerHTML = role === 'user'
    ? `<div class="bd-bub">${html}</div>`
    : `<div class="bd-av">AI</div><div class="bd-bub">${html}</div>`;
  if (cost && SHOW_CREDIT_COSTS) {
    const chip = document.createElement('span');
    chip.className = 'bd-spent';
    chip.textContent = `−${cost}`;
    chip.title = `${cost} credits`;
    row.querySelector('.bd-bub').appendChild(chip);
  }
  log().appendChild(row);
  if (chatFirst) {
    if (!row.querySelector('.bd-dots')) {
      const messages = [...log().children].filter((child) => child.classList.contains('bd-msg') && !child.querySelector('.bd-dots'));
      // Reset on each new message, retaining the complete previous message.
      // Follow-up cards stay attached to the message that introduced them.
      activeChatMessage = messages[messages.length - 2] || row;
      followChatMessage = true;
    }
  }
  scroll();
  return row;
}

/** An assistant message whose body is a card rather than a sentence. */
function card(html) {
  const row = document.createElement('div');
  row.className = 'bd-msg ai';
  row.innerHTML = `<div class="bd-av">AI</div><div class="bd-card">${html}</div>`;
  log().appendChild(row);
  scroll();
  return row;
}

async function thinking(ms = 900) {
  const row = bubble('ai', '<span class="bd-dots"><i></i><i></i><i></i></span>');
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
  return !state.authed && creditsUsed() + cost > AUTH_CREDITS_USED;
}

function requireAuth(cost, resume, { atPublish = false } = {}) {
  if (state.authed) return true;
  if (chatFirst && state.generated) {
    state.pendingAuth = resume;
    showAuthGate('preview-limit');
    return false;
  }
  /* Sugarhead: delay sign-in until publish — let them see full value first. */
  if (sugarhead && !atPublish) return true;
  if (!sugarhead && !authRequiredFor(cost)) return true;
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
  if (sugarhead || state.authed || state.authNudgeShown || creditsUsed() < AUTH_CREDITS_USED) return;
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
        I can build a process up to four steps and publish it as a form with
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
  if (chatFirst && params.get('experience') === 'full') {
    const proceed = () => {
      saveNcbPreview();
      showInlineAppSettings($('bdFrame'));
      window.openEaiCliHandoff(projectName, () => window.moveEaiAppToCli(projectName, {ws:state.ws, email:state.email, app:params.get('app') || 'vendor-onboarding', published:state.published ? '1' : '0', demo:'michael'}));
    };
    if (requireAuth(0, proceed, { atPublish:true })) proceed();
    return;
  }
  saveNcbPreview();
  if (chatFirst) {
    sessionStorage.setItem('eai-cli-handoff', JSON.stringify({
      project: projectName, prompt: state.prompt, brand: state.brandKey,
      extraFields: state.extraFields, workflow: WORKFLOW, returnUrl: location.href,
    }));
  }
  location.href = window.bdCarry(chatFirst ? '../admin/build-web/builder.html' : 'app.html', {
    tab: 'cli',
    ws: state.ws,
    email: state.email,
    project: projectName,
    ...(chatFirst ? { demo: 'michael', handoff: '1', published: state.published ? '1' : '0', app: 'vendor-onboarding', surface: 'ncb', view: 'dashboard', section: 'overview', cliSetup: '1', drawer: 'open' } : {}),
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

function brandedPreviewClasses() {
  const cls = ['bd-pv-doc', 'bd-pv-mvp'];
  if (sugarhead && !state.generated) cls.push('bd-template');
  if (state.branded) cls.push('bd-branded');
  return cls.join(' ');
}

function applyBrandToPreviewFrame() {
  const frame = $('bdFrame');
  if (!frame || !window.BrandMatch) return;
  window.BrandMatch.applyBrandVars(frame);
  /* The brand step promises "the preview is already wearing it", so the
     preview follows whatever is currently active — not just what has been
     committed. Picking a swatch has to show up immediately or the promise
     is a lie. */
  const live = window.BrandMatch.getActiveBrand?.();
  const branded = state.branded || !!(live && live.key && live.key !== 'none');
  document.body.classList.toggle('bd-branded-preview', branded);
}

function paintMvpPreviewStep(index) {
  if (sugarhead && !smartBlocks) return paintMktPreviewStep(index);
  return paintLegacyMvpPreviewStep(index);
}

function paintTemplatePreview() {
  if (!sugarhead || smartBlocks) return;
  document.body.classList.add('bd-has-preview');
  state.activeStep = 0;
  paintMktPreviewStep(0);
}

function paintMktPreviewStep(index) {
  const PL = window.MKT_APP_PREVIEW;
  if (!PL) {
    console.error('[sugarhead] MKT_APP_PREVIEW missing');
    return;
  }

  const brand = window.BrandMatch?.getActiveBrand?.();
  const app = PL.workflowToApp(WORKFLOW, index, projectName);
  const frame = $('bdFrame');
  const publishButton = chatFirst ? $('bdPublish') : null;
  const headerActions = document.querySelector('.bd-top-acts');
  if (headerActions && frame.contains(headerActions)) document.querySelector('.bd-top').appendChild(headerActions);
  frame.dataset.device = state.device;
  frame.innerHTML = PL.render(app, {
    activeStep: index,
    brand,
    interactive: true,
    device: state.device,
    mobileSlot: true,
  });
  /* The QR button is wired once at boot, so it is moved into each freshly
     painted toolbar rather than re-rendered and re-bound. Held by reference,
     not by id — repainting the frame detaches it from the document. */
  const slot = frame.querySelector('.mkt-wf-mobile-slot');
  if (slot && mobileQrBtn) slot.replaceWith(mobileQrBtn);
  if (chatFirst) {
    frame.querySelector('.mkt-wf-bar > .mkt-seg-tabs')?.remove();
    if (params.get('previewOnly') !== '1') {
      const settings = document.createElement('button');
      settings.type = 'button';
      settings.className = 'bd-mobile-qr bd-app-settings';
      settings.textContent = 'App settings';
      settings.addEventListener('click', () => {
        const openSettings = () => {
          if (params.get('experience') === 'full') {
            showInlineAppSettings(frame);
            return;
          }
          saveNcbPreview();
          location.href = window.bdCarry('../admin/build-web/builder.html', {
            demo: 'michael', handoff: '1', app: 'vendor-onboarding',
            surface: 'ncb', view: 'dashboard', section: 'settings', drawer: 'open',
            project: projectName, prompt: state.prompt, ws: state.ws, email: state.email,
            published: state.published ? '1' : '0', appUrl: state.published ? publicUrl() : '',
          });
        };
        if (requireAuth(0, openSettings, { atPublish: true })) openSettings();
        else {
          $('gateLede').textContent = 'Sign in to open app settings';
          $('wsGo').textContent = 'Continue to app settings';
        }
      });
      if (params.get('experience') === 'full') {
        const views = document.createElement('div');
        views.className = 'mkt-seg-tabs mkt-seg-tabs-sm bd-app-settings';
        views.setAttribute('role', 'group');
        views.setAttribute('aria-label', 'App view');
        const preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'on';
        preview.textContent = 'Preview';
        preview.setAttribute('aria-pressed', 'true');
        preview.addEventListener('click', () => {
          frame.classList.remove('bd-show-settings');
          preview.classList.add('on');
          settings.classList.remove('on');
          preview.setAttribute('aria-pressed', 'true');
          settings.setAttribute('aria-pressed', 'false');
        });
        settings.className = '';
        settings.setAttribute('aria-pressed', 'false');
        views.append(preview, settings);
        frame.querySelector('.mkt-wf-bar')?.prepend(views);
      } else {
        frame.querySelector('.mkt-wf-bar')?.prepend(settings);
      }
    }
    frame.querySelectorAll('.mkt-app-devices button').forEach((button) => {
      const label = document.createElement('span');
      label.textContent = button.getAttribute('aria-label');
      button.appendChild(label);
    });
    if (mobileQrBtn) {
      mobileQrBtn.title = 'Preview link';
      mobileQrBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Preview link';
      const actions = document.createElement('div');
      actions.className = 'bd-preview-actions';
      mobileQrBtn.replaceWith(actions);
      actions.appendChild(mobileQrBtn);
      if (params.get('experience') === 'full' && params.get('previewOnly') !== '1') {
        const cli = document.createElement('button');
        cli.type = 'button';
        cli.className = 'bd-mobile-qr bd-toolbar-cli';
        cli.textContent = 'Go further with EAI CLI';
        cli.addEventListener('click', () => $('bdContinueCli')?.click());
        actions.insertBefore(cli, mobileQrBtn);
      }
      if (publishButton && params.get('previewOnly') !== '1') {
        const destination = params.get('experience') === 'full'
          ? document.querySelector('.bd-top-acts') : actions;
        destination.appendChild(publishButton);
      }
    }
  }
  PL.bind(frame, {
    onStep: (i) => {
      state.activeStep = i;
      state.expandedStep = i;
      paintMktPreviewStep(i);
      if (!sugarhead) paintProcessMap();
    },
    onDevice: (d) => {
      state.device = d;
      paintMktPreviewStep(state.activeStep);
    },
  });
  applyBrandToPreviewFrame();
  window.alignEaiBuilderColumns?.();
}

function showInlineAppSettings(frame) {
  let panel = frame.querySelector('.bd-inline-settings');
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'bd-inline-settings';
    panel.setAttribute('aria-label', 'App settings');
    panel.innerHTML = `
      <header><div><h2>${esc(projectName)}</h2><p>Manage your app settings.</p></div><button type="button" class="bd-settings-save">Save changes</button></header>
      <article><h3>App overview</h3><div class="bd-settings-facts"><div><b>${state.published ? 'Published' : 'Draft'}</b><span>Status</span></div><div><b>${WORKFLOW.length}</b><span>Stages</span></div></div></article>
      <article><h3>Who can access</h3><p>Control who can open and use this app.</p><label for="bdInlineAccess">App access</label><select id="bdInlineAccess"><option>Anyone in workspace</option><option>Only invited people</option><option>Anyone with the link</option></select></article>
      <article><label class="bd-settings-badge"><span><b>“Built with EAI” badge</b><small>Show the badge in the footer of the published app.</small></span><input type="checkbox" aria-label="Show Built with EAI badge" checked></label></article>
      <p class="bd-settings-status" role="status"></p>`;
    panel.querySelector('select').value = state.appAccess || 'Anyone in workspace';
    panel.querySelector('input').checked = state.appBadge !== false;
    panel.querySelector('.bd-settings-save').addEventListener('click', () => {
      state.appAccess = panel.querySelector('select').value;
      state.appBadge = panel.querySelector('input').checked;
      panel.querySelector('.bd-settings-status').textContent = 'Settings saved for this session.';
    });
    const content = document.createElement('div');
    content.className = 'bd-settings-content';
    while (panel.firstChild) content.appendChild(panel.firstChild);
    const cliBanner = document.createElement('div');
    cliBanner.className = 'bd-overview-cli-banner';
    cliBanner.innerHTML = '<div><h3>Go further with EAI CLI</h3><p>Add custom logic, integrations and advanced features. Continue building this app in EAI CLI.</p></div><button type="button" class="bd-settings-save">Go further with EAI CLI</button>';
    cliBanner.querySelector('button').addEventListener('click', () => goCli('builder'));
    content.prepend(cliBanner);

    const rail = document.createElement('nav');
    rail.className = 'bd-settings-rail';
    rail.setAttribute('aria-label', 'App settings sections');
    rail.innerHTML = `<div class="bd-settings-identity"><span class="bd-settings-app-icon">${esc(projectName.charAt(0))}</span><span><b>${esc(projectName)}</b><small>App settings</small></span></div>`;
    const embedded = document.createElement('div');
    embedded.className = 'bd-settings-embedded';
    embedded.hidden = true;
    const cards = [...content.querySelectorAll('article')];
    ['Overview', 'Submissions', 'Analytics', 'Resources'].forEach((name) => {
      const button = document.createElement('button');
      button.type = 'button';
      const icons = {
        Overview: '<path d="M4 10.5 12 4l8 6.5V20H5V10.5M9 20v-6h6v6"/>',
        Submissions: '<path d="M7 3h7l4 4v14H7zM14 3v5h5"/>',
        Analytics: '<path d="M4 20V10M10 20V4M16 20v-7M3 20h18"/>',
        Resources: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
      };
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${icons[name]}</svg><span>${name}</span>`;
      button.classList.toggle('on', name === 'Overview');
      if (name === 'Overview') button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => {
        rail.querySelectorAll('button').forEach((item) => {
          item.classList.toggle('on', item === button);
          if (item === button) item.setAttribute('aria-current', 'page');
          else item.removeAttribute('aria-current');
        });
        const local = name === 'Overview';
        content.hidden = !local;
        embedded.hidden = local;
        if (local) {
          cards[0].hidden = name === 'Settings';
          content.querySelector('header p').textContent = name === 'Overview' ? 'Manage your app settings.' : 'Manage how your app is accessed and displayed.';
        } else {
          const page = name === 'Submissions' ? 'app-submissions.html' : name === 'Resources' ? 'app-configure.html' : 'app-analytics.html';
          if (embedded.dataset.page !== page) {
            const iframe = document.createElement('iframe');
            iframe.title = name;
            iframe.src = window.bdCarry('../admin/build-web/' + page, {embedded:'1', section:name === 'Resources' ? 'resources' : null, demo:'michael', app:'vendor-onboarding', project:projectName, ws:state.ws, email:state.email});
            embedded.replaceChildren(iframe);
            embedded.dataset.page = page;
          }
        }
      });
      rail.appendChild(button);
    });
    panel.append(rail, content, embedded);
    frame.querySelector('.mkt-preview-wrap').appendChild(panel);
  }
  frame.classList.add('bd-show-settings');
  frame.querySelectorAll('.bd-app-settings button').forEach((button, index) => {
    button.classList.toggle('on', index === 1);
    button.setAttribute('aria-pressed', String(index === 1));
  });
}

function paintLegacyMvpPreviewStep(index) {
  const step = WORKFLOW[index];
  if (!step) return;
  state.activeStep = index;

  const extra = state.extraFields.filter((f) => f.stepId === step.id);
  const fields = [...step.fields, ...extra].map(mvpFieldHtml).join('');
  const brand = window.BrandMatch?.getActiveBrand?.();
  const title = state.branded && brand && brand.key !== 'none' ? brand.name : projectName;

  $('bdFrame').innerHTML = `
    <div class="${brandedPreviewClasses()}">
      <div class="bd-pv-hd">
        <b>${esc(title)}</b>
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
      <span class="bd-pv-watermark">MVP · prototype</span>
    </div>`;

  applyBrandToPreviewFrame();

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

function enterMvpWorkshop() {
  document.body.classList.add('bd-has-preview', 'bd-mvp-workshop');
  state.generated = true;
  state.activeStep = 0;
  state.expandedStep = 0;
  paintProcessMap();
  paintMvpPreviewStep(0);
  $('bdProjectName').textContent = projectName;
  /* The chat keeps its scroll height from before the layout changed, so the
     newest message ends up above the fold in the shorter workshop panel. */
  requestAnimationFrame(scroll);
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
    </div>`;
}

function openPreview() {
  document.body.classList.add('bd-has-preview');
  paintPreview();
}

/* ====================== the clarification stepper ================= */

/* clarification-card.tsx: 3–4 questions, one at a time, anchored above
   the input rather than dropped into the transcript. Options plus a way
   to type your own, and a way out — nothing here blocks. */

const QUESTIONS = [
  {
    q: 'Who starts this process?',
    opts: ['A customer or applicant', 'Someone in your team', 'Another system, automatically'],
  },
  {
    q: 'Does anyone have to approve it before it completes?',
    opts: ['Yes — one approver', 'Yes — more than one', 'No approval needed'],
  },
  {
    q: 'What has to come out the other end?',
    opts: ['A decision on record', 'A document or letter', 'A record in another system'],
  },
];

let pendingChoiceReply = null;

function setChoiceReply(handler) {
  pendingChoiceReply = handler;
  $('bdSay').disabled = !handler;
  $('bdSend').disabled = !handler;
  $('bdSay').placeholder = handler ? 'Choose an option or reply here...' : 'Describe a change…';
}

function askClarify() {
  if (chatFirst) {
    // Preserve the exchange anchor when the question panel opens.
    scroll();
  }
  return new Promise((resolve) => {
    let at = 0;
    let done = false;
    const answers = [];
    $('bdAnchor').innerHTML = '';
    const box = document.createElement('div');
    box.className = 'bd-clarify';
    $('bdAnchor').appendChild(box);

    function paint() {
      const q = QUESTIONS[at];
      box.className = smartBlocks ? 'bd-clarify' : 'bd-clarify bd-clarify--shadcn';
      box.innerHTML = smartBlocks ? `
        <div class="bd-cl-hd">
          <b>A few questions before I build</b>
          <span>${at + 1} of ${QUESTIONS.length} &middot; free</span>
        </div>
        <p class="bd-cl-q">${esc(q.q)}</p>
        <div class="bd-cl-opts">
          ${q.opts.map((o, i) => `<button type="button" data-i="${i}">${esc(o)}</button>`).join('')}
        </div>
        <div class="bd-cl-ft">
          <input type="text" placeholder="Something else&hellip;" data-other />
          <button class="bd-cl-skip" type="button" data-skip>Skip &mdash; just build it</button>
        </div>` : `
        <div class="bd-cl-hd">
          <b>Quick questions</b>
          <span>${at + 1} of ${QUESTIONS.length} &middot; free</span>
        </div>
        <p class="bd-cl-q">${esc(q.q)}</p>
        <div class="bd-cl-radio">
          ${q.opts.map((o, i) => `<button type="button" data-i="${i}">${esc(o)}</button>`).join('')}
        </div>
        <div class="bd-cl-ft">
          <input type="text" placeholder="Something else&hellip;" data-other />
          <button class="bd-cl-skip" type="button" data-skip>Skip &mdash; just build it</button>
        </div>`;

      if (chatFirst) {
        box.className = 'bd-choice-card';
        box.innerHTML = `
          <div class="bd-choice-heading"><h3>${esc(q.q)}</h3><span>${at + 1} of ${QUESTIONS.length} · Choose one</span></div>
          <p>Choose an option below or write your answer in the chat.</p>
          ${q.opts.map((option, i) => `<button type="button" data-i="${i}"><span class="bd-choice-number">${i + 1}</span><span><b>${esc(option)}</b></span></button>`).join('')}
          ${params.get('experience') === 'full' ? `<form class="bd-choice-custom"><div><input id="bdCustomAnswer" type="text" aria-label="Other answer" placeholder="Other — type your answer…" autocomplete="off" /><button type="submit" disabled>Send</button></div></form>` : ''}
          <div class="bd-choice-footer"><button type="button" data-skip>Skip — just build it</button></div>`;
      }

      box.querySelectorAll('[data-i]').forEach((b) => {
        b.addEventListener('click', () => pick(q.opts[Number(b.dataset.i)]));
      });
      const customForm = box.querySelector('.bd-choice-custom');
      const openCustom = () => {
        customForm.hidden = false;
        customForm.querySelector('input').focus();
      };
      if (customForm) {
        const input = customForm.querySelector('input');
        const send = customForm.querySelector('button');
        input.addEventListener('input', () => { send.disabled = !input.value.trim(); });
        customForm.addEventListener('submit', event => {
          event.preventDefault();
          if (input.value.trim()) pick(input.value.trim());
        });
      }
      const other = box.querySelector('[data-other]');
      other?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && other.value.trim()) pick(other.value.trim());
      });
      box.querySelector('[data-skip]').addEventListener('click', () => finish(true));
      if (chatFirst) setChoiceReply((text) => {
        if (text.trim() === '4' && customForm) { openCustom(); return; }
        const option = /^[1-3]$/.test(text) ? q.opts[Number(text) - 1] : text;
        pick(option);
      });
    }

    function pick(value) {
      if (chatFirst) bubble('user', esc(value));
      answers.push({ q: QUESTIONS[at].q, a: value });
      at += 1;
      if (at >= QUESTIONS.length) return finish(false);
      paint();
    }

    function finish(skipped) {
      if (done) return;
      done = true;
      if (chatFirst) setChoiceReply(null);
      box.remove();
      if (!skipped && answers.length && !chatFirst) {
        /* clarification-answers-card.tsx: a read-only record of what was
           confirmed, not a chat bubble pretending they typed it. */
        card(`
          <div class="bd-answers">
            <b>What you told me</b>
            ${answers.map((a) => `<span><i>${esc(a.q)}</i>${esc(a.a)}</span>`).join('')}
          </div>`);
      }
      resolve(answers);
    }

    paint();
  });
}

/* ============================ the run ============================= */

async function generate() {
  if (!requireAuth(PRICE.generate, () => generate())) return;
  const cost = charge('generate');
  await thinking(700);

  /* Sugarhead shows the app itself, not a description of it. No process
     map, no build-progress theatre, no summary card — the preview on the
     right has been the answer since the first paint. */
  if (sugarhead) {
    state.generated = true;
    await say(chatFirst
      ? 'Your first version is ready, with your company’s colours and logo.\n\nTry it out in the preview. Walk through the process and see how it looks on desktop, tablet or mobile.\n\nWhat would you like to change? Tell me here and we’ll refine it together. For custom logic, integrations or more advanced features, you can continue in EAI CLI using the option below.\n\nWhen you’re happy with it, click Publish.'
      : 'Done — it\'s wearing your brand. Try the steps and the device sizes on the right, then publish when it looks right.', cost);
    paintMktPreviewStep(state.activeStep);
    setStep('improve');
    $('bdPublish').disabled = false;
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;
    $('bdSay').placeholder = 'Describe a change…';
    if (chatFirst) $('bdCliOffer').hidden = params.get('experience') === 'full' && state.authed;
    return;
  }

  if (!smartBlocks) {
    await say('Here\'s your workflow — expand each step to see the problem, solution, and impact. The form preview updates as you go.', cost);
    enterMvpWorkshop();
    setStep('improve');
    $('bdPublish').disabled = false;
    $('bdSuggest').hidden = false;
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;
    $('bdSay').placeholder = 'Describe a change…';
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
        'Mapping the process as it runs today',
        'Collapsing four handoffs into one submission',
        'Adding Document Analysis and Compliance Rules blocks',
        'Building the form',
      ]
    : [
        'Mapping the process as it runs today',
        'Collapsing handoffs into one submission',
        'Building the form',
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
  $('bdSay').placeholder = 'Describe a change…';
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

function mountBusinessProcessCard(onConfirm) {
  const bu = card(`
    <div class="bd-bu">
      <div class="hd">
        <b>Business process card</b>
        <span>My structured understanding — confirm or refine it.</span>
      </div>
      <div class="quote">${esc(sentence(state.prompt))} — today this runs on email and a shared inbox, with the same details re-keyed at least twice.</div>
      <div class="kv">
        <span class="i goal">${params.get('experience') === 'full' ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>' : '◎'}</span><div><b>Goal</b><span>Get to a decision without anybody chasing the paperwork.</span></div>
      </div>
      <div class="kv">
        <span class="i aud">${params.get('experience') === 'full' ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/></svg>' : '◍'}</span><div><b>Audience</b><span>The person submitting, and the one or two people who review it.</span></div>
      </div>
      <div class="kv">
        <span class="i out">${params.get('experience') === 'full' ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>' : '✓'}</span><div><b>Outcome</b><span>A decision on record, with everything it was based on attached to it.</span></div>
      </div>
      <div class="acts">
        <button class="nb-btn" type="button" data-refine>Make changes</button>
        <button class="nb-btn primary" type="button" data-confirm>Looks good &mdash; continue</button>
      </div>
    </div>`);

  /* The fit fork is decided here, on what they typed, but it is not shown
     here — the business card is the first thing that has to land. */
  if (APP_WORDS.test(state.prompt)) {
    state.pendingFit = (state.prompt.match(APP_WORDS) || [])[0];
    state.turnsSinceFork = 0;
  }

  bu.querySelector('[data-refine]').addEventListener('click', () => {
    $('bdSay').disabled = false;
    $('bdSend').disabled = false;
    $('bdSay').placeholder = 'What did I get wrong?';
    $('bdSay').focus();
  });

  bu.querySelector('[data-confirm]').addEventListener('click', async () => {
    if (state.continuing) return;
    state.continuing = true;
    bu.querySelector('.acts').innerHTML = '<span class="bd-confirmed">Confirmed</span>';
    await onConfirm();
  });
}

async function run() {
  if (state.runStarted) return;
  state.runStarted = true;
  paintMeter();
  $('bdProjectName').textContent = projectName;
  paintAccount();
  document.title = `Prototype — ${projectName}`;

  /* Chat-first has no preview panel yet — the split only opens once the
     business process card is confirmed, so painting here would flash it in. */
  if (sugarhead && !chatFirst) paintTemplatePreview();

  /* The prompt is already the first message. On /build-sugar nobody
     signed up to get here — they typed on the homepage and landed. */
  bubble('user', esc(state.prompt));

  /* Sugarhead is five beats: they type, we show the app, we ask for the
     email that brands it, they try it, they publish. The business process
     card and the three clarify questions were both interrogations standing
     between somebody and the thing they asked for — the app on the right
     already answers "did you understand me?" better than a card could.

     Plan-first keeps the instant preview but puts the card and the
     questionnaire back in before branding — for when we want confirmation
     before we dress it in their colours. */
  if (sugarhead && !planFirst && !brandFirst && !chatFirst) {
    await thinking(900);
    const understood = charge('understand');
    await say(`Here's ${state.prompt} as a working app — it's on the right.`, understood);
    await wait(300);
    await brandThenGenerate();
    return;
  }

  if (chatFirst) {
    await thinking(900);
    const understood = charge('understand');
    await say(`Right — ${state.prompt}. A few questions first...`, understood);
    await askClarify();
    await wait(200);
    await say('Here\'s my understanding of the process — confirm or refine it before we build.');
    await wait(200);
    mountBusinessProcessCard(continueAfterChatFirstCard);
    return;
  }

  if (planFirst) {
    await thinking(900);
    const understood = charge('understand');
    await say(`Here's ${state.prompt} as a working app — it's on the right.`, understood);
    await wait(200);
    await say('Before we brand it, here\'s my understanding — correct me if anything\'s off.');
    await wait(200);
    mountBusinessProcessCard(continueAfterPlanFirstConfirm);
    return;
  }

  if (brandFirst) {
    const brand = window.BrandMatch?.getActiveBrand?.();
    const brandName = brand && brand.key !== 'none' ? brand.name : 'your brand';
    await thinking(900);
    const understood = charge('understand');
    await say(`Here's ${state.prompt} as a working app — on the right, wearing ${brandName}.`, understood);
    await wait(200);
    await say('Two or three questions first — they\'re free, asking you something isn\'t work.');
    await askClarify();
    await wait(200);
    await say('Here\'s my understanding of the process — confirm or refine it before I build.');
    await wait(200);
    mountBusinessProcessCard(continueAfterBrandFirstCard);
    return;
  }

  await thinking(1100);
  const cost = charge('understand');
  await say(`Right — ${state.prompt}. Here's what I think you're describing. Correct me before I build anything.`, cost);

  await wait(200);
  mountBusinessProcessCard(continueAfterConfirm);
}

/** Ask for the work email, dress the preview in that brand, then build. */
async function brandThenGenerate() {
  setStep('generate');
  if (window.BrandMatch) {
    await say('Next, let’s make it look like your app. Enter your work email to apply your company’s colours and logo.');
    /* The card lands in the transcript where the question was asked, not
       pinned above the composer: it is a turn in the conversation. */
    const r = await window.BrandMatch.askInChat(log(), esc, () => paintTemplatePreview());
    state.brandKey = r.brandKey;
    state.branded = r.brandKey !== 'none';
    state.email = r.email || state.email;
    if (r.workspace) state.ws = r.workspace;
    paintTemplatePreview();
    scroll();
  }
  await generate();
}

async function continueAfterConfirm() {
  if (state.step !== 'describe') return;
  setStep('generate');
  await wait(400);
  await say('Two or three questions, then I\'ll build it. They\'re free — asking you something isn\'t work.');
  await askClarify();
  await generate();
}

async function continueAfterPlanFirstConfirm() {
  if (state.step !== 'describe') return;
  await wait(400);
  await say('Two or three questions, then we\'ll brand it. They\'re free — asking you something isn\'t work.');
  await askClarify();
  await brandThenGenerate();
}

async function continueAfterBrandFirstCard() {
  if (state.step !== 'describe') return;
  setStep('generate');
  await generate();
}

function enterSplitPreview() {
  document.body.classList.add('bd-has-preview');
  paintTemplatePreview();
  requestAnimationFrame(scroll);
}

async function continueAfterChatFirstCard() {
  if (state.step !== 'describe') return;
  setStep('generate');
  await wait(400);
  enterSplitPreview();
  await wait(500);
  await brandThenGenerate();
}

/* ============================ the composer ======================== */

async function send() {
  const input = $('bdSay');
  const text = input.value.trim();
  if (text && pendingChoiceReply) {
    input.value = '';
    pendingChoiceReply(text);
    return;
  }
  if (!text || state.busy) return;
  if (state.credits <= 0) { costFork(); return; }
  if (!requireAuth(PRICE.change, () => send())) return;

  state.busy = true;
  input.value = '';
  const attachments = window.builderComposerMedia?.take() || [];
  const attachmentLinks = attachments.map((file) => `<a class="bd-sent-file" href="${esc(file.url)}" download="${esc(file.name)}">📎 ${esc(file.name)}</a>`).join('');
  bubble('user', esc(text) + attachmentLinks);

  if (APP_WORDS.test(text) && !state.fitForkShown) {
    state.pendingFit = (text.match(APP_WORDS) || [])[0];
  }

  const cost = charge('change');
  await thinking(800);

  if (state.step === 'describe') {
    await say('Got it — I\'ve taken that in. Press continue on the card above when it reads right.', cost);
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

function publicUrl() {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
  return `forms.enterpriseaigroup.com/n/${slug}`;
}

async function publish() {
  if (state.busy) return;
  if (state.credits < PRICE.publish && !sugarhead) { costFork(); return; }
  if (!requireAuth(PRICE.publish, () => publish(), { atPublish: true })) return;
  state.busy = true;
  const cost = sugarhead ? 0 : charge('publish');
  await thinking(900);
  state.published = true;
  saveNcbPreview();
  paintPreview();
  setStep('publish');
  $('bdPublish').textContent = chatFirst ? 'Publish' : 'Republish';
  const url = publicUrl();
  if (sugarhead && window.showPublishSuccess) {
    state.busy = false;
    window.showPublishSuccess({
      projectName,
      publicUrl: url,
      onManage: () => {
        location.href = window.bdCarry(chatFirst ? '../admin/build-web/ws-home.html' : 'ws-home.html', {
          tenancy: 'seeded',
          email: state.email,
          ws: state.ws,
          ...(chatFirst ? { demo: 'michael', handoff: '1', project: projectName, prompt: state.prompt, published: '1', appUrl: url } : {}),
        });
      },
      onCli: () => {
        if (chatFirst) { goCli('publish'); return; }
        location.href = window.bdCarry(chatFirst ? '../admin/build-web/ws-cli.html' : 'ws-cli.html', {
          email: state.email,
          ws: state.ws,
          project: projectName,
          ...(chatFirst ? { demo: 'michael', handoff: '1', published: '1', appUrl: url } : {}),
        });
      },
      onKeepEditing: () => {},
    });
    return;
  }
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

function prefillAuthGate() {
  /* The setup card already collected both of these. Asking again at publish
     would be the same question twice in one flow. */
  if (state.email && !$('gateEmail').value) $('gateEmail').value = state.email;
  if (state.ws && state.ws !== 'Preview') $('wsNameInput').value = state.ws;
  $('gateGo').disabled = !validEmail($('gateEmail').value);
}

function showAuthGate(mode) {
  const gate = $('authGate');
  const lede = $('gateLede');
  if (lede) {
    lede.textContent = sugarhead
      ? 'Sign in to publish your app'
      : creditsUsed() >= AUTH_CREDITS_USED
        ? 'Sign in to keep building'
        : 'Sign up to save your work';
  }
  gate.hidden = false;
  document.body.classList.add('bd-gate');
  showSignUpPanel();
  prefillAuthGate();
  if (mode === 'signin' || mode === 'signup') {
    lede.textContent = mode === 'signin' ? 'Sign in to your workspace' : 'Create your account';
  }
  document.querySelectorAll('.bd-oauth-btn').forEach((button) => {
    const provider = button.dataset.provider;
    button.textContent = (mode === 'signup' ? 'Sign up with ' : 'Sign in with ')
      + ({ google: 'Google', github: 'GitHub', microsoft: 'Microsoft' }[provider]);
  });
  $('wsGo').textContent = mode ? 'Continue to workspace' : 'Continue to publish';
  const explanation = $('gateExplanation');
  if (explanation) {
    explanation.hidden = !(chatFirst && state.generated);
    explanation.textContent = mode === 'leave'
      ? 'Sign in or create an account to keep working on your app. Leaving now may lose your unsaved work.'
      : 'Your free preview is ready. Sign in or create an account to keep chatting, add features and publish your app. You can still explore the preview without signing in.';
  }
  if (chatFirst && state.generated) {
    lede.textContent = mode === 'leave' ? 'Keep your work before you leave' : 'Sign in to continue with your app';
    $('wsGo').textContent = 'Continue with my app';
  }
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
  $('wizardRail').querySelector('[data-step="1"]').classList.add('on');
  $('wizardRail').querySelector('[data-step="2"]').classList.remove('on');
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
  $('wizardRail').querySelector('[data-step="1"]').classList.toggle('on', step === 1);
  $('wizardRail').querySelector('[data-step="2"]').classList.toggle('on', step === 2);
  $('wizardStep1').hidden = step !== 1;
  $('wizardStepOAuth').hidden = true;
  $('wizardStep2').hidden = step !== 2;
}

function goToWorkspaceStep(email) {
  signedUpEmail = email.trim();
  $('wsCountry').value = guessCountry();
  const suggested = workspaceFromEmail(signedUpEmail)
    || signedUpEmail.split('@')[0].replace(/[._+]/g, ' ').trim()
    || 'My workspace';
  $('wsNameInput').value = suggested.charAt(0).toUpperCase() + suggested.slice(1);
  syncWorkspaceGo();
  setWizardStep(2);
  $('wsNameInput').focus();
}

function finishAuth() {
  state.email = signedUpEmail;
  state.ws = $('wsNameInput').value.trim() || 'My workspace';
  state.authed = true;
  hideAuthGate();
  paintAccount();
  history.replaceState(null, '', window.bdCarry(location.pathname.split('/').pop(), {
    email: state.email,
    ws: state.ws,
    country: $('wsCountry').value,
    ...(smartBlocks ? { blocks: '1' } : {}),
  }));
  const resume = state.pendingAuth;
  state.pendingAuth = null;
  if (resume) void resume();
}

function wireAuthGate() {
  const syncGate = () => { $('gateGo').disabled = !validEmail($('gateEmail').value); };
  const syncOAuth = () => { $('oauthGo').disabled = !validEmail($('oauthEmail').value); };

  $('gateEmail').addEventListener('input', syncGate);
  $('oauthEmail').addEventListener('input', syncOAuth);
  $('wsNameInput').addEventListener('input', syncWorkspaceGo);
  $('wsCountry').addEventListener('change', syncWorkspaceGo);

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

  $('wsGo').addEventListener('click', finishAuth);
  $('wsNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !$('wsGo').disabled) finishAuth();
  });

  $('wsCountry').value = guessCountry();
}

/* ============================ wiring ============================== */

$('bdSend').addEventListener('click', () => void send());
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
if (params.get('experience') === 'full' && $('bdContinueCli')) {
  $('bdContinueCli').textContent = 'Go further with EAI CLI';
}
$('bdContinueCli')?.addEventListener('click', () => {
  const proceed = () => goCli('builder');
  if (!requireAuth(0, proceed, { atPublish: true })) {
    $('gateLede').textContent = 'Sign in or create an account to continue in EAI CLI';
    $('wsGo').textContent = 'Continue to CLI';
    return;
  }
  proceed();
});

document.querySelectorAll('#bdMode button, #bdDevice button').forEach((b) => {
  b.addEventListener('click', () => {
    const group = b.parentElement;
    group.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    if (b.dataset.mode) document.body.dataset.mode = b.dataset.mode;
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
if (chatFirst) {
  const needsAccount = () => state.generated && !state.authed;
  // Drafting (including attachments and dictation) stays available.
  // send() checks authentication before clearing or submitting the draft.
  window.addEventListener('beforeunload', (event) => {
    if (!needsAccount()) return;
    // Browsers own the exit warning. If the user stays, the sign-in
    // panel is ready in the unchanged builder beneath that warning.
    showAuthGate('leave');
    event.preventDefault();
    event.returnValue = true;
  });
  document.querySelector('.bd-sugar-home')?.addEventListener('click', (event) => {
    if (!needsAccount()) return;
    event.preventDefault();
    showAuthGate('leave');
  });
}
document.querySelectorAll('[data-header-auth]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!state.authed) {
      showAuthGate(button.dataset.headerAuth);
      return;
    }
    saveNcbPreview();
    location.href = window.bdCarry('../admin/build-web/ws-home.html', {
      demo: 'michael', handoff: '1', ws: state.ws, email: state.email,
      project: projectName, prompt: state.prompt,
      published: state.published ? '1' : '0',
      appUrl: state.published ? publicUrl() : '',
    });
  });
});
$('bdAuthClose')?.addEventListener('click', () => {
  state.pendingAuth = null;
  hideAuthGate();
  if (chatFirst && params.get('signin') === '1' && !state.runStarted) {
    wireSugarheadExtras();
    void run();
  }
});

function sugarheadPreviewUrl(token) {
  const brand = window.BrandMatch?.getActiveBrand?.();
  const qs = new URLSearchParams({
    preview: '1',
    app: 'invoice-processing',
    name: projectName,
    t: token || '',
  });
  if (brand && brand.key !== 'none') {
    qs.set('brand', brand.name);
    qs.set('accent', brand.accent);
    qs.set('initial', brand.initial);
    if (brand.ink) qs.set('ink', brand.ink);
  }
  const base = `${location.origin}${location.pathname.replace(/[^/]+$/, '')}process-live.html`;
  return `${base}?${qs}`;
}

function wireSugarheadExtras() {
  const btn = $('bdMobileQr');
  if (!btn) return;
  mobileQrBtn = btn;
  if (!window.initPreviewQr) return;
  window.initPreviewQr({
    button: btn,
    getUrl: (token) => sugarheadPreviewUrl(token),
  });
}

function saveNcbPreview() {
  if (!chatFirst || !state.generated) return;
  try {
    localStorage.setItem('eai-local-admin:ncb-preview', JSON.stringify({
      project: projectName, prompt: state.prompt, ws: state.ws,
      brandKey: state.brandKey, branded: state.branded,
      extraFields: state.extraFields, published: state.published,
    }));
  } catch { /* Preview remains available if browser storage is unavailable. */ }
}

function bootBuilder() {
  if (chatFirst && params.get('signin') === '1') {
    paintAccount();
    state.pendingAuth = () => {
      location.href = window.bdCarry('../admin/build-web/ws-home.html', {
        demo: 'michael', email: state.email, ws: state.ws,
      });
    };
    showAuthGate('signin');
    return;
  }
  if (sugarhead) {
    wireSugarheadExtras();
    if (!chatFirst) paintTemplatePreview();
  }
  if (chatFirst && params.get('previewOnly') === '1') {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('eai-local-admin:ncb-preview')); } catch {}
    if (saved && saved.project === projectName && saved.ws === state.ws) {
      state.brandKey = saved.brandKey;
      state.branded = saved.branded;
      state.extraFields = saved.extraFields || [];
      state.published = saved.published;
    } else {
      state.brandKey = window.BrandMatch?.resolveBrand?.(state.email)?.key || 'none';
    }
    window.BrandMatch?.setActive(state.brandKey, state.email);
    state.generated = true;
    state.runStarted = true;
    document.body.classList.add('bd-preview-only', 'bd-has-preview');
    document.title = projectName;
    paintTemplatePreview();
    return;
  }
  void run();
}

if (new URLSearchParams(location.search).get('enter') === '1' && !window.__BD_ENTER_DONE__) {
  window.addEventListener('bd-enter-done', bootBuilder, { once: true });
} else {
  bootBuilder();
}
