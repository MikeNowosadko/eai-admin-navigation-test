/* ------------------------------------------------------------------
   The roadmap, as data.

   ⚠️  THE ITEMS BELOW ARE PLACEHOLDERS. They are a plausible-looking
   set written to make the two views render at a realistic density, not
   a statement of what Enterprise AI has built or intends to build.
   Replace them. That is the point of this file: it is the only file
   you have to touch to change the roadmap.

   Both views read this one list:

     roadmap/index.html      the tree      — branch, parent, status
     roadmap/story-map.html  the story map — activity, step, status

   An item needs:

     id        unique, kebab-case
     title     short. It sits under a circle on the tree.
     blurb     one sentence, plain English. Shown when a node is opened.
     product   'cli' | 'builder' | 'platform'
     phase     'foundations' | 'plan' | 'build' | 'deploy'
     status    'shipped' | 'building' | 'next' | 'exploring' | 'parked'
     parent    id of the item it hangs off, or the phase id for a top
               branch. This is what makes the tree a tree: a child is
               work that only makes sense once its parent exists.
     activity  which backbone column of the story map it belongs to
     step      which sub-column under that activity
     icon      optional, name from ICONS in roadmap-view.js

   The story map's rows (its slices) are derived from status, so there
   is no slice field to keep in sync — move an item between slices by
   changing what it is, not where it sits.
------------------------------------------------------------------- */

window.ROADMAP = {

  /* --- the two products, and the platform under both --------------- */

  products: {
    platform: {
      name: 'Platform',
      short: 'Platform',
      note: 'Sign-in, workspaces, models, spend. Both products stand on it.',
      colour: '#6fe3b0',
    },
    cli: {
      name: 'EAI CLI',
      short: 'CLI',
      note: 'The command line, running inside whichever coding tool you already use.',
      colour: '#38b6ff',
    },
    builder: {
      name: 'No-code builder',
      short: 'Builder',
      note: 'Describe an app in a sentence and watch it get made. No terminal.',
      colour: '#ffc24d',
    },
  },

  /* --- the five states a thing can be in ---------------------------- */

  statuses: {
    shipped:   { name: 'Working today', verb: 'Shipped',    note: 'People are using it now.' },
    building:  { name: 'Being built',   verb: 'In build',   note: 'Someone is on it this quarter.' },
    next:      { name: 'Next up',       verb: 'Next',       note: 'Agreed, scoped, not started.' },
    exploring: { name: 'Exploring',     verb: 'Exploring',  note: 'We think it matters. We do not know the shape yet.' },
    parked:    { name: 'Parked',        verb: 'Parked',     note: 'Considered and set down, for now.' },
  },

  /* --- the trunk splits three ways, on top of what already exists --- */

  phases: [
    {
      id: 'foundations',
      name: 'Foundations',
      note: 'The parts that have to exist before either product is worth anything.',
      icon: 'layers',
    },
    {
      id: 'plan',
      name: 'Plan',
      note: 'Turn a sentence someone said in a meeting into work that can be handed over.',
      icon: 'doc',
    },
    {
      id: 'build',
      name: 'Build',
      note: 'Make the thing. Then find out whether it is any good.',
      icon: 'code',
    },
    {
      id: 'deploy',
      name: 'Deploy',
      note: 'Get it in front of people, and be able to say what changed.',
      icon: 'upload',
    },
  ],

  /* --- the story map backbone, left to right ------------------------ */

  activities: [
    { id: 'setup',  name: 'Get set up',          steps: ['Sign in', 'Set up a workspace', 'Get the tools', 'Choose how you build'] },
    { id: 'decide', name: 'Decide what to build', steps: ['Say what you want', "Understand what's there", 'Agree the spec', 'Break it into work'] },
    { id: 'make',   name: 'Make the thing',      steps: ['Write the code', 'See it as you go', 'Check the work', "Fix what's broken"] },
    { id: 'live',   name: 'Get it live',         steps: ["Prove it's safe", 'Ship it', 'Tell people'] },
    { id: 'run',    name: 'Run and govern it',   steps: ['Watch the spend', 'Keep control', 'Prove compliance'] },
  ],

  /* --- the items ---------------------------------------------------- */

  items: [

    /* Foundations ---------------------------------------------------- */
    {
      id: 'f-signin', title: 'Microsoft sign-in', product: 'platform', phase: 'foundations',
      status: 'shipped', parent: 'foundations', icon: 'key',
      activity: 'setup', step: 'Sign in',
      blurb: 'The account people already have at work. Nobody makes a new password to try us.',
    },
    {
      id: 'f-workspace', title: 'Workspaces', product: 'platform', phase: 'foundations',
      status: 'shipped', parent: 'f-signin', icon: 'users',
      activity: 'setup', step: 'Set up a workspace',
      blurb: 'Everything belongs to a workspace — the people in it, the settings, the spend.',
    },
    {
      id: 'f-roles', title: 'Roles and permissions', product: 'platform', phase: 'foundations',
      status: 'shipped', parent: 'f-workspace', icon: 'lock',
      activity: 'run', step: 'Keep control',
      blurb: 'Who can invite, who can spend, who can publish. Three roles, not thirty.',
    },
    {
      id: 'f-standard', title: 'Workspace standard', product: 'platform', phase: 'foundations',
      status: 'shipped', parent: 'f-workspace', icon: 'flag',
      activity: 'setup', step: 'Choose how you build',
      blurb: 'The workspace has already chosen the coding tool, so a new starter does not have to.',
    },
    {
      id: 'f-setup-app', title: 'EAI Setup app', product: 'platform', phase: 'foundations',
      status: 'shipped', parent: 'f-standard', icon: 'box',
      activity: 'setup', step: 'Get the tools',
      blurb: 'One download that installs what the machine is missing and signs you in.',
    },
    {
      id: 'f-gateway', title: 'Model gateway', product: 'platform', phase: 'foundations',
      status: 'shipped', parent: 'f-workspace', icon: 'globe',
      activity: 'setup', step: 'Set up a workspace',
      blurb: 'One key, every model. Changing model is a setting, not a migration.',
    },
    {
      id: 'f-spend', title: 'Spend and usage', product: 'platform', phase: 'foundations',
      status: 'building', parent: 'f-gateway', icon: 'bars',
      activity: 'run', step: 'Watch the spend',
      blurb: 'What was spent, by whom, on what. The question every finance team asks first.',
    },
    {
      id: 'f-budget', title: 'Budgets and caps', product: 'platform', phase: 'foundations',
      status: 'next', parent: 'f-spend', icon: 'target',
      activity: 'run', step: 'Watch the spend',
      blurb: 'A ceiling per workspace, and a warning before it is hit rather than after.',
    },
    {
      id: 'f-audit', title: 'Audit log', product: 'platform', phase: 'foundations',
      status: 'next', parent: 'f-roles', icon: 'eye',
      activity: 'run', step: 'Keep control',
      blurb: 'Every prompt, every deploy, every permission change, kept and searchable.',
    },
    {
      id: 'f-scim', title: 'Joiners and leavers', product: 'platform', phase: 'foundations',
      status: 'next', parent: 'f-signin', icon: 'users',
      activity: 'run', step: 'Keep control',
      blurb: 'Access follows the directory, so someone who leaves on Friday is out on Friday.',
    },
    {
      id: 'f-tenant', title: 'Models in your own tenant', product: 'platform', phase: 'foundations',
      status: 'exploring', parent: 'f-gateway', icon: 'shield',
      activity: 'run', step: 'Prove compliance',
      blurb: 'For the customers whose data is not allowed to leave their own cloud.',
    },
    {
      id: 'f-evidence', title: 'Compliance evidence pack', product: 'platform', phase: 'foundations',
      status: 'exploring', parent: 'f-audit', icon: 'doc',
      activity: 'run', step: 'Prove compliance',
      blurb: 'The answers to the security questionnaire, generated rather than written again.',
    },

    /* Plan ------------------------------------------------------------ */
    {
      id: 'p-eai', title: '/eai in your coding tool', product: 'cli', phase: 'plan',
      status: 'shipped', parent: 'plan', icon: 'terminal',
      activity: 'decide', step: 'Say what you want',
      blurb: 'One command inside Claude Code, Codex or Copilot. Everything else hangs off it.',
    },
    {
      id: 'p-brief', title: 'Say it in plain English', product: 'cli', phase: 'plan',
      status: 'shipped', parent: 'p-eai', icon: 'spark',
      activity: 'decide', step: 'Say what you want',
      blurb: 'A paragraph of what you want is the input. No template to fill in first.',
    },
    {
      id: 'p-research', title: "Read what's already there", product: 'cli', phase: 'plan',
      status: 'shipped', parent: 'p-brief', icon: 'eye',
      activity: 'decide', step: "Understand what's there",
      blurb: 'It goes through the codebase before it writes a word of spec.',
    },
    {
      id: 'p-spec', title: 'Specification', product: 'cli', phase: 'plan',
      status: 'shipped', parent: 'p-research', icon: 'doc',
      activity: 'decide', step: 'Agree the spec',
      blurb: 'What is being built and how you will know it works, in language a stakeholder can read.',
    },
    {
      id: 'p-plan', title: 'Technical plan', product: 'cli', phase: 'plan',
      status: 'shipped', parent: 'p-spec', icon: 'branch',
      activity: 'decide', step: 'Agree the spec',
      blurb: 'Architecture, contracts and data model — the argument, before the code.',
    },
    {
      id: 'p-tasks', title: 'Task breakdown', product: 'cli', phase: 'plan',
      status: 'shipped', parent: 'p-plan', icon: 'check',
      activity: 'decide', step: 'Break it into work',
      blurb: 'The plan cut into pieces small enough to finish, in an order that works.',
    },
    {
      id: 'p-visuals', title: 'Diagrams from the plan', product: 'cli', phase: 'plan',
      status: 'shipped', parent: 'p-plan', icon: 'layers',
      activity: 'decide', step: 'Agree the spec',
      blurb: 'Context, containers and data, drawn from the plan rather than kept up to date by hand.',
    },
    {
      id: 'p-constitution', title: 'House rules per repo', product: 'cli', phase: 'plan',
      status: 'building', parent: 'p-eai', icon: 'flag',
      activity: 'decide', step: 'Agree the spec',
      blurb: 'The things your team always says in review, written down once and applied every time.',
    },
    {
      id: 'p-ambiguity', title: 'Ambiguity check', product: 'cli', phase: 'plan',
      status: 'building', parent: 'p-spec', icon: 'spark',
      activity: 'decide', step: 'Agree the spec',
      blurb: 'Three readers, one spec. Wherever they disagree is the sentence to rewrite.',
    },
    {
      id: 'p-assumptions', title: 'Assumption tracking', product: 'cli', phase: 'plan',
      status: 'next', parent: 'p-plan', icon: 'target',
      activity: 'decide', step: 'Agree the spec',
      blurb: 'What the plan is betting on, and a flag when one of those bets turns out to be wrong.',
    },
    {
      id: 'p-scope', title: 'Scope creep detector', product: 'cli', phase: 'plan',
      status: 'next', parent: 'p-tasks', icon: 'eye',
      activity: 'decide', step: 'Break it into work',
      blurb: 'Compares what is now being built against what was originally asked for.',
    },
    {
      id: 'p-problem', title: 'Validate the problem first', product: 'cli', phase: 'plan',
      status: 'exploring', parent: 'p-brief', icon: 'target',
      activity: 'decide', step: 'Say what you want',
      blurb: 'Five whys before any design, so we stop building the second-best thing well.',
    },

    {
      id: 'p-describe', title: 'Describe the app', product: 'builder', phase: 'plan',
      status: 'shipped', parent: 'plan', icon: 'spark',
      activity: 'decide', step: 'Say what you want',
      blurb: 'A sentence in a box. "A form my team fills in on site, and a list I can filter."',
    },
    {
      id: 'p-templates', title: 'App templates', product: 'builder', phase: 'plan',
      status: 'shipped', parent: 'p-describe', icon: 'box',
      activity: 'decide', step: 'Say what you want',
      blurb: 'The six shapes people actually ask for, so the blank page is never the start.',
    },
    {
      id: 'p-entities', title: 'Choose the data it holds', product: 'builder', phase: 'plan',
      status: 'shipped', parent: 'p-describe', icon: 'database',
      activity: 'decide', step: 'Agree the spec',
      blurb: 'The two or three things the app is about, named before anything is generated.',
    },
    {
      id: 'p-preview-plan', title: 'See the plan before it builds', product: 'builder', phase: 'plan',
      status: 'building', parent: 'p-entities', icon: 'doc',
      activity: 'decide', step: 'Agree the spec',
      blurb: 'Screens, data and rules listed for approval, so the first surprise is not the app itself.',
    },
    {
      id: 'p-import-spec', title: 'Open a CLI spec in the builder', product: 'builder', phase: 'plan',
      status: 'next', parent: 'p-preview-plan', icon: 'branch',
      activity: 'decide', step: 'Break it into work',
      blurb: 'Half the bridge: a spec written by an engineer becomes a builder project.',
    },

    /* Build ------------------------------------------------------------ */
    {
      id: 'b-run', title: 'Run the tasks', product: 'cli', phase: 'build',
      status: 'shipped', parent: 'build', icon: 'play',
      activity: 'make', step: 'Write the code',
      blurb: 'It works the list, writes the code and stops where it needs an answer.',
    },
    {
      id: 'b-harness', title: 'Bring your own coding tool', product: 'cli', phase: 'build',
      status: 'shipped', parent: 'b-run', icon: 'terminal',
      activity: 'setup', step: 'Choose how you build',
      blurb: 'Claude Code, Codex, Copilot. Nobody is asked to move to our editor.',
    },
    {
      id: 'b-resume', title: 'Save and resume', product: 'cli', phase: 'build',
      status: 'shipped', parent: 'b-run', icon: 'refresh',
      activity: 'make', step: 'Write the code',
      blurb: 'Stop on Friday, pick up on Monday with the context still there.',
    },
    {
      id: 'b-tdd', title: 'Test-first loop', product: 'cli', phase: 'build',
      status: 'building', parent: 'b-run', icon: 'check',
      activity: 'make', step: 'Check the work',
      blurb: 'The acceptance criteria become failing tests, and then they stop failing.',
    },
    {
      id: 'b-diagnose', title: 'Reproduce, minimise, fix', product: 'cli', phase: 'build',
      status: 'building', parent: 'b-run', icon: 'target',
      activity: 'make', step: "Fix what's broken",
      blurb: 'A bug loop that insists on reproducing the thing before it changes any code.',
    },
    {
      id: 'b-review', title: 'Code review council', product: 'cli', phase: 'build',
      status: 'next', parent: 'b-tdd', icon: 'users',
      activity: 'make', step: 'Check the work',
      blurb: 'Three readers: is it readable, is it right, is it fast. They do not always agree.',
    },
    {
      id: 'b-parallel', title: 'Several agents, one task list', product: 'cli', phase: 'build',
      status: 'next', parent: 'b-run', icon: 'layers',
      activity: 'make', step: 'Write the code',
      blurb: 'The independent tasks go at once instead of one after another.',
    },
    {
      id: 'b-hydrate', title: 'Spec an existing codebase', product: 'cli', phase: 'build',
      status: 'exploring', parent: 'b-run', icon: 'doc',
      activity: 'make', step: "Understand what's there",
      blurb: 'Point it at code nobody wrote a spec for, and get the spec back.',
    },

    {
      id: 'b-generate', title: 'Generate the screens', product: 'builder', phase: 'build',
      status: 'shipped', parent: 'build', icon: 'box',
      activity: 'make', step: 'Write the code',
      blurb: 'The app appears — screens, navigation, forms — from the plan that was agreed.',
    },
    {
      id: 'b-live', title: 'Live preview', product: 'builder', phase: 'build',
      status: 'shipped', parent: 'b-generate', icon: 'eye',
      activity: 'make', step: 'See it as you go',
      blurb: 'The real app, next to the conversation, updating while you talk to it.',
    },
    {
      id: 'b-point', title: 'Point at it and ask', product: 'builder', phase: 'build',
      status: 'building', parent: 'b-live', icon: 'spark',
      activity: 'make', step: 'Write the code',
      blurb: '"This button, make it do that." No file to find, no code to read.',
    },
    {
      id: 'b-data', title: 'Connect a data source', product: 'builder', phase: 'build',
      status: 'next', parent: 'b-generate', icon: 'database',
      activity: 'make', step: 'Write the code',
      blurb: 'The app stops being a demo the moment it reads the real list.',
    },
    {
      id: 'b-functions', title: 'Logic without code', product: 'builder', phase: 'build',
      status: 'next', parent: 'b-data', icon: 'branch',
      activity: 'make', step: 'Write the code',
      blurb: 'The when-this-then-that part, described rather than programmed.',
    },
    {
      id: 'b-agents', title: 'Agents inside your app', product: 'builder', phase: 'build',
      status: 'exploring', parent: 'b-functions', icon: 'spark',
      activity: 'make', step: 'Write the code',
      blurb: 'The app itself gets to think — summarise, classify, answer — not just store.',
    },
    {
      id: 'b-handoff', title: 'Open a builder app in the CLI', product: 'builder', phase: 'build',
      status: 'next', parent: 'b-generate', icon: 'branch',
      activity: 'make', step: 'Write the code',
      blurb: 'The other half of the bridge, for the day the app outgrows the builder.',
    },

    /* Deploy ------------------------------------------------------------ */
    {
      id: 'd-validate', title: 'Validation gates', product: 'cli', phase: 'deploy',
      status: 'building', parent: 'deploy', icon: 'shield',
      activity: 'live', step: "Prove it's safe",
      blurb: 'Correctness, security, tests and standards checked before anything is merged.',
    },
    {
      id: 'd-blast', title: 'Blast radius', product: 'cli', phase: 'deploy',
      status: 'next', parent: 'd-validate', icon: 'target',
      activity: 'live', step: "Prove it's safe",
      blurb: 'What else this change touches, listed before it goes out rather than after.',
    },
    {
      id: 'd-security', title: 'Security red team pass', product: 'cli', phase: 'deploy',
      status: 'next', parent: 'd-validate', icon: 'lock',
      activity: 'live', step: "Prove it's safe",
      blurb: 'It attacks the change from three angles and reports what got through.',
    },
    {
      id: 'd-rollback', title: 'A way back', product: 'cli', phase: 'deploy',
      status: 'exploring', parent: 'd-validate', icon: 'refresh',
      activity: 'live', step: "Prove it's safe",
      blurb: 'Every phase ships with the steps to undo it, written at the time, not in the incident.',
    },
    {
      id: 'd-cloud', title: 'Read your cloud', product: 'cli', phase: 'deploy',
      status: 'shipped', parent: 'deploy', icon: 'globe',
      activity: 'live', step: 'Ship it',
      blurb: 'Azure, AWS and GCP, looked at and never touched. It tells you what is there.',
    },
    {
      id: 'd-azure', title: 'Deploy to Azure', product: 'cli', phase: 'deploy',
      status: 'next', parent: 'd-cloud', icon: 'upload',
      activity: 'live', step: 'Ship it',
      blurb: 'From the same command line that wrote it, into the environment you already have.',
    },
    {
      id: 'd-comms', title: 'Release notes and a demo script', product: 'cli', phase: 'deploy',
      status: 'building', parent: 'deploy', icon: 'doc',
      activity: 'live', step: 'Tell people',
      blurb: 'What changed, in the words the people affected by it use.',
    },
    {
      id: 'd-publish', title: 'Publish to a workspace URL', product: 'builder', phase: 'deploy',
      status: 'shipped', parent: 'deploy', icon: 'upload',
      activity: 'live', step: 'Ship it',
      blurb: 'One button. The app has an address and the people in your workspace can open it.',
    },
    {
      id: 'd-testers', title: 'Share with a test group', product: 'builder', phase: 'deploy',
      status: 'building', parent: 'd-publish', icon: 'users',
      activity: 'live', step: 'Ship it',
      blurb: 'Six people who will tell you the truth, before the four hundred who will not.',
    },
    {
      id: 'd-promote', title: 'Promote to production', product: 'builder', phase: 'deploy',
      status: 'next', parent: 'd-testers', icon: 'flag',
      activity: 'live', step: 'Ship it',
      blurb: 'The same app, in the environment where being wrong actually costs something.',
    },
    {
      id: 'd-secrets', title: 'Secrets and settings', product: 'builder', phase: 'deploy',
      status: 'next', parent: 'd-publish', icon: 'key',
      activity: 'live', step: "Prove it's safe",
      blurb: 'Keys kept out of the app, and different per environment.',
    },
    {
      id: 'd-domain', title: 'Your own domain', product: 'builder', phase: 'deploy',
      status: 'exploring', parent: 'd-promote', icon: 'globe',
      activity: 'live', step: 'Ship it',
      blurb: 'It stops looking like a prototype the moment the address is yours.',
    },
    {
      id: 'd-observe', title: 'See what the app is doing', product: 'platform', phase: 'deploy',
      status: 'next', parent: 'deploy', icon: 'bars',
      activity: 'run', step: 'Watch the spend',
      blurb: 'Who used it, what broke, what it cost — for apps nobody is watching closely.',
    },

  ],
};
