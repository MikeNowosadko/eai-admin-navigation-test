/**
 * Smart block workflow templates — shared markup for marketing and signed-in home.
 * Preview opens the marketing template dialog; Start links to smart-blocks-config.
 */
(function () {
  const ICONS = {
    users:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    file:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mail:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="m2 7 10 7 10-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const TEMPLATES = [
    {
      id: 'candidates',
      name: 'Candidate screening',
      blurb: 'Evaluate job applications against a rubric, shortlist, and sign off.',
      icon: 'users',
    },
    {
      id: 'rfp',
      name: 'RFP evaluation',
      blurb: 'Score vendor RFP submissions against your criteria, shortlist, and decide.',
      icon: 'file',
    },
    {
      id: 'email',
      name: 'EDM email',
      blurb: 'Generate an effective marketing email from a brief and assets — output is AI-written text.',
      icon: 'mail',
    },
  ];

  function templateHref(base, id) {
    const root = base || '../smart-blocks-config/index.html';
    return `${root}?workflow=${encodeURIComponent(id)}`;
  }

  function renderCard(t, base, opts) {
    const o = opts || {};
    const href = templateHref(base, t.id);

    if (o.preview) {
      return (
        `<article class="sb-wf-card sb-wf-card--preview">` +
        `<span class="sb-wf-top">` +
        `<span class="sb-wf-ico">${ICONS[t.icon]}</span>` +
        `</span>` +
        `<span class="sb-wf-name">${t.name}</span>` +
        `<span class="sb-wf-blurb">${t.blurb}</span>` +
        `<div class="sb-wf-foot">` +
        `<button type="button" class="sb-wf-preview" data-sb-preview="${t.id}">Preview</button>` +
        `<a class="sb-wf-go" href="${href}">Start ${ICONS.arrow}</a>` +
        `</div>` +
        `</article>`
      );
    }

    return (
      `<a class="sb-wf-card" href="${href}">` +
      `<span class="sb-wf-top">` +
      `<span class="sb-wf-ico">${ICONS[t.icon]}</span>` +
      `<span class="sb-wf-go">Start ${ICONS.arrow}</span>` +
      `</span>` +
      `<span class="sb-wf-name">${t.name}</span>` +
      `<span class="sb-wf-blurb">${t.blurb}</span>` +
      `</a>`
    );
  }

  /**
   * @param {HTMLElement} root
   * @param {{ base?: string, heading?: string, label?: string, browseHref?: string, preview?: boolean, hideHeader?: boolean }} opts
   */
  function renderSbWorkflowTemplates(root, opts) {
    if (!root) return;
    const o = opts || {};
    const base = o.base;
    const heading = o.heading ?? 'Templates';
    const label = o.label;
    const browse = o.browseHref;

    let html = '<div class="sb-templates">';
    if (!o.hideHeader) {
      if (label) {
        html += `<p class="sb-templates-label">${label}</p>`;
      } else {
        html += '<div class="sb-templates-hd">';
        html += `<b id="templatesHeading">${heading}</b>`;
        if (browse) {
          html += `<a href="${browse}">Browse all <span aria-hidden="true">›</span></a>`;
        }
        html += '</div>';
      }
    }
    html += '<div class="sb-wf-grid">';
    html += TEMPLATES.map((t) => renderCard(t, base, o)).join('');
    html += '</div></div>';
    root.innerHTML = html;
  }

  window.SB_WORKFLOW_TEMPLATES = TEMPLATES;
  window.renderSbWorkflowTemplates = renderSbWorkflowTemplates;
  window.sbTemplateHref = templateHref;
})();
