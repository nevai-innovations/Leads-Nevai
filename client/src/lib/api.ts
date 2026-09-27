import type { CurrentSystem, Interest, LeadStatus, WashType } from './constants';

export interface Lead {
  id: string;
  serialNo: number;
  serial: string;
  businessName: string;
  contactName: string;
  mobile: string;
  whatsapp: string | null;
  location: string;
  district: string;
  mapsLink: string | null;
  washType: WashType;
  dailyVehicles: number;
  currentSystem: CurrentSystem;
  remarks: string | null;
  interest: Interest;
  followUpDate: string | null;
  followUpCompleted: boolean;
  status: LeadStatus;
  collectedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpNote {
  id: string;
  leadId: string;
  note: string;
  outcome: string | null;
  scheduledFor: string | null;
  completed: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface LeadDetail extends Lead {
  followUps: FollowUpNote[];
}

export interface LeadInput {
  businessName: string;
  contactName: string;
  mobile: string;
  whatsapp: string;
  location: string;
  district: string;
  mapsLink: string;
  washType: WashType | '';
  dailyVehicles: string;
  currentSystem: CurrentSystem | '';
  remarks: string;
  interest: Interest | '';
  followUpDate: string;
  status: LeadStatus;
  collectedBy: string;
}

export interface Paged<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardData {
  today: string;
  kpis: {
    total: number;
    hot: number;
    warm: number;
    demoScheduled: number;
    converted: number;
    conversionRate: number;
    dueToday: number;
    overdue: number;
    addedThisWeek: number;
  };
  byInterest: { key: Interest; count: number }[];
  byStatus: { key: LeadStatus; count: number }[];
  byDistrict: { district: string; HOT: number; WARM: number; COLD: number; NOT_INTERESTED: number; total: number }[];
  overTime: { weekStart: string; count: number }[];
  funnel: { stage: string; count: number }[];
  followUpsThisWeek: { days: { date: string; count: number }[]; leads: Lead[] };
  topDistricts: { district: string; hot: number; warm: number; total: number; share: number }[];
  topLocations: { location: string; district: string; hot: number; warm: number }[];
}

export interface ReportsData {
  avgDailyVehicles: number;
  totalDailyVehicles: number;
  byCollector: { collector: string; total: number; converted: number; demo: number; lost: number }[];
  byWashType: { key: WashType; total: number; avgVehicles: number }[];
  bySystem: { key: CurrentSystem; total: number; hotWarm: number }[];
  byDistrict: { district: string; total: number; converted: number; open: number }[];
}

export interface FollowUpsData {
  overdue: Lead[];
  today: Lead[];
  upcoming: Lead[];
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.fieldErrors);
  return body as T;
}

export type LeadFilters = Record<string, string | undefined>;

export function toQuery(params: LeadFilters): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  listLeads: (params: LeadFilters) => request<Paged<Lead>>(`/leads${toQuery(params)}`),
  getLead: (id: string) => request<LeadDetail>(`/leads/${id}`),
  createLead: (data: LeadInput) => request<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: LeadInput) => request<Lead>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) => request<void>(`/leads/${id}`, { method: 'DELETE' }),
  addFollowUp: (
    id: string,
    data: { note: string; outcome?: string; markComplete: boolean; nextFollowUpDate?: string; status?: LeadStatus; createdBy?: string },
  ) => request<{ note: FollowUpNote; lead: Lead }>(`/leads/${id}/followups`, { method: 'POST', body: JSON.stringify(data) }),
  dashboard: () => request<DashboardData>('/dashboard'),
  followUps: () => request<FollowUpsData>('/followups'),
  reports: () => request<ReportsData>('/reports'),
  meta: () => request<{ districts: string[]; collectors: string[] }>('/meta'),
  exportUrl: (format: 'csv' | 'xlsx', params: LeadFilters) => `/api/leads/export${toQuery({ ...params, format, page: undefined, pageSize: undefined })}`,
};
