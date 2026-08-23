# EAI onboarding prototypes

Clickable HTML prototypes of the "get started" journeys, built for user testing.
Static files only: no build step, no framework, no data, nothing wired to a real
service.

**This is a playground, not production.** It lives in its own repo precisely so
nobody has to think about the website when changing it. It started life inside
`com.enterpriseaigroup` and was moved out with its history intact.

**Run locally:**

```bash
python3 serve.py 8899       # then http://localhost:8899/cli
npx serve .                 # also fine
```

**Use one of those two, not `python3 -m http.server`.** It sends no
`Cache-Control` at all, and with no directive a browser invents one — usually
treating a file as fresh for about 10% of its age. You edit CSS, reload, and the
markup and JavaScript update while the stylesheet quietly does not, so half your
change appears and you go hunting for a bug in the half that didn't. `serve.py`
is the same static server with `no-store` on everything; `npx serve` sends
`must-revalidate`, which has the same effect.

It bites [`/states`](#states--the-one-that-isnt-a-flow) hardest, because that
page fetches `signup/index.html` at runtime and drives it by id — a cached copy
of the app plus current state code isn't a stale page, it's a broken one.

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
| **Simpler setup form** | `install-2/` | [/install-2](https://eai-website.github.io/prototypes/install-2) | In progress — `/install` with the prerequisites hidden and one question per screen |
| **One-page setup form** | `install-3/` | [/install-3](https://eai-website.github.io/prototypes/install-3) | In progress — `/install-2` again, on one page with no Continue |
| **EAI Setup + external harness** | `install-4/` | [/install-4](https://eai-website.github.io/prototypes/install-4) | **Current** — the fourth pass at this flow |
| **Sign up, then download** | `signup/` | [/signup](https://eai-website.github.io/prototypes/signup) | New — account first, download from inside the product |
| ↳ *harness installed* | `signup/` | [/signup?scenario=installed](https://eai-website.github.io/prototypes/signup?scenario=installed) | Same flow, Claude Code already on the Mac |
| ↳ *nothing installed* | `signup/` | [/signup?scenario=none](https://eai-website.github.io/prototypes/signup?scenario=none) | Same flow, out to claude.com and back first |
| **Version history** | `history/` | [/history](https://eai-website.github.io/prototypes/history) | The four passes side by side, with what each one changed |
| **EAI Setup — states** | `states/` | [/states](https://eai-website.github.io/prototypes/states) | Not a flow — every state of the setup app on one page, for reviewing |
| **Roadmap — general** | `roadmap/timetable.html` | [/roadmap/timetable.html](https://eai-website.github.io/prototypes/roadmap/timetable.html) | **In use** — three teams, four quarters, interlocks |
| **Roadmap — usability / CLI** | `roadmap/funnel.html` | [/roadmap/funnel.html](https://eai-website.github.io/prototypes/roadmap/funnel.html) | **In use** — a funnel band's problem, outcome, solution |
| ↳ *tree* | `roadmap/index.html` | [/roadmap](https://eai-website.github.io/prototypes/roadmap) | Earlier pass — what stands on what |
| ↳ *story map* | `roadmap/story-map.html` | [/roadmap/story-map.html](https://eai-website.github.io/prototypes/roadmap/story-map.html) | Earlier pass — sliced by release |

`index.html` at the root is an internal launch pad, grouping the flows by the
experiment they belong to. Finished experiments carry a Completed badge and
their working flows drop off the pad — the URLs keep working.

**The pad shows what's worth handing to someone, not everything that exists.**
The setup form's earlier passes are iterations rather than options, so they came
off it; `/history` is where they live now, and its footer lists whatever else is
still up but no longer on the pad. Testers don't need it — give them the flow's URL
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

### `/states` — the one that isn't a flow

Every flow above can only be read forwards, one state at a time, which is right
for a tester and wrong for a review. [`/states`](https://eai-website.github.io/prototypes/states)
is the setup app with the journey taken off it: a rail of controls on the left,
the app on the right, and every screen and every failure one click apart. It
starts before the app exists, at the disk image.

It answers the questions a flow makes expensive — do the seven error messages
sound like they were written by one person, does every failure say what to do
next, does the last screen still make sense on a Mac with nothing installed.

Two rules it follows, both of which are the point:

- **It is not a copy.** `#winSetup` is `fetch`ed out of `signup/index.html` when
  the page loads, so there is no second sign-in screen in this repo to keep in
  step. Change `/signup`, reload `/states`, and it is already there. The fetch is
  `cache: 'no-store'` — a cached response would quietly make it a copy after all,
  and driving yesterday's markup with today's state code fails as a missing
  element somewhere far from the cause. The cost is that this one page needs a
  static server: a browser won't fetch a sibling over `file://`.

**If it won't come up**, the panel names which half broke. *"This page needs a
static server"* means the app never arrived — no server, wrong folder. *"The app
loaded, but this page couldn't drive it"* means the opposite: the server is fine
and `/states` reached for an element `/signup` no longer has, so it names the id.
Full stack in the console. If you've just changed the setup app and see the
second one, that element is where to look — and hard-reload once (⇧⌘R) so the
browser picks up the current `states.js` too.
- **State is applied in one direction.** `paint()` resets the window and applies
  the current state from scratch, every time. `⌘K` in the flows has to know how
  to undo each failure it caused; nothing here does, because nothing is ever
  half-applied.

**Sign-in's browser hand-off has a failure now.** "Signed in" is the only screen
reporting on something the app doesn't control — it opens a browser and waits on
a tab that can be closed, expire, or have its callback eaten by a proxy. It had
no face for that, so pressing "Sign in with browser" and having nothing happen
was a real state with no design. It now turns over: the tick goes red, and the
screen offers **Try again** plus **Copy the sign-in link** — the second for when
retrying does the same nothing twice, which is why every CLI that borrows your
browser prints the URL. It's in `/signup` too, under ⌘K.

**Sign-in carries one status, with two faces** — a tick saying the Mac is ready,
or a row for each thing in the way. Never both. It used to have a second box
under the tick, which let the screen say "This Mac is ready" in green directly
above a red "Can't reach api.eai.com": ready and unable to proceed, at once. The
prerequisite failure was two boxes for one problem. The second box is gone; a
failure takes the tick's place.

**Failures combine.** Sign-in's two are checkboxes, not a menu of one: the Mac
that wouldn't let Git install is usually the Mac behind the proxy blocking
`api.eai.com`, and two problems are two rows in that one list. Where two genuinely can't co-occur the rail shows radios instead — Set
up's pair, because with no workspace there is no name field for a name to be
taken in.

**The disk image is in there too**, as the first screen — the downloaded `.dmg`,
opened. It isn't the app: it's a Finder window with our wordmark in it, and the
whole design is making one drag obvious. Its *Moment* control holds each beat
still — opening, ready to drag, over Applications, copied — which is the only way
to look at a sequence that is over in 1.3 seconds. `/states` lifts both `#winSetup`
and `#winDmg` and shows one at a time; the frame takes each window's own height
(900×566 here, 900×720 for the app), because two different windows being two
different shapes isn't the resizing we removed.

**Setup is four states, not one.** It reveals downwards — answer a question, the
next appears — so "Set up" means any of four shapes. The rail's *Answered so far*
steps through them, named as Paper names them (*Workspace only → Template appears
→ Name appears → Folder appears — ready*), including where it starts: the
workspace is already answered on arrival, because there's only one and a question
with one possible answer isn't a question.

**No numerals, no ticks, no wordmark** — from Paper's `1O24-0` and `1MRJ-0`. The
step badge was doing two jobs and had stopped doing either: as a numeral it
counted questions you can already see all of, and as a tick it reported
"answered" on a step whose answer sits directly underneath it in words. It also
cost a 34px indent, so no heading shared a left edge with anything. The wordmark
went for the same reason — the window's own title bar already says *Enterprise AI
Setup*. Both are overridden in `signup.css`, which only `/signup` and `/states`
load, so `/install-3` and `/install-4` keep the look they were tested with.

**The window is 900 × 720, fixed, for every state.** Measured across the states
the content runs 270px to 844px — sized to fit, the window would grow and shrink
by more than half its own height as you step through, which reads as a page
reflowing rather than an app running. A window is furniture: it's the size it is,
and the content moves inside it. 720 clears everything except the fully-answered
form, which scrolls by ~96px — the one screen whose content is genuinely
accumulating.

Paper's frames are all `height: fit-content`, but that's an artboard convention
(a design tool crops each frame so they compare side by side), not a claim about
the shipped window. Reading it as one is what produced the jumping.

The cost is slack: sign-in has ~360px below it. That's what the bottom rail is
for — action rows are pushed to the far edge, and setup's **Create app** sits
there greyed from the first question rather than appearing at the end. A primary
floating mid-window reads as a small screen in a big box; the same primary on the
rail reads as a frame waiting for you. **Fixed height and anchored actions are one
decision, not two.** Setup now carries Paper's full footer — `‹ Back` at one end,
`Create app ›` at the other, both there from question one. Sign-in keeps its
right-aligned `Retry` / disabled primary, which is what its own frame draws.

Every state has its own URL, so a state can be sent to somebody rather than
described: `?screen=done&mac=none&standard=claude`. `screen` is one of `signin`,
`welcome`, `setup`, `running`, `done`, `handoff`, `built`; `fault` is a
comma-separated list of that screen's failures (`?fault=prereq,network`); `mac`
is `installed`, `none` or `waiting`; `standard` is `none` or `claude`; `stage`
is the position within a staged screen — 1–4 on both the disk image and setup.

Adding a state means adding to `SCREENS` in `assets/states.js` — a name, what the
screen is for, its failures and how each is escaped, and a `paint` for anything
the markup can't say on its own. Adding a *screen* to the setup app means adding
it to `signup/index.html` as usual, then one entry here.

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

## Simpler setup form

`/install-2` is `/install` at a lighter weight, built from the flow on the
board: download → install → log in → workspace → app name → folder → `eai init`
→ `/eai` in your tool. Both end in the same place, so what's being compared is
the shape of the form.

Two changes, pulling in opposite directions on purpose:

- **The prerequisites disappear.** `/install` opens on a checklist of four
  green ticks — four lines of reassurance about work nobody asked to see. Here
  Node, Git, npm and the CLI come down while the app is being copied to
  Applications, and are never mentioned unless one fails. **⌘K → "Prereq
  install failed"** is that screen, and it's the one this variation exists to
  get right: an app you just installed, telling you about a dependency you
  didn't know it had, with one action that fixes it.
- **Every screen asks one thing.** `/install` puts name, folder and coding app
  on a single screen. This asks them one at a time, and adds the **workspace**
  question the real installer has and `/install` skipped.

So: fewer decisions per screen, more screens. That's the trade the two exist to
settle.

`assets/install-2.js` shares `/install`'s install section, folder chooser and
hand-off; the middle is its own.

## One-page setup form

`/install-3` is the second pass at `/install-2`. That one answered "what if the
prerequisites were invisible and every screen asked one thing"; the answer was
fewer decisions per screen, but four Continues to get through them. This keeps
the first half and drops the second.

- **The window opens big enough for the whole form**, with the wordmark centred
  above the title. Growing a window under someone mid-task is worse than
  starting roomy.
- **The check is stated, not listed.** `/install` shows four green ticks;
  `/install-2` showed nothing. Both are wrong the same way — one makes you read
  a report, the other leaves you wondering whether anything happened. So: one
  row saying the Mac is ready, in the component the complex form uses, and the
  full list only when something in it failed. **⌘K → "Prereq install failed"**
  is that expansion.
- **Sign-in lands on a tick** that holds long enough to read, then hands its
  title to *Let's get set up*.
- **Setup is one page.** Choosing a workspace reveals the name field; naming
  reveals the folder; choosing a folder reveals the button. No Continue
  anywhere — a click whose only meaning is "yes, I did just answer that" is a
  click worth deleting. Answered steps stay on screen and stay editable, so
  changing your mind is editing a field rather than walking backwards.
- **Nothing opens itself.** Finishing setup and leaving for your editor are two
  intentions, and the second is the user's, so it gets a success state and one
  big button.
- **Buttons have states** — hover, keyboard focus ring, active — on shadcn's
  model.

The folder step says out loud that a **new folder** is the recommendation, since
the chooser's New Folder button is easy to miss.

`assets/install-3.js` shares `/install-2`'s install section, folder chooser and
hand-off. `assets/install-3.css` is this version's own, scoped to
`#winSetup.i3`.

## Version history

`/history` tells the story of the external-harness flow in one page: the four
passes, what each changed, what it got right and what the next one fixed, with
a screenshot of the key screen from each and a link to run it.

Screens live in `assets/history/`. They're element screenshots of `#winSetup`
rather than the whole desktop, so the versions can be compared without the
wallpaper and dock getting in the way. Re-take them the same way if a version
changes: drive the flow to the screen, hide `.dock`, screenshot the window.

## Roadmap

`/roadmap/funnel.html` and `/roadmap/timetable.html` are the two we are actually
running on. They are not onboarding flows — they are what goes on a screen when
somebody asks where Enterprise AI is going, and both are built to be handed over
as a PDF.

**The general roadmap** is three teams as three lanes against four quarters.
Solid track is laid, dashed is not, and the black couplings are *interlocks* —
two pieces of work that have to land in the same quarter or neither counts.

**The usability roadmap** is the discovery funnel: Knowledge, Setup, Build,
Deploy. Click a band and you get three lists — **problem**, **outcome**,
**solution**. Outcomes carry a score against the bar that applies to everything
on both boards: *8 out of 10 of our ICP complete it unaided*. Scores are shown
moving, `4/10 → 8/10`, so a row states its claim rather than its status.

**Editing is one file per view** — `assets/funnel-data.js` and
`assets/timetable-data.js`. Nothing else needs touching to change the content,
and both carry the copy rule at the top: one line per item, two at the outside.
If a line needs a third it is two items pretending to be one.

**Colour means one thing.** Red is the problem, mint the outcome, blue the
solution — and mint doubles as "clears the bar" wherever a score appears. Nothing
is filled: the hue lives in the section header and the row's outline.

**Day and night.** The whole theme is CSS variables, so `assets/daymode.js`
switches it with one class on `<body>` and remembers the choice. The three
accents are *darkened* for day rather than reused, because the night values fail
contrast on white. An inline script applies the saved theme before first paint,
or you get a flash of the wrong one every time you move between the two views.

**Print is a real output, not an afterthought.** Save as PDF always produces the
day palette regardless of what is on screen, so somebody working at night still
hands over a light document. The funnel prints all four bands, one per page —
`break-before` plus `break-inside: avoid`, and tighter type, so a six-outcome
band clears a single page. The timetable prints as one landscape page.

### Earlier passes

`roadmap/index.html` (the tree) and `roadmap/story-map.html` came first and are
off the launch pad, per *One prototype, one URL* above. The tree answers what
stands on what; the story map slices by release. Both still work, both still
read from `assets/roadmap-data.js`, and neither is being maintained.

## Harness picker

`/install-4` is `/install-3` with the last question done properly. Picking your
AI app is a list of six only if you already have one; three things make it more
than that.

**Some are here and some aren't**, and the app can tell — the CLI reports it
(`eai ai-surfaces`). The list says which, in words, in the trailing lane.

**Most of the missing ones can be installed from here.** Claude Code, Copilot,
Codex and Gemini are npm packages, and setup installed npm a minute ago; the CLI
already has the hook (`eai start --surface <id> --install`). So "go and get this
yourself" is usually a lie. **VS Code is the exception** — an app download, not
a package — and that difference is visible, because it changes what the button
can promise. The verb carries it: *Open* when it's there, *Install and open*
when we can fetch it, *Get* when you have to.

**What we can't do is get you an account.** Installing Claude Code doesn't sign
anyone in to Anthropic. So the line under the button always names what it will
ask for next, and says EAI never sees it. Offering to install something is only
honest if you're equally clear about the half you can't do.

**The workspace gets an opinion.** A workspace can name a preferred harness; it
sorts first and carries the only chip on the screen. Recommending isn't
installing — a managed Mac may forbid it — so a recommended-but-missing tool
goes through the same install affordance as any other.

The download case sends them to the provider's page and then waits, saying the
app is already created and nothing is lost by closing the window. **It resolves
itself**: the moment the harness lands in Applications the waiting box checks,
finds it and enables *Next*. There used to be an **I've installed it — check
again** button there, which asked somebody to tell the app what it could see for
itself, and read as a thing that might say no. What the auto-detect deliberately
does *not* do is raise the setup window or take focus — whether they remember to
come back on their own is the measurement, and pulling them back the instant the
drag finishes would answer it for them.

**⌘K** has the four states worth designing for: the recommended one missing,
nothing installed at all, a download required, and npm refusing to write on a
managed Mac.

## Sign up, then download

`/signup` moves one thing and changes nothing else: **the download is not on the
marketing site any more.** You make an account, name a workspace, land in the
product — and the installer is in there, next to the no-code builder, as the
other way to build. From the disk image onwards it is `/install-4` line for
line, so the two can be run back to back and the only variable is the road in.

**Sign-up doesn't ask about plans.** Everyone starts on Builder, free while it's
in preview, said in one line on the workspace form rather than asked as a
question — pricing a product you haven't seen isn't a decision, it's a toll
booth, and only one of the four plans could be picked anyway. `plans.html`
stays, as somewhere you arrive rather than a step: from the plan card in the
sidebar or the chip beside the page title, with the account and workspace in its
URL so *back* means back. The plan you're on is marked, not sold.

**The web half** (`signup/pages/`):

1. `home.html` — the same homepage, with **Get started free** where the download
   button used to be
2. `signup.html` — one screen for sign-in and sign-up. **Continue with
   Microsoft** is the primary, because that is what EAI's customers are on
3. `ms-signin.html` — Microsoft's own pages, built rather than skipped: email,
   password, number-matching MFA, the consent screen naming EAI, "stay signed
   in". This is the moment EAI hands someone to their own IT department, and it
   is where a sign-up either feels like joining a company tool or being stopped
   by one. **The address is prefilled** — `usertesting@gmail.com`, in every
   field that asks for one: here, the email route on `signup.html`, and the
   harness maker's own sign-in in variation 2. It used to be empty on the
   argument that the account should be theirs, since the rest of the journey
   names it. Testers wouldn't type one, and they were right to hesitate:
   nothing on screen says this Mac is a drawing, so a Microsoft page asking for
   a work address reads as a real request for a real account. A test address
   already in the field answers that before it is asked — press enter. It still
   travels the whole way through, so everything downstream is unchanged
4. `verify.html` — the email-code screen. **Only the email route reaches it**;
   Microsoft has already asserted the address, so there is nothing to confirm.
   It is the most expensive screen in the journey — the one where a person
   leaves for another app — which is the argument for Microsoft leading. **The
   code is filled in on arrival**, with the fake inbox left underneath to say
   where it came from. Copying six digits out of a made-up email is a
   transcription exercise: it tells you whether somebody can retype a number,
   which is not what any of this is for. The screen still exists, because the
   cost of leaving is the argument for Microsoft; what it no longer does is
   charge admission
5. `workspace.html` — the last thing between a person and the product, and now
   the only thing: country, name, captcha, and one line saying the plan is
   Builder. Carried through the query string
6. `app.html` — **the logged-in app**, built to the Paper design (file *No Code
   Builder*, page `homepage/admin`, frame `1GV5-0`): the 264px sidebar, the
   composer, the template cards and the process list, on Geist and the same
   shadcn tokens the setup app uses. Recreated rather than sketched, so the
   proposal is judged against the real product. `new.html` is the no-code
   builder's front door (`src/app/new/new-workflow-chat.tsx` in
   `eainocodebuilder`), so the fork is a real fork
7. The **tab group** — **No code builder | CLI** — is what carries the whole
   experiment. It makes the CLI a way to build rather than a banner: one
   workspace, two ways in, and the choice sits above everything else in the
   sidebar. Without it there is no way for someone to say they'd rather build
   on their own machine, and the download has nowhere honest to live. The tab
   changes the page and the primary action with it — *New process* belongs to
   the builder, and nothing in the CLI tab can be done in a browser
8. The **CLI tab** holds the download, built to the Paper frame on page *EAI
   Setup — card variations + onboarding*: **Get started with the EAI Setup
   app**, then *Download the app* with the only dark button on the page, then
   *Or install yourself* with `npx install eai` in a plain card and a COPY
   chip. It took three passes to get to one heading. It was *Get started
   building with CLI* until a read-through caught it promising a command line —
   the one action is a Mac app, and the CLI is the tab it lives on, not what
   you get. The hero lost its standfirst at the same time: *Whole apps in a
   folder on your Mac* described the experience rather than the choice, and it
   stood between the heading and the only thing to do on the page. Then the two
   remaining titles — *Build on your machine* over a card called *Get started
   with the EAI Setup app* — turned out to be saying the same sentence to each
   other, so the card's name became the page's name and **the card itself went**.
   A card means "one of several", and there is only ever this; the border was
   drawn around the page's entire reason for existing. What was in it is now
   just the page — except that the download and the instruction share one
   border, because downloading the app and typing `/eai` in the window it opens
   are a single act with a wait in the middle, and stacked as two boxes they
   read as two topics. The instruction is headed **Get started with EAI** and
   names the harnesses by kind: *once you have completed the installation of
   the EAI Setup app and you are in your external harness (Codex, Claude etc.),
   type `/eai`*.
   Two ways in, app first, and no black — a terminal-coloured slab reads as an
   advert and would be the loudest object on a page whose job is a quiet
   choice. The four steps came off it: they narrated the installer's journey
   while you were still deciding whether to start it, and the app narrates
   every one of them once it opens. **The card has one state** — it used to
   rewrite itself on Download, which is a second design nobody drew; what a
   download looks like on a Mac is Safari's toolbar filling a progress ring,
   and the shell already does that. COPY tells the shell what was copied, so
   pasting it into the fake terminal later gives back the same string
9. The **plan card** in the sidebar footer is the upgrade path: what you're on,
   what you've used of it (`0 of 2 processes · 1 of 2 users`), and a way to
   `plans.html`. Sign-up stopped asking, so the product has to be where the free
   plan runs out — a card where the evidence is, not a banner

**What it changes in the app**, all of it downstream of signing up first:

- **The workspace stops being a question.** They created one on the way to the
  download and are in exactly one, so step 1 arrives answered — with the name
  they typed — and the form opens on "name your app". The list stays: a second
  workspace makes it a choice again.
- **Sign-in is a confirmation.** The browser session is live, so `signin.html`
  asks *which account, and is it you* rather than for a password. The device
  code stays — it is what says the request came from the app on your own Mac.
- **The app is told who signed up.** The portal posts workspace, country and
  email up to the shell (`action: 'context'`), so the native app shows the
  person's own words back to them.
- **The setup window is one size for the whole journey.** It had no height at
  all: it grew to whatever the current step needed, 362px at sign-in and up to
  the 84vh cap by the folder step. Two things went wrong with that in testing.
  It grew *downwards*, over the dock, so the Downloads folder vanished behind
  it; and once it hit the cap the body scrolled instead, so revealing a step
  pushed the title off the top and the app read as having shifted down. It is
  now a fixed 68% × 84%, sitting clear of the dock, with a little air taken out
  of the form so more of it fits. A real Mac app doesn't resize itself between
  steps. On a desktop shorter than about 900px the two tallest screens still
  scroll — the four-step form runs to ~730px of content, and nothing that tall
  fits above a dock on a 720px screen.

**What it costs** is four screens and a Microsoft round trip before anyone sees
a dmg. That is the trade the experiment is for.

### The round this is set up to run

**We cannot write anything into an external harness.** Claude Code, Copilot,
Codex and the rest are somebody else's window: they open on the folder with an
empty prompt and no idea EAI exists, and nothing we ship can put a banner, a
hint or a chip in there. Everything below follows from taking that seriously.

- **The harness opens empty and typeable.** A bare `❯` and a cursor. Anything
  that isn't `/eai` gets a harness-style *Unknown slash command*; `/eai` prints
  one line and raises a **congratulations** card over the desktop. Whether
  somebody gets there unaided is the whole question.
- **Claude's harness is light.** The shared agent skin in `assets/desktop.js` is
  dark, which is right for Codex and Gemini and wrong for this one — the window
  a tester is handed should look like the app they would actually get. Scoped to
  `#winHost.light` in `signup.css` and switched by `signup.js` on `host-changed`,
  so `/install-3` and `/install-4` keep the dark one they were tested with.
- **So the guidance moves upstream**, and is said twice in the two places we do
  control: the web app's CLI tab, and the setup app. Each carries the same
  alert — *when it opens, type `/eai`* — and the same short animation under it.
  In the web app both sit **inside the install card**, full width, under the
  download: getting the app and typing `/eai` in the window it opens are one act
  with a wait in the middle, not two topics.
- **The video plays in place, at full size, and only in the setup app.** It was
  a 116px thumbnail that opened a lightbox — two bets against itself: a small
  target asks to be skipped, and a modal asks permission to take over the
  screen. It is now the size it will be while it runs, sitting in the page
  looking like something you could press, and the whole frame is the target. It
  came off the web app entirely: there it was a trailer for something two
  screens away, and on the hand-off screen it plays at the last moment it can
  still change what somebody does.
- **In the setup app the hand-off is its own step.** Choosing a tool and being
  told what to do in it are different questions, and the instruction used to sit
  at the bottom of a list of six rows and two alerts — the worst place on the
  screen for the one line that has to survive the trip. So: pick your tool (and
  install it, if it isn't here), press **Next**, and the next screen is nothing
  but the instruction, the video, and one button that names both ends of the
  hand-off — *Open contract-renewals in Claude Code*.
- **Terminal came off the list.** It's built into macOS, it's always "ready",
  and it can run `/eai` without anyone going anywhere — which made it a hole in
  variation 2, where the trip out to a tool's own website is the thing being
  measured. **Whether anyone plays the video is the measurement**; plays,
  finishes and closes land in `window.EAI_VIDEO_LOG` and the console
  (`assets/eai-video.js`). It's drawn rather than recorded, so it survives these
  tools redesigning their chrome.
- **The app opens on the CLI tab**, stripped to the install card and that
  guidance. "What the CLI adds" and "Apps from the CLI" are gone — they were
  reasons to be interested, and this round is past that.
- **The browser opens zoomed**, unlike every other flow, and the CLI page is
  tuned so the card, the instruction and the video all clear the fold at that
  size. A measurement below the fold measures the fold. The green button still
  restores the windowed size.
- **App template is the first field** in setup, before name and folder, as two
  radio cards: **EAI template** (pre-selected, badged *Recommended*) and **Start
  from scratch** — an empty project that says outright there's more to configure
  yourself. It's asked first because it's the only answer that changes what gets
  built; the choice is repeated back in the init rows.
- **Nothing is prefilled at Microsoft.** The address they type there is the
  account for the rest of the journey — workspace owner, device confirmation,
  the name in the native app — so it has to be theirs. `sam.taylor@company.com`
  only appears when somebody jumps straight in from ⌘K.

**Two variations.** Each is a URL a tester can be handed on its own —
`?scenario=installed` and `?scenario=none`, which is what the launch pad's
*Getting to `/eai`* row links to. The scenario is applied at load, so the
machine's state is true from the first second rather than arranged behind them
at the end, and it becomes the baseline that ⌘K's *back to the happy path*
returns to. Both are still switchable mid-run from ⌘K, which marks whichever
one is live.

1. **A harness is installed.** Claude Code is on the Mac. Pick it, open it, type
   the thing.
2. **Nothing is installed.** Every row reads *not installed*, the button becomes
   **Get Claude Code**, and it opens the tool's own product page (`harness.html`,
   one page for all of them via the query string) — which has exactly one button
   on it, **Download for macOS**, and never mentions us again.

   From there it happens where it really happens, on the machine: the file
   arrives in Safari's download list above `EAI-Setup.dmg`, opening it mounts a
   disk image with the app to drag to Applications, and the app then runs its
   own welcome and its own **Sign In** — Google, or an email address. Then it
   opens **as itself**: sidebar, empty recents, the account in the footer and a
   prompt you can type in, in light. It used to end on a centred "You're signed
   in" card with a picture of a chat box under it — a dialog with nothing to
   press, at the moment a person is deciding what to do next. Nothing in any of
   it has heard of Enterprise AI.

   **That is the measurement.** An earlier version ended with a button reading
   *Open EAI Setup*, which is both a lie — Anthropic's installer would never say
   that — and a way of answering the only question being asked: *do they
   remember to come back?* EAI Setup sits behind that window the whole time,
   and by then it has already found the harness and is ready to carry on.

The administrator-chose-one case came off the screen: these are new users
signing themselves up, so there is nobody to have chosen. Terminal stays in the
list because macOS ships it — it is also, deliberately noted, the one way a
sharp participant can dodge variation 2's trip entirely.

`assets/signup.js` is `/install-4`'s journey with those three changes;
`assets/signup.css` is the web half only. Two bugs are fixed there and left
alone elsewhere:

- `#winSetup .eai-acts` sets `display: flex`, which outranks the `hidden`
  attribute, so **Create app** is on screen from the moment the setup form
  opens. `/install-4` has been in front of people, so it keeps the behaviour it
  was tested with — worth fixing before the next round.
- Placeholder nav items were `href="#"`, which scrolls the page to the top;
  inside the desktop's browser frame that reads as the UI jumping away from you
  with no way back. They now say what they are, in a toast.

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
