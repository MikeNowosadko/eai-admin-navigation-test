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
| `ws-users.html` | Users & roles — seats, members, **Builds with** (No-code / CLI) |
| `ws-settings.html` | Settings — General · **Harness defaults** · Billing · Danger zone |
| `profile.html` | Your profile — identity, workspaces, inherited harness |
| `app-overview.html` | Process overview — KPIs, drop-off funnel / table, recommended fixes, clients, devices |
| `app-general.html` | Process settings form — identity, access, workspace, badge |
| `app-clients.html` | Clients roll-up — submissions, completed, median, share of volume |
| `app-client.html` | One client — Submissions · Analytics |

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
