export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const adminToken = () => { try { return sessionStorage.getItem('adminToken') || ''; } catch { return ''; } };

export class ApiError extends Error {
  constructor(public code: string, public params: Record<string, unknown> = {}, public status = 400) { super(code); }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    let body: { code?: string; params?: Record<string, unknown> } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiError(body.code || 'unknown', body.params, res.status);
  }
  return res.json();
}
const json = (method: string, body: unknown, admin = false): RequestInit => ({
  method, body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...(admin ? { 'x-admin-token': adminToken() } : {}) },
});

export interface Code { code: string; display: string; unit: string | null; description: string }
export interface Rate {
  code: string; dutyPercent: number | null; dutySpecific: number | null; dutyCurrency: string | null;
  excisePercent: number | null; exciseSpecific: number | null; exciseCurrency: string | null;
  vatPercent: number | null; utilFee: number | null; note: string | null;
}
export interface CodeDetail extends Code {
  path: string[]; rate: Rate | null;
  documents: { id: number; title: string; kind: string }[];
  preferences: { id: number; name: string; nameEn: string | null; nameUz: string | null; source: string; dutyPercent: number; validTo: string }[];
}
export interface TreeNode { prefix: string; title: string; count?: number; leaf: boolean; display?: string; unit?: string | null }
export interface Country { iso: string; name: string; regime: string; goodsListOnly: boolean }
export interface CalcItem { code: string; price: number; freight?: number; insurance?: number; qty?: number }
export interface CalcRequest {
  mode: 'import' | 'export' | 'temporary'; date: string; hasCertificate: boolean;
  origin: string; dispatch: string; trader: string; currency: string; lang: string;
  fxRates: Record<string, number>; tempMonths?: number; items: CalcItem[];
}
export interface ItemResult {
  code: string; display: string; description: string; unit: string | null; customsValue: number;
  regime: string; dutyPct: number; dutySpecific: number | null; dutySpecificCurrency: string | null;
  excisePct: number | null; vatPct: number; feePct: number; qty: number;
  preferenceApplied: boolean; additionalApplied: boolean; dutyRateLabel: string;
  duty: number; excise: number; vat: number; fee: number; util: number; total: number;
  notes: string[]; warnings: string[];
}
export interface CalcResponse {
  date: string; mode: string; currency: string; fxRate: number; tempMonths: number; items: ItemResult[];
  totals: Record<'customsValue' | 'duty' | 'excise' | 'vat' | 'fee' | 'util' | 'total', number>;
}
export interface Stats { codes: number; rates: number; demoRates: number; documents: number }

export const api = {
  search: (q: string) => req<Code[]>(`/tnved/search?q=${encodeURIComponent(q)}`),
  tree: (prefix: string) => req<TreeNode[]>(`/tnved/tree?prefix=${prefix}`),
  detail: (code: string) => req<CodeDetail>(`/tnved/${code}`),
  countries: () => req<Country[]>('/countries'),
  fx: () => req<{ rates: Record<string, number>; date?: string }>('/fx'),
  stats: () => req<Stats>('/stats'),
  calc: (b: CalcRequest) => req<CalcResponse>('/calc', json('POST', b)),
  exportXlsx: async (b: CalcRequest) => {
    const res = await fetch(`${API_BASE_URL}/calc/export`, json('POST', b));
    if (!res.ok) throw new ApiError('export');
    return res.blob();
  },
  settings: () => req<Record<string, string>>('/settings'),
  saveSettings: (s: Record<string, string>) => req<Record<string, string>>('/settings', json('PUT', s, true)),
  upload: (kind: 'codes' | 'rates' | 'documents', file: File, replace: boolean) => {
    const fd = new FormData();
    fd.append('file', file);
    return req<{ imported: number }>(`/admin/import/${kind}?replace=${replace}`, {
      method: 'POST', body: fd, headers: { 'x-admin-token': adminToken() },
    });
  },
};

export const today = () => new Date().toISOString().slice(0, 10);
export const digitsOnly = (s: string) => s.replace(/\D/g, '');
/** «Лошади:; чистопородные:; прочие» → { title: 'прочие', parents: ['Лошади', 'чистопородные'] } */
export const splitDesc = (d: string) => {
  const parts = d.split(';').map((p) => p.trim().replace(/:$/, '')).filter(Boolean);
  return { title: parts[parts.length - 1] ?? d, parents: parts.slice(0, -1) };
};
