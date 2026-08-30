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
