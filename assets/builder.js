/* ------------------------------------------------------------------
   /build — the harness.

   Our own agent, building the thing somebody typed on the homepage, in
   our own product. Everything visible here is redrawn from the shipped
   no-code builder (see build/pages/builder.html for the file-by-file
   map); everything *spent* is new.

   The shape of the file follows assets/cli.js: a running order at the
   top, one function per beat, and a `state` the later beats read.

   Two things it is honest about, and a third it cannot be:

   - The transcript is written, not generated. Type something far from
     the scripted brief and the reply will fit it loosely. Steer with
     the chips on the homepage, or say so in the session.
   - The prices are invented, and say so on the plans page.
   - The four-step ceiling is not invented. `applyProposedChange` in
     chat-container.tsx refuses to add a fifth step, and that ceiling is
     what makes the second fork honest rather than a sales pitch.
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
const TOPUP = { credits: 500, price: '$49' };

/** Never show per-action credit prices in the UI (CTAs, message chips). */
const SHOW_CREDIT_COSTS = false;

/* ============================ state =============================== */

const params = new URLSearchParams(location.search);

const state = {
  prompt: (params.get('prompt') || 'a new business process').trim(),
  ws: params.get('ws') || 'Northwind Group',
  email: params.get('email') || 'usertesting@gmail.com',
  credits: Number(params.get('credits') || START_CREDITS),
  step: 'describe',
  published: false,
  costForkShown: false,
  fitForkShown: false,
  turnsSinceFork: 99,
  extraFields: [],
  busy: false,
};

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* What somebody typed is the name of the thing. Asking them to name it
   again, having just described it, is a question with one answer. */
const projectName = sentence(state.prompt);

/* ====================== the workflow it builds ===================== */

/* Four steps, because four is the ceiling. Generic enough to survive an
   unscripted prompt, specific enough to look like a real form. */
const WORKFLOW = [
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
    id: 'checks', title: 'Automated checks', blurb: 'Was a manual review inbox. Now a smart block that runs on submit.',
    transform: 'Off-platform review → on-platform and monitored',
    fields: [
      { label: 'Document validation', type: 'Smart block', req: false, block: true },
      { label: 'Identity check', type: 'Smart block', req: false, block: true },
    ],
  },
  {
    id: 'review', title: 'Review and approve', blurb: 'One decision, with the checks already done and attached.',
    transform: 'Manual approval → auto-extract, human decides the exception',
    fields: [
      { label: 'Decision', type: 'Select', req: true, opts: ['Approve', 'Send back for more information', 'Decline'] },
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
      : 'Builder preview · free';
}

function setStep(step) {
  state.step = step;
  const order = ['describe', 'generate', 'improve', 'publish'];
  const at = order.indexOf(step);
  document.querySelectorAll('#bdSteps .st').forEach((el) => {
    const i = order.indexOf(el.dataset.step);
    el.classList.toggle('on', i === at);
    el.classList.toggle('done', i < at);
  });
}

/* ============================ transcript ========================== */

const log = () => $('bdLog');

function scroll() {
  const l = log();
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

/**
 * Spend, repaint, and then decide whether this is the turn the flow
 * forks. The order matters: the fork card is the assistant's next
 * message, so it has to land after whatever the spend produced.
 */
function charge(kind) {
  const cost = PRICE[kind] || 0;
  state.credits = Math.max(0, state.credits - cost);
  state.turnsSinceFork += 1;
  paintMeter();
  return cost;
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
  location.href = window.bdCarry('app.html', {
    tab: 'cli',
    ws: state.ws,
    email: state.email,
    project: projectName,
    from: why,
  });
}

/* ============================ preview ============================= */

function fieldRow(f) {
  const cls = ['bd-fld'];
  if (f.block) cls.push('block');
  if (f.isNew) cls.push('new');
  return `
    <div class="${cls.join(' ')}">
      <label>${esc(f.label)}${f.req ? '<i>*</i>' : ''}</label>
      ${f.opts
        ? `<div class="ctl select">${esc(f.opts[0])}<svg viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>`
        : f.block
          ? `<div class="ctl blk"><span class="spark">◆</span>${esc(f.type)} &middot; runs automatically</div>`
          : `<div class="ctl">${f.type === 'Long text' ? '' : ''}</div>`}
      ${f.isNew ? '<span class="tag">New</span>' : ''}
    </div>`;
}

function paintPreview() {
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

function askClarify() {
  return new Promise((resolve) => {
    let at = 0;
    const answers = [];
    const box = document.createElement('div');
    box.className = 'bd-clarify';
    $('bdAnchor').appendChild(box);

    function paint() {
      const q = QUESTIONS[at];
      box.innerHTML = `
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
        </div>`;

      box.querySelectorAll('.bd-cl-opts button').forEach((b) => {
        b.addEventListener('click', () => pick(q.opts[Number(b.dataset.i)]));
      });
      const other = box.querySelector('[data-other]');
      other.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && other.value.trim()) pick(other.value.trim());
      });
      box.querySelector('[data-skip]').addEventListener('click', () => finish(true));
    }

    function pick(value) {
      answers.push({ q: QUESTIONS[at].q, a: value });
      at += 1;
      if (at >= QUESTIONS.length) return finish(false);
      paint();
    }

    function finish(skipped) {
      box.remove();
      if (!skipped && answers.length) {
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
  const cost = charge('generate');
  await thinking(700);
  const row = await say('Designing it now — four steps, and I\'m taking two things off the manual pile as I go.', cost);
  void row;

  const prog = card(`
    <div class="bd-run">
      <span class="r" data-r="1">Mapping the process as it runs today</span>
      <span class="r" data-r="2">Collapsing four handoffs into one submission</span>
      <span class="r" data-r="3">Adding document validation as a smart block</span>
      <span class="r" data-r="4">Building the form</span>
    </div>`);
  for (const n of [1, 2, 3, 4]) {
    await wait(620);
    prog.querySelector(`[data-r="${n}"]`).classList.add('done');
  }

  await wait(300);
  card(`
    <div class="bd-summary">
      <div class="hd"><b>${esc(projectName)}</b><span>4 steps · 2 automated</span></div>
      ${WORKFLOW.map((s, i) => `
        <div class="st">
          <span class="n">${i + 1}</span>
          <div>
            <b>${esc(s.title)}</b>
            <span>${esc(s.blurb)}</span>
            ${s.transform ? `<i class="tr">${esc(s.transform)}</i>` : ''}
          </div>
        </div>`).join('')}
      <p class="fine">The builder caps a process at four steps on purpose — past that it stops being a form.</p>
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

async function run() {
  paintMeter();
  $('bdProjectName').textContent = projectName;
  $('wsName').textContent = state.ws;
  $('wsInitial').textContent = state.ws.charAt(0).toUpperCase();
  document.title = `Prototype — ${projectName}`;

  /* The prompt is already the first message. Nobody types it twice: they
     typed it on the homepage, and the whole of sign-up carried it here. */
  bubble('user', esc(state.prompt));

  await thinking(1100);
  const cost = charge('understand');
  await say(`Right — ${state.prompt}. Here's what I think you're describing. Correct me before I build anything.`, cost);

  await wait(200);
  const bu = card(`
    <div class="bd-bu">
      <div class="hd">
        <b>Business process card</b>
        <span>My structured understanding — confirm or refine it.</span>
      </div>
      <div class="quote">${esc(sentence(state.prompt))} — today this runs on email and a shared inbox, with the same details re-keyed at least twice.</div>
      <div class="kv">
        <span class="i goal">◎</span><div><b>Goal</b><span>Get to a decision without anybody chasing the paperwork.</span></div>
      </div>
      <div class="kv">
        <span class="i aud">◍</span><div><b>Audience</b><span>The person submitting, and the one or two people who review it.</span></div>
      </div>
      <div class="kv">
        <span class="i out">✓</span><div><b>Outcome</b><span>A decision on record, with everything it was based on attached to it.</span></div>
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
    bu.querySelector('.acts').innerHTML = '<span class="bd-confirmed">Confirmed</span>';
    setStep('generate');
    await wait(400);
    await say('Two or three questions, then I\'ll build it. They\'re free — asking you something isn\'t work.');
    await askClarify();
    await generate();
  });
}

/* ============================ the composer ======================== */

async function send() {
  const input = $('bdSay');
  const text = input.value.trim();
  if (!text || state.busy) return;
  if (state.credits <= 0) { costFork(); return; }

  state.busy = true;
  input.value = '';
  bubble('user', esc(text));

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

/* ============================ wiring ============================== */

$('bdSend').addEventListener('click', () => void send());
$('bdSay').addEventListener('keydown', (e) => { if (e.key === 'Enter') void send(); });
$('bdSuggest').addEventListener('click', () => void suggest());
$('bdPublish').addEventListener('click', () => void publish());

/* The CLI tab is the same fork, reachable at any time — which is the
   point of it sitting above everything else in the sidebar. */
$('tabCli').addEventListener('click', () => goCli('tab'));

document.querySelectorAll('#bdMode button, #bdDevice button').forEach((b) => {
  b.addEventListener('click', () => {
    const group = b.parentElement;
    group.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    if (b.dataset.device) $('bdFrame').dataset.device = b.dataset.device;
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

void run();
