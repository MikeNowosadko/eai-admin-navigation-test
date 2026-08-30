/* ------------------------------------------------------------------
   Seeded tenancy showcase — boot, milestone walkthrough, build CTA.
------------------------------------------------------------------- */

(function () {
  const STAGES = [
    {
      id: 'plan',
      title: 'Plan with your consultant',
      copy: 'Describe how work runs today. The AI consultant asks the right questions, maps handoffs, and captures the business case before anything gets built.',
      points: [
        'Back-and-forth workshop in plain language',
        'Business understanding card — goal, audience, outcome',
        'Process map you can edit before build starts',
      ],
    },
    {
      id: 'build',
      title: 'Build with smart blocks',
      copy: 'Snap governed blocks into a workflow. Tweak the UI in preview, iterate with your harness, and sync changes back to Enterprise AI.',
      points: [
        'Smart blocks — validate, route, notify, audit',
        'Live preview updates as you describe changes',
        'Same session in Claude Code or Copilot on your machine',
      ],
    },
    {
      id: 'deploy',
      title: 'Deploy to many clients',
      copy: 'Authenticate with Microsoft Entra, configure tenancy once, and roll the same app out to every client — with governance and audit built in.',
      points: [
        'Sign in with Microsoft — your IT, your directory',
        'One app, many client tenancies',
        'Per-client rollout, credits, and usage analytics',
      ],
    },
  ];

  const APPS = [
    { name: 'KYC onboarding', clients: 8, dau: 420, revenue: '$312K', fill: 92 },
    { name: 'Invoice approval', clients: 5, dau: 890, revenue: '$248K', fill: 78 },
    { name: 'Leave requests', clients: 4, dau: 650, revenue: '$156K', fill: 65 },
    { name: 'Vendor onboarding', clients: 2, dau: 310, revenue: '$89K', fill: 44 },
    { name: 'Contract renewals', clients: 1, dau: 130, revenue: '$42K', fill: 28 },
  ];

  let stageIndex = 0;

  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

  function renderApps() {
    const grid = $('#scApps');
    if (!grid) return;
    grid.innerHTML = APPS.map((app) => `
      <article class="sc-app">
        <div class="sc-app-top">
          <h3>${app.name}</h3>
          <span class="sc-app-status">Live</span>
        </div>
        <div class="sc-app-meta">
          <span><b>${app.clients}</b> clients</span>
          <span><b>${app.dau.toLocaleString()}</b> daily users</span>
          <span><b>${app.revenue}</b> ARR</span>
        </div>
        <div class="sc-app-bar" aria-hidden="true"><i style="width:${app.fill}%"></i></div>
      </article>`).join('');
  }

  function frameHtml(id) {
    if (id === 'plan') {
      return `
        <div class="sc-chat">
          <div class="sc-msg sc-msg--user">We onboard corporate clients for KYC — lots of email back and forth between compliance and relationship managers.</div>
          <div class="sc-msg sc-msg--ai">Got it. Who starts the process, and where does it usually stall?</div>
          <div class="sc-msg sc-msg--user">RM submits in Salesforce. Compliance waits on documents in a shared inbox. Average 11 days.</div>
          <div class="sc-msg sc-msg--ai">Three manual handoffs — I'll map those. Here's what I heard:</div>
          <div class="sc-card-mini">
            <b>Business understanding</b>
            <dl>
              <dt>Goal</dt><dd>Cut KYC cycle from 11 days to 3</dd>
              <dt>Audience</dt><dd>Relationship managers + compliance</dd>
              <dt>Outcome</dt><dd>Single queue, automated doc checks</dd>
            </dl>
          </div>
        </div>`;
    }
    if (id === 'build') {
      return `
        <div class="sc-blocks">
          <div class="sc-block on"><span class="sc-block-ico">✓</span><div><b>Validate documents</b><span>Policy check against client rules</span></div></div>
          <div class="sc-block on"><span class="sc-block-ico">↪</span><div><b>Route to compliance</b><span>Manager queue with SLA</span></div></div>
          <div class="sc-block"><span class="sc-block-ico">✉</span><div><b>Notify RM</b><span>Email + Teams when approved</span></div></div>
          <div class="sc-block"><span class="sc-block-ico">📋</span><div><b>Audit log</b><span>Tenancy-ready, immutable trail</span></div></div>
        </div>
        <div class="sc-preview">
          <div class="sc-preview-label">Preview — updated just now</div>
          <div class="sc-preview-ui">
            <h4>KYC review queue</h4>
            <p>Acme Corp · 3 documents pending · SLA 2 days</p>
            <div class="sc-preview-btns">
              <button type="button">Request docs</button>
              <button type="button" class="primary">Approve</button>
            </div>
          </div>
        </div>`;
    }
    return `
      <div class="sc-deploy-grid">
        <div class="sc-deploy-card">
          <h4><span class="sc-ms"><i style="background:#f25022"></i><i style="background:#7fba00"></i><i style="background:#00a4ef"></i><i style="background:#ffb900"></i></span> Microsoft Entra</h4>
          <p style="margin:0;font-size:13px;color:var(--sc-muted)">Sign in with your work account. Roles sync from your directory — no separate EAI password for end users.</p>
        </div>
        <div class="sc-deploy-card">
          <h4>Multi-client rollout</h4>
          <ul class="sc-client-list">
            <li><span>Northwind Bank</span><span class="tag">Live</span></li>
            <li><span>Contoso Financial</span><span class="tag">Live</span></li>
            <li><span>Fabrikam Capital</span><span class="tag">Live</span></li>
            <li><span>Adventure Works</span><span class="tag pending">Staging</span></li>
          </ul>
        </div>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:var(--sc-muted)">Same app, isolated tenancy per client — credits, audit, and analytics roll up to your workspace.</p>`;
  }

  function renderStage() {
    const stage = STAGES[stageIndex];
    const copy = $('#scStageCopy');
    const frame = $('#scStageFrame');
    const prev = $('#scPrev');
    const next = $('#scNext');

    if (copy) {
      copy.innerHTML = `
        <h3>${stage.title}</h3>
        <p>${stage.copy}</p>
        <ul class="sc-stage-points">${stage.points.map((p) => `<li>${p}</li>`).join('')}</ul>`;
    }
    if (frame) {
      frame.innerHTML = `
        <div class="sc-frame-bar"><i></i><i></i><i></i> ${stage.title}</div>
        <div class="sc-frame-body">${frameHtml(stage.id)}</div>`;
    }

    $$('.sc-milestone').forEach((btn, i) => btn.classList.toggle('on', i === stageIndex));
    if (prev) prev.disabled = stageIndex === 0;
    if (next) {
      next.textContent = stageIndex === STAGES.length - 1 ? 'Start building' : 'Next';
      next.classList.toggle('sc-btn-primary', stageIndex === STAGES.length - 1);
    }
  }

  function boot() {
    const el = $('#scBoot');
    if (!el) return;
    setTimeout(() => {
      el.classList.add('done');
      document.body.classList.add('sc-ready');
    }, 900);
  }

  function bind() {
    $$('.sc-milestone').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        stageIndex = i;
        renderStage();
      });
    });

    $('#scPrev')?.addEventListener('click', () => {
      if (stageIndex > 0) {
        stageIndex -= 1;
        renderStage();
      }
    });

    $('#scNext')?.addEventListener('click', () => {
      if (stageIndex < STAGES.length - 1) {
        stageIndex += 1;
        renderStage();
      } else {
        window.location.href = 'pages/builder.html';
      }
    });

    $('#scSeeHow')?.addEventListener('click', () => {
      $('#scShowcase')?.scrollIntoView({ behavior: 'smooth' });
    });

    $('#scBuildTop')?.addEventListener('click', () => {
      window.location.href = 'pages/builder.html';
    });
  }

  renderApps();
  renderStage();
  bind();
  boot();
})();
