"use client"

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AlertTriangle, Users, Phone, Mail, FileDown } from 'lucide-react'
import { fetchClients, fetchClientDetail, ClientRow, ClientDetail, ClientsNotConfiguredError } from '../services/clientsRepository'
import { CaseStatus } from '@/modules/case-files'
import { labelFor } from '@/modules/practice-areas'
import { CaseStatusLinks } from '@/modules/client-portal'

const STATUS_LABELS: Record<CaseStatus, string> = {
  potansiyel: 'Potansiyel', aktif: 'Aktif', istinaf: 'İstinaf', temyiz: 'Temyiz',
  kesinlesti: 'Kesinleşti', kapandi: 'Kapandı', arsiv: 'Arşiv',
};

const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

function formatMoney(n: number): string {
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

const CLIENTS_PAGE_SIZE = 200;

export function ClientsPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<ClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const rows = await fetchClients(CLIENTS_PAGE_SIZE);
        setItems(rows);
        setHasMore(rows.length === CLIENTS_PAGE_SIZE);
      } catch (err) {
        if (err instanceof ClientsNotConfiguredError) setError(err.message);
        else { console.error('Müvekkiller yüklenemedi:', err); setError('Müvekkiller yüklenirken beklenmeyen bir hata oluştu.'); }
        setItems([]);
      }
    })();
  }, []);

  const loadMore = async () => {
    if (!items || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const more = await fetchClients(CLIENTS_PAGE_SIZE, items.length);
      setItems(prev => [...(prev ?? []), ...more]);
      setHasMore(more.length === CLIENTS_PAGE_SIZE);
    } catch (err) {
      console.error('Ek müvekkiller yüklenemedi:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const fromQuery = searchParams.get('client');
    if (fromQuery) setSelectedId(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    fetchClientDetail(selectedId)
      .then(setDetail)
      .catch(err => { console.error('Müvekkil detayı alınamadı:', err); setDetail(null); })
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const filteredCount = useMemo(() => items?.length ?? 0, [items]);

  const handleDownloadReport = async () => {
    if (!selectedId) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/generate-client-report?clientId=${selectedId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Rapor oluşturulamadı.' }));
        throw new Error(body.error || 'Rapor oluşturulamadı.');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? 'muvekkil-raporu.docx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Rapor indirilemedi.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Müvekkiller Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 space-y-2">
        <p className="text-xs text-muted-foreground px-1">{filteredCount} müvekkil</p>
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-2">
          {items === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
          {items !== null && items.length === 0 && <p className="text-sm text-muted-foreground">Henüz müvekkil yok.</p>}
          {items?.map(item => (
            <button
              key={item.id}
              onClick={() => { setSelectedId(item.id); router.replace(`/dashboard/musteriler?client=${item.id}`); }}
              className={`w-full text-left bg-muted hover:bg-muted border rounded-xl p-3 transition-colors ${
                selectedId === item.id ? 'border-[var(--primary)]/40' : 'border-border hover:border-[var(--primary)]/20'
              }`}
            >
              <p className="text-sm text-muted-foreground">{item.full_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.phone || item.email || '—'}{item.practice_area_id ? ` · ${labelFor(item.practice_area_id)}` : ''}</p>
            </button>
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full text-sm font-medium px-3 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-[var(--primary)]/30 transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Göster'}
            </button>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {!selectedId && (
          <div className="glass-card p-8 text-center h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Detayları görmek için soldan bir müvekkil seçin.</p>
          </div>
        )}

        {selectedId && detailLoading && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}

        {selectedId && !detailLoading && detail && (
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-serif text-xl text-foreground flex items-center gap-2"><Users size={18} className="text-[var(--primary)]" /> {detail.client.full_name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {detail.client.phone && <span className="flex items-center gap-1.5"><Phone size={12} /> {detail.client.phone}</span>}
                    {detail.client.email && <span className="flex items-center gap-1.5"><Mail size={12} /> {detail.client.email}</span>}
                  </div>
                </div>
                <button
                  onClick={handleDownloadReport}
                  disabled={isDownloading}
                  className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50 shrink-0"
                >
                  <FileDown size={14} /> {isDownloading ? 'Hazırlanıyor...' : 'Müvekkil Raporu İndir'}
                </button>
              </div>
              {downloadError && <p className="text-xs text-rose-400">{downloadError}</p>}

              <div className="grid grid-cols-3 gap-3">
                <div><p className={labelClass}>Anlaşılan Ücret</p><p className="text-muted-foreground text-sm">{formatMoney(detail.totals.agreedFeeTry)}</p></div>
                <div><p className={labelClass}>Tahsil Edilen</p><p className="text-emerald-400 text-sm">{formatMoney(detail.totals.collectedTry)}</p></div>
                <div><p className={labelClass}>Bekleyen Bakiye</p><p className={`text-sm ${detail.totals.outstandingTry > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>{formatMoney(detail.totals.outstandingTry)}</p></div>
              </div>
            </div>

            <div className="glass-card p-5 space-y-3">
              <p className={labelClass}>Dosyalar ({detail.cases.length})</p>
              {detail.cases.length === 0 && <p className="text-sm text-muted-foreground">Bu müvekkile bağlı dosya yok.</p>}
              {detail.cases.map(c => (
                <div key={c.id} className="bg-muted border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground">{c.title}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-muted-foreground bg-accent">{STATUS_LABELS[c.status]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.court_name || '—'} · Açılış: {new Date(c.opened_at).toLocaleDateString('tr-TR')}</p>
                  {c.otherParties.length > 0 && (
                    <p className="text-xs text-muted-foreground">Diğer taraflar: {c.otherParties.join(', ')}</p>
                  )}
                  <CaseStatusLinks caseId={c.id} clientId={detail.client.id} clientName={detail.client.full_name} />
                </div>
              ))}
              {detail.cases.some(c => c.otherParties.length > 0) && (
                <p className="text-[11px] text-muted-foreground italic pt-1">Çok taraflı dosyalarda ücret/masraf payı otomatik hesaplanmaz; yukarıdaki tutarlar dosyanın toplamıdır.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
