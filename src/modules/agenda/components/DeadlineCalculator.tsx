"use client"

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Calculator, ShieldAlert } from 'lucide-react'
import {
  fetchDeadlineRules, fetchRecessPeriods, fetchNonWorkingDays, toEngineRule,
  createEvent, DeadlineRuleRow, AgendaNotConfiguredError,
} from '../services/agendaRepository'
import { computeDeadline, DeadlineComputation, RecessPeriod } from '../services/deadlineEngine'

const inputClass = "w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40";
const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

export function DeadlineCalculator({ caseId, onSaved }: { caseId?: string; onSaved?: () => void }) {
  const [rules, setRules] = useState<DeadlineRuleRow[] | null>(null);
  const [recessPeriods, setRecessPeriods] = useState<RecessPeriod[]>([]);
  const [nonWorkingDays, setNonWorkingDays] = useState<Set<string>>(new Set());
  const [coveredYears, setCoveredYears] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [ruleId, setRuleId] = useState<string>('');
  const [triggerDate, setTriggerDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isRecessExempt, setIsRecessExempt] = useState(false);
  const [result, setResult] = useState<DeadlineComputation | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [r, rp, nwd] = await Promise.all([fetchDeadlineRules(), fetchRecessPeriods(), fetchNonWorkingDays()]);
        setRules(r);
        setRecessPeriods(rp);
        setNonWorkingDays(nwd.days);
        setCoveredYears(nwd.coveredYears);
        if (r.length > 0) setRuleId(r[0].id);
      } catch (err) {
        if (err instanceof AgendaNotConfiguredError) setError(err.message);
        else { console.error('Süre kuralları yüklenemedi:', err); setError('Süre kuralları yüklenirken beklenmeyen bir hata oluştu.'); }
      }
    })();
  }, []);

  const selectedRule = useMemo(() => rules?.find(r => r.id === ruleId) ?? null, [rules, ruleId]);

  const handleCompute = () => {
    if (!selectedRule) return;
    const computation = computeDeadline({
      rule: toEngineRule(selectedRule),
      triggerDate,
      isRecessExempt,
      recessPeriods,
      nonWorkingDays,
      coveredYears,
    });
    setResult(computation);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!selectedRule || !result) return;
    setIsSaving(true);
    const res = await createEvent({
      case_id: caseId ?? null,
      client_id: null,
      event_type: 'sure',
      title: selectedRule.label,
      starts_at: new Date(`${result.dueDate}T09:00:00`).toISOString(),
      ends_at: null,
      all_day: true,
      location_note: null,
      deadline_rule_id: selectedRule.id,
      trigger_date: triggerDate,
      computed_due_date: result.dueDate,
      computation: result.steps,
      is_manual_override: false,
    });
    setIsSaving(false);
    setSaveMessage(res.message);
    if (res.success) onSaved?.();
  };

  if (error) {
    return (
      <div className="glass-card p-6 text-center border-amber-500/30">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="font-serif text-lg text-foreground flex items-center gap-2"><Calculator size={18} className="text-[var(--primary)]" /> Süre Hesaplayıcı</h3>

      {rules === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
      {rules !== null && (
        <>
          <div>
            <label className={labelClass}>Süre Kuralı</label>
            <select value={ruleId} onChange={e => { setRuleId(e.target.value); setResult(null); }} className={inputClass}>
              {rules.map(r => <option key={r.id} value={r.id} className="bg-[var(--background)]">{r.label} ({r.legal_basis})</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tebliğ / Tefhim Tarihi</label>
            <input type="date" value={triggerDate} onChange={e => { setTriggerDate(e.target.value); setResult(null); }} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={isRecessExempt} onChange={e => { setIsRecessExempt(e.target.checked); setResult(null); }} className="accent-[var(--primary)]" />
            Bu dosya adli tatilden istisnadır (HMK m.103)
          </label>

          <button onClick={handleCompute} disabled={!selectedRule} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50">
            Hesapla
          </button>

          {result && selectedRule && (
            <div className="border-t border-border pt-4 space-y-3">
              {!result.isVerified && (
                <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 rounded-lg px-3 py-2">
                  <ShieldAlert size={14} /> Bu kural büro tarafından doğrulanmadı.
                </div>
              )}
              {result.coverageWarning && (
                <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} /> {new Date(result.dueDate).getFullYear()} yılı tatil günleri girilmemiş — sonuç doğrulanmalı.
                </div>
              )}
              <div>
                <p className={labelClass}>Son Gün</p>
                <p className="text-2xl font-serif text-foreground">{new Date(result.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className={labelClass}>Hesaplama Adımları</p>
                <ul className="space-y-1.5">
                  {result.steps.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex justify-between gap-2">
                      <span>{s.label} <span className="text-muted-foreground">({s.legalBasis})</span></span>
                      <span className="text-muted-foreground shrink-0 font-mono">{new Date(s.date).toLocaleDateString('tr-TR')}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-muted-foreground italic">Bu hesaplama bilgilendirme amaçlıdır ve süre denetimi sorumluluğunu ortadan kaldırmaz.</p>
              <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={isSaving} className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50">
                  {result.isVerified ? 'Ajandaya Ekle' : 'Doğrulayarak Ekle'}
                </button>
                {saveMessage && <span className="text-xs text-muted-foreground">{saveMessage}</span>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
