/**
 * Marketing site — template preview dialog (Paper 9GU-0)
 */

const DEPT_COLORS = {
  Procurement: { bg: '#DBEAFE', color: '#1D4ED8' },
  HR: { bg: '#EDE9FE', color: '#6D28D9' },
  Marketing: { bg: '#FCE7F3', color: '#BE185D' },
  Compliance: { bg: '#FEF3C7', color: '#B45309' },
  Risk: { bg: '#FEE2E2', color: '#B91C1C' },
};

const SPARKLE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2zM5 16l.8 2.6L8.4 19l-2.6.8L5 22.4l-.8-2.6L1.6 19l2.6-.8L5 16zM19 14l.6 2L21.6 17l-2 .6L19 19.6l-.6-2-2-.6 2-.6.6-2z" fill="currentColor"/></svg>';
const UPLOAD = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const TEMPLATES = {
  rfi: {
    id: 'rfi',
    dept: 'Procurement',
    name: 'RFI screener',
    desc: 'Score incoming RFIs against your criteria and route the right ones forward.',
    summary: 'Turns a messy inbox of RFIs into a scored, routed queue — your criteria, your owners, your SLA.',
    steps: [
      ['Receive RFI', 'Intake captures request details once', 'Form'],
      ['Score against criteria', 'Auto-scored against your weighting rules', 'Compose'],
      ['Route to owner', 'Assigned by category and threshold', 'Routed by rules'],
      ['Track response', 'Status visible until closed', 'Approval'],
    ],
    app: {
      title: 'Candidate screening',
      tabs: ['Rubric', 'Evaluation', 'Review'],
      sectionTitle: 'Build your evaluation table',
      sectionDesc: "Upload the rubric we'll score every candidate against — we'll turn its criteria into your scoring table.",
      fieldLabel: 'Your rubric *',
      uploadTitle: 'Drag your rubric here, or browse',
      uploadHint: 'XLSX, CSV or PDF · one file',
      actionLabel: 'Generate table',
      assistantIntro: 'Ask me anything about these 24 candidates and how they scored.',
      messages: [
        ['user', "Who's strongest on communication?"],
        ['ai', 'Devin Park (9.0), then Mara Ortiz (8.8). Want me to re-rank by communication?'],
        ['user', 'Why is Mara #1?'],
        ['ai', 'She leads on the total (8.9) — top scores on Technical (9.2) and Culture fit (9.2).'],
      ],
    },
  },
  interview: {
    id: 'interview',
    dept: 'HR',
    name: 'Interview candidate process',
    desc: 'Move candidates through stages, scorecards, and shortlist decisions.',
    summary: 'A structured hiring pipeline from application to offer — scorecards and approvals built in.',
    steps: [
      ['Application received', 'Candidate data captured once', 'Captured once'],
      ['Screen & score', 'Scorecard against role criteria', 'Scored automatically'],
      ['Interview stages', 'Panel feedback routed for review', 'Manual → automated'],
      ['Offer & notify', 'Approval then candidate update', 'Notify on change'],
    ],
    app: {
      title: 'Candidate screening',
      tabs: ['Rubric', 'Evaluation', 'Review'],
      sectionTitle: 'Build your evaluation table',
      sectionDesc: "Upload the rubric we'll score every candidate against — we'll turn its criteria into your scoring table.",
      fieldLabel: 'Your rubric *',
      uploadTitle: 'Drag your rubric here, or browse',
      uploadHint: 'XLSX, CSV or PDF · one file',
      actionLabel: 'Generate table',
      assistantIntro: 'Ask me anything about these 24 candidates and how they scored.',
      messages: [
        ['user', "Who's strongest on communication?"],
        ['ai', 'Devin Park (9.0), then Mara Ortiz (8.8). Want me to re-rank by communication?'],
        ['user', 'Why is Mara #1?'],
        ['ai', 'She leads on the total (8.9) — top scores on Technical (9.2) and Culture fit (9.2).'],
      ],
    },
  },
  edm: {
    id: 'edm',
    dept: 'Marketing',
    name: 'EDM tracker',
    desc: 'Track campaign builds, approvals, and send status in one place.',
    summary: 'One place for every campaign — draft, legal review, build, approve, send.',
    steps: [
      ['Draft campaign', 'Brief and assets captured once', 'Captured once'],
      ['Review & approve', 'Legal and brand sign-off routed', 'Routed by rules'],
      ['Build & QA', 'Checklist before send', 'Manual → automated'],
      ['Send & log', 'Send recorded and archived', 'Off-platform → monitored'],
    ],
    app: {
      title: 'Campaign builder',
      tabs: ['Brief', 'Review', 'Send'],
      sectionTitle: 'Upload campaign brief',
      sectionDesc: 'Drop your brief and assets — we structure the build checklist and approval route.',
      fieldLabel: 'Campaign brief *',
      uploadTitle: 'Drag your brief here, or browse',
      uploadHint: 'DOCX, PDF or link · one file',
      actionLabel: 'Generate checklist',
      assistantIntro: 'Ask me about campaign status, blockers, or who needs to sign off.',
      messages: [
        ['user', 'Which campaigns are waiting on legal?'],
        ['ai', 'Q3 product launch and Partner newsletter — both entered legal review yesterday.'],
      ],
    },
  },
  kyc: {
    id: 'kyc',
    dept: 'Compliance',
    name: 'KYC onboarding',
    desc: 'Collect documents, verify identity, and log compliance checks.',
    summary: 'Document collection, identity verification, and audit trail — ready for your policy rules.',
    steps: [
      ['Collect documents', 'Customer uploads once', 'Captured once'],
      ['Verify identity', 'Checks run against your providers', 'Matched on-platform'],
      ['Compliance review', 'Exceptions routed for sign-off', 'Manual → automated'],
      ['Approve & archive', 'Decision logged with evidence', 'Off-platform → monitored'],
    ],
    app: {
      title: 'Onboarding intake',
      tabs: ['Documents', 'Verify', 'Review'],
      sectionTitle: 'Collect customer documents',
      sectionDesc: 'Configure the intake form — validated fields, required uploads, and policy checks.',
      fieldLabel: 'Document pack *',
      uploadTitle: 'Drag document templates here, or browse',
      uploadHint: 'PDF checklist or form spec · one file',
      actionLabel: 'Generate form',
      assistantIntro: 'Ask about verification rules, exceptions, or approval thresholds.',
      messages: [
        ['user', 'What triggers a manual review?'],
        ['ai', 'ID mismatch, PEP match, or missing proof of address — each routes to compliance.'],
      ],
    },
  },
  vendor: {
    id: 'vendor',
    dept: 'Risk',
    name: 'Vendor assessment',
    desc: 'Assess third-party risk before onboarding a new supplier.',
    summary: 'Standardised vendor risk intake — questionnaire, scoring, and approval before onboarding.',
    steps: [
      ['Vendor intake', 'Questionnaire captured once', 'Captured once'],
      ['Risk scoring', 'Scored against your framework', 'Scored automatically'],
      ['Review & escalate', 'High-risk cases routed for approval', 'Routed by rules'],
      ['Decision & record', 'Outcome logged and archived', 'Off-platform → monitored'],
    ],
    app: {
      title: 'Vendor intake',
      tabs: ['Questionnaire', 'Score', 'Decision'],
      sectionTitle: 'Upload risk framework',
      sectionDesc: 'Your scoring framework becomes the questionnaire and weighting rules automatically.',
      fieldLabel: 'Risk framework *',
      uploadTitle: 'Drag your framework here, or browse',
      uploadHint: 'XLSX or CSV · one file',
      actionLabel: 'Generate questionnaire',
      assistantIntro: 'Ask about vendor scores, escalations, or framework weighting.',
      messages: [
        ['user', 'What score triggers escalation?'],
        ['ai', 'Anything above 70 routes to risk committee — medium band is 40–70 with owner review.'],
      ],
    },
  },
};

const dialog = document.getElementById('mktDialog');
const dialogTitle = document.getElementById('mktDialogTitle');
const dialogLeftTitle = document.getElementById('mktDialogLeftTitle');
const dialogDesc = document.getElementById('mktDialogDesc');
const dialogSummary = document.getElementById('mktDialogSummary');
const dialogSteps = document.getElementById('mktDialogSteps');
const dialogPreview = document.getElementById('mktDialogPreview');
const useTemplateBtn = document.getElementById('mktUseTemplate');
const promptInput = document.getElementById('mktPrompt');

const workflowBase = document.body.dataset.mktWorkflowsUrl || '../smart-blocks-config/index.html';
const WORKFLOW_LINKS = {
  rfi: `${workflowBase}?workflow=rfp`,
  interview: `${workflowBase}?workflow=candidates`,
  edm: `${workflowBase}?workflow=email`,
};

/** Smart block workflow ids → marketing preview dialog template ids */
const SB_PREVIEW_MAP = {
  candidates: 'interview',
  rfp: 'rfi',
  email: 'edm',
};

let activeTemplateId = null;

function builderTarget(prompt) {
  const body = document.body;
  const base = body.dataset.mktBuilderUrl || 'builder-blocks.html';
  const blocks = body.dataset.mktBlocksMode === '1';
  const params = new URLSearchParams();
  if (prompt) params.set('prompt', prompt);
  if (blocks) params.set('blocks', '1');
  params.set('enter', '1');
  sessionStorage.setItem('build-sugar-enter', '1');
  sessionStorage.setItem('bw-builder-url', base);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

function signupTarget(prompt) {
  const base = document.body.dataset.mktSignupUrl;
  if (!base) return null;
  const params = new URLSearchParams();
  if (prompt) params.set('prompt', prompt);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

function goSignup(prompt) {
  const href = signupTarget(prompt);
  if (!href) return false;
  sessionStorage.removeItem('bw-signed-in');
  sessionStorage.setItem('bw-builder-url', document.body.dataset.mktBuilderUrl || 'builder.html');
  location.href = href;
  return true;
}

function goBuilder(prompt) {
  location.href = builderTarget(prompt || '');
}

function renderSteps(steps) {
  if (!dialogSteps) return;
  dialogSteps.innerHTML = steps.map(([title, desc, block], i) => `
    <div class="mkt-step">
      <span class="mkt-step-num">${i + 1}</span>
      <div class="mkt-step-body"><b>${title}</b><span>${desc}</span></div>
      <span class="mkt-block">${block}</span>
    </div>
  `).join('');
}

function renderAppPreview(app) {
  const stages = app.tabs.map((t, i) => {
    const active = i === 0;
    return `
      <div class="mkt-wf-stage${active ? ' active' : ''}">
        <span class="mkt-wf-stage-ring">${active ? String(i + 1) : '○'}</span>
        ${t}
      </div>
    `;
  }).join('');

  const msgs = app.messages.map(([role, text]) => `
    <div class="mkt-bubble mkt-bubble-${role}">${text}</div>
  `).join('');

  return `
    <div class="mkt-preview-wrap">
      <div class="mkt-workflow-preview">
        <div class="mkt-wf-bar">
          <span class="mkt-wf-bar-title">Workflow Preview</span>
          <div class="mkt-wf-bar-spacer"></div>
          <div class="mkt-seg-tabs mkt-seg-tabs-sm">
            <button type="button">Editor</button>
            <button type="button" class="on">Preview</button>
          </div>
          <div class="mkt-app-devices">
            <span class="on" title="Desktop">▭</span>
            <span title="Tablet">▢</span>
            <span title="Mobile">▯</span>
          </div>
        </div>
        <div class="mkt-wf-body">
          <div class="mkt-app-panel">
            <div class="mkt-app-chrome">
              <div class="mkt-app-brand">
                <span class="mkt-app-brand-icon">A</span>
                Adaptovate
              </div>
            </div>
            <div class="mkt-app-main">
              <h3 class="mkt-app-title">${app.title}</h3>
              <div class="mkt-wf-stages">${stages}</div>
              <div class="mkt-app-section">
                <h4>${app.sectionTitle}</h4>
                <p>${app.sectionDesc}</p>
                <label>${app.fieldLabel}</label>
                <div class="mkt-upload-zone">
                  <div class="mkt-upload-icon">${UPLOAD}</div>
                  <b>${app.uploadTitle}</b>
                  <span>${app.uploadHint}</span>
                  <button class="mkt-browse-btn" type="button">Browse files</button>
                </div>
              </div>
            </div>
            <div class="mkt-app-actions">
              <button class="back" type="button" disabled>Back</button>
              <button class="go" type="button">${app.actionLabel} ${ARROW}</button>
            </div>
          </div>
          <aside class="mkt-assistant">
            <div class="mkt-assistant-hd">${SPARKLE} Assistant</div>
            <div class="mkt-assistant-body">
              <p class="mkt-assistant-intro">${app.assistantIntro}</p>
              <div class="mkt-assistant-msgs">${msgs}</div>
            </div>
            <div class="mkt-assistant-ft">
              <input type="text" placeholder="Ask about your results…" readonly />
              <button class="mkt-assistant-send" type="button" aria-label="Send">${ARROW}</button>
            </div>
          </aside>
        </div>
      </div>
    </div>`;
}

function openPreview(id) {
  const t = TEMPLATES[id];
  if (!t || !dialog) return;

  activeTemplateId = id;
  if (dialogTitle) dialogTitle.textContent = t.name;
  if (dialogLeftTitle) dialogLeftTitle.textContent = t.name;
  if (dialogDesc) dialogDesc.textContent = t.desc;
  if (dialogSummary) dialogSummary.textContent = t.summary;
  renderSteps(t.steps);
  if (dialogPreview) dialogPreview.innerHTML = renderAppPreview(t.app);

  if (useTemplateBtn) {
    useTemplateBtn.hidden = false;
  }

  dialog.classList.add('is-open');
  document.body.classList.add('mkt-dialog-open');
  dialog.setAttribute('aria-hidden', 'false');
}

function closePreview() {
  activeTemplateId = null;
  if (!dialog) return;
  dialog.classList.remove('is-open');
  document.body.classList.remove('mkt-dialog-open');
  dialog.setAttribute('aria-hidden', 'true');
}

window.openMktTemplatePreview = openPreview;

document.addEventListener('click', (e) => {
  const sbBtn = e.target.closest('[data-sb-preview]');
  if (sbBtn) {
    e.preventDefault();
    e.stopPropagation();
    const mktId = SB_PREVIEW_MAP[sbBtn.dataset.sbPreview];
    if (mktId) openPreview(mktId);
    return;
  }

  const mktBtn = e.target.closest('[data-template-preview]');
  if (mktBtn) {
    e.preventDefault();
    e.stopPropagation();
    openPreview(mktBtn.dataset.templatePreview);
  }
});

const dialogClose = document.getElementById('mktDialogClose');
if (dialogClose) dialogClose.addEventListener('click', closePreview);

if (useTemplateBtn) {
  useTemplateBtn.addEventListener('click', () => {
    const href = WORKFLOW_LINKS[activeTemplateId];
    if (href) location.href = href;
    else goBuilder(promptInput?.value?.trim());
  });
}

document.querySelectorAll('button[data-mkt-start]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const prompt = promptInput?.value?.trim();
    if (!goSignup(prompt)) goBuilder(prompt);
  });
});

document.querySelectorAll('button[data-mkt-signin]').forEach((btn) => {
  btn.addEventListener('click', () => {
    sessionStorage.setItem('bw-signed-in', '1');
    sessionStorage.setItem('bw-tenancy', 'seeded');
    sessionStorage.removeItem('bw-email');
    sessionStorage.removeItem('bw-ws');
    sessionStorage.removeItem('bw-pending-prompt');
    sessionStorage.setItem('bw-builder-url', document.body.dataset.mktBuilderUrl || 'builder.html');
    const base = document.body.dataset.mktSigninUrl || 'ws-home.html';
    location.href = `${base}${base.includes('?') ? '&' : '?'}tenancy=seeded`;
  });
});

if (dialog) {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closePreview();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.classList.contains('is-open')) closePreview();
  });
}

document.querySelectorAll('[data-mkt-chip]').forEach((chip) => {
  chip.addEventListener('click', () => {
    if (!promptInput) return;
    promptInput.value = chip.textContent;
    promptInput.focus();
  });
});

const mktForm = document.getElementById('mktForm');
if (mktForm) {
  mktForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = promptInput?.value?.trim();
    if (!v) {
      promptInput?.focus();
      return;
    }
    if (!goSignup(v)) goBuilder(v);
  });
}

document.querySelectorAll('[data-dept]').forEach((el) => {
  const c = DEPT_COLORS[el.dataset.dept];
  if (c) {
    el.style.background = c.bg;
    el.style.color = c.color;
  }
});
