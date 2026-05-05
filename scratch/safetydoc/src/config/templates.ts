export interface FieldConfig {
  id: string;
  label: string;
  type: 'text' | 'date' | 'signature' | 'number' | 'tel';
}

export interface DocTemplate {
  id: string;
  name: string;
  docxUrl: string;
  fields: FieldConfig[];
}

export const WORKER_ROLES = ['작업책임자', '철도운행관리자', '작업자', '입회자'] as const;
export type WorkerRole = typeof WORKER_ROLES[number];

export interface WorkerData {
  name: string;
  nameHandwritten: string;
  signature: string;
  role: WorkerRole;
}

export const COMMON_FIELDS = [
  { id: 'date', label: '날짜', type: 'date' },
  { id: 'projectName', label: '공사명', type: 'text' },
  { id: 'companyName', label: '업체이름', type: 'text' },
  { id: 'approvalNo', label: '승인번호', type: 'text' },
  { id: 'witness', label: '입회자', type: 'text' },
  { id: 'witnessPhone', label: '입회자 전화번호', type: 'tel' },
] as const;

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: 'tbm',
    name: 'TBM 일지',
    docxUrl: '/templates/tbm.docx',
    fields: [
      { id: 'date', label: '날짜', type: 'date' },
      { id: 'projectName', label: '공사명', type: 'text' },
      { id: 'companyName', label: '업체이름', type: 'text' },
      { id: 'approvalNo', label: '승인번호', type: 'text' },
      { id: 'witness', label: '입회자', type: 'text' },
      { id: 'witnessPhone', label: '입회자 전화번호', type: 'tel' },
    ],
  },
  {
    id: 'alcohol',
    name: '음주측정 기록부',
    docxUrl: '/templates/alcohol.docx',
    fields: [
      { id: 'date', label: '날짜', type: 'date' },
      { id: 'companyName', label: '업체명', type: 'text' },
    ],
  },
  {
    id: 'railway',
    name: '철도운행관리자 일지',
    docxUrl: '/templates/railway.docx',
    fields: [
      { id: 'date', label: '날짜', type: 'date' },
      { id: 'projectName', label: '공사명', type: 'text' },
      { id: 'witness', label: '입회자', type: 'text' },
      { id: 'witnessPhone', label: '입회자 전화번호', type: 'tel' },
    ],
  },
  {
    id: 'daily_report',
    name: '일일업무보고',
    docxUrl: '/templates/daily_report.docx',
    fields: [
      { id: 'date', label: '날짜', type: 'date' },
      { id: 'projectName', label: '공사명', type: 'text' },
      { id: 'companyName', label: '업체이름', type: 'text' },
    ],
  },
  {
    id: 'supervision_diary',
    name: '공사감독일지',
    docxUrl: '/templates/supervision_diary.docx',
    fields: [
      { id: 'date', label: '날짜', type: 'date' },
      { id: 'projectName', label: '공사명', type: 'text' },
    ],
  },
];
