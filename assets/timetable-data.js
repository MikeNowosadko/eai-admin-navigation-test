/* ------------------------------------------------------------------
   Three lines, against the clock.

   One lane per team, time running left to right. The white couplings
   are interlocks: two pieces of work that have to land in the same
   quarter or neither of them counts.

   COPY RULE: a station name is a name, not a sentence. Interlock
   captions get two lines at most.

   ⚠️  PLACEHOLDER CONTENT. Replace the wording; keep the shape.
------------------------------------------------------------------- */

window.TIMETABLE = {

  intro: {
    title: 'The same three lines, against the clock.',
  },

  /* Four columns. Station positions are given as a column index, so
     changing the quarters here moves every station with them. */
  columns: ['Working today', 'Q4 2026', 'Q1 2027', 'Q2 2027 →'],

  lanes: [
    {
      id: 'product',
      name: 'Product / Discovery',
      colour: 'product',
      laid: 1,                                   // solid track up to this column
      stations: [
        { col: 0, name: 'Onboarding',       state: 'Shipped' },
        { col: 1, name: 'Usability Set up', state: 'In build', interlock: true },
        { col: 2, name: 'Usability Build',  state: 'Q1 2027' },
        { col: 3, name: 'Usability Deploy', state: 'Q2 2027' },
      ],
    },
    {
      id: 'infra',
      name: 'Scale / Infra',
      colour: 'infra',
      laid: 1,
      stations: [
        { col: 0, name: 'Tenant isolation', state: 'Shipped' },
        { col: 1, name: 'Workspace API',    state: 'In build', interlock: true },
        { col: 2, name: 'Per-agent quotas', state: 'Q1 2027',  interlock: true },
        { col: 3, name: 'Models in tenant', state: 'Q2 2027' },
      ],
    },
    {
      id: 'daisy',
      name: 'DAISY',
      colour: 'daisy',
      laid: 1,
      stations: [
        { col: 0, name: 'Agent runtime',        state: 'Shipped' },
        { col: 1, name: 'Tool permissions',     state: 'In build' },
        { col: 2, name: 'Evals and guardrails', state: 'Q1 2027', interlock: true },
        { col: 3, name: 'Autonomous runs',      state: 'Q2 2027' },
      ],
    },
  ],

  /* A coupling joins two adjacent lanes in one column. */
  interlocks: [
    {
      col: 1, from: 'product', to: 'infra',
      when: 'Interlock · Q4 2026',
      text: 'The builder cannot ship until the API under it does.',
    },
    {
      col: 2, from: 'infra', to: 'daisy',
      when: 'Interlock · Q1 2027',
      text: 'You cannot cap an agent until it can say what it is doing.',
    },
  ],
};
