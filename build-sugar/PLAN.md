# `/build-sugar` — sugar hit: builder first, sign up later

**Status: scaffolded.** Clickable at `/build-sugar` — a fork of `/build` for testing whether value before account improves conversion.

**Web only.** No macOS desktop shell — the marketing site and builder fill the viewport. Compare with `/build`, which wraps the same web half in Safari, dock and EAI Setup.

The hypothesis: people need to *feel* the no-code builder working before they'll create an account. `/build` gates on sign-up before the harness runs; this iteration inverts that order.

---

## The route

| # | Screen | What it is | What it tests |
| --- | --- | --- | --- |
| 1 | `home.html` | Same marketing composer as `/build` | Does anybody type in it |
| 2 | `builder.html` | **No auth.** Opens immediately with the prompt as the first message | Does the AI reply + business process card land as a "sugar hit" |
| 3 | — | **Late auth gate** on "Looks good — continue" | Do they sign up now that they've seen value, or bounce |
| 4+ | Same as `/build` | Clarify → generate → credits → forks → CLI exit | Everything `/build` already measures |

Steps 4+ reuse `/build`'s harness logic (`assets/build-sugar-builder.js`, forked from `assets/builder.js`). The native half (`assets/build-sugar.js`) is kept on disk but not loaded — this variant stops at the web experience.

---

## What's different from `/build`

| | `/build` | `/build-sugar` |
| --- | --- | --- |
| Homepage → next | `signup.html` (gate on ghost preview) | `builder.html` (live harness) |
| When auth appears | Before any building | After business process card confirmed |
| Sidebar on load | Workspace + name filled | Guest / Preview |
| Shell | macOS desktop + Safari iframe | **Web only, full viewport** |
| Journey file | `assets/builder.js` | `assets/build-sugar-builder.js` |

`/build` is frozen — compare against it without wondering what else moved.

---

## No-code builder source

The harness is redrawn from the shipped product. Source repo (when linked):

`~/conductor/repos/eainocodebuilder`

See `/build/PLAN.md` §2 for the file-by-file map (`new-workflow-chat.tsx`, `configurator-shell.tsx`, etc.).

---

## Variations to try next

- **Earlier gate** — after first AI sentence, before the business card
- **Later gate** — after workflow preview generates (more sugar, higher drop-off risk)
- **Softer gate** — email only, workspace deferred
- **Swap harness** — wire in prototype from `eainocodebuilder` repo when available
