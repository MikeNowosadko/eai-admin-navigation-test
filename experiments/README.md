# Experiments

Product experiments: what we tested, with how many people, and what we decided.

Lives in Notion: [EAI Product Management → Experiments](https://app.notion.com/p/3bbcd7477dd581a5bf58e62ddd76e9d2).
Plans are mirrored here so they sit beside the prototypes they use.

| Area | Experiment | Status | Decision it informs |
| --- | --- | --- | --- |
| EAI CLI set up | [Onboarding: current vs npx vs setup app](./eai-cli-setup/onboarding-ux-test.md) | Run — decision pending numbers | Which set-up path we build |
| EAI CLI set up | [Setup shell + embedded harness](./eai-cli-setup/shell-harness-bridge.md) | Design | Can we unify admin and external harness without building our own agent |
| Better experience | [Sugar hit — builder first](../build-sugar/PLAN.md) | Scaffolded — [`/build-sugar`](https://eai-website.github.io/prototypes/build-sugar) | Does value before account improve conversion |
| Better experience | [Sugar hit + shell merge](https://app.notion.com/p/9921f8c973104f4799b9414e9e4019ae) | Future thinking (Notion) | North-star journey: web sugar hit → unified desktop shell |

## How we run one

1. **State the decision** the experiment informs. If nothing hangs on it, don't run it.
2. **Write the thresholds before the data.** What result would make us build it, fix it, or drop it.
3. **Write the result on the same page**, including anything that went against the hypothesis.

The structured records belong in the Notion databases: the thing being tested is
a **Bet**, and each participant observation is a **Feedback** row with
Channel = usability test.
