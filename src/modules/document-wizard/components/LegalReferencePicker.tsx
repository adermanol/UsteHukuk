"use client"

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ExternalLink, Loader2, X } from 'lucide-react'
import { searchFeedItems, LegalFeedItemRow } from '@/modules/legislation-radar/services/feedRepository'
import { searchOfficialSources, LiveSearchResult } from '@/modules/legislation-radar/services/liveOfficialSearch'
import { searchKnowledgeBase } from '@/modules/knowledge-base/services/ragService'
import { SearchResult, KnowledgeBaseNotConfiguredError } from '@/modules/knowledge-base/services/types'
import { LegalFeedNotConfiguredError } from '@/modules/legislation-radar/services/feedRepository'
import { IndexDocumentForm } from '@/modules/knowledge-base/components/IndexDocumentForm'
import { searchArticles, LegalCodeArticleResult, LegalCodesNotConfiguredError } from '@/modules/legal-codes/services/searchArticles'
import { searchCaseLaw, CaseLawResult, CaseLawNotConfiguredError } from '@/modules/case-law'

interface PickerState {
  loading: boolean;
  live: LiveSearchResult[];
  cached: LegalFeedItemRow[];
  cachedError: string | null;
  kb: SearchResult[];
  kbError: string | null;
  codes: LegalCodeArticleResult[];
  codesError: string | null;
  caseLaw: CaseLawResult[];
  caseLawError: string | null;
  searched: boolean;
}

const EMPTY_STATE: PickerState = {
  loading: false,
  live: [],
  cached: [],
  cachedError: null,
  kb: [],
  kbError: null,
  codes: [],
  codesError: null,
  caseLaw: [],
  caseLawError: null,
  searched: false,
};

export function LegalReferencePicker({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<PickerState>(EMPTY_STATE)
  const [isPending, startTransition] = useTransition()

  const runSearch = () => {
    const term = query.trim();
    if (!term) return;
    setState(s => ({ ...s, loading: true, searched: true }));

    startTransition(async () => {
      const [liveResults, cachedResult, kbResult, codesResult, caseLawResult] = await Promise.all([
        searchOfficialSources(term),
        searchFeedItems({ query: term }, 20).then(
          (rows): { rows: LegalFeedItemRow[]; error: string | null } => ({ rows, error: null }),
          (err): { rows: LegalFeedItemRow[]; error: string | null } => ({
            rows: [],
            error: err instanceof LegalFeedNotConfiguredError ? err.message : 'Mevzuat radarı araması başarısız oldu.',
          })
        ),
        searchKnowledgeBase(term).then(
          (rows): { rows: SearchResult[]; error: string | null } => ({ rows, error: null }),
          (err): { rows: SearchResult[]; error: string | null } => ({
            rows: [],
            error: err instanceof KnowledgeBaseNotConfiguredError ? err.message : 'Bilgi bankası araması başarısız oldu.',
          })
        ),
        searchArticles(term, 12).then(
          (rows): { rows: LegalCodeArticleResult[]; error: string | null } => ({ rows, error: null }),
          (err): { rows: LegalCodeArticleResult[]; error: string | null } => ({
            rows: [],
            error: err instanceof LegalCodesNotConfiguredError ? err.message : 'Kanun maddesi araması başarısız oldu.',
          })
        ),
        searchCaseLaw(term, 8).then(
          (rows): { rows: CaseLawResult[]; error: string | null } => ({ rows, error: null }),
          (err): { rows: CaseLawResult[]; error: string | null } => ({
            rows: [],
            error: err instanceof CaseLawNotConfiguredError ? err.message : 'İçtihat araması başarısız oldu.',
          })
        ),
      ]);

      setState({
        loading: false,
        searched: true,
        live: liveResults,
        cached: cachedResult.rows,
        cachedError: cachedResult.error,
        kb: kbResult.rows,
        kbError: kbResult.error,
        codes: codesResult.rows,
        codesError: codesResult.error,
        caseLaw: caseLawResult.rows,
        caseLawError: caseLawResult.error,
      });
    });
  };

  const insert = (text: string) => {
    onChange(value ? `${value}; ${text}` : text);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-2">{label}</label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Örn. 6098 sayılı Türk Borçlar Kanunu md. 299'}
        />
        <Button type="button" variant="outline" size="icon" onClick={() => setIsOpen(o => !o)} title="Resmi kaynaklarda ara">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="mt-3 border border-border rounded-xl bg-muted p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-1">
              <Input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                placeholder="Aranacak konu/kanun/madde..."
              />
              <Button type="button" size="sm" onClick={runSearch} disabled={isPending || !query.trim()}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ara'}
              </Button>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="ml-2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {state.searched && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 max-h-80 overflow-y-auto">
              <ResultGroup title="Kanun Maddeleri">
                {state.loading && <LoadingRow />}
                {!state.loading && state.codesError && <EmptyRow text={state.codesError} />}
                {!state.loading && !state.codesError && state.codes.length === 0 && <EmptyRow text="Sonuç bulunamadı." />}
                {!state.loading && state.codes.map(item => (
                  <ResultRow
                    key={item.id}
                    title={`${item.codeShortName} md. ${item.articleNo}${item.heading ? ` — ${item.heading}` : ''}`}
                    meta={item.content.slice(0, 90) + (item.content.length > 90 ? '…' : '')}
                    onSelect={() => insert(`${item.codeShortName} md. ${item.articleNo}`)}
                  />
                ))}
              </ResultGroup>

              <ResultGroup title="İçtihat (Senkronize)">
                {state.loading && <LoadingRow />}
                {!state.loading && state.caseLawError && <EmptyRow text={state.caseLawError} />}
                {!state.loading && !state.caseLawError && state.caseLaw.length === 0 && <EmptyRow text="Sonuç bulunamadı." />}
                {!state.loading && state.caseLaw.map(item => (
                  <ResultRow
                    key={item.id}
                    title={`${item.birim ?? item.decisionType ?? 'Karar'} — E: ${item.esasNo ?? '—'}, K: ${item.kararNo ?? '—'}`}
                    meta={`%${Math.round(item.similarity * 100)} alaka${item.kararTarihi ? ` · ${new Date(item.kararTarihi).toLocaleDateString('tr-TR')}` : ''}`}
                    url={item.sourceUrl}
                    onSelect={() => insert(`${item.birim ?? ''} E: ${item.esasNo ?? '—'}, K: ${item.kararNo ?? '—'}`.trim())}
                  />
                ))}
              </ResultGroup>

              <ResultGroup title="Resmî Kaynaklar (Canlı)">
                {state.loading && <LoadingRow />}
                {!state.loading && state.live.every(r => r.items.length === 0) && (
                  <EmptyRow text={state.live.some(r => r.status === 'error') ? 'Sonuç alınamadı.' : 'Sonuç bulunamadı.'} />
                )}
                {!state.loading && state.live.flatMap(r => r.items).slice(0, 8).map((item, i) => (
                  <ResultRow key={i} title={item.title} meta={item.category ?? undefined} url={item.url} onSelect={() => insert(item.title)} />
                ))}
              </ResultGroup>

              <ResultGroup title="Mevzuat Radarı">
                {state.loading && <LoadingRow />}
                {!state.loading && state.cachedError && <EmptyRow text={state.cachedError} />}
                {!state.loading && !state.cachedError && state.cached.length === 0 && <EmptyRow text="Sonuç bulunamadı." />}
                {!state.loading && state.cached.map(item => (
                  <ResultRow key={item.id} title={item.title} meta={item.category ?? undefined} url={item.url} onSelect={() => insert(item.title)} />
                ))}
              </ResultGroup>

              <ResultGroup title="Bilgi Bankası">
                {state.loading && <LoadingRow />}
                {!state.loading && state.kbError && <EmptyRow text={state.kbError} />}
                {!state.loading && !state.kbError && state.kb.length === 0 && (
                  <div className="space-y-3">
                    <EmptyRow text="Sonuç bulunamadı." />
                    <IndexDocumentForm />
                  </div>
                )}
                {!state.loading && state.kb.map(item => (
                  <ResultRow key={item.id} title={item.title} meta={`%${Math.round(item.relevance * 100)} alaka`} onSelect={() => insert(item.title)} />
                ))}
              </ResultGroup>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="text-[11px] uppercase tracking-widest text-[var(--primary)] font-semibold mb-2">{title}</h5>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function ResultRow({ title, meta, url, onSelect }: { title: string; meta?: string; url?: string; onSelect: () => void }) {
  return (
    <div className="flex items-start gap-1.5 bg-accent hover:bg-accent rounded-lg p-2 transition-colors">
      <button type="button" onClick={onSelect} className="flex-1 text-left">
        <div className="text-xs text-muted-foreground leading-snug">{title}</div>
        {meta && <div className="text-[10px] text-muted-foreground mt-0.5">{meta}</div>}
      </button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[var(--primary)] shrink-0 pt-0.5">
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}

function LoadingRow() {
  return <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Aranıyor...</div>
}

function EmptyRow({ text }: { text: string }) {
  return <div className="text-xs text-muted-foreground">{text}</div>
}
