# Experiment — Onboarding: current vs npx vs setup app

> Lives in Notion: [Experiments → EAI CLI set up → Onboarding](https://app.notion.com/p/3bbcd7477dd5818ab477c911387da562).
> This copy sits beside the prototypes it uses. Notion is the source of truth.

| | |
| --- | --- |
| **Status** | Round 1 complete — round 2 on the setup app to follow |
| **Method** | Lyssna, unmoderated |
| **Participants** | 5 per experiment, 15 total |
| **Owner** | Gareth |
| **Run dates** | TBC |
| **Decision** | Replace the current path. Setup app is the direction, but retest before building — 3 of 5 didn't clear the 4-of-5 line. npx ruled out for this ICP. |

## Hypothesis

Getting set up — from a Google search or the main site through to working in the
CLI — is too confusing for our users.

## Goal

Get to the starting point of the next milestone: typing `/eai` to start
building. Everything before that is prep, and prep is what we're testing.

## The three experiments

| # | Experiment | What the participant gets | URL to test |
| --- | --- | --- | --- |
| 1 | Existing | The docs we have today | <https://www.enterpriseaigroup.com/docs/getting-started> |
| 2 | npx flow | Prototype: copy one command, paste it, sign in from the terminal | <https://eai-website.github.io/prototypes/npx> |
| 3 | Setup app | Prototype: download an app, open it, sign in | <https://eai-website.github.io/prototypes/setup> |

Different people in each experiment, so nobody arrives already knowing the
journey. Paste the URL straight into Lyssna as the live website for that test.

> The two prototype URLs are on a personal Vercel account for now. Move them to
> an EAI-owned account before sending them to panel participants — they show EAI
> branding and pricing on a domain nobody at EAI controls.

## Participants

5 per experiment, recruited from the [Lyssna panel](https://app.lyssna.com/projects/daisy-cli-7144e152a0624d5aacf6f571c475a084)
to match our ICP — consultants, not deeply technical.

| | |
| --- | --- |
| Location | United States, United Kingdom, Australia, Singapore |
| Age | 18–55 |
| Industry | Business Management & Administration |

The panel filters don't say how technical someone is, which is the variable the
three paths differ on — so every participant is also asked:

> **How often do you use command line?**  1 = Never → 5 = Every day

> **Read every result against this answer.** With 5 people per group, one group
> landing more technical than another is likely, and it would look exactly like
> a difference between the paths. Report completion split by this score rather
> than as a single number per experiment — "4 of 5 finished" means something
> very different if those 4 all answered 5.

## What we measure

- Command-line frequency, 1 to 5 — the control variable, asked before the task
- Did they reach the `/eai` starting point, unaided — yes or no
- Where they stopped, hesitated, or would have given up
- How easy it felt, 1 to 7
- How confident they'd be doing it for real on their own machine, 1 to 5
- Anything they'd hesitate to do — pasting a command, downloading an app

## Decision

Against the rules set before running this:

| Path | Result | What the rule says |
| --- | --- | --- |
| Existing docs | 0 of 5 | **Replace it.** Not a close call. |
| npx flow | 2 of 5 | **Don't build it** — for this audience |
| Setup app | 3 of 5 | **Fix the sticking point and retest.** Doesn't clear the 4-of-5 line. |

**The app is the direction, but it hasn't earned the build yet.** 3 of 3 genuine
attempts is encouraging and it beat both alternatives, but "4 or 5 of 5" was
written down in advance precisely so a good-looking small number couldn't talk
us into committing engineering. Three people is not five people.

**Next:** round 2 on the setup app with the harness-already-talking change,
tighter screening so we get five real attempts, and command-line frequency
recorded per participant. If that clears 4 of 5, build it.

Actionable without another test:

- **The current documented path is not worth defending.** 0 of 5, 0 of 4 among
  people who tried.
- **"Open your terminal" is not a viable instruction for this ICP** — a finding
  about the audience, not the copy. It applies to any future flow that assumes
  a terminal.

---

## Per-participant data

Full tables and verbatims live on the Notion page. The headline the completion
counts don't show — **difficulty, 1 = easy, 5 = hard**:

| Experiment | Mean difficulty | Mean command-line use |
| --- | --- | --- |
| Existing docs | 4.4 | 2.2 |
| npx flow | **4.6** | 2.2 |
| Setup app | **2.0** | 2.6 |

Difficulty is the more trustworthy signal: consistent across every participant,
and independent of any judgement about who genuinely attempted. Nobody rated the
app above 3; four of five rated npx the maximum.

Command-line use was uniformly low in all three groups, so the npx failure isn't
an artefact of a less technical sample — and equally, we have no evidence about
people who *do* use a terminal.

**Two flaws in the test, both fixable before round 2:**

1. The task said stop at "eai cli"; the screen says "EAI welcome". Two
   participants said so outright, so completions are a floor, not a measurement.
2. At least two participants were on Windows while the prototype simulates a
   Mac, and they noticed.
