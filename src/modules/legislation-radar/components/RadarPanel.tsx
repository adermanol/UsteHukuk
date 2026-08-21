"use client"

import { useEffect, useMemo, useState, useTransition } from 'react'
import { AlertTriangle, ExternalLink, RefreshCw, Search, Sparkles, X } from 'lucide-react'
import {
  fetchLatestFeedItems,
  fetchLatestRunPerSource,
  searchFeedItems,
  LegalFeedItemRow,
  LegalFeedRunRow,
  LegalFeedNotConfiguredError,
} from '../services/feedRepository'
import { triggerLegalRadarScan } from '../services/triggerScan'
import { LegalFeedSource } from '../services/types'
import {
  fetchTrackedCodes, fetchArticlesForCode, TrackedCodeStatus, LegalCodeArticleResult, LegalCodesNotConfiguredError,
} from '@/modules/legal-codes/services/searchArticles'
import { triggerLegalCodesSync } from '@/modules/legal-codes/services/triggerSync'
import {
  fetchCaseLawStatus, triggerCaseLawSync, fetchDecisionsForKeyword,
  CaseLawStatusRow, CaseLawResult, CaseLawNotConfiguredError,
} from '@/modules/case-law'
import { labelFor } from '@/modules/practice-areas'
import { BookOpen, Gavel, ChevronDown } from 'lucide-react'

const SOURCE_LABELS: Record<string, string> = {
  resmi_gazete: 'Resmî Gazete',
  mevzuat_gov: 'Mevzuat Bilgi Sistemi',
  kvkk: 'KVKK',
  rekabet_kurumu: 'Rekabet Kurumu',
};

const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}

export function RadarPanel() {
  const [items, setItems] = useState<LegalFeedItemRow[] | null>(null);
  const [runs, setRuns] = useState<LegalFeedRunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string>('all');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchResults, setSearchResults] = useState<LegalFeedItemRow[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [trackedCodes, setTrackedCodes] = useState<TrackedCodeStatus[] | null>(null);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [codesSyncMessage, setCodesSyncMessage] = useState<string | null>(null);
  const [isCodesPending, startCodesTransition] = useTransition();

  const [caseLawStatus, setCaseLawStatus] = useState<CaseLawStatusRow[] | null>(null);
  const [caseLawError, setCaseLawError] = useState<string | null>(null);
  const [caseLawSyncMessage, setCaseLawSyncMessage] = useState<string | null>(null);
  const [isCaseLawPending, startCaseLawTransition] = useTransition();

  const [expandedCodeId, setExpandedCodeId] = useState<string | null>(null);
  const [codeArticles, setCodeArticles] = useState<LegalCodeArticleResult[] | null>(null);
  const [codeArticleQuery, setCodeArticleQuery] = useState('');
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [keywordDecisions, setKeywordDecisions] = useState<CaseLawResult[] | null>(null);
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(false);

  const isSearchActive = Boolean(searchQuery.trim() || dateFrom || dateTo);

  const load = async () => {
    setError(null);
    try {
      const [itemsData, runsData] = await Promise.all([
        fetchLatestFeedItems(80),
        fetchLatestRunPerSource(),
      ]);
      setItems(itemsData);
      setRuns(runsData);
    } catch (err) {
      if (err instanceof LegalFeedNotConfiguredError) {
        setError(err.message);
      } else {
        console.error('Radar verisi yüklenemedi:', err);
        setError('Radar verisi yüklenirken beklenmeyen bir hata oluştu.');
      }
      setItems([]);
    }
  };

  const loadTrackedCodes = async () => {
    setCodesError(null);
    try {
      setTrackedCodes(await fetchTrackedCodes());
    } catch (err) {
      if (err instanceof LegalCodesNotConfiguredError) {
        setCodesError(err.message);
      } else {
        console.error('Kanun listesi yüklenemedi:', err);
        setCodesError('Kanun listesi yüklenirken beklenmeyen bir hata oluştu.');
      }
      setTrackedCodes([]);
    }
  };

  const loadCaseLawStatus = async () => {
    setCaseLawError(null);
    try {
      setCaseLawStatus(await fetchCaseLawStatus());
    } catch (err) {
      if (err instanceof CaseLawNotConfiguredError) {
        setCaseLawError(err.message);
      } else {
        console.error('İçtihat durumu yüklenemedi:', err);
        setCaseLawError('İçtihat durumu yüklenirken beklenmeyen bir hata oluştu.');
      }
      setCaseLawStatus([]);
    }
  };

  useEffect(() => {
    load();
    loadTrackedCodes();
    loadCaseLawStatus();
  }, []);

  const handleCodesSync = () => {
    setCodesSyncMessage(null);
    startCodesTransition(async () => {
      const result = await triggerLegalCodesSync();
      if (result.success) {
        const total = result.results.reduce((acc, r) => acc + r.articleCount, 0);
        const failed = result.results.filter(r => r.status === 'error');
        setCodesSyncMessage(
          failed.length > 0
            ? `Senkronizasyon tamamlandı: ${total} madde. ${failed.length} kanunda hata oluştu.`
            : `Senkronizasyon tamamlandı: ${total} madde güncellendi.`
        );
        await loadTrackedCodes();
      } else {
        setCodesSyncMessage(result.message);
      }
    });
  };

  const toggleCodeExpand = (code: TrackedCodeStatus) => {
    if (expandedCodeId === code.id) { setExpandedCodeId(null); return; }
    setExpandedCodeId(code.id);
    setCodeArticles(null);
    setCodeArticleQuery('');
    setIsLoadingArticles(true);
    fetchArticlesForCode(code.id)
      .then(setCodeArticles)
      .catch(err => { console.error('Kanun maddeleri yüklenemedi:', err); setCodeArticles([]); })
      .finally(() => setIsLoadingArticles(false));
  };

  const handleCodeArticleSearch = (codeId: string, query: string) => {
    setCodeArticleQuery(query);
    setIsLoadingArticles(true);
    fetchArticlesForCode(codeId, query)
      .then(setCodeArticles)
      .catch(err => { console.error('Kanun maddesi araması başarısız:', err); setCodeArticles([]); })
      .finally(() => setIsLoadingArticles(false));
  };

  const toggleKeywordExpand = (keyword: string) => {
    if (expandedKeyword === keyword) { setExpandedKeyword(null); return; }
    setExpandedKeyword(keyword);
    setKeywordDecisions(null);
    setIsLoadingDecisions(true);
    fetchDecisionsForKeyword(keyword)
      .then(setKeywordDecisions)
      .catch(err => { console.error('İçtihat listesi yüklenemedi:', err); setKeywordDecisions([]); })
      .finally(() => setIsLoadingDecisions(false));
  };

  const handleCaseLawSync = () => {
    setCaseLawSyncMessage(null);
    startCaseLawTransition(async () => {
      const result = await triggerCaseLawSync();
      if (result.success) {
        const total = result.results.reduce((acc, r) => acc + r.imported, 0);
        const failed = result.results.filter(r => r.status === 'error');
        setCaseLawSyncMessage(
          failed.length > 0
            ? `Senkronizasyon tamamlandı: ${total} yeni karar. ${failed.length} taramada hata oluştu.`
            : `Senkronizasyon tamamlandı: ${total} yeni karar eklendi.`
        );
        await loadCaseLawStatus();
      } else {
        setCaseLawSyncMessage(result.message);
      }
    });
  };

  // Arama/tarih/kaynak filtrelerinden herhangi biri doluysa, tüm tabloyu
  // Supabase üzerinde sorgular (yalnızca o an yüklü 80 kayıtla sınırlı kalmaz).
  useEffect(() => {
    if (!isSearchActive) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      searchFeedItems({
        query: searchQuery,
        source: activeSource as LegalFeedSource | 'all',
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
        .then(rows => {
          setSearchResults(rows);
          setSearchError(null);
        })
        .catch(err => {
          if (err instanceof LegalFeedNotConfiguredError) {
            setSearchError(err.message);
          } else {
            console.error('Radar araması başarısız:', err);
            setSearchError('Arama yapılırken beklenmeyen bir hata oluştu.');
          }
          setSearchResults([]);
        })
        .finally(() => setIsSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, dateFrom, dateTo, activeSource, isSearchActive]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  // Sabit liste kullanılır (yalnızca o an yüklü öğelerden türetilmez), çünkü
  // arama sonuçları yüklü olmayan bir kaynaktan gelebilir ve rozet yine de
  // seçilebilir olmalı.
  const sources = useMemo(() => Object.keys(SOURCE_LABELS), []);

  const filteredItems = useMemo(() => {
    if (isSearchActive) return searchResults ?? [];
    if (!items) return [];
    if (activeSource === 'all') return items;
    return items.filter(i => i.source === activeSource);
  }, [items, activeSource, isSearchActive, searchResults]);

  const handleScan = () => {
    setScanMessage(null);
    startTransition(async () => {
      const result = await triggerLegalRadarScan();
      if (result.success) {
        const total = result.results.reduce((acc, r) => acc + r.items.length, 0);
        const failed = result.results.filter(r => r.status === 'error');
        setScanMessage(
          failed.length > 0
            ? `Tarama tamamlandı: ${total} öğe. ${failed.length} kaynakta hata oluştu.`
            : `Tarama tamamlandı: ${total} yeni/güncel öğe bulundu.`
        );
        await load();
      } else {
        setScanMessage(result.message);
      }
    });
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Mevzuat Radarı Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass-card p-3 space-y-3">
        <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Kelime, isim, kanun/karar numarası ile ara…"
            className="flex-1 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground outline-none"
          />
          {isSearchActive && (
            <button
              onClick={handleClearSearch}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Aramayı temizle"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Başlangıç
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground outline-none focus:border-[var(--primary)]/40"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Bitiş
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-muted-foreground outline-none focus:border-[var(--primary)]/40"
            />
          </label>
          {isSearchActive && (
            <span className="text-[11px] text-muted-foreground">
              {isSearching ? 'Aranıyor…' : `${filteredItems.length} sonuç`}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSource('all')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeSource === 'all'
                ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)]'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Tümü
          </button>
          {sources.map(src => (
            <button
              key={src}
              onClick={() => setActiveSource(src)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                activeSource === src
                  ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)]'
                  : 'bg-muted border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {SOURCE_LABELS[src] ?? src}
            </button>
          ))}
        </div>
        <button
          onClick={handleScan}
          disabled={isPending}
          className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
          {isPending ? 'Taranıyor...' : 'Şimdi Tara'}
        </button>
      </div>

      {scanMessage && <p className="text-xs text-muted-foreground">{scanMessage}</p>}

      {runs.length > 0 && (
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {runs.map(run => (
            <span key={run.id} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${run.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {SOURCE_LABELS[run.source] ?? run.source}: {run.item_count} öğe · {formatRelativeTime(run.ran_at)}
            </span>
          ))}
        </div>
      )}

      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <BookOpen size={15} className="text-[var(--primary)]" /> Kanun Metinleri
          </h3>
          <button
            onClick={handleCodesSync}
            disabled={isCodesPending}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isCodesPending ? 'animate-spin' : ''} />
            {isCodesPending ? 'Senkronize ediliyor...' : 'Şimdi Senkronize Et'}
          </button>
        </div>

        {codesSyncMessage && <p className="text-xs text-muted-foreground">{codesSyncMessage}</p>}
        {codesError && <p className="text-xs text-amber-400">{codesError}</p>}

        {!codesError && trackedCodes === null && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
        {!codesError && trackedCodes !== null && trackedCodes.length === 0 && (
          <p className="text-xs text-muted-foreground">Henüz senkronize edilmiş kanun yok. "Şimdi Senkronize Et" ile ilk indirmeyi başlatın (birkaç dakika sürebilir).</p>
        )}
        {!codesError && trackedCodes !== null && trackedCodes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {trackedCodes.map(code => (
              <button
                key={code.id}
                onClick={() => toggleCodeExpand(code)}
                className={`flex items-center gap-2 text-[11px] text-muted-foreground bg-muted border rounded-lg px-2.5 py-1.5 text-left transition-colors hover:border-[var(--primary)]/30 ${expandedCodeId === code.id ? 'border-[var(--primary)]/40' : 'border-border'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${code.lastSyncStatus === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-muted-foreground truncate">{code.shortName}</span>
                <span className="ml-auto shrink-0">{code.articleCount} md.{code.lastSyncedAt ? ` · ${formatRelativeTime(code.lastSyncedAt)}` : ''}</span>
                <ChevronDown size={12} className={`shrink-0 transition-transform ${expandedCodeId === code.id ? 'rotate-180' : ''}`} />
              </button>
            ))}
          </div>
        )}

        {expandedCodeId && (
          <div className="border-t border-border pt-3 space-y-2">
            <input
              value={codeArticleQuery}
              onChange={e => handleCodeArticleSearch(expandedCodeId, e.target.value)}
              placeholder="Bu kanun içinde madde numarası veya kelime ara..."
              className="w-full bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground placeholder:text-muted-foreground outline-none focus:border-[var(--primary)]/40"
            />
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {isLoadingArticles && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
              {!isLoadingArticles && codeArticles !== null && codeArticles.length === 0 && (
                <p className="text-xs text-muted-foreground">Sonuç bulunamadı.</p>
              )}
              {!isLoadingArticles && codeArticles?.map(a => (
                <div key={a.id} className="bg-muted border border-border rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-[var(--primary)]">{a.codeShortName} md. {a.articleNo}{a.heading ? ` — ${a.heading}` : ''}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Gavel size={15} className="text-[var(--primary)]" /> İçtihat Veritabanı
          </h3>
          <button
            onClick={handleCaseLawSync}
            disabled={isCaseLawPending}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isCaseLawPending ? 'animate-spin' : ''} />
            {isCaseLawPending ? 'Senkronize ediliyor...' : 'Şimdi Senkronize Et'}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Adalet Bakanlığı'nın resmî emsal karar servisinden, büronun pratik alanlarına hedefli anahtar kelime taramalarıyla büyüyen bir Yargıtay/Danıştay karar veritabanı. Doküman Sihirbazı'ndaki Yasal Dayanak aramasında "İçtihat (Senkronize)" grubu olarak görünür.
        </p>

        {caseLawSyncMessage && <p className="text-xs text-muted-foreground">{caseLawSyncMessage}</p>}
        {caseLawError && <p className="text-xs text-amber-400">{caseLawError}</p>}

        {!caseLawError && caseLawStatus === null && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
        {!caseLawError && caseLawStatus !== null && caseLawStatus.length === 0 && (
          <p className="text-xs text-muted-foreground">Henüz senkronize edilmiş karar yok. "Şimdi Senkronize Et" ile ilk taramayı başlatın (birkaç dakika sürebilir).</p>
        )}
        {!caseLawError && caseLawStatus !== null && caseLawStatus.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {caseLawStatus.map(row => (
              <button
                key={row.keyword}
                onClick={() => toggleKeywordExpand(row.keyword)}
                className={`flex items-center gap-2 text-[11px] text-muted-foreground bg-muted border rounded-lg px-2.5 py-1.5 text-left transition-colors hover:border-[var(--primary)]/30 ${expandedKeyword === row.keyword ? 'border-[var(--primary)]/40' : 'border-border'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                <span className="text-muted-foreground truncate" title={labelFor(row.practiceAreaId)}>{row.keyword}</span>
                <span className="ml-auto shrink-0">{row.count} karar{row.lastSyncedAt ? ` · ${formatRelativeTime(row.lastSyncedAt)}` : ''}</span>
                <ChevronDown size={12} className={`shrink-0 transition-transform ${expandedKeyword === row.keyword ? 'rotate-180' : ''}`} />
              </button>
            ))}
          </div>
        )}

        {expandedKeyword && (
          <div className="border-t border-border pt-3 max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {isLoadingDecisions && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
            {!isLoadingDecisions && keywordDecisions !== null && keywordDecisions.length === 0 && (
              <p className="text-xs text-muted-foreground">Sonuç bulunamadı.</p>
            )}
            {!isLoadingDecisions && keywordDecisions?.map(d => (
              <a
                key={d.id}
                href={d.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 bg-muted hover:bg-muted border border-border hover:border-[var(--primary)]/20 rounded-lg p-2.5 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--primary)]">{d.birim ?? d.decisionType ?? 'Karar'} — E: {d.esasNo ?? '—'}, K: {d.kararNo ?? '—'}</p>
                  {d.kararTarihi && <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(d.kararTarihi).toLocaleDateString('tr-TR')}</p>}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.content}</p>
                </div>
                <ExternalLink size={12} className="text-muted-foreground group-hover:text-[var(--primary)] shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        )}
      </div>

      {searchError && (
        <p className="text-xs text-amber-400 flex items-center gap-1.5">
          <AlertTriangle size={12} /> {searchError}
        </p>
      )}

      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {!isSearchActive && items === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {isSearchActive && isSearching && searchResults === null && (
          <p className="text-sm text-muted-foreground">Aranıyor...</p>
        )}
        {!isSearchActive && items !== null && filteredItems.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz taranmış öğe yok. "Şimdi Tara" ile ilk taramayı başlatın.</p>
        )}
        {isSearchActive && !isSearching && !searchError && filteredItems.length === 0 && (
          <p className="text-sm text-muted-foreground">Aramanızla eşleşen kayıt bulunamadı.</p>
        )}
        {filteredItems.map(item => {
          const isNew = Date.now() - new Date(item.first_seen_at).getTime() < NEW_WINDOW_MS;
          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 bg-muted hover:bg-muted border border-border hover:border-[var(--primary)]/20 rounded-xl p-3 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] uppercase tracking-wide text-[var(--primary)]/80 font-semibold">
                    {SOURCE_LABELS[item.source] ?? item.source}
                  </span>
                  {item.category && <span className="text-[10px] text-muted-foreground">{item.category}</span>}
                  {isNew && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <Sparkles size={10} /> Yeni
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground group-hover:text-foreground leading-snug">{item.title}</p>
                {isSearchActive && item.excerpt && (
                  <p className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2">{item.excerpt}</p>
                )}
              </div>
              <ExternalLink size={14} className="text-muted-foreground group-hover:text-[var(--primary)] shrink-0 mt-1" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
