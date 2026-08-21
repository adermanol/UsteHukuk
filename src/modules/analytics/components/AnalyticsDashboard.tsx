"use client"

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  AlertTriangle, Loader2, TrendingUp, TrendingDown, Wallet, FolderOpen, CalendarClock, Download, Printer,
} from 'lucide-react'
import { toCsv } from '@/lib/csv'
import {
  fetchKpis, fetchMonthlyCashflow, fetchCaseMix, fetchReceivablesAging, fetchIntakeFunnel,
  fetchHearingLoad, fetchCaseAge, fetchLlmUsage,
  AnalyticsKpis, MonthlyCashflowRow, CaseMixRow, AgingRow, IntakeFunnelRow, HearingLoadRow, CaseAgeRow, LlmUsageRow,
  AnalyticsNotConfiguredError,
} from '../services/analyticsService'
import { PeriodSelector, Period, defaultPeriod } from './PeriodSelector'

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-neutral)'];
const MONTH_NAMES_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function monthLabel(iso: string): string {
  const d = new Date(iso);
  return MONTH_NAMES_TR[d.getMonth()];
}
function weekLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES_TR[d.getMonth()]}`;
}
function money(n: number): string {
  return `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-4 rounded-xl shadow-2xl text-sm z-50 border border-border bg-popover">
        <p className="text-[var(--primary)] font-serif text-lg mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-mono text-sm">
              <span className="font-sans text-muted-foreground">{entry.name}:</span> {entry.value.toLocaleString('tr-TR')}
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

/** Dönem/filtre bilgisiyle dosya adını benzersizleştirir; tarayıcının
 * indirme mekanizması dışında herhangi bir sunucu isteğine gerek yoktur. */
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = toCsv([headers, ...rows]);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ChartCard({ title, children, collapsible, defaultOpen = true, csv }: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  csv?: { headers: string[]; rows: (string | number)[][] };
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className={`flex items-center justify-between ${open ? 'mb-6' : ''}`}>
        <h3 className="text-[var(--primary)] font-serif text-xl">{title}</h3>
        <div className="flex items-center gap-3 print:hidden">
          {csv && csv.rows.length > 0 && (
            <button
              onClick={() => downloadCsv(`${title.replace(/\s+/g, '-').toLowerCase()}.csv`, csv.headers, csv.rows)}
              title="CSV indir"
              className="text-muted-foreground hover:text-[var(--primary)] transition-colors"
            >
              <Download size={15} />
            </button>
          )}
          {collapsible && (
            <button onClick={() => setOpen(v => !v)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {open ? 'Gizle' : 'Göster'}
            </button>
          )}
        </div>
      </div>
      {open && <div className="h-64">{children}</div>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>(defaultPeriod());
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [cashflow, setCashflow] = useState<MonthlyCashflowRow[] | null>(null);
  const [caseMix, setCaseMix] = useState<CaseMixRow[] | null>(null);
  const [aging, setAging] = useState<AgingRow[] | null>(null);
  const [funnel, setFunnel] = useState<IntakeFunnelRow[] | null>(null);
  const [hearingLoad, setHearingLoad] = useState<HearingLoadRow[] | null>(null);
  const [caseAge, setCaseAge] = useState<CaseAgeRow[] | null>(null);
  const [llmUsage, setLlmUsage] = useState<LlmUsageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [k, cf, cm, ag, fn, hl, ca, lu] = await Promise.all([
          fetchKpis(period.from, period.to),
          fetchMonthlyCashflow(period.from, period.to),
          fetchCaseMix(period.from, period.to),
          fetchReceivablesAging(),
          fetchIntakeFunnel(period.from, period.to),
          fetchHearingLoad(8),
          fetchCaseAge(),
          fetchLlmUsage(period.from, period.to),
        ]);
        if (cancelled) return;
        setKpis(k); setCashflow(cf); setCaseMix(cm); setAging(ag); setFunnel(fn); setHearingLoad(hl); setCaseAge(ca); setLlmUsage(lu);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AnalyticsNotConfiguredError) setError(err.message);
        else { console.error('Analitik veri yüklenemedi:', err); setError('Analitik veriler yüklenirken beklenmeyen bir hata oluştu.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [period]);

  if (loading && !kpis && !error) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[var(--primary)]">
          <Loader2 className="w-12 h-12 animate-spin" />
          <p className="text-lg font-serif tracking-widest uppercase text-[var(--primary)]/80">Sistem Verileri Senkronize Ediliyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-10">
        <div className="glass-card p-8 max-w-md text-center border-amber-500/30">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h3 className="font-serif text-xl text-foreground mb-2">Analitik Yapılandırılmadı</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const cumulativeCashflow = (cashflow ?? []).reduce<{ name: string; kumulatif: number }[]>((acc, row) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].kumulatif : 0;
    acc.push({ name: monthLabel(row.bucket), kumulatif: prev + row.net_try });
    return acc;
  }, []);

  const funnelChart = (funnel ?? []).map(row => ({
    name: monthLabel(row.bucket),
    basvuru: row.applications,
    donusen: row.converted,
    oran: row.applications > 0 ? Math.round((row.converted / row.applications) * 100) : 0,
  }));

  const agingColor = (bucket: string) => bucket === 'Vadesi gelmedi' ? 'var(--chart-neutral)' : bucket === '0-30 gün' ? 'var(--chart-1)' : bucket === '31-60 gün' ? 'var(--chart-5)' : 'var(--chart-2)';
  const caseAgeColor = (bucket: string) => bucket === '2+ yıl' ? 'var(--chart-2)' : bucket === '1-2 yıl' ? 'var(--chart-5)' : 'var(--chart-1)';

  return (
    <div className="p-6 md:p-10 space-y-8 bg-transparent text-foreground min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-amber-200 mb-2">
            Analitik Terminali
          </h1>
          <p className="text-muted-foreground font-sans">Büro Operasyonu, Finans ve Yapay Zekâ Kullanım Raporu</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="print:hidden"><PeriodSelector value={period} onChange={setPeriod} /></div>
          <button
            onClick={() => downloadCsv('kpi-ozet.csv', ['Gösterge', 'Değer'], [
              ['Gelir', kpis?.income_try ?? 0],
              ['Gider', kpis?.expense_try ?? 0],
              ['Net Kâr', kpis?.net_try ?? 0],
              ['Tahsil Edilmemiş Alacak', kpis?.receivable_try ?? 0],
              ['Açık Dosya', kpis?.open_cases ?? 0],
              ['7 Gün İçinde Duruşma', kpis?.hearings_next_7d ?? 0],
              ['7 Gün İçinde Süre', kpis?.deadlines_next_7d ?? 0],
            ])}
            title="KPI'ları CSV indir"
            className="print:hidden flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-full border border-border text-muted-foreground hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-colors shrink-0"
          >
            <Download size={14} /> KPI CSV
          </button>
          <button
            onClick={() => window.print()}
            title="Rapor Görünümü — Yazdır / PDF Kaydet"
            className="print:hidden flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-full border border-border text-muted-foreground hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-colors shrink-0"
          >
            <Printer size={14} /> Rapor Görünümü
          </button>
        </div>
      </div>

      {/* KPI şeridi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { icon: TrendingUp, label: 'Gelir', value: money(kpis?.income_try ?? 0), color: 'text-emerald-400' },
          { icon: TrendingDown, label: 'Gider', value: money(kpis?.expense_try ?? 0), color: 'text-rose-400' },
          { icon: Wallet, label: 'Net Kâr', value: money(kpis?.net_try ?? 0), color: (kpis?.net_try ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400' },
          { icon: AlertTriangle, label: 'Tahsil Edilmemiş Alacak', value: money(kpis?.receivable_try ?? 0), color: (kpis?.receivable_try ?? 0) > 0 ? 'text-amber-400' : 'text-muted-foreground' },
          { icon: FolderOpen, label: 'Açık Dosya', value: `${kpis?.open_cases ?? 0}`, color: 'text-[var(--primary)]' },
          { icon: CalendarClock, label: '7 Gün İçinde Duruşma/Süre', value: `${(kpis?.hearings_next_7d ?? 0) + (kpis?.deadlines_next_7d ?? 0)}`, color: ((kpis?.hearings_next_7d ?? 0) + (kpis?.deadlines_next_7d ?? 0)) > 0 ? 'text-rose-400' : 'text-muted-foreground' },
        ].map((tile, i) => (
          <div key={i} className="glass-card p-5 flex flex-col justify-center relative overflow-hidden">
            <tile.icon className="absolute -right-4 -top-4 w-24 h-24 text-[var(--primary)]/5 rotate-12 pointer-events-none" />
            <h3 className="text-muted-foreground font-serif text-xs mb-2 relative z-10">{tile.label}</h3>
            <div className={`text-xl font-mono font-bold relative z-10 ${tile.color}`}>{tile.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Gelir – Gider – Kâr (Aylık)" csv={{ headers: ['Ay', 'Gelir', 'Gider', 'Kâr'], rows: (cashflow ?? []).map(r => [monthLabel(r.bucket), r.income_try, r.expense_try, r.net_try]) }}>
          {!cashflow || cashflow.every(r => r.income_try === 0 && r.expense_try === 0) ? (
            <EmptyState text="Bu dönem için finansal kayıt girilmemiş." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashflow.map(r => ({ name: monthLabel(r.bucket), Gelir: r.income_try, Gider: r.expense_try, Kâr: r.net_try }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Gelir" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gider" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Kâr" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Kümülatif Kazanç (Dönem İçinde)" csv={{ headers: ['Ay', 'Kümülatif Kâr'], rows: cumulativeCashflow.map(r => [r.name, r.kumulatif]) }}>
          {cumulativeCashflow.length === 0 ? (
            <EmptyState text="Bu dönem için finansal kayıt girilmemiş." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeCashflow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKazanc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="kumulatif" name="Kümülatif Kâr" stroke="var(--chart-1)" fill="url(#colorKazanc)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Dava Türü Dağılımı" csv={{ headers: ['Dava Türü', 'Açık Dosya Sayısı'], rows: (caseMix ?? []).map(r => [r.label, r.open_count]) }}>
          {!caseMix || caseMix.length === 0 ? (
            <EmptyState text="Bu dönemde açılmış dosya yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={caseMix.slice(0, 7)} dataKey="open_count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {caseMix.slice(0, 7).map((entry, i) => <Cell key={entry.area_id} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Dava Türüne Göre Tahsil Edilen Gelir" csv={{ headers: ['Dava Türü', 'Tahsil Edilen'], rows: [...(caseMix ?? [])].sort((a, b) => b.income_try - a.income_try).map(r => [r.label, r.income_try]) }}>
          {!caseMix || caseMix.every(r => r.income_try === 0) ? (
            <EmptyState text="Bu dönem için tahsilat kaydı yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...caseMix].sort((a, b) => b.income_try - a.income_try).slice(0, 7)} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income_try" name="Tahsil Edilen" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tahsilat Yaşlandırma (Alacak)" csv={{ headers: ['Vade Aralığı', 'Tutar'], rows: (aging ?? []).map(r => [r.bucket, r.total_try]) }}>
          {!aging || aging.every(r => r.total_try === 0) ? (
            <EmptyState text="Tahsil edilmemiş alacak yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_try" name="Alacak" radius={[4, 4, 0, 0]}>
                  {aging.map(row => <Cell key={row.bucket} fill={agingColor(row.bucket)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Başvuru → Dosya Dönüşümü" csv={{ headers: ['Ay', 'Başvuru', 'Dönüşen', 'Oran (%)'], rows: funnelChart.map(r => [r.name, r.basvuru, r.donusen, r.oran]) }}>
          {funnelChart.length === 0 || funnelChart.every(r => r.basvuru === 0) ? (
            <EmptyState text="Bu dönemde başvuru yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={funnelChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="basvuru" name="Başvuru" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="donusen" name="Dosyaya Dönüşen" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Duruşma ve Süre Yoğunluğu (8 Hafta)" csv={{ headers: ['Hafta', 'Duruşma', 'Süre'], rows: (hearingLoad ?? []).map(r => [weekLabel(r.week_start), r.hearings, r.deadlines]) }}>
          {!hearingLoad || hearingLoad.every(r => r.hearings === 0 && r.deadlines === 0) ? (
            <EmptyState text="Önümüzdeki 8 hafta için planlanmış etkinlik yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hearingLoad.map(r => ({ name: weekLabel(r.week_start), Duruşma: r.hearings, Süre: r.deadlines }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Duruşma" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Süre" stackId="a" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Açık Dosya Yaş Dağılımı" csv={{ headers: ['Yaş Aralığı', 'Dosya Sayısı'], rows: (caseAge ?? []).map(r => [r.bucket, r.case_count]) }}>
          {!caseAge || caseAge.every(r => r.case_count === 0) ? (
            <EmptyState text="Açık dosya yok." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caseAge} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="case_count" name="Dosya" radius={[4, 4, 0, 0]}>
                  {caseAge.map(row => <Cell key={row.bucket} fill={caseAgeColor(row.bucket)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Aylık Token Kullanımı" collapsible defaultOpen={false} csv={{ headers: ['Ay', 'Token'], rows: (llmUsage ?? []).map(r => [monthLabel(r.bucket), r.tokens]) }}>
        {!llmUsage || llmUsage.every(r => r.tokens === 0) ? (
          <EmptyState text="Bu dönemde yapay zekâ kullanımı yok." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={llmUsage.map(r => ({ name: monthLabel(r.bucket), value: r.tokens }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="var(--chart-4)" name="Token" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
