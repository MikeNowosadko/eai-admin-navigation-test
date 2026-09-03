# Smart block configuration

Prototypes for configuring Smart Blocks — where a block's data comes from, how it
evaluates, who sees it, and what actions it exposes. Brought over from
`eainocodebuilder/missoula` on 2026-08-31 so design explorations live beside the
onboarding prototypes.

## What's here

| Path | What it is |
| --- | --- |
| `template-flow/index.html` | **Interactive flow** — marketing site → read the template → brand it → connect data → set up the review → publish. No build step |
| `index.html` | Pre-built static snapshot — open via `serve.py`, no install |
| `5layer-editor/` | Source — three templates (candidate screening, RFP evaluation, EDM email), each walking a block through "where does its data come from?" |
| `five-layer-poc/` | Earlier iteration — five-layer table editor only (run with `npm install && npm run dev` in that folder) |

The load-bearing idea, from a comment in `5layer-editor/src/blocks/table/tableClarification.ts`:

> The Table block's clarifying questions ARE its source bindings — set via chat.

You do not build a config form. You ask business questions; the answers *are* the
configuration.

## Run the source (when editing)

```bash
cd smart-blocks-config/5layer-editor
npm install
npm run play      # → http://localhost:5191
```

Optional: set `ANTHROPIC_API_KEY` for the real LLM classifier in the five-layer
chat editor; without it the mock classifier is used.

## Refresh the static snapshot

After changing `5layer-editor/`:

```bash
cd smart-blocks-config/5layer-editor
npm install
npx vite build --base=./
cp dist/index.html ../index.html
cp -R dist/assets ../assets
```

Then fix asset paths in `index.html` if the hashed filenames changed.

## Origin

- `5layer-editor/` copied from `eainocodebuilder/missoula/prototypes/smart-blocks-5layer-editor`
- Static build copied from `eainocodebuilder/missoula/public/original/blocks`
- `five-layer-poc/` copied from archived `smart-blocks-poc/five-layer-poc`

In the no-code builder repo these also exist as Next.js playgrounds (`/original/blocks`,
`/smart-blocks-workbench`, `/configurator/smart-blocks`). Those depend on the full app;
this folder is the portable, editable copy.

## Template flow (interactive)

`template-flow/index.html` — one self-contained file, no build. Open it via
`serve.py` at `/smart-blocks-config/template-flow/`.

It walks the whole journey the Paper file describes:

1. **Marketing site** — "Don't start from scratch. Browse 50 templates by the
   shelf." Category chips filter the shelves; every tile is a miniature of the
   app that template builds. The EDM campaign tile is the live one.
2. **Read the template** — detail page with a live preview you can switch
   between desktop / tablet / mobile, the four blocks, and the CTA.
3. **Sign up = brand match** — one field, a work email. It creates the account
   *and* the domain after the @ is the brand lookup. Then "This is Lumina,
   right?" shows what came back — logo, four colours with their hexes, typeface,
   tone of voice — beside a live preview already wearing it.
4. **Make it yours** — the builder shell (384px chat + preview). Four
   clarifying questions, the answers *are* the configuration:
   brand → assets → tone → sign-off. Brand arrives already answered from the
   sign-up, so the builder opens on assets.
5. **The review** — reviewers table built from the role and number of levels you
   chose; click a pending row to open the review dialog and approve or reject.
6. **Publish** — the recap and the live branded app.

There is no reset button — you move through it by clicking what is actually on
screen, the way the real product would work. Refresh to start over. The setup
screens do carry the five-step rail from the Paper file, because a tester who has
just handed over an email wants to know how much more there is.

### The brand, and where the colour comes from

The whole point of the sign-up screen: **one email does sign-up and branding.**

- `lumina.com` and `nike.com` are the two designed brands, with the palettes from
  the Paper file. They are the ones to demo.
- **Any other company domain** gets a brand generated from it — the domain is
  hashed to a hue, and accent / wash / deep / secondary are derived from that.
  So a tester can type their own address and watch the app take their colour.
  It is deterministic: the same domain always gives the same palette.
- Free mail domains (gmail, outlook, …) are recognised as personal — there is no
  brand behind them, and Continue goes on unbranded.
- **Edit colours** turns the swatches into buttons and adds a colour input. Pick
  anything and the preview repaints as you drag. Text colour on the accent flips
  to dark automatically past a luminance threshold, so a pale pick never becomes
  white-on-white.

Everything branded reads three CSS variables — `--accent`, `--accent-wash`,
`--accent-ink` — set on `:root` by `applyBrandVars()`. That is the whole theming
mechanism; nothing else needs to know which brand is on.

### Two variations of where the setup lives

Same brand mechanism, two places to put the question. `?setup=chat` switches
between them; everything downstream is identical.

**A — full-screen setup** (default). "Make your own" leaves the builder for two
pages: the sign-up, then "This is Lumina, right?" with the brand card beside a
preview. Faithful to the Paper file. It is a bigger moment, but it is also two
screens of chrome — a step rail, a confirmation — before you reach the editor.

**B — inside the chat card** (`?setup=chat`). "Make your own" goes straight into
the builder in editor mode. The first clarifying card asks for work email and
workspace name, and the brand strip appears inside it as the domain resolves.
The preview is already on screen to the right, so you watch the app take your
colour while you are still typing — the repaint is the feedback, not a separate
confirmation screen. The workspace name auto-fills from the matched brand until
you type your own.

B is the cheaper build: no new screens, no step rail, no second route. It reuses
the clarifying-card shell and the `expansion('brand', …)` strip that were already
there, and the workspace question simply replaces the brand question as step 1 —
so the builder still counts 1/4 through 4/4.

Deep links for user testing:

| URL | Lands on |
| --- | --- |
| `template-flow/index.html?screen=signup` | A — the sign-up screen, empty |
| `…?email=jo@lumina.com` | A — the sign-up screen, prefilled and matched |
| `…?setup=chat` | B — the builder, workspace card waiting |
| `…?setup=chat&email=jo@lumina.com` | B — the builder, already matched and painted |

Question copy is lifted from `5layer-editor/src/blocks/composer/composerClarification.ts`
and `.../approval/approvalClarification.ts`; the reviewers table and review dialog
follow `ReviewersTable.tsx` / `ReviewDialog.tsx`.
