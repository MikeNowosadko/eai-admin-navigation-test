/**
 * Marketing template app preview — shared by mkt-site dialog and Sugarhead builder.
 * HTML matches renderAppPreview in mkt-site.js (Workflow Preview shell).
 */
(function () {
  const SPARKLE =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const UPLOAD =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* Toolbar icons, from the Paper source of truth (Configurator → app view).
     The device row used ▭ ▢ ▯ text glyphs, which sit on their own baselines
     and at their own optical sizes — that is why the row never lined up with
     Editor/Preview no matter what the flexbox said. */
  const PENCIL =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const EYE =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>';
  const MONITOR =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const TABLET =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2" stroke="currentColor" stroke-width="2"/><path d="M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const PHONE =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2" stroke="currentColor" stroke-width="2"/><path d="M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  const DEVICES = [
    ['desktop', 'Desktop', MONITOR],
    ['tablet', 'Tablet', TABLET],
    ['mobile', 'Mobile', PHONE],
  ];

  const DEFAULT_MESSAGES = [
    ['user', 'Which invoices are waiting on PO match?'],
    ['ai', 'Three from Acme Supplies — all missing a PO number. Want me to draft a chase email?'],
  ];

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function brandDisplay(brand, app) {
    if (brand && brand.key && brand.key !== 'none') {
      return {
        name: brand.name,
        initial: brand.initial || brand.name.charAt(0),
        /* A brand with a real mark shows it; the initial is the fallback. */
        logo: brand.logo || '',
        accent: brand.accent || '',
        ink: brand.ink || '#fff',
      };
    }
    return {
      name: app.brandName || 'Adaptovate',
      initial: app.brandInitial || 'A',
      logo: '',
      accent: '',
      ink: '#fff',
    };
  }

  function stepActionLabel(step) {
    const last = step.fields?.[step.fields.length - 1];
    if (last?.type === 'File') return 'Continue';
    if (step.id === 'payment') return 'Schedule payment';
    if (step.id === 'approval') return 'Submit decision';
    return 'Continue';
  }

  /** Map builder WORKFLOW steps → marketing app preview object. */
  function workflowToApp(workflow, activeStep, projectName) {
    const step = workflow[activeStep] || workflow[0];
    const fileField = step.fields?.find((f) => f.type === 'File');
    const title =
      projectName ||
      (workflow[0]?.previewTitle?.toLowerCase().includes('invoice')
        ? 'Invoice processing'
        : 'Your process');

    return {
      title,
      tabs: workflow.map((s) => s.tab || s.title),
      sectionTitle: step.previewTitle || step.title,
      sectionDesc: step.previewSub || step.blurb || '',
      fieldLabel: fileField ? `${fileField.label}${fileField.req ? ' *' : ''}` : null,
      uploadTitle: fileField ? 'Drag your file here, or browse' : null,
      uploadHint: 'PDF or image · one file',
      fields: (step.fields || []).filter((f) => f.type !== 'File'),
      actionLabel: stepActionLabel(step),
      assistantIntro: 'Ask about this process — routing, approvals, or what happens next.',
      messages: DEFAULT_MESSAGES,
    };
  }

  function stagesHtml(tabs, activeStep, interactive) {
    return tabs
      .map((t, i) => {
        const active = i === activeStep;
        const done = i < activeStep;
        const ring = done ? '✓' : active ? String(i + 1) : '○';
        const cls = active ? ' active' : done ? ' done' : '';
        if (interactive) {
          return `<button type="button" class="mkt-wf-stage${cls}" data-step="${i}">
            <span class="mkt-wf-stage-ring">${ring}</span>
            ${esc(t)}
          </button>`;
        }
        return `<div class="mkt-wf-stage${cls}">
          <span class="mkt-wf-stage-ring">${ring}</span>
          ${esc(t)}
        </div>`;
      })
      .join('');
  }

  function sectionBody(app) {
    let html = '';
    if (app.fieldLabel && app.uploadTitle) {
      html += `
        <label>${esc(app.fieldLabel)}</label>
        <div class="mkt-upload-zone">
          <div class="mkt-upload-icon">${UPLOAD}</div>
          <b>${esc(app.uploadTitle)}</b>
          <span>${esc(app.uploadHint || 'PDF or image · one file')}</span>
          <button class="mkt-browse-btn" type="button">Browse files</button>
        </div>`;
    }
    (app.fields || []).forEach((f) => {
      html += `
        <div class="mkt-static-field-wrap">
          <label>${esc(f.label)}${f.req ? ' *' : ''}</label>
          ${f.hint ? `<span class="mkt-field-hint">${esc(f.hint)}</span>` : ''}
          <div class="mkt-static-field">${esc(f.placeholder || f.opts?.[0] || f.label)}</div>
        </div>`;
    });
    return html;
  }

  function render(app, opts = {}) {
    const activeStep = opts.activeStep ?? 0;
    const interactive = opts.interactive ?? false;
    const device = opts.device || 'desktop';
    const b = brandDisplay(opts.brand, app);
    const brandIconStyle = b.accent ? ` style="background:${esc(b.accent)};color:${esc(b.ink)}"` : '';
    const goStyle = b.accent ? ` style="background:${esc(b.accent)};color:${esc(b.ink)}"` : '';

    const msgs = (app.messages || DEFAULT_MESSAGES)
      .map(([role, text]) => `<div class="mkt-bubble mkt-bubble-${role}">${esc(text)}</div>`)
      .join('');

    /* The toolbar is chrome about the preview, not part of the app, so it
       sits on the background beside the card. Keeping it inside meant the
       app's own border wrapped around Editor/Preview and the device row —
       the card stopped reading as "this is your app". */
    const bar =
      opts.shell === 'body'
        ? ''
        : `<div class="mkt-wf-bar">
          <span class="mkt-wf-bar-title">App preview</span>
          <div class="mkt-wf-bar-spacer"></div>
          <div class="mkt-seg-tabs mkt-seg-tabs-sm">
            <button type="button">${PENCIL} Editor</button>
            <button type="button" class="on">${EYE} Preview</button>
          </div>
          ${opts.mobileSlot ? '<span class="mkt-wf-mobile-slot"></span>' : ''}
          <div class="mkt-app-devices">
            ${DEVICES.map(([key, label, icon]) =>
              `<button type="button" class="${key === device ? 'on' : ''}" data-device="${key}" title="${label}" aria-label="${label}" aria-pressed="${key === device}">${icon}</button>`
            ).join('')}
          </div>
        </div>`;

    return `
      <div class="mkt-preview-wrap">
        ${bar}
        <div class="mkt-workflow-preview">
          <div class="mkt-app-chrome">
            <div class="mkt-app-brand">
              <span class="mkt-app-brand-icon${b.logo ? ' has-logo' : ''}"${brandIconStyle}>${b.logo || esc(b.initial)}</span>
              ${esc(b.name)}
            </div>
          </div>
          <div class="mkt-wf-body">
            <div class="mkt-app-panel">
              <div class="mkt-app-main">
                <h3 class="mkt-app-title">${esc(app.title)}</h3>
                <div class="mkt-wf-stages">${stagesHtml(app.tabs, activeStep, interactive)}</div>
                <div class="mkt-app-section">
                  <h4>${esc(app.sectionTitle)}</h4>
                  <p>${esc(app.sectionDesc)}</p>
                  ${sectionBody(app)}
                </div>
              </div>
              <div class="mkt-app-actions">
                <button class="back" type="button" disabled>Back</button>
                <button class="go" type="button"${goStyle}>${esc(app.actionLabel || 'Continue')} ${ARROW}</button>
              </div>
            </div>
            <aside class="mkt-assistant">
              <div class="mkt-assistant-hd"><span class="mkt-assistant-mark">${SPARKLE}</span> Assistant</div>
              <div class="mkt-assistant-body">
                <p class="mkt-assistant-intro">${esc(app.assistantIntro)}</p>
                <div class="mkt-assistant-msgs">${msgs}</div>
              </div>
              <div class="mkt-assistant-ft">
                <div class="mkt-assistant-composer">
                  <input type="text" placeholder="Ask about your results…" readonly />
                  <button class="mkt-assistant-send" type="button" aria-label="Send">${ARROW}</button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>`;
  }

  function bind(root, { onStep, onDevice } = {}) {
    if (!root) return;
    if (onStep) {
      root.querySelectorAll('.mkt-wf-stage[data-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const i = Number(btn.dataset.step);
          if (!Number.isNaN(i)) onStep(i);
        });
      });
    }
    if (onDevice) {
      root.querySelectorAll('.mkt-app-devices [data-device]').forEach((btn) => {
        btn.addEventListener('click', () => onDevice(btn.dataset.device));
      });
    }
  }

  window.MKT_APP_PREVIEW = { render, bind, workflowToApp };
})();
