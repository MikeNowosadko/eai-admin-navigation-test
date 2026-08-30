/**
 * Smart block combo prototype — ask → configure → refine → connect
 */

const CONFIG_MESSAGES = [
  'Reading your process…',
  'Finding the steps…',
  'Matching smart blocks…',
  'Building your combo…',
];

const WORKFLOWS = {
  invoice: {
    name: 'Invoice approval',
    summary: 'From supplier email to scheduled payment — with PO matching and finance sign-off over your threshold.',
    steps: [
      { title: 'Supplier submits invoice', desc: 'Intake captures invoice data once', block: 'Captured once' },
      { title: 'Match against purchase order', desc: 'PO validation runs on-platform', block: 'Matched on-platform' },
      { title: 'Finance approves over $10k', desc: 'Approval routed by amount threshold', block: 'Manual → automated' },
      { title: 'Schedule payment & notify', desc: 'Payment queued and supplier updated', block: 'Off-platform → monitored' },
    ],
    intro: 'Here\'s how I\'d run invoice approval — four steps, four smart blocks. Tell me what to change.',
  },
  rfi: {
    name: 'RFI screener',
    summary: 'Score incoming RFIs against your criteria and route the right ones to the correct owner.',
    steps: [
      { title: 'Receive RFI', desc: 'Intake captures request details once', block: 'Captured once' },
      { title: 'Score against criteria', desc: 'Auto-scored against your weighting rules', block: 'Scored automatically' },
      { title: 'Route to owner', desc: 'Assigned by category and threshold', block: 'Routed by rules' },
      { title: 'Track response', desc: 'Status visible until closed', block: 'Off-platform → monitored' },
    ],
    intro: 'RFI screener distilled to four steps. Refine anything before you connect your data.',
  },
  kyc: {
    name: 'KYC onboarding',
    summary: 'Document collection, identity verification, and compliance logging with approval gates.',
    steps: [
      { title: 'Collect documents', desc: 'Customer uploads once', block: 'Captured once' },
      { title: 'Verify identity', desc: 'Checks against your providers', block: 'Matched on-platform' },
      { title: 'Compliance review', desc: 'Exceptions routed for sign-off', block: 'Manual → automated' },
      { title: 'Approve & archive', desc: 'Decision logged with evidence', block: 'Off-platform → monitored' },
    ],
    intro: 'KYC onboarding as a four-step combo. Adjust thresholds or add a step if you need to.',
  },
  leave: {
    name: 'Leave approval',
    summary: 'Time-off requests routed through manager and HR with policy rules and audit trail.',
    steps: [
      { title: 'Employee requests leave', desc: 'Dates and type captured once', block: 'Captured once' },
      { title: 'Manager review', desc: 'Routed by team and delegation rules', block: 'Routed by rules' },
      { title: 'HR sign-off', desc: 'Policy check before approval', block: 'Manual → automated' },
      { title: 'Update calendar & notify', desc: 'Systems updated and employee notified', block: 'Notify on change' },
    ],
    intro: 'Leave approval with manager and HR gates. Say if your policy differs.',
  },
};

let currentKey = 'invoice';
let refineCount = 0;

const $ = (sel) => document.querySelector(sel);
const askEl = $('#cbAsk');
const configEl = $('#cbConfig');
const refineEl = $('#cbRefine');
const connectEl = $('#cbConnect');
const processInput = $('#processInput');
const configStatus = $('#configStatus');
const chatThread = $('#chatThread');
const chatInput = $('#chatInput');
const workflowTitle = $('#workflowTitle');
const workflowSummary = $('#workflowSummary');
const workflowSteps = $('#workflowSteps');
const workflowBlocks = $('#workflowBlocks');

function detectWorkflow(text) {
  const t = text.toLowerCase();
  if (t.includes('rfi') || t.includes('procurement') || t.includes('tender')) return 'rfi';
  if (t.includes('kyc') || t.includes('onboard') || t.includes('identity')) return 'kyc';
  if (t.includes('leave') || t.includes('time off') || t.includes('holiday')) return 'leave';
  return 'invoice';
}

function show(state) {
  askEl.classList.toggle('cb-hidden', state !== 'ask');
  configEl.classList.toggle('is-active', state === 'config');
  configEl.classList.toggle('cb-hidden', state !== 'config');
  refineEl.classList.toggle('is-active', state === 'refine');
  refineEl.classList.toggle('cb-hidden', state !== 'refine');
  connectEl.classList.toggle('is-active', state === 'connect');
  connectEl.classList.toggle('cb-hidden', state !== 'connect');
}

function renderWorkflow(key) {
  const w = WORKFLOWS[key];
  workflowTitle.textContent = w.name;
  workflowSummary.textContent = w.summary;
  workflowSteps.innerHTML = w.steps.map((s, i) => `
    <div class="cb-step">
      <span class="cb-step-num">${i + 1}</span>
      <div class="cb-step-body"><b>${s.title}</b><span>${s.desc}</span></div>
      <span class="cb-smart-block">${s.block}</span>
    </div>
  `).join('');
  workflowBlocks.innerHTML = [...new Set(w.steps.map((s) => s.block))]
    .map((b) => `<span class="cb-smart-block">${b}</span>`).join('');
}

function addMsg(text, role) {
  const el = document.createElement('div');
  el.className = `cb-msg cb-msg-${role} cb-fade-in`;
  el.textContent = text;
  chatThread.appendChild(el);
  chatThread.scrollTop = chatThread.scrollHeight;
}

function runConfigure(onDone) {
  show('config');
  configEl.querySelectorAll('.cb-block-pill').forEach((pill) => {
    pill.style.animation = 'none';
    pill.offsetHeight;
    pill.style.animation = '';
  });

  let i = 0;
  configStatus.textContent = CONFIG_MESSAGES[0];
  const interval = setInterval(() => {
    i += 1;
    if (i < CONFIG_MESSAGES.length) configStatus.textContent = CONFIG_MESSAGES[i];
  }, 650);

  setTimeout(() => {
    clearInterval(interval);
    onDone();
  }, 2800);
}

function startRefine(key) {
  currentKey = key;
  refineCount = 0;
  renderWorkflow(key);
  chatThread.innerHTML = '';
  addMsg(WORKFLOWS[key].intro, 'ai');
  show('refine');
}

function briefReconfigure(callback) {
  refineEl.classList.add('cb-reconfiguring');
  runConfigure(() => {
    refineEl.classList.remove('cb-reconfiguring');
    callback();
  });
}

function handleRefine(text) {
  const lower = text.toLowerCase();
  addMsg(text, 'user');

  if (lower.includes('finance') || lower.includes('$') || lower.includes('10')) {
    briefReconfigure(() => {
      WORKFLOWS.invoice.steps[2].title = 'Finance approves over $10k';
      WORKFLOWS.invoice.steps[2].desc = 'Approval routed when amount exceeds your threshold';
      renderWorkflow(currentKey);
      addMsg('Updated — finance approval now triggers above $10,000. Anything else?', 'ai');
    });
    return;
  }

  if (lower.includes('hr') || lower.includes('manager')) {
    briefReconfigure(() => {
      addMsg('Added an HR review step after manager approval. Check the workflow panel.', 'ai');
      if (currentKey === 'leave') {
        WORKFLOWS.leave.steps[2].desc = 'HR checks policy before final sign-off';
      }
      renderWorkflow(currentKey);
    });
    return;
  }

  if (lower.includes('good') || lower.includes('yes') || lower.includes('looks') || lower.includes('ready')) {
    addMsg('Great — when you\'re ready, connect your data and we\'ll wire this to your systems.', 'ai');
    return;
  }

  refineCount += 1;
  if (refineCount === 1) {
    addMsg('Got it. I\'ll adjust the combo — give me a moment.', 'ai');
    briefReconfigure(() => addMsg('Done. Does this match how you run it?', 'ai'));
  } else {
    addMsg('Noted. You can keep refining, or connect your data when this looks right.', 'ai');
  }
}

document.querySelectorAll('#cbChips button').forEach((btn) => {
  btn.addEventListener('click', () => {
    processInput.value = btn.textContent;
    processInput.focus();
  });
});

$('#configureBtn').addEventListener('click', () => {
  const text = processInput.value.trim();
  if (!text) {
    processInput.focus();
    return;
  }
  currentKey = detectWorkflow(text);
  runConfigure(() => startRefine(currentKey));
});

$('#chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  handleRefine(text);
});

$('#connectBtn').addEventListener('click', () => show('connect'));
$('#backRefineBtn').addEventListener('click', () => show('refine'));
$('#startOverBtn').addEventListener('click', () => {
  processInput.value = '';
  show('ask');
});

processInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    $('#configureBtn').click();
  }
});
