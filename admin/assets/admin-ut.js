/* ------------------------------------------------------------------
   Unmoderated user-study chrome — intro overlay + persistent task reminder.

   Activated when the participant enters via ut-leave.html (session flag)
   or ?ut=leave on any admin page. First screen is the signed-in workspace;
   instructions appear as a one-time overlay on top of it.
------------------------------------------------------------------- */

(function () {
  const TASK = 'Find and review this week\u2019s new leave requests.';

  function active() {
    if (sessionStorage.getItem('adUtLeave') === '1') return true;
    if (new URLSearchParams(location.search).get('ut') === 'leave') {
      sessionStorage.setItem('adUtLeave', '1');
      return true;
    }
    return false;
  }

  function injectTask() {
    if (document.getElementById('adUtTask')) return;

    const el = document.createElement('aside');
    el.id = 'adUtTask';
    el.className = 'ad-ut-task collapsed';
    el.innerHTML = `
      <button class="ad-ut-task-toggle" type="button" aria-expanded="false" aria-controls="adUtTaskBody">
        <span class="ad-ut-task-k">Your task</span>
        <span class="ad-ut-task-mini">${TASK}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="ad-ut-task-body" id="adUtTaskBody">
        <p>${TASK}</p>
        <span class="ad-ut-task-hint">When you are done, return to your study link.</span>
      </div>`;

    document.body.appendChild(el);

    const toggle = el.querySelector('.ad-ut-task-toggle');
    toggle.addEventListener('click', () => {
      const collapsed = el.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  function injectIntro() {
    if (sessionStorage.getItem('adUtStarted') === '1') return;
    if (document.getElementById('adUtIntro')) return;

    const el = document.createElement('div');
    el.id = 'adUtIntro';
    el.className = 'ad-ut-intro';
    el.innerHTML = `
      <div class="ad-ut-intro-card" role="dialog" aria-modal="true" aria-labelledby="adUtIntroTitle">
        <p class="ad-ut-intro-eyebrow">Unmoderated study · ~5 minutes</p>
        <h2 id="adUtIntroTitle">Review this week&apos;s leave requests</h2>
        <p class="ad-ut-intro-lead">You work at <b>Northwind Ops</b>. A few weeks ago you set up a live <b>Leave approval</b> app so staff could apply for sick leave and holiday leave online.</p>
        <div class="ad-ut-intro-box">
          <b>Your task</b>
          <p>Find and review the <b>new leave requests that came in this week</b>. When you reach the list, skim a few entries so you know what people applied for.</p>
        </div>
        <ul class="ad-ut-intro-list">
          <li>You are already signed in — use the workspace behind this dialog.</li>
          <li>Work at your own pace. There are no wrong answers.</li>
          <li>If you are recording, please think aloud as you go.</li>
        </ul>
        <button class="ad-ut-intro-go" type="button" id="adUtIntroGo">Start task</button>
        <p class="ad-ut-intro-foot">Some buttons show a &ldquo;not wired up&rdquo; message — that is expected in this prototype.</p>
      </div>`;

    document.body.appendChild(el);
    document.body.classList.add('ad-ut-intro-open');

    el.querySelector('#adUtIntroGo').addEventListener('click', () => {
      sessionStorage.setItem('adUtStarted', '1');
      el.remove();
      document.body.classList.remove('ad-ut-intro-open');
    });
  }

  function inject() {
    if (!active()) return;
    injectIntro();
    injectTask();
  }

  window.adUtMount = inject;
})();
