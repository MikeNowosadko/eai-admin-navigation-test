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
3. **Make it yours** — the builder shell (384px chat + preview). Four
   clarifying questions, the answers *are* the configuration:
   brand (Lumina / Nike / none) → assets → tone → sign-off.
   Picking a brand re-skins the preview immediately.
4. **The review** — reviewers table built from the role and number of levels you
   chose; click a pending row to open the review dialog and approve or reject.
5. **Publish** — the recap and the live branded app.

There is no step rail or reset button — you move through it by clicking what is
actually on screen, the way the real product would work. Refresh to start over.

Question copy is lifted from `5layer-editor/src/blocks/composer/composerClarification.ts`
and `.../approval/approvalClarification.ts`; the reviewers table and review dialog
follow `ReviewersTable.tsx` / `ReviewDialog.tsx`.
