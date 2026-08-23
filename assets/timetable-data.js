/* ------------------------------------------------------------------
   Three lines, against the clock.

   One lane per team, time running left to right in two-week sprints —
   the cadence we actually work in, not quarters. Months band across the
   top so eight columns stay readable.

   The white couplings are interlocks: two pieces of work that have to
   land in the same sprint or neither of them counts.

   COPY RULE: a station name is a name, not a sentence. Interlock
   captions get two lines at most.

   ⚠️  PLACEHOLDER CONTENT. Replace the wording; keep the shape.
------------------------------------------------------------------- */

window.TIMETABLE = {

  intro: {
    title: 'The same three lines, against the clock.',
  },

  /* One entry per sprint. Station positions are given as a column
     index, so re-cutting the calendar moves every station with it. */
  columns: [
    '27 Jul', '10 Aug', '24 Aug', '7 Sep',
    '21 Sep', '5 Oct', '19 Oct', '2 Nov',
  ],

  /* Which sprint we are in. Everything to the left of it has happened. */
  now: 2,

  /* Bands above the sprints. The spans have to add up to columns.length. */
  months: [
    { label: 'July', span: 1 },
    { label: 'August', span: 2 },
    { label: 'September', span: 2 },
    { label: 'October', span: 2 },
    { label: 'November', span: 1 },
  ],

  lanes: [
    {
      id: 'product',
      name: 'Product / Discovery',
      colour: 'product',
      laid: 2,                                   // solid track up to this column
      stations: [
        { col: 0, name: 'Onboarding',       state: 'Shipped' },
        { col: 2, name: 'Usability Set up', state: 'In build', interlock: true },
        { col: 4, name: 'Usability Build',  state: 'Sprint 21/9' },
        { col: 6, name: 'Usability Deploy', state: 'Sprint 19/10' },
      ],
    },
    {
      id: 'infra',
      name: 'Scale / Infra',
      colour: 'infra',
      laid: 2,
      stations: [
        { col: 0, name: 'Tenant isolation', state: 'Shipped' },
        { col: 2, name: 'Workspace API',    state: 'In build',    interlock: true },
        { col: 4, name: 'Per-agent quotas', state: 'Sprint 21/9', interlock: true },
        { col: 6, name: 'Models in tenant', state: 'Sprint 19/10' },
      ],
    },
    {
      id: 'daisy',
      name: 'DAISY',
      colour: 'daisy',
      laid: 2,
      stations: [
        { col: 0, name: 'Agent runtime',        state: 'Shipped' },
        { col: 2, name: 'Tool permissions',     state: 'In build' },
        { col: 4, name: 'Evals and guardrails', state: 'Sprint 21/9', interlock: true },
        { col: 6, name: 'Autonomous runs',      state: 'Sprint 19/10' },
      ],
    },
  ],

  /* A coupling joins two adjacent lanes in one sprint. */
  interlocks: [
    {
      col: 2, from: 'product', to: 'infra',
      when: 'Interlock · sprint 24/8',
      text: 'The builder cannot ship until the API under it does.',
    },
    {
      col: 4, from: 'infra', to: 'daisy',
      when: 'Interlock · sprint 21/9',
      text: 'You cannot cap an agent until it can say what it is doing.',
    },
  ],
};
