import type { CandidateRow, SmartTableColumn, SourceBinding } from './types';

// The rubric-derived criteria columns (deriveColumns output, shown as config.dataConfig.columns).
export const BASE_COLUMNS: SmartTableColumn[] = [
  { key: 'technical', label: 'Technical', valueType: 'number', align: 'right' },
  { key: 'communication', label: 'Communication', valueType: 'number', align: 'right' },
  { key: 'culture', label: 'Culture fit', valueType: 'number', align: 'right' },
  { key: 'experience', label: 'Experience', valueType: 'number', align: 'right' },
  { key: 'total', label: 'Total', valueType: 'number', align: 'right' },
];

const NAMES = [
  'Mara Ortiz', 'Devin Park', 'Aria Chen', 'Rafael Silva', 'Priya Nair',
  'Jonah Feld', 'Lena Kovac', 'Sam Whitfield', 'Nadia Rahman', 'Tomas Berg',
  'Iris Yeung', 'Marcus Bell', 'Sofia Marin', 'Elias Novak', 'Grace Okoro',
  'Leo Fischer', 'Hana Sato', 'Owen Pryce', 'Zoe Adler', 'Ravi Menon',
  'Clara Dubois', 'Noah Reid', 'Amara Diallo', 'Felix Braun',
];

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

// Deterministic pseudo-score so the same candidate always scores the same (no Math.random).
function score(i: number, salt: number): number {
  const v = Math.abs(Math.sin((i + 1) * (salt + 3) * 12.9898) * 43758.5453);
  const frac = v - Math.floor(v); // 0..1
  return Math.round((6.5 + frac * 3) * 10) / 10; // 6.5 .. 9.5, one decimal
}

function makeCandidate(i: number): CandidateRow {
  const name = NAMES[i % NAMES.length];
  const technical = score(i, 1);
  const communication = score(i, 2);
  const culture = score(i, 3);
  const experience = score(i, 4);
  const total = Math.round(((technical + communication + culture + experience) / 4) * 10) / 10;
  return {
    id: `c${i}`,
    name,
    initials: initials(name),
    cells: { technical, communication, culture, experience, total },
  };
}

const ALL = NAMES.map((_, i) => makeCandidate(i));

// Different data sources resolve to different candidate sets — the point of the data layer.
const UPLOAD_ROWS = ALL.slice(0, 8); // recruiter uploaded 8 resumes this run
const WORKFLOW_ROWS = ALL; // 24 pulled from an upstream "Receive applications" workflow
const DATA_SOURCE_ROWS = ALL.slice(0, 12); // a pinned "Talent pool" data source

export function describeRowsSource(kind: SourceBinding['kind']): { label: string; count: number } {
  if (kind === 'block-output')
    return { label: 'Upstream workflow · "Receive applications"', count: WORKFLOW_ROWS.length };
  if (kind === 'object-type')
    return { label: 'Data source · "Talent pool" (SharePoint)', count: DATA_SOURCE_ROWS.length };
  return { label: 'Runtime upload · resumes (this run)', count: UPLOAD_ROWS.length };
}

// The app-side adapter: resolveRows(binding) — the package block never sees this logic.
export const candidateAdapter = {
  resolveRows(binding: SourceBinding): CandidateRow[] {
    if (binding.kind === 'block-output') return WORKFLOW_ROWS;
    if (binding.kind === 'object-type') return DATA_SOURCE_ROWS;
    return UPLOAD_ROWS;
  },
};
