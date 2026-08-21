import { supabase, isMockSupabase } from '@/core/database/supabase'
import type { CaseStatus } from '@/modules/case-files'

export interface ClientRow {
  id: string;
  created_at: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  case_type: string | null;
  details: string | null;
  status: string;
  preferred_channel: string | null;
  attachment_url: string | null;
  consents: Record<string, boolean | string> | null;
  source: string | null;
  practice_area_id: string | null;
  assigned_to: string | null;
  updated_at: string | null;
  resolved_at: string | null;
  foreign_id_no: string | null;
  passport_no: string | null;
  nationality: string | null;
  residence_permit_type: string | null;
  residence_permit_expires_on: string | null;
  goc_appointment_at: string | null;
  goc_appointment_no: string | null;
}

export class ClientsNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClientsNotConfiguredError'
  }
}

const CLIENT_COLUMNS = 'id, created_at, full_name, email, phone, case_type, details, status, preferred_channel, attachment_url, consents, source, practice_area_id, assigned_to, updated_at, resolved_at, foreign_id_no, passport_no, nationality, residence_permit_type, residence_permit_expires_on, goc_appointment_at, goc_appointment_no';

export async function fetchClients(limit = 200, offset = 0): Promise<ClientRow[]> {
  if (isMockSupabase()) {
    throw new ClientsNotConfiguredError('Supabase yapılandırılmadı: müvekkiller alınamadı.');
  }
  const { data, error } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .order('full_name', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`Müvekkiller alınamadı: ${error.message}`);
  return data ?? [];
}

export async function fetchClient(id: string): Promise<ClientRow | null> {
  if (isMockSupabase()) throw new ClientsNotConfiguredError('Supabase yapılandırılmadı: müvekkil alınamadı.');
  const { data, error } = await supabase.from('clients').select(CLIENT_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`Müvekkil alınamadı: ${error.message}`);
  return data;
}

export interface ClientCaseSummary {
  id: string;
  title: string;
  status: CaseStatus;
  court_name: string | null;
  opened_at: string;
  closed_at: string | null;
  agreed_fee: number | null;
  otherParties: string[]; // aynı dosyadaki diğer müvekkillerin adı (çok taraflı dosyalar için)
}

export interface ClientLedgerEntrySummary {
  id: string;
  case_id: string | null;
  case_title: string | null;
  entry_type: 'income' | 'expense' | 'trust_in' | 'trust_out';
  description: string;
  amount_try: number;
  entry_date: string;
  paid_at: string | null;
}

export interface ClientDetail {
  client: ClientRow;
  cases: ClientCaseSummary[];
  ledgerEntries: ClientLedgerEntrySummary[];
  totals: { agreedFeeTry: number; collectedTry: number; outstandingTry: number };
}

/** Bir müvekkilin taraf olduğu tüm dosyaları (case_clients üzerinden — tek
 * veya çok taraflı fark etmez), bu dosyalara bağlı finans kayıtlarını ve
 * hesaplanmış toplamları döner. Müvekkil Raporu (Aşama B) ve Müvekkiller
 * paneli (ClientsPanel) bu tek fonksiyonu paylaşır. */
export async function fetchClientDetail(clientId: string): Promise<ClientDetail | null> {
  if (isMockSupabase()) throw new ClientsNotConfiguredError('Supabase yapılandırılmadı: müvekkil detayı alınamadı.');

  const client = await fetchClient(clientId);
  if (!client) return null;

  const { data: linkRows, error: linkErr } = await supabase
    .from('case_clients')
    .select('case_id')
    .eq('client_id', clientId);
  if (linkErr) throw new Error(`Dosya bağlantıları alınamadı: ${linkErr.message}`);
  const caseIds = (linkRows ?? []).map(r => r.case_id as string);

  if (caseIds.length === 0) {
    return { client, cases: [], ledgerEntries: [], totals: { agreedFeeTry: 0, collectedTry: 0, outstandingTry: 0 } };
  }

  const [{ data: caseRows, error: caseErr }, { data: allPartyRows, error: partyErr }, { data: ledgerRows, error: ledgerErr }] = await Promise.all([
    supabase.from('cases').select('id, title, status, court_name, opened_at, closed_at, agreed_fee').in('id', caseIds),
    supabase.from('case_clients').select('case_id, client_id, clients(full_name)').in('case_id', caseIds),
    supabase.from('ledger_entries').select('id, case_id, entry_type, description, amount_try, entry_date, paid_at').in('case_id', caseIds).order('entry_date', { ascending: false }),
  ]);
  if (caseErr) throw new Error(`Dosyalar alınamadı: ${caseErr.message}`);
  if (partyErr) throw new Error(`Dosya tarafları alınamadı: ${partyErr.message}`);
  if (ledgerErr) throw new Error(`Finans kayıtları alınamadı: ${ledgerErr.message}`);

  const caseTitleById = new Map((caseRows ?? []).map(c => [c.id, c.title as string]));
  const partiesByCase = new Map<string, string[]>();
  for (const row of (allPartyRows ?? []) as unknown as { case_id: string; client_id: string; clients: { full_name: string } | { full_name: string }[] | null }[]) {
    if (row.client_id === clientId) continue; // yalnızca "diğer" taraflar
    const name = (Array.isArray(row.clients) ? row.clients[0] : row.clients)?.full_name ?? 'İsimsiz müvekkil';
    const list = partiesByCase.get(row.case_id) ?? [];
    list.push(name);
    partiesByCase.set(row.case_id, list);
  }

  const cases: ClientCaseSummary[] = (caseRows ?? []).map(c => ({
    id: c.id, title: c.title, status: c.status as CaseStatus, court_name: c.court_name,
    opened_at: c.opened_at, closed_at: c.closed_at, agreed_fee: c.agreed_fee,
    otherParties: partiesByCase.get(c.id) ?? [],
  }));

  const ledgerEntries: ClientLedgerEntrySummary[] = (ledgerRows ?? []).map(l => ({
    id: l.id, case_id: l.case_id, case_title: l.case_id ? caseTitleById.get(l.case_id) ?? null : null,
    entry_type: l.entry_type, description: l.description, amount_try: l.amount_try,
    entry_date: l.entry_date, paid_at: l.paid_at,
  }));

  const agreedFeeTry = cases.reduce((sum, c) => sum + (c.agreed_fee ?? 0), 0);
  const collectedTry = ledgerEntries.filter(l => l.entry_type === 'income' && l.paid_at !== null).reduce((sum, l) => sum + l.amount_try, 0);
  const outstandingTry = ledgerEntries.filter(l => l.entry_type === 'income' && l.paid_at === null).reduce((sum, l) => sum + l.amount_try, 0);

  return { client, cases, ledgerEntries, totals: { agreedFeeTry, collectedTry, outstandingTry } };
}
