# `/build-web` — web sugar hit (release focus)

**Status: active.** Two variants for parallel testing ahead of **16 Oct** hard release.

| URL | Variant | Ship target |
| --- | --- | --- |
| `/build-web/index.html` → `builder.html` | **MVP — no smart blocks** | Oct 16 |
| `/build-web/index-blocks.html` → `builder-blocks.html` | **Smart blocks** (stretch) | Desirability tests |

Toggle in code: `?blocks=1`, `?variant=blocks`, or `data-bd-blocks="on"` on `<body>`.

---

## MVP vs smart blocks

| | **MVP** (`builder.html`) | **Smart blocks** (`builder-blocks.html`) |
| --- | --- | --- |
| **Plan phase** | Chat — business process card + shadcn questionnaire | Same |
| **Build phase** | **Process map** (left) + **tabbed form preview** (right) | Chat summary + stacked form preview |
| **Step cards** | Problem / Solution / Impact per step | Transform badges in chat summary |
| **Workflow** | 4 steps — Submit · Review · Approval · Payment | 4 steps with smart block automated checks |
| **Preview** | One step at a time with tabs | All steps stacked in editor |

MVP matches the invoice-approval workshop layout: collapsible process cards on the left, live form on the right.

**CSS:** `assets/build-web-mvp.css` · **JS:** `build-sugar-builder.js` (`!smartBlocks` path)

---

## The route

| # | Screen | What it is |
| --- | --- | --- |
| 1 | `index.html` or `index-blocks.html` | Prompt-first marketing |
| 2 | `builder.html` or `builder-blocks.html` | Harness opens immediately |
| 3 | — | Late auth after ~50 credits used |
| 4+ | Clarify → generate → improve → publish | |

**JS:** `assets/build-sugar-builder.js` — reads variant at load, picks `WORKFLOW_MVP` or `WORKFLOW_BLOCKS`.

### Smart blocks catalog

Six planned blocks (mirrors `eaiNoCodeBuilder` `data/smart-blocks.ts`):

| Block | Backed by | Example use |
| --- | --- | --- |
| Document Analysis | LLM + OCR | Extract criteria, pre-fill forms |
| AI Chat | LLM + workflow context | Clarify intent, multi-turn tasks |
| Comparison Table | LLM evaluator | RFP / job screening scores |
| Document Checklist | Rule engine + classifier | Required docs, upload tracking |
| Compliance Rules | Rule engine | Pass/fail policy checks |
| Approvals | Workflow state machine | Sign-off, comments, resubmit |

The blocks variant demo uses **Document Analysis**, **Compliance Rules**, and **Approvals** in the generated workflow.

---

## Related (paused)

| URL | Role |
| --- | --- |
| `/build-sugar/showcase.html` | Seeded tenancy end-state |
| `/build-sugar/shell.html` | Desktop journey |
| `/build` | Frozen — macOS shell + account-first |

---

## What to test in parallel

- **MVP:** Can someone publish a useful form without smart blocks?
- **Smart blocks:** Does the automated-checks step increase desire, or confuse?
- Same metrics on both: type-in rate, continue after business card, sign-in after 50 credits

---

## Admin & settings (built from the Paper MVP frame)

Two shells, eight screens. Enter at `ws-home.html`.

| URL | Screen |
| --- | --- |
| `ws-home.html` | Workspace home — composer, templates, recent processes |
| `ws-processes.html` | All processes — roll-up tiles, search, sortable table, split-button row actions |
| `ws-cli.html` | CLI tab — download EAI Setup, `/eai` instruction, `npx install eai` |
| `ws-templates.html` | Templates splash — coming soon |
| `ws-integrations.html` | Integrations splash — coming soon |
| `ws-users.html` | Users & roles — seats, members, **Builds with** (No-code / CLI) |
| `ws-settings.html` | Settings — General · **Harness defaults** · Billing · Danger zone |
| `profile.html` | Your profile — identity, workspaces, inherited harness |
| `app-overview.html` | Process overview — KPIs, drop-off funnel / table, recommended fixes, clients, devices |
| `app-general.html` | Process settings form — identity, access, workspace, badge |
| `app-clients.html` | Clients roll-up — submissions, completed, median, share of volume |
| `app-client.html` | One client — Submissions · Analytics |
| `process-live.html` | End-user form preview — what someone filling the process sees |
| `process-edit.html` | Process editor — chat left, shared workflow preview right |

**Shells.** `ws-*` and `profile` use the workspace sidebar; `app-*` use the nested
"App settings" card. Both are rendered by `assets/admin-shell.js` from body data
attributes, so the chrome is defined once. Seed data lives in
`assets/admin-data.js` — the client rows add up to the process totals, so the
numbers stay honest when you click between them.

**Analytics** are ported from `eainocodebuilder`, not re-invented —
`assets/admin-analytics.js` carries over the step-health thresholds
(`src/lib/analytics/step-health.ts`), `formatTime`, the conversion funnel's
geometry and hover card (`conversion-funnel.tsx`), the step table
(`step-analytics-table.tsx`), the triage banner (`attention-banner.tsx`) and
the ranked fix list (`recommended-fixes.tsx`).

Everything on the dashboard is derived from one `StepMetric[]`: the KPIs, the
banner, the funnel, the table and the fixes all read the same array, so no two
figures on the page can disagree. Client step entries sum to the process
totals, so the same holds when you drill in.

The overview does not list submissions. A submission belongs to a client, so
the way out of the overview is the clients card at the foot of it — each row
carries that client's own worst step, which is rarely the process-wide one.

On the processes table each row carries one split button: **Edit** with a
caret that opens View/Preview and Manage. The middle action follows state —
a live process can be **View**ed, a draft only **Preview**ed, because there
is nothing published to visit. **View / Preview** opens `process-live.html`
— the end-user form experience (workflow preview with client branding), not
the admin dashboard. **Edit** opens `process-edit.html` — the configurator
layout (chat + preview) with a seeded transcript. Both pull the same preview
markup from `assets/admin-process-live.js`. Sorting lives on the column headers rather
than a filter control; clicking **Status** groups live above draft, which
is the same cut the old tabs made with one less thing on screen.

**Scope:** this is a form builder. A submission is completed, in progress or
abandoned — there is no reviewer, no approval and no decision anywhere in the
data or the UI.

**What is wired:** rail and sidebar navigation, client drill-down, submission
search and status filter, funnel/table toggle with per-step hover detail,
dashboard/submissions tabs, settings tabs, harness surface + CLI role pickers,
toggles. Everything else toasts.

**Navigation.** These are eight files, but links between them are intercepted
and swapped client-side — a document load repaints the whole window, so moving
between two screens that share a sidebar used to flash white on every click.
The URL, the title and the back button all still work; the chrome just stops
blinking. Links out of the set (`home.html`, `builder.html`, anything external)
navigate for real.

`app-settings.html` and `workspace-settings.html` are redirects to the new pages.

---

## Unmoderated study — Leave approval (Sep 2026)

**Participant link (send this):** `build-web/ut-leave.html` — redirects to the signed-in workspace home (`ws-home.html`) with a one-time task overlay. Also on the **Launch pad** under *Marketing site & no-code builder → MVP*.

Marketing **Sign in** and post-signup flows also land on `ws-home.html` (not the builder workshop).

The entry page sets the scenario, states the task in plain language, and does **not** hint at bells, email, or navigation paths — so you can observe whether those match participants' mental models.

### Task (shown to participants)

> You work at Northwind Ops. You set up a live **Leave approval** process for sick and holiday leave.
> **Find and review the new leave requests that came in this week.**

A collapsible **Your task** reminder stays on screen for the whole session (via `assets/admin-ut.js` + `sessionStorage`).

### Variants

| Link on entry page | What opens | Use when |
| --- | --- | --- |
| **Open workspace** (default) | `ws-home.html?ut=leave` + task overlay | Default — Maze, UserTesting, Lyssna, etc. |
| **Mac desktop version** | `ut-leave.html?desktop=1` → `build/index.html` → Safari loads workspace home | Testing Mail vs in-app notifications |

### Seeded state (no setup for participants)

- Signed in as **Gareth Chainey**, workspace **Northwind Ops**
- **Leave approval** is live with **5 submissions this week** (1–2 Sep 2026)
- Bell badge: **2 unread**; Mail dock badge: **2** (desktop only)

### Success (for your analysis — not shown to participants)

Participant reaches the **Submissions** tab for Leave approval and sees this week's requests (LVE-1044 through LVE-1048). Any path counts — processes list, notifications, overview banner, search, or Mail → Safari.

### Suggested post-task questions (external survey)

1. How confident were you that you found the right place? (1–5)
2. Where did you expect new leave requests to appear before you started?
3. Did you notice notifications? If yes, where did you look first — bell, email, or somewhere else?
4. Was anything confusing about getting from "my app" to "this week's submissions"?

### Researcher reset

Clear `sessionStorage` keys `adUtLeave` and `adUtMode`, or open the entry page in a fresh incognito window.
