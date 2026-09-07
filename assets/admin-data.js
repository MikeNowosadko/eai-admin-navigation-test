/* ------------------------------------------------------------------
   Seeded tenancy for the admin/settings prototype.
   One workspace, one signed-in owner, five processes.

   SCOPE: the product is a form builder. A submission is a form someone
   filled in — it is completed, in progress, or abandoned. There is no
   reviewer queue in the UI except where a process name implies one
   (Leave approval is the user-testing scenario).

   Analytics packs are per process. Each client's step entries sum to
   the process totals, and KPIs are derived from those steps (see
   admin-analytics.js) so no two screens disagree.
------------------------------------------------------------------- */

window.ADMIN = (function () {
  const A = window.ADANALYTICS;

  const workspace = {
    id: 'northwind-ops',
    name: 'Northwind Ops',
    initial: 'N',
    plan: 'Builder',
    region: 'Australia (Sydney)',
    seatsUsed: 7,
    seatsTotal: 10,
    invitesPending: 1,
  };

  const user = {
    name: 'Gareth Chainey',
    av: 'GC',
    role: 'Owner',
    email: 'gareth@northwindops.com',
    title: 'Product design',
  };

  const members = [
    { av: 'GC', name: 'Gareth Chainey', email: 'gareth@northwindops.com', role: 'Owner', builds: ['No-code', 'CLI'], seen: 'Active now' },
    { av: 'PS', name: 'Priya Sharma', email: 'priya@northwindops.com', role: 'Admin', builds: ['No-code'], seen: '2 hours ago' },
    { av: 'TH', name: 'Tom Halloran', email: 'tom@northwindops.com', role: 'Builder', builds: ['CLI'], seen: 'Yesterday' },
    { av: 'ML', name: 'Mei Lin', email: 'mei@northwindops.com', role: 'Builder', builds: ['No-code'], seen: '3 days ago' },
    { av: 'RI', name: 'Rafael Ibarra', email: 'rafael@northwindops.com', role: 'Builder', builds: ['No-code'], seen: 'Last week' },
    { av: 'AV', name: 'Anneliese Vogt', email: 'anneliese@northwindops.com', role: 'Viewer', builds: [], seen: '2 weeks ago' },
    { av: 'DK', name: 'Dana Kowalski', email: 'dana@bendigobank.com.au', role: 'Viewer', builds: [], seen: 'Invited 2 days ago', pending: true },
  ];

  const harness = {
    surface: 'nocode',
    agent: 'Claude Code',
    model: 'Claude Opus 5',
    creditCap: '25 credits',
    cliRoles: { Owner: true, Admin: true, Builder: true, Viewer: false },
    install: 'npx @eai/cli login --workspace northwind-ops',
  };

  const processes = [
    { id: 'kyc-onboarding', name: 'KYC Onboarding', initial: 'K', subtitle: 'Customer identity verification · Finance', desc: 'Collect documents and verify identity in four steps.', status: 'Live', seen: '2h ago', hoursAgo: 2, url: 'kyc.northwindops.app', access: 'Anyone in workspace', badge: true },
    { id: 'leave-approval', name: 'Leave approval', initial: 'L', subtitle: 'HR · Form · Approval · Table', desc: 'The most common approval in any company, currently living in email.', status: 'Live', seen: '1h ago', hoursAgo: 1, url: 'leave.northwindops.app', access: 'Anyone in workspace', badge: true },
    { id: 'candidate-screening', name: 'Candidate Screening', initial: 'C', subtitle: 'Shortlisting · People', desc: 'Score applicants against a rubric and shortlist the top of the list.', status: 'Live', seen: 'Yesterday', hoursAgo: 26, url: 'screening.northwindops.app', access: 'Only invited people', badge: true },
    { id: 'vendor-onboarding', name: 'Vendor Onboarding', initial: 'V', subtitle: 'Supplier checks · Procurement', desc: 'Collect vendor details and run compliance checks.', status: 'Draft', seen: '3d ago', hoursAgo: 72, url: '—', access: 'Only invited people', badge: true },
    { id: 'invoice-processing', name: 'Invoice processing', initial: 'I', subtitle: 'PO matching · Finance', desc: 'Capture invoice details and match them to purchase orders.', status: 'Draft', seen: 'Last week', hoursAgo: 168, url: '—', access: 'Only invited people', badge: true },
  ];

  const STATUS = {
    completed: { label: 'Completed', tone: 'green' },
    in_progress: { label: 'In progress', tone: 'amber' },
    abandoned: { label: 'Abandoned', tone: 'red' },
  };

  const OS_DEFAULTS = {
    Desktop: ['macOS 15.6', 'Windows 11', 'macOS 14.7'],
    Mobile: ['iOS 18.6', 'Android 15'],
    Tablet: ['iPadOS 18.6', 'Android 15'],
  };

  function submissionOs(s) {
    if (s.os) return s.os;
    const opts = OS_DEFAULTS[s.device] || ['—'];
    const i = String(s.ref).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % opts.length;
    return opts[i];
  }

  /** Build clients + overview from step seeds for one process. */
  function buildPack(steps, clientSeed, submissions, extras) {
    const clients = clientSeed.map((c) => {
      const metrics = A.stepMetrics(steps, c.entries, c.completed, c.times);
      const s = A.summary(metrics);
      return {
        ...c,
        steps,
        metrics,
        submissions: s.total,
        completed: s.completed,
        completionRate: s.completionRate,
        avgMinutes: s.avgMinutes,
        inProgress: c.inProgress,
        abandoned: s.total - s.completed - c.inProgress,
        share: 0,
      };
    });

    const processMetrics = A.stepMetrics(
      steps,
      steps.map((_, i) => clients.reduce((a, c) => a + c.entries[i], 0)),
      clients.reduce((a, c) => a + c.completed, 0),
      steps.map((_, i) => {
        const total = clients.reduce((a, c) => a + c.entries[i], 0);
        const weighted = clients.reduce((a, c) => a + c.times[i] * c.entries[i], 0);
        return Math.round((weighted / total) * 10) / 10;
      }),
    );
    const processSummary = A.summary(processMetrics);
    clients.forEach((c) => { c.share = Math.round((c.submissions / processSummary.total) * 100); });

    const overview = {
      steps,
      metrics: processMetrics,
      summary: processSummary,
      activeUsers: extras.activeUsers,
      devices: extras.devices,
    };

    return { steps, clients, overview, submissions };
  }

  const KYC_STEPS = ['Personal Details', 'Upload Documents', 'Review & Confirm', 'Submit'];

  const PACKS = {
    'kyc-onboarding': buildPack(
      KYC_STEPS,
      [
        { id: 'adaptovate', name: 'Adaptovate', initial: 'A', entries: [612, 578, 430, 402], completed: 396, inProgress: 38, times: [1.3, 2.2, 0.8, 0.5] },
        { id: 'bendigo-bank', name: 'Bendigo Bank', initial: 'B', entries: [431, 372, 190, 168], completed: 160, inProgress: 41, times: [2.0, 4.1, 1.2, 0.7] },
        { id: 'telstra-health', name: 'Telstra Health', initial: 'T', entries: [241, 220, 139, 120], completed: 116, inProgress: 19, times: [1.7, 3.0, 1.0, 0.6] },
      ],
      {
        adaptovate: [
          { ref: 'KYC-1284', who: 'Marguerite Okafor', email: 'm.okafor@adaptovate.com', status: 'in_progress', at: '30 Aug, 09:14', minutes: 3.2, step: 2, device: 'Mobile' },
          { ref: 'KYC-1283', who: 'Deshawn Whitfield', email: 'd.whitfield@adaptovate.com', status: 'completed', at: '30 Aug, 08:02', minutes: 4.6, step: 4, device: 'Desktop' },
          { ref: 'KYC-1281', who: 'Anneliese Vogt', email: 'a.vogt@adaptovate.com', status: 'completed', at: '29 Aug, 17:40', minutes: 5.1, step: 4, device: 'Desktop' },
          { ref: 'KYC-1279', who: 'Rafael Ibarra', email: 'r.ibarra@adaptovate.com', status: 'abandoned', at: '29 Aug, 14:22', minutes: 2.4, step: 2, device: 'Mobile' },
          { ref: 'KYC-1277', who: 'Yuki Tanaka', email: 'y.tanaka@adaptovate.com', status: 'completed', at: '29 Aug, 11:05', minutes: 4.2, step: 4, device: 'Tablet' },
          { ref: 'KYC-1274', who: 'Grace Mutumbo', email: 'g.mutumbo@adaptovate.com', status: 'completed', at: '28 Aug, 16:31', minutes: 6.0, step: 4, device: 'Desktop' },
        ],
        'bendigo-bank': [
          { ref: 'KYC-1282', who: 'Callum Beattie', email: 'c.beattie@bendigobank.com.au', status: 'abandoned', at: '30 Aug, 08:47', minutes: 3.9, step: 2, device: 'Mobile' },
          { ref: 'KYC-1280', who: 'Sunita Rao', email: 's.rao@bendigobank.com.au', status: 'in_progress', at: '29 Aug, 16:12', minutes: 5.4, step: 2, device: 'Mobile' },
          { ref: 'KYC-1276', who: 'Hamish Dunlop', email: 'h.dunlop@bendigobank.com.au', status: 'completed', at: '29 Aug, 10:38', minutes: 8.7, step: 4, device: 'Desktop' },
          { ref: 'KYC-1271', who: 'Ines Ferreira', email: 'i.ferreira@bendigobank.com.au', status: 'abandoned', at: '28 Aug, 13:55', minutes: 4.8, step: 2, device: 'Mobile' },
          { ref: 'KYC-1268', who: 'Barnaby Quill', email: 'b.quill@bendigobank.com.au', status: 'completed', at: '28 Aug, 09:02', minutes: 9.3, step: 4, device: 'Desktop' },
        ],
        'telstra-health': [
          { ref: 'KYC-1278', who: 'Aroha Ngata', email: 'a.ngata@telstrahealth.com', status: 'completed', at: '29 Aug, 15:20', minutes: 6.1, step: 4, device: 'Desktop' },
          { ref: 'KYC-1275', who: 'Oliver Ashby', email: 'o.ashby@telstrahealth.com', status: 'in_progress', at: '29 Aug, 09:44', minutes: 2.8, step: 3, device: 'Tablet' },
          { ref: 'KYC-1270', who: 'Fatima El-Amin', email: 'f.elamin@telstrahealth.com', status: 'completed', at: '28 Aug, 12:07', minutes: 5.6, step: 4, device: 'Desktop' },
          { ref: 'KYC-1266', who: 'Jonah Priestley', email: 'j.priestley@telstrahealth.com', status: 'abandoned', at: '27 Aug, 17:31', minutes: 3.1, step: 2, device: 'Mobile' },
        ],
      },
      {
        activeUsers: 342,
        devices: [
          { name: 'Desktop', pct: 62, users: 798, complete: 74, color: '#2563EB' },
          { name: 'Mobile', pct: 29, users: 372, complete: 57, color: '#F59E0B' },
          { name: 'Tablet', pct: 9, users: 114, complete: 61, color: '#8B5CF6' },
        ],
      },
    ),

    'leave-approval': buildPack(
      ['Request details', 'Dates & type', 'Manager review', 'Submit'],
      [
        { id: 'northwind-staff', name: 'Northwind Ops staff', initial: 'N', entries: [142, 138, 128, 121], completed: 118, inProgress: 12, times: [0.8, 0.6, 1.2, 0.4] },
      ],
      {
        'northwind-staff': [
          { ref: 'LVE-1048', who: 'Priya Sharma', email: 'priya@northwindops.com', status: 'completed', at: '2 Sep, 08:41', minutes: 2.8, step: 4, device: 'Desktop', os: 'macOS 15.6', leaveType: 'Annual leave', thisWeek: true },
          { ref: 'LVE-1047', who: 'Tom Halloran', email: 'tom@northwindops.com', status: 'in_progress', at: '2 Sep, 07:15', minutes: 1.9, step: 3, device: 'Mobile', os: 'iOS 18.6', leaveType: 'Sick leave', thisWeek: true },
          { ref: 'LVE-1046', who: 'Mei Lin', email: 'mei@northwindops.com', status: 'completed', at: '1 Sep, 16:22', minutes: 3.1, step: 4, device: 'Desktop', os: 'Windows 11', leaveType: 'Annual leave', thisWeek: true },
          { ref: 'LVE-1045', who: 'Rafael Ibarra', email: 'rafael@northwindops.com', status: 'completed', at: '1 Sep, 11:08', minutes: 2.4, step: 4, device: 'Desktop', os: 'macOS 15.6', leaveType: 'Personal leave', thisWeek: true },
          { ref: 'LVE-1044', who: 'Anneliese Vogt', email: 'anneliese@northwindops.com', status: 'in_progress', at: '1 Sep, 09:30', minutes: 2.0, step: 3, device: 'Mobile', os: 'Android 15', leaveType: 'Sick leave', thisWeek: true },
          { ref: 'LVE-1043', who: 'Grace Mutumbo', email: 'g.mutumbo@northwindops.com', status: 'completed', at: '29 Aug, 14:18', minutes: 3.4, step: 4, device: 'Desktop', os: 'macOS 14.7', leaveType: 'Annual leave' },
          { ref: 'LVE-1042', who: 'Hamish Dunlop', email: 'h.dunlop@northwindops.com', status: 'abandoned', at: '28 Aug, 10:02', minutes: 1.2, step: 2, device: 'Mobile', os: 'iOS 18.5', leaveType: 'Sick leave' },
          { ref: 'LVE-1041', who: 'Sunita Rao', email: 's.rao@northwindops.com', status: 'completed', at: '27 Aug, 15:44', minutes: 2.6, step: 4, device: 'Tablet', os: 'iPadOS 18.6', leaveType: 'Annual leave' },
        ],
      },
      {
        activeUsers: 89,
        devices: [
          { name: 'Desktop', pct: 54, users: 48, complete: 88, color: '#2563EB' },
          { name: 'Mobile', pct: 38, users: 34, complete: 79, color: '#F59E0B' },
          { name: 'Tablet', pct: 8, users: 7, complete: 82, color: '#8B5CF6' },
        ],
      },
    ),
  };

  const ANALYTICS_IDS = new Set(Object.keys(PACKS));

  const PROCESS_STATS = {
    'candidate-screening': { submissions: 486, completionRate: 61 },
  };

  processes.forEach((p) => {
    p.live = p.status === 'Live';
    p.hasAnalytics = ANALYTICS_IDS.has(p.id);
    if (!p.live) { p.stats = null; return; }
    if (PACKS[p.id]) {
      p.stats = {
        submissions: PACKS[p.id].overview.summary.total,
        completionRate: PACKS[p.id].overview.summary.completionRate,
      };
    } else {
      p.stats = PROCESS_STATS[p.id] || { submissions: 0, completionRate: 0 };
    }
  });

  const live = processes.filter((p) => p.live);
  const totalSubmissions = live.reduce((a, p) => a + p.stats.submissions, 0);
  const workspace_summary = {
    processes: processes.length,
    live: live.length,
    draft: processes.length - live.length,
    submissions: totalSubmissions,
    completionRate: totalSubmissions
      ? Math.round(live.reduce((a, p) => a + p.stats.completionRate * p.stats.submissions, 0) / totalSubmissions)
      : 0,
    creditsLeft: 42,
    creditsTotal: 100,
  };

  const leaveSubmissionsHref = 'app-submissions.html?app=leave-approval';

  /* Workspace-level resources — added in settings, allocated to apps. */
  const resources = [
    { id: 'postgres-prod', name: 'Production Postgres', type: 'Database', detail: 'Shared cluster · Sydney' },
    { id: 's3-uploads', name: 'Upload bucket', type: 'Storage', detail: 's3://northwind-uploads' },
    { id: 'sendgrid', name: 'SendGrid', type: 'Email', detail: 'Transactional mail' },
  ];

  const resourceAllocations = {
    'kyc-onboarding': ['postgres-prod', 's3-uploads'],
    'leave-approval': [],
    'candidate-screening': ['postgres-prod'],
    'vendor-onboarding': [],
    'invoice-processing': [],
  };

  const notifications = [
    {
      id: 'leave-week',
      unread: true,
      title: '5 new leave requests this week',
      body: 'Leave approval · Northwind Ops staff',
      href: leaveSubmissionsHref,
      time: '1h ago',
    },
    {
      id: 'leave-tom',
      unread: true,
      title: 'Sick leave submitted',
      body: 'Tom Halloran · awaiting manager review',
      href: leaveSubmissionsHref,
      time: '2h ago',
    },
    {
      id: 'leave-priya',
      unread: false,
      title: 'Annual leave request completed',
      body: 'Priya Sharma · 12–16 Sep',
      href: leaveSubmissionsHref,
      time: 'Yesterday',
    },
    {
      id: 'kyc-alert',
      unread: false,
      title: 'Upload Documents drop-off is up',
      body: 'KYC Onboarding · Adaptovate',
      href: 'app-analytics.html?app=kyc-onboarding',
      time: '2d ago',
    },
  ];

  function pack(processId) {
    return PACKS[processId] || PACKS['kyc-onboarding'];
  }

  function clientsFor(processId) {
    return pack(processId).clients;
  }

  function overviewFor(processId) {
    return pack(processId).overview;
  }

  function stepsFor(processId) {
    return pack(processId).steps;
  }

  function submissionsFor(processId, clientId) {
    return pack(processId).submissions[clientId] || [];
  }

  /** Every submission for a process in one list — no client drill-down required. */
  function allSubmissionsFor(processId) {
    const p = PACKS[processId];
    if (!p) return [];
    const multi = p.clients.length > 1;
    return p.clients.flatMap((c) =>
      (p.submissions[c.id] || []).map((s) => ({
        ...s,
        clientId: c.id,
        clientName: multi ? c.name : null,
      })),
    );
  }

  function newThisWeek(processId) {
    const p = pack(processId);
    return Object.values(p.submissions).flat().filter((s) => s.thisWeek);
  }

  function client(id, processId) {
    const list = clientsFor(processId || 'kyc-onboarding');
    return list.find((c) => c.id === id) || list[0];
  }

  function process(id) {
    return processes.find((p) => p.id === id) || processes[0];
  }

  function resource(id) {
    return resources.find((r) => r.id === id);
  }

  function resourcesFor(processId) {
    const ids = resourceAllocations[processId] || [];
    return ids.map((rid) => resource(rid)).filter(Boolean);
  }

  /** Per-step form answers for submission detail — keyed by process:ref. */
  const SUBMISSION_ANSWERS = {
    'leave-approval:LVE-1048': [
      [{ label: 'Full name', value: 'Priya Sharma' }, { label: 'Work email', value: 'priya@northwindops.com' }, { label: 'Department', value: 'Product design' }],
      [{ label: 'Leave type', value: 'Annual leave' }, { label: 'Start date', value: '12 Sep 2026' }, { label: 'End date', value: '16 Sep 2026' }, { label: 'Working days', value: '5' }, { label: 'Reason', value: 'Family holiday — school break trip. Already discussed with Tom.' }],
      [{ label: 'Reporting manager', value: 'Tom Halloran' }, { label: 'Cover arranged', value: 'Yes — Mei Lin covering stand-ups' }, { label: 'Manager notes', value: 'Approved. Enjoy the break.' }],
      [{ label: 'Confirmation', value: 'Submitted' }],
    ],
    'leave-approval:LVE-1047': [
      [{ label: 'Full name', value: 'Tom Halloran' }, { label: 'Work email', value: 'tom@northwindops.com' }, { label: 'Department', value: 'Engineering' }],
      [{ label: 'Leave type', value: 'Sick leave' }, { label: 'Start date', value: '2 Sep 2026' }, { label: 'End date', value: '3 Sep 2026' }, { label: 'Reason', value: 'Flu — doctor certificate attached.' }],
      [{ label: 'Reporting manager', value: 'Gareth Chainey' }, { label: 'Cover arranged', value: 'Not answered' }],
      [],
    ],
    'leave-approval:LVE-1046': [
      [{ label: 'Full name', value: 'Mei Lin' }, { label: 'Work email', value: 'mei@northwindops.com' }, { label: 'Department', value: 'Operations' }],
      [{ label: 'Leave type', value: 'Annual leave' }, { label: 'Start date', value: '22 Sep 2026' }, { label: 'End date', value: '26 Sep 2026' }, { label: 'Working days', value: '5' }, { label: 'Reason', value: 'Long weekend extension.' }],
      [{ label: 'Reporting manager', value: 'Priya Sharma' }, { label: 'Cover arranged', value: 'Yes — Rafael covering inbox' }, { label: 'Manager notes', value: 'Approved.' }],
      [{ label: 'Confirmation', value: 'Submitted' }],
    ],
    'leave-approval:LVE-1045': [
      [{ label: 'Full name', value: 'Rafael Ibarra' }, { label: 'Work email', value: 'rafael@northwindops.com' }, { label: 'Department', value: 'Sales' }],
      [{ label: 'Leave type', value: 'Personal leave' }, { label: 'Start date', value: '5 Sep 2026' }, { label: 'End date', value: '5 Sep 2026' }, { label: 'Reason', value: 'Medical appointment.' }],
      [{ label: 'Reporting manager', value: 'Priya Sharma' }, { label: 'Manager notes', value: 'Approved — half day.' }],
      [{ label: 'Confirmation', value: 'Submitted' }],
    ],
    'leave-approval:LVE-1044': [
      [{ label: 'Full name', value: 'Anneliese Vogt' }, { label: 'Work email', value: 'anneliese@northwindops.com' }, { label: 'Department', value: 'Finance' }],
      [{ label: 'Leave type', value: 'Sick leave' }, { label: 'Start date', value: '1 Sep 2026' }, { label: 'End date', value: '2 Sep 2026' }, { label: 'Reason', value: 'Migraine — working from bed this morning.' }],
      [{ label: 'Reporting manager', value: 'Gareth Chainey' }, { label: 'Cover arranged', value: 'Not answered' }],
      [],
    ],
    'leave-approval:LVE-1043': [
      [{ label: 'Full name', value: 'Grace Mutumbo' }, { label: 'Work email', value: 'g.mutumbo@northwindops.com' }, { label: 'Department', value: 'Customer success' }],
      [{ label: 'Leave type', value: 'Annual leave' }, { label: 'Start date', value: '15 Sep 2026' }, { label: 'End date', value: '19 Sep 2026' }, { label: 'Reason', value: 'Annual leave — wedding travel.' }],
      [{ label: 'Reporting manager', value: 'Tom Halloran' }, { label: 'Manager notes', value: 'Approved.' }],
      [{ label: 'Confirmation', value: 'Submitted' }],
    ],
    'leave-approval:LVE-1042': [
      [{ label: 'Full name', value: 'Hamish Dunlop' }, { label: 'Work email', value: 'h.dunlop@northwindops.com' }, { label: 'Department', value: 'Engineering' }],
      [{ label: 'Leave type', value: 'Sick leave' }, { label: 'Start date', value: 'Not answered' }, { label: 'End date', value: 'Not answered' }],
      [], [],
    ],
    'leave-approval:LVE-1041': [
      [{ label: 'Full name', value: 'Sunita Rao' }, { label: 'Work email', value: 's.rao@northwindops.com' }, { label: 'Department', value: 'Legal' }],
      [{ label: 'Leave type', value: 'Annual leave' }, { label: 'Start date', value: '8 Sep 2026' }, { label: 'End date', value: '12 Sep 2026' }, { label: 'Reason', value: 'Family visit.' }],
      [{ label: 'Reporting manager', value: 'Gareth Chainey' }, { label: 'Manager notes', value: 'Approved.' }],
      [{ label: 'Confirmation', value: 'Submitted' }],
    ],
  };

  function submissionFor(processId, ref) {
    return allSubmissionsFor(processId).find((s) => s.ref === ref) || null;
  }

  function genericAnswers(processId, sub) {
    const steps = stepsFor(processId);
    if (processId === 'leave-approval') {
      return steps.map((_, i) => {
        if (i === 0) return [{ label: 'Full name', value: sub.who }, { label: 'Work email', value: sub.email }];
        if (i === 1) return [{ label: 'Leave type', value: sub.leaveType || '—' }];
        return [{ label: 'Notes', value: sub.step > i + 1 ? '—' : 'Not answered' }];
      });
    }
    if (processId === 'kyc-onboarding') {
      return steps.map((title, i) => {
        if (i === 0) return [{ label: 'Full name', value: sub.who }, { label: 'Email', value: sub.email }];
        if (i === 1 && sub.step > 1) return [{ label: 'Document type', value: 'Passport' }, { label: 'Upload status', value: sub.step > 2 ? 'Verified' : 'Pending review' }];
        if (i === 2 && sub.step > 2) return [{ label: 'Declaration', value: sub.step > 3 ? 'Confirmed' : 'Not answered' }];
        if (i === 3 && sub.step > 3) return [{ label: 'Submission', value: 'Complete' }];
        return [];
      });
    }
    return steps.map(() => []);
  }

  function submissionDetail(processId, ref) {
    const sub = submissionFor(processId, ref);
    if (!sub) return null;
    const stepTitles = stepsFor(processId);
    const answerSets = SUBMISSION_ANSWERS[`${processId}:${ref}`] || genericAnswers(processId, sub);
    const groups = stepTitles.map((title, i) => ({
      index: i,
      title,
      reached: (i + 1) <= sub.step,
      active: sub.step === i + 1 && sub.status !== 'completed',
      fields: (answerSets[i] || []).map((f) => ({
        label: f.label,
        value: f.value,
        empty: !f.value || f.value === 'Not answered',
      })),
    }));
    const fillable = groups.reduce((n, g) => n + g.fields.length, 0);
    const answered = groups.reduce((n, g) => n + g.fields.filter((f) => !f.empty).length, 0);
    return { submission: sub, groups, fillable, answered };
  }

  function unreadCount() {
    return notifications.filter((n) => n.unread).length;
  }

  /* Legacy aliases — default to KYC for anything that still reads them. */
  const kyc = PACKS['kyc-onboarding'];

  return {
    workspace,
    user,
    members,
    harness,
    processes,
    summary: workspace_summary,
    STATUS,
    notifications,
    unreadCount,
    newThisWeek,
    clientsFor,
    overviewFor,
    stepsFor,
    submissionsFor,
    allSubmissionsFor,
    submissionOs,
    client,
    process,
    resource,
    resources,
    resourceAllocations,
    resourcesFor,
    submissionFor,
    submissionDetail,
    STEPS: kyc.steps,
    overview: kyc.overview,
    clients: kyc.clients,
    submissions: kyc.submissions,
  };
})();
