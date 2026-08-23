/* ------------------------------------------------------------------
   The discovery funnel, as data.

   Four bands, top of the funnel first. Click a band and you get three
   things: what is wrong, what we expect to see, what we will do.

   COPY RULE: one line per item, two at the outside. If a line needs a
   third, it is two items pretending to be one — split it.

   ⚠️  PLACEHOLDER CONTENT. Replace the wording; keep the shape.
------------------------------------------------------------------- */

window.FUNNEL = {

  bar: 8,

  intro: {
    title: 'What is wrong, what we expect, and what we will do about it.',
  },

  steps: [
    {
      id: 'knowledge',
      name: 'Knowledge',
      reach: '100 hear about us',
      cycle: 'Cycle 1 · 2 weeks',
      live: true,
      question: 'What do they think this is before we explain it?',
      problem: [
        'People cannot tell what this is for.',
        'Nothing on the roadmap sits in this band.',
        'We never wrote down what they should understand.',
      ],
      outcomes: [
        { text: 'Say what EAI is for, in their own words', from: null, to: 8 },
        { text: 'We can name the sentence that lands', learning: true },
      ],
      solution: [
        { when: 'Days 1–2', text: 'Write the question down. One sentence.' },
        { when: 'Days 3–8', text: 'Show the page to 10 people who have never heard of us.' },
        { when: 'Days 9–10', text: 'Rewrite it around what they said back.' },
      ],
    },

    {
      id: 'setup',
      name: 'Setup',
      reach: '38 try to install',
      cycle: 'Cycle 2 · 3 weeks',
      question: 'Where do they stop, and how many never come back?',
      problem: [
        'Our users cannot get set up. The CLI is too confusing and overwhelming.',
        '0/5 users from our ICP were able to get set up (plus Adaptovate user testing).',
      ],
      outcomes: [
        { text: 'Getting set up with EAI CLI is easy for our ICP', from: 4, to: 8 },
        { text: 'Users load into their AI harness with the correct folder open and eai cli ready', from: 2, to: 8 },
      ],
      solution: [
        { text: 'EAI Setup app to …' },
        { text: 'Instrument the Setup App so the drop-off is a number, not a hunch' },
      ],
    },

    {
      id: 'build',
      name: 'Build',
      reach: '12 build something',
      cycle: 'Cycle 3 · 3 weeks',
      question: 'What does the first thing they build have to be?',
      problem: [
        'They reach the prompt and freeze.',
        'Six of the ten outcomes sit in this band.',
        'Five have never been tested on anybody.',
      ],
      outcomes: [
        { text: 'Understand the Admin Screens', from: 3, to: 8 },
        { text: 'Reach DAISY Assist configuration', from: null, to: 8 },
        { text: 'Update DAISY Assist prompts', from: null, to: 8 },
        { text: 'Reconfigure DAISY Assess', from: null, to: 8 },
        { text: 'Use the evaluations product', from: null, to: 8 },
        { text: 'Use the testing product', from: null, to: 8 },
      ],
      solution: [
        { when: 'Days 1–2', text: 'Write the question down. One sentence.' },
        { when: 'Days 3–10', text: 'Test all five untested outcomes, 10 people each.' },
        { when: 'Days 11–14', text: 'Rank by how badly they fail, not how loud the ask was.' },
        { when: 'Last day', text: 'Name the two we fix first.' },
      ],
    },

    {
      id: 'deploy',
      name: 'Deploy',
      reach: '4 show anyone',
      cycle: 'Cycle 4 · 2 weeks',
      question: 'What stops a working thing reaching a colleague?',
      problem: [
        'What they built dies on their laptop.',
        'One outcome clears the bar. We cannot say why.',
      ],
      outcomes: [
        { text: 'Launch an app to Azure, guided', from: 5, to: 8 },
        { text: 'DAISY Assess live for Muswellbrook', from: 8, to: 8, passing: true },
        { text: 'We can say why the one that works, works', learning: true },
      ],
      solution: [
        { when: 'Days 1–2', text: 'Write the question down. One sentence.' },
        { when: 'Days 3–7', text: 'Interview everyone on the Muswellbrook launch.' },
        { when: 'Days 8–10', text: 'Try the same path with a second council.' },
      ],
    },
  ],
};
