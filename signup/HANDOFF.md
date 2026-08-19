# /signup — where this got to, and what to know before changing it

A handoff note for whoever picks this up next. The design record lives in the
root `README.md` under **Sign up, then download**; this is the shorter version,
plus the things you would otherwise learn by breaking them.

## What the flow is

`/signup` is one journey on the fake macOS desktop. Two URLs a tester can be
handed on their own:

- `/signup?scenario=installed` — Claude Code is already on the Mac
- `/signup?scenario=none` — nothing is, so they have to go and get it

Marketing site → create account → **Microsoft sign-in** (empty field, they type
their address, and it follows them everywhere after) → workspace → the logged-in
app, **on its CLI tab** → download EAI Setup → drag to Applications → sign in
(one click; the browser session is live) → **template → name → folder** → init →
choose a harness → *Next* → the hand-off screen → the harness opens **empty** →
they type `/eai` → congratulations.

## The one thing the round measures

**We cannot write anything into an external harness.** Claude Code, Copilot and
the rest are somebody else's window; they open with an empty prompt and no idea
EAI exists. Everything else follows from taking that seriously:

- The harness opens as a bare `❯`. No banner, no hint, no chip, no placeholder.
- So the instruction — *type `/eai`* — and the video are said beforehand, in the
  web app's CLI card and again on the setup app's **hand-off screen** (its own
  step, after *Next*, because at the bottom of the harness list nobody read it).
- In variation 2, the tool's own site has **one button** and never mentions us.
  They download it, open it from Safari's download list, drag it to Applications,
  and sign in to *its* account. Nothing hands them back. **Whether they remember
  to return to EAI Setup is the measurement** — don't add a button that does it
  for them; that was tried and removed.

## Traps, all of which have bitten

1. **`[hidden]` loses to `display:`.** Every component in `assets/signup.css`
   sets `display: flex` somewhere, which outranks the `hidden` attribute — so a
   "hidden" screen renders anyway. There are scoped `[hidden] { display: none
   !important }` rules for `#winSetup`, `.nb`, `.hs-page` and `#winHarnessApp`.
   Add one for any new block.
2. **`.win` is the desktop shell's class.** `desktop.js` walks every `.win` and
   binds a drag handler to its `[data-drag]` title bar. A decorative element
   called `win` threw and killed the rest of `desktop.js` — which is why a
   download once "broke the UI". The video's fake window is `.vwin` for exactly
   this reason.
3. **The address bar comes from `<meta name="eai-url">`.** `page.js` reports it
   on `DOMContentLoaded`, which is *after* an inline script at the end of body —
   so posting a nav message by hand gets overwritten. Change the meta tag
   instead (`harness.html` does).
4. **Focusing a button scrolls its panel.** `finish()` used to focus the primary
   action and the harness screen opened scrolled to the bottom. It resets scroll
   to top instead.
5. **The browser caches hard.** When a change doesn't show, it's usually the
   iframe's stylesheet, not your edit. Bust with a query param.

## Where things live

| Thing | File |
| --- | --- |
| The desktop, windows, dock, download plumbing | `assets/desktop.js` (shared — changes hit every flow) |
| This journey's logic | `assets/signup.js` |
| This journey's styles | `assets/signup.css` |
| The video, mounted in place | `assets/eai-video.js` |
| The web pages | `signup/pages/` |
| The setup app + harness app windows | `signup/index.html` |

`signup/index.html` holds three apps' worth of markup: EAI Setup (`#winSetup`,
screens via `data-screen`), the harness's own app (`#winHarnessApp`, screens via
`data-ha`), and the shell's chrome.

## Conventions worth keeping

- **One prototype, one URL.** `/install-4` has been in front of people, so it
  doesn't change. `/signup` started as a copy of it. The next iteration is a new
  folder, not an edit to this one.
- Shared `assets/` changes affect every flow — plumbing only. One known bug is
  fixed *only* in this flow on purpose: `#winSetup .eai-acts` sets
  `display:flex`, so **Create app** shows before it should in `/install-4`.
- ⌘K in any flow opens the moderator panel: jump to a page, switch variation,
  trigger error states.
- Every page carries `noindex`. The pricing and plans are invented.

## Still open

- **The video is drawn, not recorded.** Survives these tools redesigning their
  chrome; wrong if people will judge the content rather than click it.
- **Nothing is timed.** We capture whether `/eai` was typed, not how long it took
  or what was typed first. Worth adding for unmoderated sessions.
- **The player pushed "Or install it yourself" below the fold** on the CLI tab.
  That was the trade for a video nobody can miss.
- `.context/todos.md` in the working copy has the full checklist with everything
  ticked, if that workspace still exists.
