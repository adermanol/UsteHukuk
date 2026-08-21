"use client"

import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { fetchDeadlineRules, updateDeadlineRule, DeadlineRuleRow, AgendaNotConfiguredError } from '../services/agendaRepository'
import { fetchCurrentProfile } from '@/modules/team'

export function RulesEditor() {
  const [rules, setRules] = useState<DeadlineRuleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = async () => {
    setError(null);
    try {
      setRules(await fetchDeadlineRules());
    } catch (err) {
      if (err instanceof AgendaNotConfiguredError) setError(err.message);
      else { console.error('Kurallar yüklenemedi:', err); setError('Kurallar yüklenirken beklenmeyen bir hata oluştu.'); }
      setRules([]);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = (id: string) => {
    setStatusMessage(null);
    startTransition(async () => {
      const profile = await fetchCurrentProfile();
      const result = await updateDeadlineRule(id, { verified_at: new Date().toISOString().slice(0, 10), verified_by: profile?.full_name || profile?.email || 'Bilinmiyor' });
      setStatusMessage(result.message);
      if (result.success) {
        setRules(prev => prev?.map(r => (r.id === id ? { ...r, verified_at: new Date().toISOString().slice(0, 10) } : r)) ?? prev);
      }
    });
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Süre Kuralları Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      {rules === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
      {rules?.map(rule => (
        <div key={rule.id} className="glass-card p-4 flex flex-wrap items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${rule.verified_at ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
            {rule.verified_at ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm text-muted-foreground">{rule.label}</p>
            <p className="text-xs text-muted-foreground">{rule.legal_basis} · {rule.duration_value} {rule.duration_unit.replace('_', ' ')} · Tetikleyici: {rule.trigger_label}</p>
          </div>
          {rule.verified_at ? (
            <span className="text-[10px] text-emerald-400">Doğrulandı: {new Date(rule.verified_at).toLocaleDateString('tr-TR')}</span>
          ) : (
            <button
              onClick={() => handleVerify(rule.id)}
              disabled={isPending}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
            >
              Doğrula
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
