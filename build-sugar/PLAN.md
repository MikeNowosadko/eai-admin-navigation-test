# `/build-sugar` — split desktop + marketing site

**Status: scaffolded.** Marketing site at `/build-sugar/index.html` (used inside the shell iframe). Split desktop journey at `/build-sugar/shell.html`.

**Split desktop flow:** Google → marketing → download → install → sign in (shader right) → harness + project location → **Start** animates to full-screen unified window. See `split-desktop-architecture.html`.

| URL | Role |
| --- | --- |
| `/build-sugar/showcase.html` | Seeded tenancy — success dashboard + Plan · Build · Deploy walkthrough → builder |
| `/build-sugar/shell.html` | Full desktop journey + harness-only installer |
| `/build-sugar/index.html` | Marketing / download page (Safari iframe) |

---

## The route (web sugar hit)

| # | Screen | What it is | What it tests |
| --- | --- | --- | --- |
| 1 | `home.html` | Same marketing composer as `/build` | Does anybody type in it |
| 2 | `builder.html` | **No auth.** Opens immediately with the prompt as the first message | Does the AI reply + business process card land as a "sugar hit" |
| 3 | — | **Late auth gate** on "Looks good — continue" | Do they sign up now that they've seen value, or bounce |
| 4+ | Same as `/build` | Clarify → generate → credits → forks → CLI exit | Everything `/build` already measures |

Steps 4+ reuse `/build`'s harness logic (`assets/build-sugar-builder.js`, forked from `assets/builder.js`).

### Gopher desktop route (`shell.html`)

| # | Screen | What it is |
| --- | --- | --- |
| 1 | Google (Safari) | Search → Enterprise AI result |
| 2 | `index.html` | Gopher marketing — **Download EAI Setup** |
| 3 | DMG → Applications | Standard macOS install |
| 4 | EAI Setup opens | **Connect** — one click (sign-in, workspace, create) |
| 5 | Unified app | Full-screen Enterprise AI — admin left, **harness nested right** |

Uses `install-4.js` + `setup-split.js` + `build-sugar-shell.js` (nested harness, no second `#winHost` window).

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

---

## Future: merge with unified shell

Sugar hit and the DesignEx-inspired shell are tracked together in Notion
([Sugar hit prototypes](https://app.notion.com/p/9921f8c973104f4799b9414e9e4019ae))
and mirrored in `.context/notion-sugar-hit-and-shell.md`.

**Sugar hit** fixes value before account (web). **Unified shell** fixes the
hand-off to a separate harness window (native). The north-star journey:

1. Prompt on homepage → builder without auth (`/build-sugar`)
2. Sign up after the business process card
3. Continue in **one desktop app** — admin/builder left, external harness right
   — see [`../experiments/eai-cli-setup/shell-harness-bridge.md`](../experiments/eai-cli-setup/shell-harness-bridge.md)

That merge is roadmap thinking, not the next usability test. Run sugar hit on
web first; shell is a parallel design track (`/install-6` comp, then
`eai-installer` PTY spike).
