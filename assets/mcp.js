/* ------------------------------------------------------------------
   /mcp — the playground.

   One question, four ways of asking it, three harnesses. The left
   column is what we author, the right is what a person sees, and the
   only claim the page makes is that the left column changes far less
   than the right one.

   The mocks are drawn rather than screenshotted. Screenshots of these
   tools rot within a release; what has to stay true is the shape —
   who owns the border, whose fonts, how many controls are on offer.

   THE ONE QUESTION, used everywhere on this page, is the approval gate
   from the build pipeline: research is done, and nothing may be built
   until a human says yes. It is the right example because it is the
   gate people currently scroll past.
------------------------------------------------------------------- */

/* What each harness can be asked to draw. This is the whole of the
   compatibility story, and it is four booleans. */
const HARNESS = {
  claude: { name: 'Claude Code',    kind: 'cli', text: 1, form: 1, url: 1, app: 0 },
  codex:  { name: 'Codex',          kind: 'cli', text: 1, form: 1, url: 0, app: 0 },
  vscode: { name: 'VS Code',        kind: 'gui', text: 1, form: 1, url: 1, app: 1 },
};

const RUNGS = ['text', 'form', 'url', 'app'];
const RUNG_NAME = { text: '1 · Text', form: '2 · Form', url: '2b · Link', app: '3 · App' };

const state = { harness: 'claude', rung: 'form', fellBack: null };

/* ---------------- what we author, per rung ----------------------
   Note what does *not* vary: none of these change per harness. One
   artifact, three windows. That is the entire argument for doing it
   this way rather than writing a Claude version and a VS Code one. */

const SOURCE = {
  text: `<span class="c">// we write words. that's the whole API.</span>

<span class="k">print</span>(<span class="s">"◆ Your turn — approve before we build"</span>)
<span class="k">print</span>(<span class="s">"  3 screens · 2 integrations · ~40 files"</span>)
<span class="k">print</span>(<span class="s">""</span>)
<span class="k">print</span>(<span class="s">"  Type approve, feedback, or stop."</span>)`,

  form: `<span class="c">// we describe the question. we never draw it.</span>

elicitation/create {
  <span class="t">message</span>: <span class="s">"Approve the proposal before building?"</span>,
  <span class="t">requestedSchema</span>: {
    <span class="t">type</span>: <span class="s">"object"</span>,
    <span class="t">properties</span>: {
      <span class="t">decision</span>: {
        <span class="t">type</span>: <span class="s">"string"</span>,
        <span class="t">title</span>: <span class="s">"What next?"</span>,
        <span class="t">enum</span>: [<span class="s">"approve"</span>, <span class="s">"feedback"</span>, <span class="s">"stop"</span>],
        <span class="t">enumNames</span>: [
          <span class="s">"Approve — start building"</span>,
          <span class="s">"Give feedback first"</span>,
          <span class="s">"Stop here"</span>
        ]
      }
    },
    <span class="t">required</span>: [<span class="s">"decision"</span>]
  }
}`,

  url: `<span class="c">// we send a link. the page at the other end</span>
<span class="c">// is ours, and looks like whatever we like.</span>

elicitation/create {
  <span class="t">mode</span>: <span class="s">"url"</span>,
  <span class="t">message</span>: <span class="s">"Review the proposal in your browser"</span>,
  <span class="t">url</span>: <span class="s">"https://eai.app/gate/9f2c1a"</span>,
  <span class="t">elicitationId</span>: <span class="s">"9f2c1a"</span>
}

<span class="c">// …then, when they've decided:</span>
notifications/elicitation/complete { <span class="t">id</span>: <span class="s">"9f2c1a"</span> }`,

  app: `<span class="c">// we ship the actual interface, as HTML.</span>

resource <span class="s">"ui://eai/approval-gate"</span>
  mimeType: <span class="s">"text/html;profile=mcp-app"</span>

<span class="c">// and inside that HTML, we paint with</span>
<span class="c">// whatever the host handed us:</span>

.card {
  background: <span class="k">var</span>(<span class="t">--color-background-primary</span>);
  color:      <span class="k">var</span>(<span class="t">--color-text-primary</span>);
  font-family:<span class="k">var</span>(<span class="t">--font-sans</span>);
  border-radius: <span class="k">var</span>(<span class="t">--border-radius-md</span>);
}`,
};

/* ---------------- what a person sees ----------------------------- */

/* The proposal card that is ours in every sense: our layout, our
   words, our idea of what a person needs in order to say yes. Only
   the paint changes, and only on rung 3. */
function oursCard(skin) {
  return `
  <div class="ours ${skin}">
    <h5>Approve before building?</h5>
    <p class="o-sub">contract-renewals · research finished 4 minutes ago</p>
    <div class="o-rows">
      <div class="o-row"><b>Scope</b><span>3 screens, 2 integrations</span></div>
      <div class="o-row"><b>Touches</b><span>~40 files</span><span class="o-chip risk">1 protected</span></div>
      <div class="o-row"><b>Rollback</b><span>checkpoint at every phase</span></div>
    </div>
    <div class="o-acts">
      <a class="o-btn">Approve</a>
      <a class="o-btn ghost">Give feedback</a>
      <a class="o-btn ghost">Stop</a>
    </div>
  </div>`;
}

function termText(h) {
  const cls = h === 'codex' ? 'codex' : 'claude';
  return `
  <div class="term ${cls}">
    <div><span class="prompt">❯</span> /eai</div>
    <div class="muted">Researching contract-renewals…  done</div>
    <div>&nbsp;</div>
    <div>◆ Your turn — approve before we build</div>
    <div class="muted">&nbsp; 3 screens · 2 integrations · ~40 files</div>
    <div>&nbsp;</div>
    <div class="muted">&nbsp; Type approve, feedback, or stop.</div>
    <div>&nbsp;</div>
    <div><span class="prompt">❯</span> <span style="opacity:.4">▌</span></div>
  </div>`;
}

function termForm(h) {
  const cls = h === 'codex' ? 'codex' : 'claude';
  return `
  <div class="term ${cls}">
    <div class="muted">Researching contract-renewals…  done</div>
    <div class="tbox">
      <div class="tb-title">Approve the proposal before building?</div>
      <div class="tb-msg">What next?</div>
      <div class="opt on">❯ 1. Approve — start building</div>
      <div class="opt">&nbsp; 2. Give feedback first</div>
      <div class="opt">&nbsp; 3. Stop here</div>
      <div class="tb-foot">↑↓ to move · enter to choose · esc to cancel</div>
    </div>
  </div>`;
}

function vscForm() {
  return `
  <div class="vsc">
    <div class="vsc-top"><i></i> Chat — eai</div>
    <div class="vsc-body">
      <div class="vsc-card">
        <h5>Approve the proposal before building?</h5>
        <p>What next?</p>
        <div class="vsc-radio on"><i></i> Approve — start building</div>
        <div class="vsc-radio"><i></i> Give feedback first</div>
        <div class="vsc-radio"><i></i> Stop here</div>
        <div class="vsc-acts">
          <a class="vsc-btn">Submit</a>
          <a class="vsc-btn ghost">Cancel</a>
        </div>
      </div>
    </div>
  </div>`;
}

function urlOut(h) {
  const ask = h === 'vscode'
    ? `<div class="vsc"><div class="vsc-top"><i></i> Chat — eai</div><div class="vsc-body">
         <div class="vsc-card"><h5>Open a link?</h5>
         <p>eai wants to open <b style="color:#cccccc">eai.app/gate/9f2c1a</b></p>
         <div class="vsc-acts"><a class="vsc-btn">Open</a><a class="vsc-btn ghost">Cancel</a></div></div>
       </div></div>`
    : `<div class="term claude"><div class="tbox">
         <div class="tb-title">Open a link in your browser?</div>
         <div class="tb-msg">eai.app/gate/9f2c1a</div>
         <div class="opt on">❯ 1. Open</div><div class="opt">&nbsp; 2. Cancel</div>
       </div></div>`;

  return `<div style="width:100%">
    ${ask}
    <div style="text-align:center;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#86868f;padding:14px 0 10px">then, in Safari</div>
    <div class="saf">
      <div class="saf-top"><i></i><i></i><i></i><div class="saf-url">eai.app/gate/9f2c1a</div></div>
      <div style="padding:16px">${oursCard('')}</div>
    </div>
  </div>`;
}

function appOut() {
  return `
  <div class="vsc">
    <div class="vsc-top"><i></i> Chat — eai</div>
    <div class="vsc-body">${oursCard('skin-vscode')}</div>
  </div>`;
}

/* ---------------- the sentence under each pairing ---------------- */

const NOTE = {
  text: `<b>Nobody drew anything.</b> We sent characters; the harness printed them. This always works, in every tool, forever — and it is the only rung where the person has to know what to type.`,
  form: `<b>We sent a description, not a design.</b> The border, the fonts, the arrow keys, the word “Submit” — none of that is ours, and it changes with the tool. What we control is the question and the three answers. Try switching the harness above and watch the same schema get redrawn.`,
  url: `<b>Two windows and a trip.</b> The harness only ever draws its own “open this?” prompt; everything after that is a normal web page we designed. Full control, at the cost of leaving the tool.`,
  app: `<b>We drew it, they painted it.</b> Our HTML, our layout, our three buttons — rendered inside their window, using the colours and fonts they handed us. Switch to Claude Code or Codex to see what happens when a tool can’t do this.`,
};

const FALLBACK_NOTE = (harness, want) =>
  `<span class="miss">${HARNESS[harness].name} can’t do the ${RUNG_NAME[want].split(' · ')[1].toLowerCase()} rung.</span>
   So the gate fell back to the rung below. This is the fallback ladder doing its job — the
   <i>question</i> survived, only the <i>drawing</i> was lost.`;

/* ---------------- wiring ---------------------------------------- */

const $ = (id) => document.getElementById(id);

function bestAvailable(harness, want) {
  const caps = HARNESS[harness];
  if (caps[want]) return want;
  // walk down the ladder until the harness can draw something
  for (let i = RUNGS.indexOf(want) - 1; i >= 0; i -= 1) {
    if (caps[RUNGS[i]]) return RUNGS[i];
  }
  return 'text';
}

function paint() {
  const { harness } = state;
  const shown = bestAvailable(harness, state.rung);
  state.fellBack = shown === state.rung ? null : state.rung;

  // the two segmented controls
  document.querySelectorAll('#segHarness button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.v === harness));
  });
  /* The pressed rung is the one actually being drawn, not the one asked
     for — otherwise the control and the two column headings disagree
     with each other during a fallback. The request is still remembered
     in `state.rung`, so switching back to a harness that can do it
     restores it, and the note below says what was lost. */
  document.querySelectorAll('#segRung button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.v === shown));
    b.disabled = !HARNESS[harness][b.dataset.v];
  });

  $('src').innerHTML = SOURCE[shown];
  $('srcRung').textContent = RUNG_NAME[shown];
  $('outHarness').textContent = HARNESS[harness].name;

  let out;
  if (shown === 'text') out = termText(harness);
  else if (shown === 'form') out = harness === 'vscode' ? vscForm() : termForm(harness);
  else if (shown === 'url') out = urlOut(harness);
  else out = appOut();
  $('out').innerHTML = out;

  $('note').innerHTML = state.fellBack
    ? FALLBACK_NOTE(harness, state.fellBack)
    : NOTE[shown];
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('#segHarness button, #segRung button');
  if (!b || b.disabled) return;
  if (b.closest('#segHarness')) state.harness = b.dataset.v;
  else state.rung = b.dataset.v;
  paint();
});

paint();
