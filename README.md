# Playground — onboarding prototypes

Clickable HTML prototypes of the "get started" journeys, built for user testing.
Static files only: no build step, no framework, no data, nothing wired to a real
service.

**This directory is deliberately outside `public/`.** The production deploy
copies `public/` into the Next standalone bundle, so anything in there ships to
enterpriseaigroup.com. Nothing here is part of the website build — it is hosted
separately (see *Hosting* below).

**Run locally:** any static server pointed at this folder, e.g.

```bash
npx serve playground        # then http://localhost:3000/npx
python3 -m http.server 8899 --directory playground
```

## Flows

Each flow is a self-contained journey that starts at step 1 — a mocked Google
search — so a tester can be handed one URL and nothing else.

| Flow | Path | Test URL | State |
| --- | --- | --- | --- |
| **npx flow** | `npx/` | `/npx` | Complete: search → deployed app |
| **eai setup app flow** | `setup/` | `/setup` | Search → download → Applications → sign-in |

`index.html` at the root is an internal launch pad listing both. Testers don't
need it — give them `/npx` or `/setup` directly.

Both run on the same fake macOS desktop (`assets/desktop.*`).

## Hosting

Requirements: publicly reachable, isolated from production, cheap, disposable.

**Recommended — a separate Vercel project pointed at this folder.** It is a
static site with no build, so it costs nothing on the Hobby tier and cannot
touch the Azure production deploy.

1. Vercel → *Add New… → Project* → import `EAI-Website/com.enterpriseaigroup`
2. Set **Root Directory** to `playground`
3. Framework preset: **Other**. No build command, output directory `.`
4. Deploy. `vercel.json` here already handles `/npx` and `/setup`, and sends
   `X-Robots-Tag: noindex` so the prototypes never get indexed.

Or from the CLI:

```bash
cd playground
vercel link          # create/choose the project (do NOT link the repo root)
vercel deploy --prod
```

Alternatives considered:

- **Azure Static Web Apps** — matches the existing Azure estate and could be
  provisioned from `infra/`, but needs a Bicep change, a deploy workflow and
  service-principal credentials. Worth it only if this outlives user testing.
- **GitHub Pages** — free, but this repo is internal, and Pages on non-public
  repos requires GitHub Enterprise Cloud.
- **Serving from the existing Next site** (`/prototypes/...`) — rejected: it
  would publish the prototypes on the production domain.

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

## What the prototype won't fake

A web page can't bounce a dock icon or launch an app, so copying a command
does nothing on the desktop beyond the page's own "Copied" confirmation — you
open the app yourself. Whatever you copy is what pastes: copy the setup prompt
from the docs and that exact prompt lands in Claude/Codex/Terminal, not a
different command.

## Layout

```
assets/
  proto.css      page styling (site, Google, terminal, admin, plans…)
  desktop.css    the fake OS: wallpaper, windows, dock, app skins
  desktop.js     windows, dock, browser, app skins, page ↔ app message bus
  terminal.js    the npx journey — one async function, top of file
  setup.js       the setup-app flow: disk image, drag to Applications
  page.js        loaded by every page inside the browser window
  wallpaper.jpg
npx/
  index.html     desktop shell for the npx flow
  pages/         what the browser window shows
setup-app/
  index.html     desktop shell for the setup app flow
  pages/
```

## Editing

The whole npx script lives in `journey()` at the top of `assets/terminal.js`.
Reorder or reword steps there; the helpers below it (`out`, `ask`, `choose`,
`progress`, `inBrowser`) don't need touching. Pages inside the browser report
back with `data-eai-action="..."`, which is what `inBrowser()` waits for.

App skins live in the `HOSTS` map in `assets/desktop.js` — each is a chunk of
HTML containing a `.term-slot`, which the shared terminal element is moved into.
Add an app by adding an entry there plus a dock icon in `npx/index.html`.
