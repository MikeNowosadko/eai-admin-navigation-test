# EAI CLI set up

> Lives in Notion: [Experiments → EAI CLI set up](https://app.notion.com/p/3bbcd7477dd581e7bc8def46701a5eaf).

Everything a person has to do between never having heard of EAI and typing
`/eai` to start building — and our attempts to make that shorter.

## The problem

Getting set up today takes eight distinct pieces of work, most of which the user
has to know to do:

| # | Step today | Where it happens |
| --- | --- | --- |
| 0 | Never heard of EAI | — |
| 1 | Get to the EAI marketing website | Web |
| 2 | Have the prerequisites: git, node.js, npm and the EAI CLI | Their machine |
| 3 | Log in to the EAI platform | Web |
| 4 | Select where in EAI they are building (tenant) | Web |
| 5 | Select the local folder where code will sit | Their machine |
| 6 | Run `eai init` to add the EAI app template to that folder | Terminal |
| 7 | Open an AI harness with the right folder open **and** knowledge of `/EAI` | Their machine |
| 8 | Type `/EAI` and describe what they want to build | AI harness |

Two of those (2 and 7) are silent prerequisites: nothing tells the user they are
required until something fails. Steps 4–6 need vocabulary — tenant, workspace,
app template — that a first-time user doesn't have yet.

**Our belief:** this is the single biggest drop-off between interest and first
build, and it is a set-up problem rather than a product problem.

## What we're trying instead

Two candidate paths, both prototyped end to end:

| Path | Shape | Steps to `/EAI` |
| --- | --- | --- |
| **A — Current** | Docs tell you what to install and run | 8 |
| **B — npx flow** | Copy one command, paste it, sign in from the terminal | 6 |
| **C — Setup app** | Download an app, open it, sign in | 5 so far (flow ends at sign-in) |

B folds prerequisites, tenant selection and `eai init` into the command itself.
C moves the whole thing into a native app that can check the machine before the
user is asked for anything.

## Prototypes

Clickable, no login, no install. Each starts at a Google search so the first run
is cold, and each simulates a whole Mac — browser, dock, terminal or agent — so
the hand-off between website and machine is visible.

| Path | URL | Source |
| --- | --- | --- |
| B — npx flow | [/npx](https://eai-onboarding-prototypes.vercel.app/npx) | `npx/` |
| C — Setup app | [/setup](https://eai-onboarding-prototypes.vercel.app/setup) | `setup/` |

See [../README.md](../README.md) for hosting and how to edit.

## Experiments

- [Onboarding: current vs npx vs setup app](./onboarding-ux-test.md) — five
  unmoderated sessions on Lyssna, deciding which path we build.
