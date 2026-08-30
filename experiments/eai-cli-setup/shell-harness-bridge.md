# EAI Setup + embedded harness — design (DesignEx-inspired)

**Status:** design only — no prototype built yet.  
**Decision this informs:** Can we collapse the gap between EAI admin (web) and the external CLI harness without building our own agent?

**Notion (sugar hit + shell merge):** [Sugar hit prototypes](https://app.notion.com/p/9921f8c973104f4799b9414e9e4019ae) · repo mirror: `.context/notion-sugar-hit-and-shell.md`

Related: [EAI CLI set up](./README.md), [`/build-sugar`](../../build-sugar/PLAN.md) (sugar hit — web, builder first), `/install-5` (two-column setup, branding on the right), `/chat` (admin preview beside chat), `/signup` (hand-off to a separate harness window), `/mcp` (what we can draw inside somebody else's tool).

---

## The bet

Today a builder lives in three places:

| Place | What it is | Pain |
| --- | --- | --- |
| EAI web app | Account, workspace, no-code builder, admin screens, credits | Good for configuration; stops at the browser |
| EAI Setup (native) | Sign-in, tenant, folder, `eai init`, harness picker | Good for machine prep; then it *opens another app* |
| External harness | Claude Code, Codex, Copilot, VS Code… | Good for building; no EAI admin, empty prompt, `/eai` to discover |

The hypothesis: **one native shell, two panes** — EAI on the left, the user's harness on the right — makes the product feel like a desktop app and the harness feel like part of EAI, without us owning the agent loop.

---

## What DesignEx actually does (and what we're borrowing)

DesignEx ([designex.app](https://designex.app/)) is a **Mac-native shell around your existing coding agent**, not a new agent. It works with Claude Code, Codex, Cursor, or OpenCode using the subscription you already have.

### Their layout

From their marketing and screenshots:

| Left — **Thread** | Right — **Workbench** |
| --- | --- |
| Design conversation, comments on elements, forks, variant comparison | Real HTML prototype rendered in *your* design system, plus a conformance strip (off-system tokens) |

Important nuance: **the right panel is not the CLI harness.** It is the *output* — the prototype the agent produced. The agent runs behind the scenes; DesignEx owns the design-specific UI (thread, compare, comment pins, design-system band).

What they are *not* claiming to be:

- Not another coding agent ("yours is already excellent at building")
- Not a mockup tool (prototypes are real markup wired to real tokens)
- Not cross-platform yet (Mac-only research preview; iOS companion for review)

### How they almost certainly built it (inferred — no public architecture doc)

DesignEx does not publish internals. The pattern matches what OpenAI documents for Codex and what several Mac harness wrappers ship today:

```
┌─────────────────────────────────────────────────────────────┐
│  DesignEx (native Mac app — Swift/AppKit or similar)        │
│  ┌──────────────────────┬──────────────────────────────────┐│
│  │  Thread UI           │  Workbench (WebView)             ││
│  │  (their product)     │  loads agent-generated HTML      ││
│  └──────────┬───────────┴──────────────────────────────────┘│
│             │ JSON-RPC / event stream                         │
│             ▼                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Agent child process (Claude Code / Codex / …)         │ │
│  │  · Codex: App Server binary, JSON-RPC over stdio       │ │
│  │  · Claude Code: CLI in a real PTY                      │ │
│  │  · Project folder + DESIGN.md / tokens as context      │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

References for that stack:

- [OpenAI — Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/) — local clients launch a platform App Server child, bidirectional JSON-RPC over stdio, streaming notifications to the UI.
- Comparable open tools (diri, Forge, Unterm) — native Mac app, **real PTY per session**, agent defined as spawn config + status rules, not reimplemented UI.

DesignEx adds a **design layer** on top: derive tokens from the repo, generate/compare prototypes, push a build pack back into git. The shell pattern is generic; the left panel is domain-specific.

---

## What we are proposing for EAI (adaptation, not a copy)

DesignEx puts **prototype output** on the right. We put the **external harness** on the right — closer to Conductor's workspace model than to DesignEx's workbench.

```
┌─────────────────────────────────────────────────────────────┐
│  EAI Desktop (extends EAI Setup → becomes the daily app)    │
│  ┌──────────────────────┬──────────────────────────────────┐│
│  │  EAI (WebView)       │  Harness pane                    ││
│  │  · Setup → Admin     │  · PTY terminal OR               ││
│  │  · No-code builder   │    embedded agent surface        ││
│  │  · Process list      │  · Same folder, same session     ││
│  │  · Credits / plans   │  · User's Claude/Codex account   ││
│  └──────────┬───────────┴──────────────────────────────────┘│
│             │ postMessage / native bridge                     │
│             ▼                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  eai core (already planned): init, surfaces, Gofer MCP   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Metaphor:** left = "DesignEx thread" equivalent (our admin + builder). Right = the harness as an **iframe-like frame** — visually inside our chrome, technically still their process.

---

## Experience design

### Phase map

| Phase | Left pane | Right pane | Today (separate) |
| --- | --- | --- | --- |
| **1 · Setup** | Sign-in, workspace, template, name, folder, harness pick | Empty or "Waiting for setup…" | `/install-4`, `/install-5` |
| **2 · Hand-off** | Short instruction + what travels (name, brief, workflow id) | Harness opens on project folder; optional auto-send `/eai` | `/signup` hand-off screen + separate `#winHost` |
| **3 · Build** | Admin screens, workflow config, analytics, credits | Agent session — user types, agent runs Gofer | Browser tab + Claude Code window |
| **4 · Review** | Preview / admin (like `/chat` third column) | Agent paused or side-by-side | Split across Safari and harness |

Setup should **not** end by spawning a second window. The right pane activates in place — same window geometry as `/install-5`, but the shader panel becomes the harness.

### Layout rules (extend `/install-5`)

`/install-5` already proves the shell: 50/50 split, stepper on the left, fixed action bar on the floor. Reuse that chrome; swap the right column:

| `/install-5` today | This iteration |
| --- | --- |
| Warp shader + wordmark | Harness surface (terminal or agent UI) |
| Decorative, non-interactive | Interactive; receives focus after setup |
| Branding during onboarding | Optional thin status strip (working / needs you / done) |

Minimum width: **1280px** effective (640px per pane). Below that, collapse to tabs — **EAI | Harness** — rather than unreadable columns. `/chat` already does this for preview (`with-preview` hides chat on narrow widths).

### Left pane content by mode

**Setup mode** — current EAI Setup screens unchanged in substance; only the container changes (no longer a floating 900×720 dialog that hands off outward).

**Product mode** — load the logged-in web app (same surfaces as `/signup` `app.html`, `/build` builder, future admin). Single sign-on session; no Safari round trip for admin.

**Context strip** — always visible at top of left pane after setup:

> **contract-renewals** · Northwind Group · Claude Code · 42 credits left

Clicking admin items does not hide the harness; the right pane stays mounted.

### Right pane — harness frame

**Default (v1): embedded PTY terminal** running the chosen surface in the project directory:

```bash
cd ~/Projects/contract-renewals && claude   # or codex, etc.
```

- Frame chrome: window title = harness name + project; not a fake clone of Claude's entire UI — honest label: *Claude Code · terminal view*.
- On hand-off: optionally pre-fill first line `/eai` (user still presses Enter — we don't fake agency).
- Status line above terminal: *Sign in to Anthropic when prompted — EAI never sees that account* (same copy as `/install-4` harness fine print).

**Stretch (v2): surface-specific**

| Surface | Right pane strategy | Constraint |
| --- | --- | --- |
| Claude Code, Codex, Gemini CLI | PTY + xterm (or native terminal view) | Full TUI; needs real PTY |
| VS Code / Cursor | Launch externally **or** deep-link `vscode://file/...` with side-by-side tile hint | Cannot truly embed VS Code in WKWebView |
| Copilot in VS Code | Same as VS Code | Extension host is VS Code |

We should not promise pixel-perfect Claude Code chrome inside our window unless we partner for an embed API. **Terminal-faithful beats fake-chrome.**

### Transitions (the moments that matter)

1. **Setup complete → harness live**  
   Left: collapses stepper to a slim progress "Ready". Right: terminal fades in (crossfade like `/install-5` shader swap — avoids blank flash).  
   No second dock icon bounce for "Claude Code" if we can avoid it — user stays in EAI Desktop.

2. **Web builder → CLI continuation** (`/build` segue)  
   Left: shows what travelled (*Business process card, workflow id WF-12*). Right: `/eai` already typed or pasted — engineering must confirm payload.  
   If workflow **cannot** travel, left pane must say so; do not draw a lie ([`/build/PLAN.md` §3.5](../../build/PLAN.md)).

3. **Admin while agent works**  
   Left: user opens Analytics or Theme. Right: agent keeps running (PTY session owned by shell daemon, not tied to WebView lifecycle).  
   Same pattern as Codex App Server — thread persists if left pane navigates.

4. **"Open in separate window" escape hatch**  
   Power users and VS Code cases: **Detach harness** moves PTY to native Claude/VS Code window. EAI shell becomes left-only with a "Reattach" button. Default remains embedded.

### What we stop doing

- Opening `#winHost` as a separate fake desktop window after setup (`/signup`, `/build`).
- Duplicating harness guidance in web CLI tab *and* setup *and* hand-off screen *and* hope — one shell, one instruction moment (right before pane activates).
- Building a second agent UI (`/chat`, `/agent` spikes remain valid alternatives, but this iteration explicitly **does not** replace the external harness).

---

## Architecture (feasibility)

### Feasible now (Mac, EAI Setup codebase)

| Capability | Approach | Notes |
| --- | --- | --- |
| Single window, two panes | Native split view + WKWebView (left) | `/install-5` layout maps directly |
| Load EAI web admin | WKWebView → `app.enterpriseai…` or bundled static | Same origin or trusted bridge for `postMessage` |
| Run Claude Code / Codex in-pane | `node-pty` / Swift PTY + xterm.js | Industry standard; Conductor-adjacent |
| Spawn in project folder | `eai init` output path + `eai start --surface` | Already in CLI prototype vocabulary |
| Detect installed surfaces | `eai ai-surfaces` | `/install-4` harness list |
| Session survives left navigation | PTY owned by main process / headless daemon | diri's `dirijord` pattern |
| Setup + product in one app | Extend `eai-installer` | Same app identity as today's Setup |

### Hard constraints (already documented in prototypes)

1. **We cannot inject UI into somebody else's harness** when it is their standalone app ([`/signup/HANDOFF.md`](../../signup/HANDOFF.md)). Embedding via PTY is *wrapping the process*, not skinning their GUI. Fake Claude chrome would be misleading.

2. **MCP Apps (rung 3) go the other direction** — our HTML inside *their* tool ([`/mcp`](../../mcp/index.html)). Useful for approval cards inside VS Code; **not** a substitute for left-pane admin. Both can coexist later.

3. **VS Code / Cursor are not PTY CLIs.** v1 either launches them externally with reattach, or defers support. Claiming "all six surfaces embedded" is false.

4. **Two auth domains.** EAI account (Microsoft Entra) and harness account (Anthropic, OpenAI…) stay separate. UI must repeat that clearly.

5. **Managed Macs.** npm global install failures already designed in `/install-4`. Embedded shell does not remove IT policy; right pane shows the same failure with detach-to-manual path.

6. **Work travel browser → CLI.** Open engineering question. Shell design assumes `{ appName, brief, workflowId? }` posts across panes; if CLI cannot consume it, left pane shows gap explicitly.

7. **Web-only prototype limit.** This repo can *simulate* the layout (extend `/install-5` right column with `#winHost` terminal skin) but cannot prove PTY behaviour. Native spike belongs in `eai-installer`.

### Platform scope

| | DesignEx | EAI (proposed) |
| --- | --- | --- |
| v1 platform | Mac only | Mac only (EAI Setup already Mac) |
| Windows | Not yet | Later — PTY story differs |
| Web | No | Admin pages still exist in browser for users who refuse the app |

---

## How this relates to existing prototypes

| Prototype | What it proves | Gap for this design |
| --- | --- | --- |
| `/install-5` | Two-column Setup chrome, stepper, 50/50 split | Right side is art, not harness |
| `/signup`, `/build` | Hand-off to empty external window | Exactly what we're replacing |
| `/chat` | Admin preview beside conversation | Preview column pattern → harness column |
| `/agent` | Agent absorbs setup steps | Opposite bet — we keep external harness |
| `/mcp` | UI inside their tool | Complementary, not competing |
| `/build-states` | CLI vs our app for build gates | Gates could render left while harness runs right |

**Suggested next clickable prototype:** `/install-6` — copy `/install-5`, replace `.setup-split-art` with a live `#winHost` terminal slot from `desktop.js` (still scripted, still fake PTY). Tests whether the *composition* reads as one app before native work.

---

## Success criteria (for a usability round)

| Question | Pass signal |
| --- | --- |
| Does it feel like one app? | ≥8/10 say they would not describe it as "two apps" |
| Do they find admin without leaving? | Open analytics/theme without closing harness |
| Do they reach `/eai` unaided? | Same bar as current `/signup` round — but with one instruction point |
| Detach path | VS Code users complete flow without feeling blocked |
| Trust | ≥8/10 understand harness login is separate from EAI |

---

## Open questions for engineering

1. Does `eai-installer` already use WKWebView / Electron / Tauri? Which PTY library is acceptable in ship criteria?
2. Can Gofer MCP stream structured "needs approval" events to the **left** pane while the harness stays on the right? (Split gate UI — `/build-states` proposal.)
3. Workflow export from no-code builder → CLI project: schema and API.
4. Codex App Server vs raw PTY for Codex — do we standardise on JSON-RPC where available?
5. Code signing / notarisation: does embedding terminal execution trigger extra entitlements review?

---

## Recommendation

**Worth building as a native extension of EAI Setup**, not as a new web property. The pattern is proven elsewhere (DesignEx, Codex desktop, Conductor, diri); our twist is **admin on the left, harness on the right** instead of DesignEx's **thread on the left, prototype on the right**.

**Start narrow:**

1. Mac only, Claude Code + Codex via PTY, one workspace, setup → embedded terminal → `/eai`.
2. Clickable HTML comp (`/install-6`) to validate layout and copy.
3. Native spike in `eai-installer`: one split window, real PTY, fake admin URL.
4. Only then wire real admin WebView and workflow travel.

**Do not start with:** fake Claude Code UI skin, full six-surface embed claims, or replacing the external agent with `/chat`-style built-in agent — that is a different experiment.
