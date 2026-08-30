/* ------------------------------------------------------------------
   Split desktop shell — sign-in → harness → animated unified hand-off.

   Loads after install-4.js on build-sugar/shell.html.
------------------------------------------------------------------- */

(function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const DEFAULT_PROJECT = { name: 'my-process', path: '~/Downloads/my-process' };

  const setupWin = document.getElementById('winSetup');
  const splitAdmin = document.getElementById('splitAdmin');
  if (!setupWin || !splitAdmin) return;

  let phase = 'idle'; /* idle | signin | harness | unified */

  function setProgress(step, total) {
    const bars = document.getElementById('setupProgress');
    const count = document.getElementById('setupProgressCount');
    if (bars) {
      bars.querySelectorAll('i').forEach((bar, i) => bar.classList.toggle('on', i < step));
    }
    if (count) count.textContent = `${step} / ${total}`;
  }

  function updateProjectPath() {
    document.querySelectorAll('#splitProjectPath').forEach((el) => {
      el.textContent = DEFAULT_PROJECT.path;
    });
  }

  /** Enterprise AI harness shell — inside unified window. */
  function harnessShellHtml() {
    return `
      <div class="designex">
        <aside class="designex-sidebar">
          <div class="designex-logo">
            <img class="designex-logo-mark" src="../assets/logos/eai-mark-dark.svg" alt="" width="28" height="28" />
            <img src="../assets/logos/eai-wordmark.svg" alt="Enterprise AI" />
          </div>
          <nav class="designex-nav">
            <div class="designex-nav-item"><svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>New project</div>
            <div class="designex-nav-item on"><svg viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h7M3 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>New chat<span class="kbd">⌘N</span></div>
            <div class="designex-nav-item"><svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Search</div>
          </nav>
          <div class="designex-stages">
            <div class="designex-stages-label">Stages</div>
            <div class="designex-stage-card on" data-stage="plan"><b>Plan</b><span>Map the process and find improvements</span></div>
            <div class="designex-stage-card" data-stage="build"><b>Build</b><span>Snap smart blocks into a workflow</span></div>
            <div class="designex-stage-card" data-stage="deploy"><b>Deploy</b><span>Ship to your tenancy</span></div>
          </div>
          <div class="designex-sidebar-spacer"></div>
          <div class="designex-settings"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.2" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>Settings</div>
        </aside>
        <main class="designex-main" id="designexMain">
          <div class="designex-main-top"><span>New project</span><svg viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/></svg></div>
          <div class="designex-body">
            <div class="designex-chat" id="designexChat" aria-live="polite"></div>
            <div class="designex-hero-wrap">
              <h1>What process do you want to improve?</h1>
              <section class="designex-controlled">
                <h2 class="designex-controlled-label">We control to an extent?</h2>
                <div class="designex-cards">
                  <div class="designex-card"><span class="designex-card-ico">📄</span><b>DESIGN.md</b><span>Import guidance</span></div>
                  <div class="designex-card"><span class="designex-card-ico">&gt;_</span><b>Codebase</b><span>Infer from app</span></div>
                  <div class="designex-card"><span class="designex-card-ico">F</span><b>Figma</b><span>Import system</span></div>
                  <div class="designex-card"><span class="designex-card-ico">▦</span><b>Catalog</b><span>Adopt a system</span></div>
                </div>
              </section>
            </div>
            <div class="designex-composer">
              <textarea class="designex-composer-input" id="designexInput" rows="1" placeholder="Describe the process, upload references, or both…"></textarea>
              <div class="designex-composer-bar">
                <span class="ico">+</span>
                <span class="ico">📎</span>
                <span class="model"><i></i>Opus 5</span>
                <span class="depth">Medium ▾</span>
                <span class="spacer"></span>
                <button class="designex-composer-send" type="button" id="designexSend" aria-label="Send" disabled>↑</button>
              </div>
            </div>
          </div>
        </main>
      </div>`;
  }

  function assistantReply(text) {
    const lower = text.toLowerCase();
    if (/kyc|onboard|compliance/i.test(lower)) {
      return '<p>Got it — KYC onboarding. Tell me how it works today: who submits, who reviews, and where it breaks down.</p><p>We can map that in Plan before anything gets built.</p>';
    }
    if (/invoice|approval|leave|vendor/i.test(lower)) {
      return '<p>Understood. Walk me through the steps as they happen today — email, spreadsheets, shared inboxes, whatever is actually in use.</p>';
    }
    return '<p>Tell me more about how this process runs today — who does what, and where time gets lost.</p><p>Once I understand the flow, we can move into Plan and sketch improvements.</p>';
  }

  function wireHarnessChat(root) {
    const main = root.querySelector('#designexMain');
    const chat = root.querySelector('#designexChat');
    const input = root.querySelector('#designexInput');
    const send = root.querySelector('#designexSend');
    if (!main || !chat || !input || !send) return;

    let busy = false;

    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
      send.classList.toggle('ready', input.value.trim().length > 0);
      send.disabled = busy || !input.value.trim();
    }

    function scrollChat() {
      chat.scrollTop = chat.scrollHeight;
    }

    function appendUser(text) {
      const el = document.createElement('div');
      el.className = 'designex-msg designex-msg--user';
      el.innerHTML = `<div class="designex-msg-bubble">${escapeHtml(text)}</div>`;
      chat.appendChild(el);
      scrollChat();
    }

    function appendTyping() {
      const el = document.createElement('div');
      el.className = 'designex-msg designex-msg--assistant';
      el.dataset.typing = '1';
      el.innerHTML = `
        <div class="designex-msg-avatar">AI</div>
        <div class="designex-msg-bubble"><div class="designex-typing"><i></i><i></i><i></i></div></div>`;
      chat.appendChild(el);
      scrollChat();
      return el;
    }

    function appendAssistant(html) {
      const el = document.createElement('div');
      el.className = 'designex-msg designex-msg--assistant';
      el.innerHTML = `<div class="designex-msg-avatar">AI</div><div class="designex-msg-bubble">${html}</div>`;
      chat.appendChild(el);
      scrollChat();
    }

    async function submit() {
      const text = input.value.trim();
      if (!text || busy) return;
      busy = true;
      main.classList.add('has-messages');
      appendUser(text);
      input.value = '';
      autoGrow();
      send.disabled = true;

      const typing = appendTyping();
      await wait(900 + Math.random() * 400);
      typing.remove();
      appendAssistant(assistantReply(text));

      busy = false;
      autoGrow();
      input.focus();
    }

    input.addEventListener('input', autoGrow);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void submit();
      }
    });
    send.addEventListener('click', () => void submit());

    root.querySelectorAll('.designex-stage-card').forEach((card) => {
      card.addEventListener('click', () => {
        root.querySelectorAll('.designex-stage-card').forEach((c) => c.classList.remove('on'));
        card.classList.add('on');
      });
    });

    setTimeout(() => input.focus(), 400);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function goToHarnessScreen() {
    const api = window.eaiSetupApi;
    const projName = document.getElementById('projName');
    const projFolder = document.getElementById('projFolder');
    if (projName) projName.value = DEFAULT_PROJECT.name;
    if (projFolder) projFolder.value = '/Users/gareth/Downloads';

    document.getElementById('harnessFine')?.setAttribute('hidden', '');

    if (api?.finish) {
      api.finish(DEFAULT_PROJECT.name, DEFAULT_PROJECT.path);
    } else {
      api?.showScreen('done');
    }

    updateProjectPath();
    setProgress(2, 2);
    phase = 'harness';
    patchStartButton();
  }

  function showSignIn() {
    const api = window.eaiSetupApi;
    api?.showScreen('signin');
    setupWin.classList.remove('at-start');
    setProgress(1, 2);
    phase = 'signin';
  }

  async function quickSignIn() {
    if (phase === 'harness' || phase === 'unified') return;
    const signinBtn = document.getElementById('setupSignin');
    if (signinBtn) signinBtn.disabled = true;
    await wait(700);
    goToHarnessScreen();
    if (signinBtn) signinBtn.disabled = false;
  }

  function enterUnifiedApp() {
    if (phase === 'unified') return;
    phase = 'unified';

    setupWin.classList.add('eai-expanding');
    requestAnimationFrame(() => {
      setupWin.classList.add('eai-unified');
      setupWin.querySelector('.win-bar .wt').textContent = 'Enterprise AI';

      const zone = splitAdmin.querySelector('.split-zone--eai') || splitAdmin;
      zone.innerHTML = harnessShellHtml();
      wireHarnessChat(zone);

      const browser = document.getElementById('winBrowser');
      if (browser) browser.classList.add('hidden');

      setupWin.classList.add('focused');
      setupWin.style.zIndex = '20';

      requestAnimationFrame(() => setupWin.classList.remove('eai-expanding'));
    });
  }

  function patchStartButton() {
    const btn = document.getElementById('harnessGo');
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    fresh.textContent = 'Start';
    btn.replaceWith(fresh);
    fresh.addEventListener('click', () => enterUnifiedApp());
  }

  function watchSetupOpen() {
    let opened = false;
    const observer = new MutationObserver(() => {
      if (setupWin.classList.contains('hidden') || opened) return;
      opened = true;
      showSignIn();
    });
    observer.observe(setupWin, { attributes: true, attributeFilter: ['class'] });
    if (!setupWin.classList.contains('hidden')) {
      opened = true;
      showSignIn();
    }
  }

  const signin = document.getElementById('setupSignin');
  if (signin) {
    const fresh = signin.cloneNode(true);
    signin.replaceWith(fresh);
    fresh.addEventListener('click', () => void quickSignIn());
  }

  const create = document.getElementById('setupCreate');
  if (create) {
    const freshCreate = create.cloneNode(true);
    create.replaceWith(freshCreate);
    freshCreate.addEventListener('click', () => void quickSignIn());
  }

  const start = document.getElementById('setupStart');
  if (start) {
    const freshStart = start.cloneNode(true);
    start.replaceWith(freshStart);
    freshStart.addEventListener('click', () => showSignIn());
  }

  watchSetupOpen();
})();
