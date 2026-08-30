# `/build-sugar` — design rules

Geist typography and composition, following [Vercel design guidelines](https://vercel.com/design.md). Styles live in `assets/build-sugar-site.css`.

---

## Typography

- **Font:** Geist Sans for prose, headings, labels, and controls. Geist Mono for code, block names, and short identifiers.
- **Headings:** Sentence case only. Never all caps, never title case by default, never uppercase CSS on labels or section titles.
- **Eyebrows / labels:** Sentence case, same weight as body or one step lighter — not shouted in caps.
- **Hierarchy:** Size and weight before decoration. Muted colour for secondary text, not smaller grey paragraphs to fake density.

### Examples

| Do | Don't |
| --- | --- |
| Problem | PROBLEM |
| Smart blocks | Smart Blocks (title case) |
| What process do you want to improve? | WHAT PROCESS DO YOU WANT TO IMPROVE? |
| Plan · Build · Deploy | PLAN · BUILD · DEPLOY |

---

## Copy

- Short headings. One line of support copy at most.
- Lead with the reader's job, not product category names.
- Placeholder copy is fine until the jobs-to-be-done workshop lands.

---

## Layout

- Max width `1080px`, generous vertical rhythm between sections.
- Visuals over paragraphs — stat cards, bars, workflow steps, diagrams.
- Monochrome first. Colour only when it encodes meaning.

---

## Components

- **Builder:** Full-width workshop (`bd-sugar-focus`) — no left sidebar; lands straight in chat. Preview slides in when generated.
- **Hero shader:** Paper warp frame `5ON-0` via `assets/build-sugar-shader.js`. Mounts on hero and footer together — same frame and speed so they stay in phase; footer canvas is vertically mirrored.
- **Nav:** Light-on-dark over hero and footer shader zones; light Geist bar over the middle sections.
- **Section label:** `.sg-label` — 12px, muted, sentence case.
- **Section title:** `.sg-section h2` — 28px, semibold.
- **Plan / Build / Deploy cards:** Numbered 01–03, one short paragraph each, mini visual below.

---

## What this file is for

Rules for the marketing site and future `/build-sugar` web surfaces. The builder harness (`.nb`, `build.css`) keeps its own tokens — don't bleed marketing styles into it.
