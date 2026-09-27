export const WASH_TYPES = ['MANUAL', 'AUTOMATIC', 'DETAILING', 'MULTI_SERVICE'] as const;
export const CURRENT_SYSTEMS = ['NOTEBOOK', 'WHATSAPP', 'EXCEL', 'EXISTING_SOFTWARE', 'NONE'] as const;
export const INTERESTS = ['HOT', 'WARM', 'COLD', 'NOT_INTERESTED'] as const;
export const STATUSES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'CONVERTED', 'LOST'] as const;

export type WashType = (typeof WASH_TYPES)[number];
export type CurrentSystem = (typeof CURRENT_SYSTEMS)[number];
export type Interest = (typeof INTERESTS)[number];
export type LeadStatus = (typeof STATUSES)[number];

export const LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  AUTOMATIC: 'Automatic',
  DETAILING: 'Detailing',
  MULTI_SERVICE: 'Multi-service',
  NOTEBOOK: 'Notebook',
  WHATSAPP: 'WhatsApp',
  EXCEL: 'Excel',
  EXISTING_SOFTWARE: 'Existing software',
  NONE: 'None',
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
  NOT_INTERESTED: 'Not interested',
  NEW: 'New',
  CONTACTED: 'Contacted',
  DEMO_SCHEDULED: 'Demo scheduled',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

export const label = (k: string | null | undefined) => (k ? LABELS[k] ?? k : '');

/** Validated categorical palette for interest (gray = intentionally neutral "not interested"). */
export const INTEREST_COLORS: Record<Interest, string> = {
  HOT: '#d9433f',
  WARM: '#eda100',
  COLD: '#2a78d6',
  NOT_INTERESTED: '#8a8f98',
};

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod',
];
