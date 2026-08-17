# EAI onboarding prototypes

Clickable HTML prototypes of the "get started" journeys, built for user testing.
Static files only: no build step, no framework, no data, nothing wired to a real
service.

**This is a playground, not production.** It lives in its own repo precisely so
nobody has to think about the website when changing it. It started life inside
`com.enterpriseaigroup` and was moved out with its history intact.

**Run locally:** any static server pointed at this folder, e.g.

```bash
npx serve .                 # then http://localhost:3000/cli
python3 -m http.server 8899 # then http://localhost:8899/cli
```

**Edit:** everything is plain HTML, CSS and JS. Open a file, change it, reload.
The CLI prototype — the one currently being worked on — is `assets/cli.js`, a
list of steps at the top of the file and one async function each.

## Flows

Each flow is a self-contained journey a tester can be handed as one URL and
nothing else. Most start at a mocked Google search; the CLI prototype starts
later, on a machine where EAI Setup is already installed.

| Flow | Path | Test URL | State |
| --- | --- | --- | --- |
| **npx flow** | `npx/` | [/npx](https://eai-website.github.io/prototypes/npx) | Complete: search → deployed app |
| **eai setup app flow** | `setup/` | [/setup](https://eai-website.github.io/prototypes/setup) | Search → download → Applications → sign-in |
| **EAI CLI** | `cli/` | [/cli](https://eai-website.github.io/prototypes/cli) | In progress — the CLI experience |
| **App install** | `install/` | [/install](https://eai-website.github.io/prototypes/install) | In progress — getting the app onto the machine |
| **Chat in the app** | `chat/` | [/chat](https://eai-website.github.io/prototypes/chat) | In progress — `/install`, but you never leave the app |
| **App as the agent** | `agent/` | [/agent](https://eai-website.github.io/prototypes/agent) | In progress — the spike: setup only, done inside the chat |

`index.html` at the root is an internal launch pad, grouping the flows by the
experiment they belong to. Finished experiments carry a Completed badge and
their working flows drop off the pad — the URLs keep working. Testers don't need it — give them the flow's URL
directly.

They all run on the same fake macOS desktop (`assets/desktop.*`).

### One prototype, one URL

A prototype that has been in front of people is evidence, so it keeps its URL
and stops changing. New thinking goes in a new folder rather than on top of an
old one, and every version stays clickable at its own address.

What that means in practice:

- **Shared, and reused freely** — `assets/`: the desktop, the app skins, the
  terminal runtime, the CSS. Changing these changes every flow, so changes here
  are the plumbing kind, not the design kind.
- **Owned by one flow, and copied to start the next** — its `index.html`, its
  `pages/`, its journey file. `cli/pages/` began as a copy of `npx/pages/`, and
  the two now go their own ways.

To start the next iteration, copy the folder — `cli/` → `cli-2/`, plus a journey
file beside `assets/cli.js` — and add a card to the launch pad. The old URL
carries on working. `install/` began exactly this way, as a copy of `setup/`.

## Hosting

**Live:** <https://eai-website.github.io/prototypes/> — [/npx](https://eai-website.github.io/prototypes/npx), [/setup](https://eai-website.github.io/prototypes/setup), [/cli](https://eai-website.github.io/prototypes/cli), [/install](https://eai-website.github.io/prototypes/install), [/chat](https://eai-website.github.io/prototypes/chat) and [/agent](https://eai-website.github.io/prototypes/agent)

GitHub Pages, published by `.github/workflows/pages.yml` on every push to
`main`. No build step: the repo root is the site.

Deliberately **not** on an `enterpriseaigroup.com` subdomain. These pages carry
invented pricing, plan tiers and a mocked sign-in; `noindex` keeps them out of
search, but it doesn't stop a participant sharing the link. On the org's own
github.io they read as what they are. Every page carries
`<meta name="robots" content="noindex, nofollow">`.

If a nicer URL is ever needed, DNS for enterpriseaigroup.com is on Azure DNS and
`prototypes` is unused — one CNAME to `eai-website.github.io` would do it. Worth
the brand trade-off only if these are shown to customers rather than test
participants.

**There are no preview deployments**, so test locally before merging.

## npx flow

Everything happens on a fake macOS desktop so the hand-off between website and
terminal is visible rather than implied: a Safari window and your CLI app on one
machine, plus a dock to switch between them.

The CLI runs in **Terminal, VS Code, Claude or GitHub Copilot** — pick one from
the dock and the same journey runs inside that app's chrome. Switch apps
mid-flow and it carries on exactly where it was, which is the point: same
platform, whichever agent you already use.

There's no prototype toolbar, step rail or hint overlay — it should read as a
real machine. The shortcut is documented on the launch pad instead: press **⌘K**
(⌃K on Windows) anywhere, including inside the browser window, for a side panel
with "Back to launch pad", "Restart this flow" and an app switcher; `esc` closes
it. The Apple menu carries the same two links.

1. Google results — three EAI results (homepage, configurator, CLI)
2. EAI site, press **Get Started** → copy `npx install eai`
3. Open Terminal from the dock, paste, install
4. **Sign in by pressing enter** → browser opens the sign-in page
5. Choose a plan (Builder, free preview)
6. Name your builder workspace → back in the terminal, "sign in successful"
7. `/EAI <what you want to build>` → two clarifying questions
8. Fastest possible prototype → approve or feed back (loops)
9. AI builds the app → approve or feed back (loops)
10. Admin screens → tests → deploy

Clicking empty terminal space fast-forwards output. The other dock apps (Mail,
Messages, Calendar, Notes, Photos, System Settings, Trash) are set dressing and
say so when clicked. EAI Setup opens as a window on the same desktop.

## eai setup app flow

1. Google results → the EAI site
2. **Download the EAI app** — the icon flies into the Downloads stack, which
   badges, and the disk image opens
3. Drag **EAI Setup** onto **Applications** (or double-click it) — the app lands
   in the dock
4. Open it from the dock: "Sign in to EAI", prerequisites already green

That's as far as the flow is defined. The two buttons in the app say so when
clicked; the rest of the setup UX comes next.

## EAI CLI

Where the CLI experience gets designed. The setup app is the route we're going
with, so this flow starts from it — already installed, already in the dock:

1. **EAI Setup is open on the desktop.** No search, no download, no `npx`.
   Getting the app onto the machine is `/setup`'s job and it's already answered
2. Sign in — the browser opens for it, then closes again
3. Name the app, choose a parent folder, and **pick your coding app** — Copilot,
   Claude, Terminal, VS Code, Codex or Gemini
4. It initialises, then hands over: your coding app opens on the new project
5. **The CLI experience** — everything from here is what this prototype is for

Seen the setup app once? **⌘K → Skip setup** goes straight to step 5 with a
default project. Sitting through four screens to reach the part being designed
gets old fast.

The hand-off names the project everywhere — window title, sidebar, breadcrumb —
in whichever app you chose, and switching apps from the dock mid-flow keeps the
transcript and re-labels the new one.

`assets/cli-setup.js` is the setup app, `assets/cli.js` is the CLI: a `STEPS`
list at the top and one async function per step. `cliProject` carries the name,
path and chosen app across the hand-off.

The CLI half is still the npx journey's content — describe, clarify, prototype,
build, admin, test, deploy. That's the placeholder being replaced.

## App install

Getting EAI onto the machine, end to end:

1. **The marketing site** — not a search. Whether people can find EAI is the
   onboarding study's question and it's already answered
2. **The install button** — the download flies into the dock and the disk
   image opens
3. **Drag to Applications** (or double-click) — the app lands in the dock
4. **Open it and set up** — sign in through the browser, name the app, choose
   a parent folder, initialise
5. **Ready to build** — your coding app opens on the new project, at the
   prompt. `/cli` picks up from here

**The download doesn't open itself.** It lands in Downloads and badges, and
you open the disk image from the stack — Safari hasn't opened safe files by
default for years, and whether people make that step unaided is the thing worth
testing rather than papering over.

**The disk image opens with a sequence** rather than appearing fully formed:
the wordmark fades in and rises, lifts from the middle of the window into a
title, and only then do the two icons and the hint come up underneath. Beats
live in `BEATS` at the top of the sequence in `assets/install.js`.

**The app that follows is skinned to match** — white surface, content sitting
directly on it instead of inside a tinted card, no app header, no legal footer,
one black primary per screen. The flow is untouched: sign-in still goes out to
the browser, the folder chooser still opens, the hand-off still happens. All of
it is `assets/install.css`, scoped to `.dmg-anim` and `#winSetup`, so `/setup`
keeps the look it was tested on. **⌘K → Replay the intro** re-runs the opening.
`prefers-reduced-motion` skips to the end state.

`assets/install.js` is the journey. It began as a copy of the setup-app study,
so nothing is improved yet — this is the baseline, on a URL that can change
without touching `/setup`. The study's "experiment done" card is gone, since
this one is for design rather than testing.

**Variations.** The point of this one is to vary it. Copy the folder and its
journey file:

```bash
cp -r install install-2 && cp assets/install.js assets/install-2.js
# then point install-2/index.html at ../assets/install-2.js
```

Add a card to the "Improving the app install" row and both are clickable, side
by side, each on its own URL.

## Chat in the app

The pair to `/install`, and the reason both exist. They install the same app
the same way and sign you in the same way; they part company on the question
underneath all of this — **where does the building actually happen?**

- **A — hand off** (`/install`): setup finishes, GitHub Copilot opens on the
  new project, and you talk to EAI there. The EAI app's job is done.
- **B — stay** (`/chat`): setup finishes and the app opens a chat. Building
  happens there. Moving the session to Copilot, Claude, Codex, VS Code, Gemini
  or Terminal is offered, kept one click away, and never required.

Everything before "signed in and initialised" is deliberately identical, down
to the copy: if the two differed earlier, the fork wouldn't be what people were
reacting to. Exactly one setup field changes — "Your coding app" becomes
"Where you'll build", which has nothing to choose.

What B does that A can't:

- **No slash command and nothing new to learn.** The app opens talking. There's
  no `/eai` to discover, because there's no other program to address.
- **Previews open beside the chat**, not in Safari, so approving what you're
  looking at doesn't cost you the question you were asked. Safari is still one
  button away in the preview bar.
- **The dock icon changes meaning.** Once the chat opens, EAI in the dock is
  the chat, because that's what the app is now.

**Moving mirrors, it doesn't hand over.** Pick an app from "Open in…" and the
transcript so far is written into it, everything after that lands in both, and
its prompt answers whatever the chat is waiting on. The chat window stays open
behind it. That's the claim being tested — that leaving is free and so is
coming back — so the prototype has to make leaving genuinely reversible rather
than just say it is. Move mid-sentence and answer from the other app: the
conversation carries on in both.

**⌘K → Straight to the chat** skips the download, the drag and the four setup
screens. Everything after sign-in is the part being designed, and reaching it
the long way gets old on the tenth run. ⌘K also lists the coding apps and a way
back, for when a moved session is covering the chat.

`assets/chat.js` is the journey: sections 1&ndash;4 are `/install`'s shared
half, section 5 is the chat and its runtime (`say`, `me`, `ask`, `pick`,
`card`, `result` — term-runtime.js's shape in a chat's terms), section 6 is
moving. `assets/chat.css` owns the chat window and nothing else; the disk image
and setup dialog are still `install.css`.

The chat's content is `/cli`'s journey on purpose — describe, clarify,
prototype, build, admin, test, deploy. Same substance, different container, so
what's being compared is the container.

## App as the agent — the spike

The two scenarios being tested are **what the app is**:

1. **EAI Setup** (`/install`) — the six steps the real installer runs, ending
   in a choice of AI app. The app's job is to prepare the machine and hand you
   over.
2. **A coding agent** (`/chat`) — many of the same steps, but you finish in a
   chat inside the app instead of in Copilot.

`/agent` is the spike inside scenario 2: **if the app is the agent, how much of
the setup can stop being the user's problem?** The real wizard
(`eai-installer`, `ui/index.html`) has six steps. Here five of them are gone
from the user's path:

| Real step | Here | Why |
| --- | --- | --- |
| 0 · Welcome | gone | Folded into the sign-in screen. Nothing to promise that being one click from useful doesn't say better |
| 1 · Detect this Mac | gone | Nothing to detect — the app brings its own runtime |
| 2 · Install what's missing | **deferred** | Moved to the moment you ask for your own editor, which is the only thing that needs Git and Node |
| 3 · Sign in | **kept** | Only a person can do this. It's the one screen in the app |
| 4 · Workspace, app, name, folder | answered | Decided from your first sentence and shown with an undo, rather than asked as a form |
| 5 · Choose how to work with AI | gone | You're already in it. The choice becomes "Open in…" — available whenever, needed never |

So the user does two things: **sign in, and say what they want.**

**Scope: setup only.** The prototype ends at "ready" — the app installed, signed
in, set up, named and created. Building it is a different prototype, and mixing
the two made this one impossible to read. Setup runs *before* the brief rather
than underneath it, because walking into a chat that isn't ready yet is the
thing being designed out.

**Deferring steps 1–2 is the whole bet.** Most of what goes wrong in a real
install goes wrong there — the macOS password dialog, Windows PATH not
refreshing after winget, an old Node already on PATH, fixed timeouts firing on
a slow corporate link. None of it can fail for someone who never needed those
tools. Ask for Copilot and it happens then, for a reason you just chose, on a
machine that has already given you something.

**Hidden is not secret.** Every decision the agent makes lands in the
transcript as a row with the change still on it — Switch workspace, Rename,
Change folder — and renaming re-labels the project everywhere, live. This is
the "Ask agent" idea from Conductor's own setup panel: don't make someone fill
in a form to describe what a competent agent could work out, but show the
working and leave the undo where the decision is.

**⌘K → "What did we skip?"** prints the six steps and what happened to each,
so the spike can be read from inside the prototype rather than from this file.

Two things it deliberately keeps: the download and drag-to-install, because
getting the app onto the machine is the one thing no amount of agency can hide;
and the folder chooser, which nobody is sent to but "Change" still opens.

`assets/agent.js` shares `/chat`'s install section and chat runtime verbatim;
what differs is the middle. `assets/chat.css` is now shared by both chat
prototypes.

## What the prototype won't fake

A web page can't bounce a dock icon or launch an app, so copying a command
does nothing on the desktop beyond the page's own "Copied" confirmation — you
open the app yourself. Whatever you copy is what pastes: copy the setup prompt
from the docs and that exact prompt lands in Claude/Codex/Terminal, not a
different command.

## Layout

```
assets/                shared by every flow
  proto.css        page styling (site, Google, terminal, admin, plans…)
  desktop.css      the fake OS: wallpaper, windows, dock, app skins
  desktop.js       windows, dock, browser, app skins, page ↔ app message bus
  icons.js         the dock's app icons, drawn on Apple's icon grid
  term-runtime.js  what a journey prints and asks with: out, ask, choose…
  page.js          loaded by every page inside the browser window
  wallpaper.jpg
  terminal.js      the npx journey
  cli-setup.js     the CLI flow's starting point: EAI Setup, already installed
  cli.js           the CLI journey, from the hand-off onwards
  setup.js         the setup-app study: disk image, drag to Applications
  install.js       the app-install prototype — setup.js's mutable copy,
                   one file per variation from here
  install.css      /install's own styles: the disk-image opening sequence
  chat.js          /chat: the same install, then the chat that replaces
                   the hand-off, and the optional move out of it
  chat.css         the chat window, scoped to #winChat — shared by /chat
                   and /agent, which differ in what comes before it
  agent.js         /agent: the spike. Sign in, then everything else is
                   the agent's problem
npx/                   the onboarding study — finished, leave it alone
  index.html       desktop shell for the npx flow
  pages/           what the browser window shows
setup/                 the setup-app study — finished, leave it alone
  index.html
  pages/
cli/                   the CLI prototype — the CLI experience
  index.html       desktop with EAI Setup installed and open
  pages/
install/               app install — marketing site to ready-to-build
  index.html
  pages/
chat/                  the same, but the building happens in the app
  index.html       adds the chat window; setup and disk image are /install's
  pages/           /install's, plus the preview and admin screens the
                   chat shows in its own pane
agent/                 the spike: the app is the agent, so the setup goes
  index.html       one screen before the chat, and it's the sign-in
  pages/
```

## Related

- [`OPEN-SOURCE.md`](./OPEN-SOURCE.md) — whether the desktop shell could be
  released for other people to build on, what is in the way, and what it would
  cost. Short version: the shell is worth releasing, this repo isn't the thing
  to release, and two real Apple files need replacing either way.
- [`experiments/`](./experiments) — the plan, the results and the decision for
  the study these prototypes were built for. Mirrored from Notion (EAI Product
  Management → Experiments → EAI CLI set up), which is the source of truth.

## Editing

Work on the CLI happens in `assets/cli.js`. It opens with `STEPS`, the running
order, and everything below is one of those steps: an async function that
prints, asks, and hands off to the browser. Reorder the list, add a step, or
comment one out — nothing else has to change. What each step learns (workspace
name, country, the brief) goes on `state` for later steps to read.

Steps talk to the user through `assets/term-runtime.js` — `out`, `gap`, `tick`,
`banner`, `progress`, `confirmKey`, `ask`, `choose`, `inBrowser`. Pages inside
the browser report back with `data-eai-action="..."`, which is what
`inBrowser()` waits for. `assets/terminal.js` is the same shape for the npx
flow, but that one is finished.

App skins live in the `HOSTS` map in `assets/desktop.js` — each is a chunk of
HTML containing a `.term-slot`, which the shared terminal element is moved into.
Add an app by adding an entry there plus a dock icon in the flow's `index.html`.

## The dock's icons

`assets/icons.js` draws all of them, and a flow asks for one by name:

```html
<div class="item" data-app="browser">
  <span class="tip">Safari</span>
  <span class="ico" data-icon="safari"></span>
  <span class="dot"></span>
</div>
```

They used to be inline SVG in each flow's `index.html`, six copies of the same
seventeen icons, so a fix had to be made six times and usually wasn't.

**They are drawn on Apple's icon grid rather than approximated.** On the 1024
grid a macOS icon is an 824-wide tile, centred, with a 185.4 corner — and that
corner is a continuous curve, not a circular arc, which is why a `border-radius`
version always reads slightly wrong however carefully the radius is picked.
`SQUIRCLE` at the top of the file is that shape, generated at Apple's corner
smoothing.

The inset is as much of the tell as the curve. A real icon sits inside a larger
transparent tile — that padding is what gives a dock its air, and it is why
Trash and Downloads can be a bin and a folder rather than pictures of a bin and
a folder on a coloured square. Because the transparency is inside the artwork,
the shadow follows the alpha: `.dock .ico` uses `filter: drop-shadow()`, not a
`box-shadow`, and the icons sit at `gap: 0` because each one brings its own
spacing.

Nothing here is an Apple file. Every icon is an original drawing, which is
deliberate — see [OPEN-SOURCE.md](./OPEN-SOURCE.md).
