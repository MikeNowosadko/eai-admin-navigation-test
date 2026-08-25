# `/build` — one prompt, our harness, and the door out of it

**Status: built.** Clickable at [`/build`](https://eai-website.github.io/prototypes/build) — prompt-first marketing, account before install, the harness in the browser, credits and the two forks, then the same EAI Setup segue as `/signup`.

The journey the other prototypes stop short of. `/signup` ends by handing
somebody a download; this one keeps them in the product, lets them build in
**our** harness, and then designs the moment they outgrow it — either because
the credits run out or because what they're building doesn't fit a form.

The name for the folder is `build/`, the URL `/build`. It is a new flow rather
than a copy of `/signup`, per *One prototype, one URL* — `/signup` has been in
front of people and keeps the behaviour it was tested with.

---

## 1. The route

| # | Screen | What it is | The decision it tests |
| --- | --- | --- | --- |
| 1 | `home.html` | Marketing site. Where **Get started** was, there is now **What do you want to build?** — a composer, example chips, a **Start** button | Does anybody type in it, or is a text box on an enterprise homepage read as a search field and scrolled past |
| 2 | `signup.html` → `ms-signin.html` → `workspace.html` | Account. Lifted from `/signup` unchanged, **except the prompt rides along on every screen** | Does the prompt survive four screens and a Microsoft round trip, or does it read as lost |
| 3 | `builder.html` | **The harness.** The no-code builder's configurator, recreated: the prompt is already the first message, the assistant is already answering | Can somebody build one thing without being taught anything |
| 4 | — | **The credit meter**, in the sidebar from the first second. 100 credits at sign-up, spent per build turn | Does anybody notice it before it matters |
| 5 | — | **The cost fork**, at 50%: top up, bring your own harness, or carry on | Which they pick, and whether they can say what a credit is |
| 6 | — | **The fit fork**, whenever it's true: what you're describing is bigger than a four-step form | Whether "go and build it on your Mac" reads as help or as rejection |
| 7 | `app.html` CLI tab → EAI Setup → `/eai` | The segue. `/signup`'s second half, reused line for line | Everything `/signup` already measures — does the hand-off survive |

Steps 2 and 7 are existing work. Steps 3–6 are the prototype.

---

## 2. What comes out of `eainocodebuilder`

The harness is not a sketch. It is the shipped product redrawn in HTML, so a
tester's reaction is to the thing we actually have. Source read at
`~/conductor/repos/eainocodebuilder`:

| Prototype piece | Source |
| --- | --- |
| The composer, chips, "What would you like to build?" | `src/app/new/new-workflow-chat.tsx` — the six chips are its `SUGGESTIONS` array verbatim: KYC onboarding, invoice processing, leave approval, customer feedback, vendor assessment, compliance review |
| Two-panel layout: chat 600px left, preview slides in from the right | `src/components/configurator/configurator-shell.tsx` |
| Progress: **Describe → Generate → Improve → Publish** | `progress-breadcrumb.tsx` (`ConfiguratorState`: welcome, business_process, workflow_design, improvements, published) |
| Message bubbles, the `AI` avatar, the streaming caret | `chat-message.tsx` |
| **Business process card** — description, Goal / Audience / Outcome, *Make Changes* / *Looks Good – Continue* | `business-understanding-card.tsx` |
| **Clarification stepper** — 3–4 questions anchored above the input, options plus "Something else…", skippable | `clarification-card.tsx` |
| Workflow summary, process map, improvement suggestions, publish dialog, device preview (Desktop/Tablet/Mobile), QR | `workflow-summary-card.tsx`, `process-map-view.tsx`, `improvement-suggestions-panel.tsx`, `publish-dialog.tsx`, `workflow-preview.tsx` |
| Sidebar: Workflows, Smart Blocks, Analytics, Theme, Notifications, support, account footer | `app-sidebar.tsx`, `nav-user.tsx` |
| Sign-in is Microsoft Entra | `signIn('microsoft-entra-id')` in `new-workflow-chat.tsx` — which is what `/signup` already draws |
| Type, colour, radii | `src/app/globals.css` → Geist + `@enterpriseaigroup/core/theme.css` shadcn tokens. `assets/signup.css` already carries these |

**Two things the codebase settles that were open questions.**

- **The builder builds a four-step form, not an app.** `applyProposedChange`
  refuses to add a fifth step (`if (structure.steps.length >= 4) return
  structure`), and the type docs describe reaching "the clean ≤4-step form".
  What it publishes is a public form with an analytics dashboard behind it.
- **There is no credit, quota, plan or entitlement anywhere in it.** The only
  hits for "credits" are a third-party brand-lookup API. So the meter, the
  ledger, the top-up and both forks are net-new design — the prototype is the
  first place they exist, which is the point, but nothing in the product can be
  copied for them.

---

## 3. What has to be designed, and what I'd argue for

### 3.1 The prompt has to survive sign-up — account first

**Decided: account first.** Typing what you want to build and then meeting four
screens and an MFA prompt makes the box a bait unless the prompt is visibly
still there. So every sign-up screen carries it — *Building: KYC onboarding for
CommBank* — and the harness opens with the prompt already sent and the first
reply arriving. Nothing is faked in the other direction either: a product with a
credit ledger can't run an agent for somebody who hasn't signed in.

`?auth=after-reply` stays available as a variation if we ever want to test the
other order, but it isn't being built now.

### 3.2 Credits — the model, decided

One word: **credits**. Never a raw model-token figure — "tokens" collides with
the word every IT person already knows from LLM billing, and the number would
never match anything they could check.

**100 free credits on sign-up**, and they buy units of work rather than words:

| What it charges for | Credits |
| --- | --- |
| Understanding your process (the business process card) | 5 |
| The clarifying questions | 0 — asking you something isn't billable |
| Generating the workflow | 15 |
| Each change you ask for | 5 |
| Suggest improvements | 10 |
| Publishing | 10 |
| Preview, analytics, editing fields by hand | 0 |

A first workflow from prompt to published form costs about **55** — so the 50%
line falls just after the workflow appears and while they're refining it. That
is deliberate: the fork lands **after** the first success and **before** the
second build, which is the only place it can read as an offer rather than an
interruption.

**Every billed turn shows its own price** — a small `−15` beside the assistant's
message. A meter nobody can account for is a number that just goes down; this is
what makes "45 of 100 left" mean *about one more workflow*.

Top-up is **500 credits for $49**, invented and labelled as such. The other
option on the same card costs nothing, which is the entire argument: your own
harness bills your own subscription.

### 3.3 50% is a warning, not a wall

At 50% nothing is blocked. A modal there is a toll booth placed in the middle of
somebody's first success. So:

- **The meter is in the sidebar from the first second**, quiet. A meter whose
  first appearance is the warning reads as a paywall that just materialised.
- **At 50%**, an inline message in the transcript, from the assistant, in the
  same typed-card pattern the product already uses for its other cards.
  Dismissible. The sidebar meter goes amber.
- **At 100%**, the dialog, because now something really is blocked.

### 3.4 Two forks, one destination, different sentences

- **Cost fork** — you're running low. *Keep building here on our credits, or
  build on your machine in the harness you already pay for.* That sentence is
  the whole product argument, and it is true: `/eai` runs inside their Claude
  Code or Copilot, so their subscription buys the inference, not ours. It also
  resolves the ambiguity in "connect your own external harness" — connecting a
  tool and moving the bill are the same act.
- **Fit fork** — what you've described isn't a four-step form. This one has a
  truthful trigger straight out of the code, and it can fire on turn two of a
  free account. It must not read as rejection: the builder is the right tool for
  a process, the CLI for an application.

They must never fire on the same turn. The cost fork suppresses the fit fork for
a turn or two.

### 3.5 The question the segue lives or dies on

**Does what I've built come with me?** If moving to the CLI is a restart, nobody
moves. The prototype should show EAI Setup opening with the app name and the
brief already filled in, and the hand-off screen naming exactly what travels.

**This needs an answer from engineering before it's drawn.** If a workflow built
in the browser can't be picked up by `eai init`, we must not draw it — and the
gap is then the most valuable finding in the whole exercise.

### 3.6 The marketing page

The current `home.html` is a stand-in and the real site's source wasn't in any
checked-out workspace here. Either way the hero changes: positioning sentence,
then the composer as the only primary action, then the chips. **The chips are
what stop an enterprise homepage reading as a toy** — *KYC onboarding*,
*compliance review* and *vendor assessment* say who this is for in six words.
Sign-in stays. The download stays off it, as `/signup` established.

---

## 4. How it gets built

Same rules as everything else here: static HTML, no build step, the shared
desktop shell.

```
build/
  index.html        desktop shell — Safari, dock, EAI Setup for the second half
  pages/
    home.html       prompt-first marketing site
    builder.html    the harness: sidebar, transcript, preview panel, meter
    plans.html      top-up / plans, arrived at rather than sold
    (signup.html, ms-signin.html, workspace.html, app.html, harness.html
     start as copies of signup/pages/ with the prompt threaded through)
assets/
  build.js          the journey: the scripted transcript, the ledger, the forks
  build.css         the harness only — sidebar, bubbles, cards, meter
```

`assets/build.js` follows `cli.js`'s shape: a `TURNS` list at the top and one
async function each, so a turn can be reordered or commented out. The ledger is
a handful of numbers on `state`, and every card the assistant can raise is one
function.

Reused as-is: `desktop.js`, `desktop.css`, `page.js`, `icons.js`, the setup-app
half of `signup.js`, `signup.css`'s tokens.

Watch the traps in `signup/HANDOFF.md` — the `[hidden]` vs `display:` one has
now bitten five times, and any new block in `build.css` needs its own guard.

### Phases

1. **Skeleton** — shell, prompt-first homepage, prompt threaded through sign-up,
   landing in an empty harness. Testable end to end on day one.
2. **The harness** — the configurator recreated, one scripted build from prompt
   to published form. The bulk of the work.
3. **Credits** — meter, ledger, 50% card, 100% dialog, top-up, plans.
4. **The forks** — fit fork, cost fork, and the segue into the CLI tab.
5. **The second half** — EAI Setup through to `/eai`, mostly wiring.
6. **Review surfaces** — ⌘K states, `?state=` URLs, a `/states`-style rail for
   the meter and fork states, README entry, launch-pad card.

---

## 5. What it won't fake

Nothing runs. The assistant's replies are written, not generated, so the
transcript is a script — which is fine for everything above except one thing:
**we can't learn whether the AI understands an arbitrary prompt.** Testers who
type something far from the scripted brief will get a reply that fits it
loosely. Either steer with chips, or accept it and say so in the session.

The credits are invented. The prices are invented. Both need a plausible model
from the business before this goes in front of anyone outside the building.

---

## 6. Decisions taken

1. **Credits**, per the table in §3.2. Invented figures, plausible shape, and
   the 50% line lands where the fork should happen.
2. **The work travels.** A workflow built in the browser is picked up by the CLI
   project — EAI Setup opens with the app name and the brief already in it, and
   the hand-off screen says so.
3. **Account first**, prompt carried on every screen (§3.1).
4. **The box takes anything.** The homepage asks what you want to build and does
   not narrow it; the harness answers in the product's own vocabulary, and a
   prompt that wants an application rather than a process is exactly what fires
   the fit fork. The mismatch is the flow, not a bug in it.
5. **The marketing page is designed here**, not mirrored — the real site's source
   isn't on this machine, and the current `home.html` is a stand-in anyway.

None of this is production. It is a drawing of an experience, made to find out
whether the experience works.
