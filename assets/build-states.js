/* ------------------------------------------------------------------
   The build stage — the state machine.

   The pair to /states. That one is the setup app: it works by lifting
   the *real* app out of /signup so the page can never drift from what
   testers are given. This one cannot do that, and the reason is the
   whole subject — the build stage happens in somebody else's window.

   So this machine draws two products side by side:

     CLI    · Claude Code, Codex, Copilot, Gemini, VS Code. Somebody
              else's window. We get whatever they will draw for us.
     OURS   · the EAI app doing the building itself. We own every
              pixel, every checkpoint and the whole session.

   ONE CONSTRAINT, ACCEPTED. In the CLI we could reach for four rungs
   (see /mcp), but rung 3 — our own HTML inside their window — does not
   run in a single command-line tool, and rung 2b sends people out to a
   browser. So the CLI side is **rung 2 and nothing else**: we describe
   the question, they draw it with their own parts. Two of the five
   tools can't even do that and fall to plain text, which the page says
   out loud rather than hiding, because it is the price of the choice.

   That decision is what makes the comparison honest. The CLI column is
   not a straw man drawn badly on purpose; it is the best we can do
   there, and the gap that remains is the actual argument.

   FIVE QUESTIONS on the rail:

     View     · CLI, ours, or both
     Stage    · where in the pipeline
     Gate     · is it waiting on a person, and which
     Faults   · what has gone wrong — a list, because they combine
     Session  · how much context is left
     Harness  · whose window the CLI side is drawing

   THE PAYOFF is the `ours` field on every gate and every fault. Some
   read "this cannot happen here", and those are the strongest rows on
   the page: a failure that stops existing beats a failure handled
   beautifully. Where it can still happen, `ours` says what is different
   and why — usually because we own the checkpoints, the session, or
   the window itself.
------------------------------------------------------------------- */

/* ===================== 1. THE TOOLS =============================
   `form` is the only rung the CLI side uses. Two of these can't do it,
   and there is nowhere else to go, so they get text. */

const HARNESSES = {
  claude:  { name: 'Claude Code', chrome: 'claude', form: 1 },
  codex:   { name: 'Codex',       chrome: 'codex',  form: 1 },
  copilot: { name: 'Copilot CLI', chrome: 'codex',  form: 0 },
  gemini:  { name: 'Gemini CLI',  chrome: 'codex',  form: 0 },
  vscode:  { name: 'VS Code',     chrome: 'vsc',    form: 1 },
};

const OWNERS = { you: 'You', machine: 'Machine', us: 'Gofer', model: 'Model' };

const PROJECT = 'contract-renewals';

/* ===================== 2. THE PIPELINE ==========================

   In running order. `log` is the transcript above whatever is
   currently happening — short on purpose, because a real one is
   thousands of lines and the thing being reviewed is always the bottom
   of somebody's screen.

   `gates` are the moments the pipeline stops for a person. They are
   not failures, they are the design, and there are seven across the
   pipeline. `faults` are the honest ways each stage breaks; each
   carries an owner and an out, and three of them have no out at all.

   `ours` is on both, and is the point of the page. */

const STAGES = [
  {
    id: 'entry',
    name: 'Entry',
    log: [],
    gates: [],
    faults: [
      {
        id: 'noplugin', name: 'No plugin', owner: 'us', halts: true,
        head: 'Unknown slash command: /eai',
        sub: 'The harness prints this. We chose none of it.',
        out: null,
        textOnly: true,
        ours: { gone: true },
      },
      {
        id: 'stale', name: 'Stale plugin', owner: 'us', halts: true,
        head: '.specify/scripts/bash/check-prerequisites.sh: no such file',
        sub: 'The commands are from one version and the workspace from another.',
        out: 'Reinstall the plugin, then run /eai again.',
        textOnly: true,
        actions: ['Reinstall it for me', 'Show me the command'],
        ours: { gone: true },
      },
      {
        id: 'auth', name: 'Not signed in', owner: 'you', halts: true,
        head: 'Not signed in to EAI',
        sub: 'eai whoami returned nothing. No tenant is selected.',
        out: 'Run eai login, then /eai again.',
        actions: ['Sign in', 'Not now'],
        ours: { gone: true },
      },
      {
        id: 'folder', name: 'Wrong folder', owner: 'you', halts: true,
        head: 'No EAI project here',
        sub: 'This is ~/, not a workspace. The harness opened where it always opens.',
        out: `cd ~/Developer/${PROJECT}, then /eai again.`,
        actions: [`Open ${PROJECT} instead`, 'Stay here'],
        ours: { gone: true },
      },
      {
        id: 'nogit', name: 'No git repo', owner: 'machine', halts: false,
        head: 'No git repository — checkpoints are off',
        sub: 'Every phase checkpoint and every rollback for this whole run is unavailable.',
        out: 'Run git init to get checkpoints back.',
        actions: ['Start a repository', 'Carry on without one'],
        ours: { gone: true },
      },
      {
        id: 'leftovers', name: 'Unfinished feature', owner: 'us', halts: false,
        head: 'Found an unfinished feature: supplier-portal',
        sub: 'Stopped at implement, 6 of 14 tasks done, 3 days ago.',
        out: 'Carry on with it, or start something new.',
        actions: ['Carry on with supplier-portal', 'Start something new'],
        ours: {
          turn: 'working',
          head: 'supplier-portal · paused 3 days ago',
          sub: 'Sitting in the list where you left it. Nothing is blocked on it.',
        },
      },
    ],
  },

  {
    id: 'research',
    name: 'Research',
    log: ['◇ Reading the codebase', '  12 agents dispatched'],
    working: { verb: 'Researching', detail: '12 agents out · 4 back' },
    gates: [],
    faults: [
      {
        id: 'ctxwarn', name: 'Context filling', owner: 'model', halts: false,
        head: 'Context 63% used',
        sub: 'Switching to sub-agents and checkpointing every 5 tasks.',
        out: 'Nothing to do. It is handling it.',
        actions: [],
        ours: { gone: true },
      },
    ],
  },

  {
    id: 'approval',
    name: 'Approval gate',
    log: ['◇ Reading the codebase', '  done — 40 files, 2 integrations'],
    gates: [
      {
        id: 'proposal',
        name: 'Proposal',
        head: 'Approve before building?',
        sub: `${PROJECT} · research finished 4 minutes ago`,
        rows: [
          ['Scope', '3 screens, 2 integrations'],
          ['Touches', '~40 files', '1 protected'],
          ['Rollback', 'checkpoint at every phase'],
        ],
        options: ['Approve — start building', 'Give feedback first', 'Stop here'],
        type: 'approve, feedback or stop',
        ours: {
          head: 'Approve before building?',
          sub: 'Research finished 4 minutes ago',
          extra: 'Open the 40 files · Open the proposal',
        },
      },
    ],
    faults: [],
  },

  {
    id: 'specify',
    name: 'Specify',
    log: ['✓ Proposal approved', '◇ Writing the specification'],
    working: { verb: 'Specifying', detail: 'spec.md' },
    gates: [],
    faults: [
      {
        id: 'autochain', name: 'False banner', owner: 'us', halts: false,
        head: '════ ✓ RESEARCH COMPLETE ════',
        sub: 'A banner, and then twenty more minutes of work under it.',
        out: null,
        ours: { gone: true },
      },
    ],
  },

  {
    id: 'plan',
    name: 'Plan',
    log: ['✓ spec.md written', '◇ Planning the architecture'],
    working: { verb: 'Planning', detail: 'plan.md · data-model.md' },
    gates: [],
    faults: [
      {
        id: 'assumption', name: 'Assumption disproven', owner: 'us', halts: true,
        head: 'An assumption behind the spec turned out to be false',
        sub: 'Approved on the basis that renewals are single-tenant. They aren’t.',
        out: 'Revise the spec, or accept and carry on.',
        actions: ['Revise the spec', 'Accept it and carry on', 'Stop'],
        ours: {
          head: 'The spec was approved on something that turned out to be false',
          sub: '“Renewals are single-tenant” — approved Tuesday, disproven just now.',
          extra: 'Reopen Tuesday’s approval',
        },
      },
    ],
  },

  {
    id: 'tasks',
    name: 'Tasks',
    log: ['✓ plan.md written', '◇ Breaking it into tasks'],
    working: { verb: 'Breaking down', detail: '14 tasks · 5 phases' },
    gates: [],
    faults: [
      {
        id: 'creep', name: 'Scope crept', owner: 'us', halts: false,
        head: 'The task list is bigger than the thing that was approved',
        sub: '14 tasks now; the approved proposal described 9.',
        out: 'Re-approve the wider scope, or cut it back.',
        actions: ['Approve the wider scope', 'Cut it back to 9'],
        ours: {
          head: '5 tasks more than you approved',
          sub: 'You approved 9. There are 14.',
          extra: 'Show me the 5',
        },
      },
    ],
  },

  {
    id: 'implement',
    name: 'Implement',
    log: ['✓ 14 tasks planned', '◇ Phase 3 of 5 — approvals'],
    working: { verb: 'Implementing', detail: 'T008 · 7 of 14 done' },
    gates: [
      {
        id: 'checklist',
        name: 'Checklists',
        head: 'Some checklists aren’t finished',
        sub: 'ux.md — 5 of 8 done. Carry on anyway?',
        rows: [['requirements.md', '12 of 12', 'pass'], ['ux.md', '5 of 8', 'incomplete']],
        options: ['Carry on anyway', 'Stop and finish them'],
        type: 'yes or no',
        ours: {
          head: 'Three checklist items aren’t done',
          sub: 'ux.md — 5 of 8',
          extra: 'The three unfinished items',
        },
      },
      {
        id: 'protected',
        name: 'Protected file',
        head: 'This file is protected',
        sub: 'src/auth/session.ts — kept out of scope for backward compatibility.',
        rows: [['File', 'src/auth/session.ts'], ['Reason', 'backward compatibility'], ['Needed by', 'T009 — approval chain']],
        options: ['Let it change this file', 'Find another way', 'Stop here'],
        type: 'approve, avoid or stop',
        ours: {
          head: 'This needs to change a file you protected',
          sub: 'src/auth/session.ts · protected for backward compatibility',
          extra: 'See the change it wants to make',
        },
      },
      {
        id: 'uiapproval',
        name: 'Screens',
        head: 'Approve these screens before they’re built for real',
        sub: 'Preview is running. Nothing continues until this is recorded.',
        rows: [['Screens', 'renewals list, contract, approval'], ['Built from', 'Vertical Template blocks'], ['Evidence', 'screenshots attached']],
        options: ['Approve the screens', 'Ask for changes'],
        type: 'approve or change',
        ours: {
          head: 'Approve these screens',
          sub: 'Three screens, running now',
          extra: 'The preview, open alongside',
          preview: true,
        },
      },
      {
        id: 'preflight',
        name: 'Deploy preflight',
        head: 'Two files have to exist before this can deploy',
        sub: 'manifest.yml is missing from the workspace root.',
        rows: [['manifest.yml', 'missing', 'blocking'], ['config.json', 'present', 'ok']],
        options: ['Generate it now', 'Stop here'],
        type: 'generate or stop',
        ours: {
          head: 'manifest.yml is missing',
          sub: 'It has to exist before this can deploy.',

        },
      },
    ],
    faults: [
      {
        id: 'testred', name: 'Tests red', owner: 'us', halts: false,
        head: 'T008 — 3 tests failing',
        sub: 'Fixing before the next task. Attempt 2 of 5.',
        out: 'Nothing yet. It stops and asks after five.',
        actions: [],
        ours: {
          turn: 'working',
          head: 'Fixing 3 failing tests · attempt 2 of 5',
          sub: 'T008 — approval routing',
        },
      },
      {
        id: 'phasebroken', name: 'Build broken', owner: 'us', halts: true,
        head: 'Phase 3 can’t close — the build is broken',
        sub: 'npm run build failed. The next phase will not start.',
        out: 'Fix it, or roll back to the phase 2 checkpoint.',
        actions: ['Keep trying', 'Roll back to phase 2', 'Stop'],
        ours: {
          head: 'Phase 3 can’t close — the build is broken',
          sub: 'npm run build failed 40 seconds ago',
          extra: 'The build output',
        },
      },
      {
        id: 'taskfailed', name: 'Task failed', owner: 'us', halts: true,
        head: 'T009 failed — the tasks after it are waiting',
        sub: 'Cannot resolve module @eai/approvals.',
        out: 'Retry, skip it, or stop.',
        actions: ['Retry T009', 'Skip it — changes what gets built', 'Stop'],
        ours: {
          head: 'T009 failed. Five tasks behind it are waiting.',
          sub: 'Cannot resolve module @eai/approvals',
          extra: 'What skipping costs',
        },
      },
      {
        id: 'partial', name: 'Partial phase', owner: 'us', halts: false,
        head: '3 of 4 parallel tasks finished — T012 failed',
        sub: 'The phase is now partly done, which no later stage checks for.',
        out: 'Retry T012 before closing the phase.',
        actions: ['Retry T012', 'Close the phase anyway'],
        ours: {
          head: 'T012 failed while the others finished',
          sub: 'Phase 3 is 3 of 4 done',
        },
      },
      {
        id: 'reviewgiveup', name: 'Review gave up', owner: 'us', halts: false,
        head: 'Still 2 blocking findings after 5 review cycles — carrying on',
        sub: 'Logged, and the pipeline continues to validation.',
        out: null,
        ours: {
          turn: 'you',
          head: 'Two things I couldn’t fix in five tries',
          sub: 'Carrying on will ship them.',
          actions: ['Send it back', 'Ship them anyway', 'Stop'],
          extra: 'Read the two findings',
        },
      },
      {
        id: 'ctxcrit', name: 'Context full', owner: 'model', halts: true,
        head: 'Context 78% — this session has to end',
        sub: 'Save, quit, open a new session, and type /8_gofer_resume.',
        out: 'Run /7_gofer_save, start a new session, run /8_gofer_resume.',
        actions: ['Save and show me how to resume'],
        ours: { gone: true },
      },
      {
        id: 'rolledback', name: 'Rolled back', owner: 'us', halts: true,
        head: 'Rolled back to the phase 2 checkpoint',
        sub: 'Uncommitted changes in 4 files are gone.',
        out: 'Nothing. It has already happened.',
        ours: {
          head: 'Rolled back to the phase 2 checkpoint',
          sub: '4 files went back. You can put them straight back.',
          actions: ['Undo this rollback'],
          extra: 'See the 4 files',
        },
      },
    ],
  },

  {
    id: 'validate',
    name: 'Validate',
    log: ['✓ 14 of 14 tasks done', '◇ Validating'],
    working: { verb: 'Validating', detail: '12 agents out · 5 back' },
    gates: [],
    faults: [
      {
        id: 'score', name: 'Low score', owner: 'us', halts: false,
        head: '71 of 110 — below the bar',
        sub: 'Test quality 4/10, error handling 5/10.',
        out: 'Read the report, or send it back to implement.',
        actions: ['Open the report', 'Send it back to implement', 'Accept 71'],
        ours: {
          head: '71 of 110',
          sub: 'Test quality 4 · error handling 5 · everything else clear',
          extra: 'The eleven categories',
        },
      },
      {
        id: 'blast', name: 'Contract broke', owner: 'us', halts: true,
        head: 'This changes something other code depends on',
        sub: 'ApprovalService.submit() changed shape. 3 callers outside this feature.',
        out: 'Keep the old shape, or update the callers.',
        actions: ['Keep the old shape', 'Update all 3 callers', 'Stop'],
        ours: {
          head: 'Three things outside this feature call the method you changed',
          sub: 'ApprovalService.submit()',
          extra: 'Open the 3 callers',
        },
      },
      {
        id: 'mocks', name: 'Mostly mocks', owner: 'us', halts: false,
        head: 'Mock ratio 0.81 — the tests barely touch real code',
        sub: 'Mutation score 34%.',
        out: 'Rewrite the worst offenders, or accept it on the record.',
        actions: ['Rewrite the worst 5', 'Accept it on the record'],
        ours: {
          head: 'The tests barely touch real code',
          sub: 'Mock ratio 0.81 · mutation score 34%',
          extra: 'The worst 5 files',
        },
      },
    ],
  },

  {
    id: 'done',
    name: 'Done',
    log: ['✓ 14 of 14 tasks done', '✓ Validated — 96 of 110'],
    working: null,
    gates: [],
    faults: [],
  },
];

const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

/* ===================== 3. THE STATE ============================= */

const state = {
  view: 'both',      // cli · ours · both
  stage: 'implement',
  gate: null,
  faults: ['ctxcrit'],
  harness: 'claude',
  session: 'crit',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Derived, never stored, so it cannot disagree with the rest of the
   state. A halting fault beats a gate; a gate beats working. */
function turnOf() {
  const stage = STAGE_BY_ID[state.stage];
  const faults = stage.faults.filter((f) => state.faults.includes(f.id));
  const halting = faults.find((f) => f.halts);
  if (halting) return { turn: 'stopped', fault: halting, faults };
  if (state.gate) return { turn: 'you', gate: stage.gates.find((g) => g.id === state.gate), faults };
  return { turn: 'working', faults };
}

/* ===================== 4. THE CLI SIDE ==========================
   Rung 2, or text where the tool won't do rung 2. Nothing else. */

function formBox(p) {
  const opts = (p.options || []).map((o, i) =>
    `<div class="opt${i ? '' : ' on'}">${i ? '&nbsp;' : '❯'} ${i + 1}. ${esc(o)}</div>`).join('');
  return `<div class="tbox">
    <div class="tb-title">${esc(p.head)}</div>
    <div class="tb-msg">${esc(p.sub)}</div>
    ${(p.rows || []).map(([k, v, c]) => `<div class="tb-row">${esc(k)}: ${esc(v)}${c ? ` (${esc(c)})` : ''}</div>`).join('')}
    ${opts}
    <div class="tb-foot">${p.foot ? esc(p.foot) : '↑↓ to move · enter to choose · esc to cancel'}</div>
  </div>`;
}

function vscFormBox(p) {
  const opts = (p.options || []).map((o, i) =>
    `<div class="vsc-radio${i ? '' : ' on'}"><i></i> ${esc(o)}</div>`).join('');
  return `<div class="vsc-card">
    <h5>${esc(p.head)}</h5><p>${esc(p.sub)}</p>${opts}
    ${opts ? '<div class="vsc-acts"><a class="vsc-btn">Submit</a><a class="vsc-btn ghost">Cancel</a></div>' : ''}
    ${p.foot ? `<p class="vsc-foot">${esc(p.foot)}</p>` : ''}
  </div>`;
}

function textBox(p, tone) {
  const mark = tone === 'stopped' ? '■' : '◆';
  const opts = (p.options || []).map((o) => `<div class="bs-t dim">&nbsp; · ${esc(o)}</div>`).join('');
  return `<div class="bs-t">&nbsp;</div>
    <div class="bs-t ${tone === 'stopped' ? 'bad' : 'ask'}">${mark} ${esc(p.head)}</div>
    <div class="bs-t dim">&nbsp; ${esc(p.sub)}</div>
    ${opts ? `<div class="bs-t">&nbsp;</div>${opts}` : ''}
    ${p.foot ? `<div class="bs-t">&nbsp;</div><div class="bs-t dim">&nbsp; ${esc(p.foot)}</div>` : ''}`;
}

function drawCli() {
  const stage = STAGE_BY_ID[state.stage];
  const { turn, gate, fault, faults } = turnOf();
  const h = HARNESSES[state.harness];
  const f = fault || faults[0];

  /* Two tools can't draw rung 2, and two failures happen before
     anything of ours is running. Both end in the same place. */
  const pinned = f && f.textOnly;
  const canForm = h.form && !pinned;

  let inner = '';
  if (f) {
    const p = {
      head: f.head, sub: f.sub, rows: [],
      options: f.actions || [],
      foot: (f.actions && f.actions.length) ? null : (f.out || 'There is no way forward from here.'),
    };
    inner = canForm
      ? `<div class="bs-gap"></div>${h.chrome === 'vsc' ? vscFormBox(p) : formBox(p)}`
      : textBox(p, f.halts ? 'stopped' : 'ask');
  } else if (turn === 'you' && gate) {
    inner = canForm
      ? `<div class="bs-gap"></div>${h.chrome === 'vsc' ? vscFormBox(gate) : formBox(gate)}`
      : textBox(gate, 'ask');
  } else if (stage.working) {
    inner = `<div class="bs-t">&nbsp;</div>
      <div class="bs-t"><span class="bs-spin"></span> ${esc(stage.working.verb)}… <span class="dim">${esc(stage.working.detail)}</span></div>`;
  } else {
    inner = `<div class="bs-t">&nbsp;</div><div class="bs-t ok">✓ Done. ${esc(PROJECT)} is built and validated.</div>`;
  }

  const log = stage.log.map((l) => `<div class="bs-t dim">${esc(l)}</div>`).join('');
  const win = h.chrome === 'vsc'
    ? `<div class="vsc bs-win"><div class="vsc-top"><i></i> Chat — eai · ${esc(PROJECT)}</div>
         <div class="vsc-body"><div class="bs-log">${log}</div>${inner}</div></div>`
    : `<div class="term ${h.chrome === 'claude' ? 'claude' : 'codex'} bs-win">
         <div class="bs-t"><span class="prompt">❯</span> /eai</div>${log}${inner}</div>`;

  return { win, degraded: !canForm, pinned };
}

/* ===================== 5. OUR SIDE ==============================

   The EAI app doing the building. What it can do that a text stream
   cannot is not a longer list of features — it is three things:
   the shape of the whole job is always on screen, evidence can sit
   under the question, and we own the checkpoints. */

function drawOurs() {
  const stage = STAGE_BY_ID[state.stage];
  const { turn, gate, fault, faults } = turnOf();
  const f = fault || faults[0];
  const o = (f && f.ours) || (gate && gate.ours) || null;

  /* Some states simply cannot happen here. That is a stronger claim
     than handling them well, so it gets its own drawing. */
  if (o && o.gone) {
    return {
      win: `<div class="eai bs-win">
        ${eaiTop()}
        <div class="eai-main">${eaiRail('working')}
          <div class="eai-body eai-gone">
            <b>Can’t happen here</b>
          </div>
        </div>
      </div>`,
      turn: 'working', gone: true,
    };
  }

  const oTurn = (o && o.turn) || turn;
  let body;

  if (o) {
    /* Two different things, and drawing them as one row was a bug: the
       *answers* are whatever the CLI would also offer, so ours must
       never have fewer of them. The *evidence* is the part rung 2
       cannot carry — the diff, the five extra tasks, the forty files —
       and it sits above the answers because it is what you read before
       you can give one. */
    const answers = o.actions || (gate ? gate.options : (f && f.actions)) || [];
    const evidence = o.extra ? o.extra.split(' · ') : [];
    body = `<div class="eai-card">
      <h5>${esc(o.head)}</h5>
      <p class="eai-sub">${esc(o.sub)}</p>
      ${o.preview ? '<div class="eai-preview"><span>the preview, running alongside</span></div>' : ''}
      ${evidence.length ? `<div class="eai-ev">${evidence.map((e) =>
        `<a class="eai-link">${esc(e)}</a>`).join('')}</div>` : ''}
      ${answers.length ? `<div class="eai-acts">${answers.map((a, i) =>
        `<a class="eai-btn${i ? ' ghost' : ''}">${esc(a.split(' — ')[0])}</a>`).join('')}</div>` : ''}
    </div>`;
  } else if (stage.working) {
    body = `<div class="eai-work">
      <b>${esc(stage.working.verb)}</b>
      <span>${esc(stage.working.detail)}</span>
      <div class="eai-bar"><i></i></div>
    </div>`;
  } else {
    body = `<div class="eai-work"><b>Done</b><span>${esc(PROJECT)} is built and validated.</span></div>`;
  }

  return {
    win: `<div class="eai bs-win">${eaiTop()}
      <div class="eai-main">${eaiRail(oTurn)}<div class="eai-body">${body}</div></div>
    </div>`,
    turn: oTurn,
  };
}

function eaiTop() {
  const sess = { ok: '', warn: 'context 63%', crit: 'context 78% · checkpointing' }[state.session];
  return `<div class="eai-top"><i></i> EAI · ${esc(PROJECT)}
    ${sess ? `<span class="eai-gauge">${esc(sess)}</span>` : ''}</div>`;
}

/* The rail is the design claim: the shape of the whole job, on screen
   the whole time, carrying the turn on the row it belongs to. Nothing
   in a text stream can do this, and most of what `ours` wins comes
   from it rather than from any individual card. */
function eaiRail(turn) {
  const i = STAGES.findIndex((s) => s.id === state.stage);
  const mark = { working: '▸', you: '◆', stopped: '■' }[turn];
  return `<div class="eai-rail">${STAGES.map((s, n) => {
    const cls = n < i ? 'done' : n === i ? `now is-${turn}` : 'todo';
    const glyph = n < i ? '✓' : n === i ? mark : '';
    return `<div class="eai-step ${cls}"><b>${glyph}</b> ${esc(s.name)}</div>`;
  }).join('')}</div>`;
}

/* ===================== 6. PAINT ================================= */

const $ = (id) => document.getElementById(id);

/* The same three shapes on both sides, but the third field is not the
   same sentence: in a terminal the only way to answer is to type, and
   in our app there is nothing to type. A contract that told somebody to
   type "approve" at a row of buttons would be the page copying itself
   rather than designing twice. */
function contractHtml(turn, stage, gate, fault, ours) {
  const c = {
    working: ['▸', 'working', stage.working ? `${stage.working.detail} · 4m 12s` : 'finished'],
    you:     ['◆', 'your turn', ours ? 'one thing to decide' : (gate ? `type ${gate.type}` : 'one thing to decide')],
    stopped: ['■', 'stopped', fault ? (fault.out || 'no way forward from here') : ''],
  }[turn];
  return `<b>${c[0]} ${c[1]}</b><span class="sep">·</span><span>${esc(stage.name)}</span>
    <span class="sep">·</span><span class="what">${esc(c[2])}</span>`;
}

function paint() {
  const stage = STAGE_BY_ID[state.stage];
  const { turn, gate, fault, faults } = turnOf();
  const f = fault || faults[0];

  const cli = drawCli();
  const ours = drawOurs();

  const panes = [];
  if (state.view !== 'ours') {
    panes.push(`<div class="bs-pane">
      <div class="bs-phead"><b>CLI</b><span>${esc(HARNESSES[state.harness].name)} · rung 2${cli.degraded ? ' → text' : ''}</span></div>
      ${cli.win}
      <div class="bs-contract is-${turn}">${contractHtml(turn, stage, gate, f)}</div>
    </div>`);
  }
  if (state.view !== 'cli') {
    panes.push(`<div class="bs-pane">
      <div class="bs-phead"><b>Ours</b><span>EAI</span></div>
      ${ours.win}
      ${ours.gone
        ? '<div class="bs-contract is-gone"><b>— not a state here</b></div>'
        : `<div class="bs-contract is-${ours.turn}">${contractHtml(ours.turn, stage, gate, f, true)}</div>`}
    </div>`);
  }

  $('panes').className = `bs-panes ${state.view === 'both' ? 'two' : 'one'}`;
  $('panes').innerHTML = panes.join('');

  /* --- the caption ------------------------------------------------
     A name and a chip. Everything that used to be explained here is in
     the comment at the top of this file and in the README
     — a paragraph stacked on the thing you are trying to look at is a
     paragraph nobody reads and a page nobody can use. */
  $('capName').textContent = gate ? gate.name : (f ? f.name : stage.name);
  $('capTag').textContent = f
    ? OWNERS[f.owner] + ((f.out || (f.actions || []).length) ? '' : ' · no way out')
    : (gate ? 'gate' : '');
  $('capTag').className = f ? `bs-tag own-${f.owner}` : 'bs-tag is-gate';
  $('capTag').hidden = !f && !gate;

  /* --- the rail --------------------------------------------------- */
  ['View', 'Stage', 'Harness', 'Session'].forEach((k) => {
    const el = $(`rail${k}`);
    if (!el) return;
    el.querySelectorAll('button').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.v === state[k.toLowerCase()])));
  });
  $('grpHarness').hidden = state.view === 'ours';

  buildGates(stage);
  buildFaults(stage);
  writeUrl();
}

/* ===================== 7. THE RAIL ============================== */

function seg(id, items, onPick) {
  const el = $(id);
  el.innerHTML = items.map(([v, label]) => `<button data-v="${v}">${label}</button>`).join('');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && !b.disabled) { onPick(b.dataset.v); paint(); }
  });
}

function buildGates(stage) {
  $('grpGate').hidden = !stage.gates.length;
  if (!stage.gates.length) return;
  $('railGate').innerHTML = [['', 'None']]
    .concat(stage.gates.map((g) => [g.id, g.name]))
    .map(([v, label]) => `<label class="bs-opt"><input type="radio" name="gate" value="${v}"
      ${String(state.gate || '') === v ? 'checked' : ''}><span>${label}</span></label>`).join('');
}

function buildFaults(stage) {
  $('grpFault').hidden = !stage.faults.length;
  if (!stage.faults.length) return;
  $('railFault').innerHTML = stage.faults.map((f) => {
    const gone = f.ours && f.ours.gone;
    return `<label class="bs-opt"><input type="checkbox" value="${f.id}"
      ${state.faults.includes(f.id) ? 'checked' : ''}><span>${f.name}<i class="own own-${f.owner}">${OWNERS[f.owner]}</i>${
      gone ? '<i class="own own-gone">gone</i>' : ''}</span></label>`;
  }).join('');
}

$('railGate').addEventListener('change', (e) => { state.gate = e.target.value || null; paint(); });
$('railFault').addEventListener('change', (e) => {
  const id = e.target.value;
  state.faults = e.target.checked ? state.faults.concat(id) : state.faults.filter((x) => x !== id);
  paint();
});

seg('railView', [['cli', 'CLI only'], ['ours', 'Ours only'], ['both', 'Side by side']], (v) => { state.view = v; });
seg('railStage', STAGES.map((s) => [s.id, s.name]), (v) => {
  state.stage = v;
  state.faults = [];
  state.gate = STAGE_BY_ID[v].gates.length ? STAGE_BY_ID[v].gates[0].id : null;
});
seg('railHarness', Object.entries(HARNESSES).map(([k, h]) => [k, h.name]), (v) => { state.harness = v; });
seg('railSession', [['ok', 'Healthy'], ['warn', 'Filling'], ['crit', 'Full']], (v) => {
  state.session = v;
  if (v === 'crit' && state.stage === 'implement' && !state.faults.includes('ctxcrit')) state.faults.push('ctxcrit');
  if (v !== 'crit') state.faults = state.faults.filter((x) => x !== 'ctxcrit');
});

/* ===================== 8. URLS ================================== */

function writeUrl() {
  const q = new URLSearchParams({ view: state.view, stage: state.stage, harness: state.harness });
  if (state.gate) q.set('gate', state.gate);
  if (state.faults.length) q.set('fault', state.faults.join(','));
  if (state.session !== 'ok') q.set('session', state.session);
  history.replaceState(null, '', `?${q}`);
}

function readUrl() {
  const q = new URLSearchParams(location.search);
  if (!q.toString()) return;
  if (['cli', 'ours', 'both'].includes(q.get('view'))) state.view = q.get('view');
  if (STAGE_BY_ID[q.get('stage')]) state.stage = q.get('stage');
  const s = STAGE_BY_ID[state.stage];
  const gate = q.get('gate');
  state.gate = gate && s.gates.some((g) => g.id === gate) ? gate : null;
  state.faults = (q.get('fault') || '').split(',').filter((f) => s.faults.some((x) => x.id === f));
  if (HARNESSES[q.get('harness')]) state.harness = q.get('harness');
  state.session = ['ok', 'warn', 'crit'].includes(q.get('session')) ? q.get('session') : 'ok';
}

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const i = STAGES.findIndex((s) => s.id === state.stage);
  if (e.key === 'ArrowRight' && i < STAGES.length - 1) seekStage(i + 1);
  else if (e.key === 'ArrowLeft' && i > 0) seekStage(i - 1);
});

function seekStage(i) {
  state.stage = STAGES[i].id;
  state.faults = [];
  state.gate = STAGES[i].gates.length ? STAGES[i].gates[0].id : null;
  paint();
}

readUrl();
paint();
