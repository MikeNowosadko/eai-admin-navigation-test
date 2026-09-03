/* ------------------------------------------------------------------
   End-user process preview — what someone filling the form sees.

   Markup mirrors eainocodebuilder WorkflowPreview (toolbar + device
   frame + form). Shared by process-edit.html and process-live.html.
------------------------------------------------------------------- */

(function () {
  const UPLOAD =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SPARKLE =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2zM5 16l.8 2.6L8.4 19l-2.6.8L5 22.4l-.8-2.6L1.6 19l2.6-.8L5 16zM19 14l.6 2L21.6 17l-2 .6L19 19.6l-.6-2-2-.6 2-.6.6-2z" fill="currentColor"/></svg>';
  const ICON_DESKTOP =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_TABLET =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" stroke-width="2"/></svg>';
  const ICON_MOBILE =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" stroke-width="2"/></svg>';

  const DEVICES = [
    { id: 'desktop', label: 'Desktop', icon: ICON_DESKTOP },
    { id: 'tablet', label: 'Tablet', icon: ICON_TABLET },
    { id: 'mobile', label: 'Mobile', icon: ICON_MOBILE },
  ];

  const APPS = {
    screening: {
      title: 'Candidate screening',
      tabs: ['Rubric', 'Evaluation', 'Review'],
      sectionTitle: 'Build your evaluation table',
      sectionDesc:
        "Upload the rubric we'll score every candidate against — we'll turn its criteria into your scoring table.",
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
    kyc: {
      title: 'Onboarding intake',
      tabs: ['Documents', 'Verify', 'Review'],
      sectionTitle: 'Collect customer documents',
      sectionDesc: 'Upload the documents we need to verify identity and run compliance checks.',
      fieldLabel: 'Document pack *',
      uploadTitle: 'Drag your documents here, or browse',
      uploadHint: 'PDF, JPG or PNG · up to 5 files',
      actionLabel: 'Continue',
      assistantIntro: 'Ask about verification rules, exceptions, or approval thresholds.',
      messages: [
        ['user', 'What triggers a manual review?'],
        ['ai', 'ID mismatch, PEP match, or missing proof of address — each routes to compliance.'],
      ],
    },
    vendor: {
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
    invoice: {
      title: 'Invoice processing',
      tabs: ['Submit', 'Review', 'Approval', 'Payment'],
      sectionTitle: 'Supplier submits the invoice',
      sectionDesc: 'Replaces the email inbox — every invoice is tracked from the moment it arrives.',
      fieldLabel: 'Invoice document *',
      uploadTitle: 'Drag your invoice here, or browse',
      uploadHint: 'PDF or image · one file',
      actionLabel: 'Continue',
      assistantIntro: 'Ask about PO matching, approval routing, or payment status.',
      messages: [
        ['user', 'Which invoices are waiting on PO match?'],
        ['ai', 'Three from Acme Supplies — all missing a PO number. Want me to draft a chase email?'],
      ],
    },
    leave: {
      title: 'Leave request',
      tabs: ['Request', 'Dates', 'Review', 'Submit'],
      sectionTitle: 'Apply for leave',
      sectionDesc: 'Sick leave, annual leave, or personal leave — pick your dates and who needs to approve.',
      fieldLabel: 'Leave type *',
      uploadTitle: 'Supporting document (optional)',
      uploadHint: 'PDF or image · medical certificate, travel docs',
      actionLabel: 'Continue',
      assistantIntro: 'Ask about leave balances, approval rules, or public holidays.',
      messages: [
        ['user', 'How many annual leave days do I have left?'],
        ['ai', 'You have 12 days remaining this year. Need help picking dates around the long weekend?'],
      ],
    },
  };

  const BY_PROCESS = {
    'candidate-screening': { app: 'screening', brand: { name: 'Adaptovate', initial: 'A' } },
    'kyc-onboarding': { app: 'kyc', brand: { name: 'Northwind Ops', initial: 'N' } },
    'leave-approval': { app: 'leave', brand: { name: 'Northwind Ops', initial: 'N' } },
    'vendor-onboarding': { app: 'vendor', brand: { name: 'Northwind Ops', initial: 'N' } },
    'invoice-processing': { app: 'invoice', brand: { name: 'Northwind Ops', initial: 'N' } },
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function appPanelHtml(app, brand) {
    const stages = app.tabs
      .map(
        (t, i) => `
      <div class="mkt-wf-stage${i === 0 ? ' active' : ''}">
        <span class="mkt-wf-stage-ring">${i === 0 ? '1' : '○'}</span>
        ${esc(t)}
      </div>`,
      )
      .join('');

    return `
      <div class="mkt-app-panel">
        <div class="mkt-app-chrome">
          <div class="mkt-app-brand">
            <span class="mkt-app-brand-icon">${esc(brand.initial)}</span>
            ${esc(brand.name)}
          </div>
        </div>
        <div class="mkt-app-main">
          <h3 class="mkt-app-title">${esc(app.title)}</h3>
          <div class="mkt-wf-stages">${stages}</div>
          <div class="mkt-app-section">
            <h4>${esc(app.sectionTitle)}</h4>
            <p>${esc(app.sectionDesc)}</p>
            <label>${esc(app.fieldLabel)}</label>
            <div class="mkt-upload-zone">
              <div class="mkt-upload-icon">${UPLOAD}</div>
              <b>${esc(app.uploadTitle)}</b>
              <span>${esc(app.uploadHint)}</span>
              <button class="mkt-browse-btn" type="button">Browse files</button>
            </div>
          </div>
        </div>
        <div class="mkt-app-actions">
          <button class="back" type="button" disabled>Back</button>
          <button class="go" type="button">${esc(app.actionLabel)} ${ARROW}</button>
        </div>
      </div>`;
  }

  function render(app, brand) {
    const msgs = app.messages
      .map(([role, text]) => `<div class="mkt-bubble mkt-bubble-${role}">${esc(text)}</div>`)
      .join('');

    const deviceBtns = DEVICES.map(
      (d, i) =>
        `<button type="button" class="${i === 0 ? 'on' : ''}" data-device="${d.id}" title="${d.label}" aria-label="${d.label} preview">${d.icon}</button>`,
    ).join('');

    return `
      <div class="mkt-preview-wrap ad-process-preview">
        <div class="mkt-workflow-preview">
          <div class="mkt-wf-head">
            <div class="mkt-wf-bar">
              <span class="mkt-wf-bar-title">Workflow Preview</span>
              <div class="mkt-wf-bar-spacer"></div>
              <div class="mkt-seg-tabs mkt-seg-tabs-sm">
                <button type="button">Editor</button>
                <button type="button" class="on">Preview</button>
              </div>
              <div class="mkt-app-devices" data-device-group>${deviceBtns}</div>
            </div>
            <div class="mkt-assistant-hd mkt-assistant-hd--light">${SPARKLE} AI Assistant</div>
          </div>
          <div class="mkt-wf-body">
            <div class="mkt-wf-stage-col">
              <div class="mkt-device-viewport">
                <div class="mkt-device-frame" data-device-frame="desktop">
                  <div class="mkt-device-island" hidden aria-hidden="true"></div>
                  <div class="mkt-device-screen">
                    ${appPanelHtml(app, brand)}
                  </div>
                </div>
              </div>
            </div>
            <aside class="mkt-assistant">
              <div class="mkt-assistant-body">
                <p class="mkt-assistant-intro">${esc(app.assistantIntro)}</p>
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

  function setDevice(root, device) {
    if (!root) return;
    const frame = root.querySelector('[data-device-frame]');
    const island = root.querySelector('.mkt-device-island');
    const group = root.querySelector('[data-device-group]');
    if (!frame) return;

    frame.dataset.deviceFrame = device;
    if (island) {
      const show = device === 'mobile';
      island.hidden = !show;
      island.setAttribute('aria-hidden', String(!show));
    }

    group?.querySelectorAll('[data-device]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.device === device);
    });

    requestAnimationFrame(() => fitDeviceFrame(root));
  }

  /** Scale framed previews down when the stage is smaller than the device. */
  function fitDeviceFrame(root) {
    const viewport = root.querySelector('.mkt-device-viewport');
    const frame = root.querySelector('[data-device-frame]');
    if (!viewport || !frame) return;

    frame.style.transform = '';
    frame.style.transformOrigin = '';

    if (frame.dataset.deviceFrame === 'desktop') return;

    const availW = viewport.clientWidth - 32;
    const availH = viewport.clientHeight - 32;
    const needW = frame.offsetWidth;
    const needH = frame.offsetHeight;
    if (!needW || !needH) return;

    const scale = Math.min(1, availW / needW, availH / needH);
    if (scale >= 0.999) return;

    frame.style.transformOrigin = 'top center';
    frame.style.transform = `scale(${Math.max(0.35, scale)})`;
  }

  function bindPreview(root) {
    if (!root) return;
    const wrap = root.querySelector('.ad-process-preview') || root;
    wrap.querySelector('[data-device-group]')?.querySelectorAll('[data-device]').forEach((btn) => {
      btn.addEventListener('click', () => setDevice(wrap, btn.dataset.device));
    });
    setDevice(wrap, 'desktop');
    window.addEventListener('resize', () => fitDeviceFrame(wrap));
  }

  window.AD_PROCESS_LIVE = {
    forProcess(id) {
      const row = BY_PROCESS[id];
      if (!row) return null;
      const app = APPS[row.app];
      if (!app) return null;
      return { app, brand: row.brand };
    },
    render,
    bindPreview,
    url(id) {
      return `process-live.html?app=${encodeURIComponent(id)}`;
    },
  };
})();
