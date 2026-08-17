# Open-sourcing the desktop shell

An assessment, not a decision. The question asked was whether the fake macOS
these prototypes run on could be released for other people to build on, and the
short answer is that **the shell is worth releasing and this repo is not the
thing to release** — the two are only 18% the same files.

## Where the repo stands today

- `EAI-Website/prototypes`, visibility **internal**, **no LICENSE file**. With
  no licence, nobody outside the org has permission to use any of it, so this
  is a deliberate act rather than a switch to flip.
- 16 commits on `main`. Short and mostly clean: the Conductor and Playwright
  scratch directories only ever appear in checkpoint refs, not on the branch.
- `.gitignore` contains one line, `.vercel`. `.context/`, `.conductor/` and
  `.playwright-mcp/` are untracked but unignored, which is one `git add -A`
  away from being public.

## What is actually reusable

| | lines | reusable? |
| --- | --- | --- |
| `desktop.js` `desktop.css` `term-runtime.js` `page.js` `icons.js` | 1,713 | **yes — this is the thing** |
| the journeys (`cli.js` `install.js` `chat.js` `setup.js` …) | 4,921 | no: EAI's onboarding, step by step |
| the pages (`*/pages/*.html`) | 2,850 | no: invented pricing, plan tiers, a mocked sign-in |
| `experiments/` | — | no: an internal Notion mirror of study results |

The shell is small, has no build step and no dependencies, and does one thing
that is genuinely fiddly to redo: a desktop with a menu bar, a dock, windows,
an iframe browser with a working address bar, app chrome you can swap
underneath a running terminal, and a `postMessage` bus so a page inside the
browser can drive the journey outside it. That is a reasonable thing to hand
someone who wants to demo software inside a believable OS.

The other 7,771 lines are EAI's onboarding study. They are the reason the repo
exists and they are not interesting to anyone else.

## The blockers, in order

### 1. Two real Apple files are committed

This is the one that actually matters, and it is the one with precedent
attached.

- `assets/wallpaper.jpg` — 2560×2560, EXIF stripped. It is Apple's Big Sur
  wallpaper.
- `assets/logos/applications-folder.png` — 512×512 RGBA, which is an `.icns`
  export size. It was added by 97fff02 ("real Applications icon") and it is
  the macOS Applications folder icon.

Redrawing Apple's *look* and shipping Apple's *files* are different categories
of risk, and the public record separates them cleanly. Browser recreations of
macOS have sat on GitHub under MIT for years without incident —
[macos-web](https://github.com/PuruVJ/macos-web) has 2.7k stars — whereas
[Docker-OSX was taken down by an Apple DMCA notice](https://www.bleepingcomputer.com/news/security/docker-osx-image-used-for-security-research-hit-by-apple-dmca-takedown/)
for redistributing Apple's own material. These two files are on the wrong side
of that line and neither is hard to replace: the wallpaper with a CSS gradient
or a CC0 image, the folder icon with the one already drawn in `icons.js`.

Everything else that used to be borrowed-looking is now an original drawing.
The dock icons were rewritten as generated SVG on Apple's icon grid — no
tracing, no extracted art — which was worth doing on its own merits and
happens to remove the bulk of this problem.

### 2. Trade dress is a residual risk, not a blocker

What remains is a menu bar, a dock and a set of icons that are recognisably
*of* macOS. That is trade dress, and the honest position is that it is a real
if small risk that the field has been running for a decade without being
tested. The mitigations are cheap and all of them are things good projects do
anyway:

- Don't call the project "macOS anything" — name it for what it does.
- Carry the disclaimer the field has settled on. winXP's is the model: *"The
  Windows XP name, artwork, trademark are surely property of Microsoft. This
  project is provided for educational purposes only. It is not affiliated with
  and has not been approved by Microsoft."*
- Make the icon set swappable. `icons.js` is already a plain name→SVG map with
  a `paintIcons()` call, so a `theme` argument is a small change and it turns
  "a macOS clone" into "a desktop shell that ships a macOS-ish theme."

### 3. Third-party marks in the coding-app icons

Copilot, Claude, Codex, VS Code and Gemini are all redrawn trademarks of five
other companies. They belong to EAI's journeys, not to a general desktop shell,
so they should stay behind in this repo rather than ship in the released one.

### 4. EAI content and history

Invented pricing, invented plan tiers, a mocked sign-in and the EAI wordmark
run through every page, and `experiments/` mirrors internal study material.
None of it can go out.

Because that content is in the history as well as the tree, **the public repo
should start from a fresh commit, not from this one's history.** Filtering 16
commits is possible but pointless when the extracted subset is 1,713 lines.

## What to do

**Extract, don't flip.** A new public repo containing `desktop.{js,css}`,
`term-runtime.js`, `page.js`, `icons.js`, one demo flow written from scratch,
a replaced wallpaper, MIT, and the disclaimer. This repo then consumes it —
which also fixes something already true and unstated, that `assets/` is a
library the flows depend on and nobody treats as one.

**In this repo, whether or not any of that happens:**

- [ ] Replace `assets/wallpaper.jpg` and `assets/logos/applications-folder.png`,
      or record where they came from and that we may use them.
- [ ] Extend `.gitignore` to `.context/`, `.conductor/`, `.playwright-mcp/`.
- [ ] Add a LICENSE. Internal-with-no-licence is ambiguous even internally.

**Worth knowing before committing to it.** The field is not empty —
[macos-web](https://github.com/PuruVJ/macos-web),
[daedalOS](https://github.com/DustinBrett/daedalOS) and
[winXP](https://github.com/ShizukuIchi/winXP) all exist and are further along
as desktop simulations. What this shell has that they don't is narrower and
more useful: it is built for *scripted journeys* — a `STEPS` list, a terminal
runtime, and a bus between the page and the machine around it — so it is aimed
at someone building a product walkthrough rather than someone building a
desktop. That is the pitch, and if it isn't the pitch there is no reason to
release it.

The ongoing cost is the usual one: issues, pull requests and questions about a
thing nobody at EAI is paid to maintain. It is small, but it isn't zero, and it
should be somebody's before the repo goes public.

## Sources

- [macos-web](https://github.com/PuruVJ/macos-web) — MIT, ~2.7k stars
- [daedalOS](https://github.com/DustinBrett/daedalOS)
- [winXP](https://github.com/ShizukuIchi/winXP) — the disclaimer quoted above
- [Docker-OSX hit by an Apple DMCA takedown](https://www.bleepingcomputer.com/news/security/docker-osx-image-used-for-security-research-hit-by-apple-dmca-takedown/)
- [Apple's copyright and trademark guidelines for third parties](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html)
