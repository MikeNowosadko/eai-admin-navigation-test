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
nothing else. The two studies start at a mocked Google search; the CLI
prototype starts later, on a machine where EAI Setup is already installed.

| Flow | Path | Test URL | State |
| --- | --- | --- | --- |
| **npx flow** | `npx/` | [/npx](https://eai-website.github.io/prototypes/npx) | Complete: search → deployed app |
| **eai setup app flow** | `setup/` | [/setup](https://eai-website.github.io/prototypes/setup) | Search → download → Applications → sign-in |
| **EAI CLI** | `cli/` | [/cli](https://eai-website.github.io/prototypes/cli) | In progress — the one being worked on |

`index.html` at the root is an internal launch pad listing all three. Testers
don't need it — give them the flow's URL directly.

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
carries on working.

## Hosting

**Live:** <https://eai-website.github.io/prototypes/> — [/npx](https://eai-website.github.io/prototypes/npx), [/setup](https://eai-website.github.io/prototypes/setup) and [/cli](https://eai-website.github.io/prototypes/cli)

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
  term-runtime.js  what a journey prints and asks with: out, ask, choose…
  page.js          loaded by every page inside the browser window
  wallpaper.jpg
  terminal.js      the npx journey
  cli-setup.js     the CLI flow's starting point: EAI Setup, already installed
  cli.js           the CLI journey, from the hand-off onwards
  setup.js         the setup-app flow: disk image, drag to Applications
npx/                   the onboarding study — finished, leave it alone
  index.html       desktop shell for the npx flow
  pages/           what the browser window shows
setup/                 the setup-app study — finished, leave it alone
  index.html
  pages/
cli/                   the CLI prototype — this is the one that changes
  index.html       desktop with EAI Setup installed and open
  pages/
```

## Related

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
