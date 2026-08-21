"use client"

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchUnresolvedSystemErrors, resolveSystemError, SystemErrorRow } from '../services/systemErrorsRepository'

/** Sentry hesabı açmadan çalışan hata görünürlüğü — cron job'lar ve API
 * route'ları `src/core/system-error-log.ts` üzerinden buraya yazar (bkz.
 * `reportCronError`). Yalnızca yönetici/master görür (RLS). */
export function SystemErrorsCard() {
  const [errors, setErrors] = useState<SystemErrorRow[] | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = () => {
    fetchUnresolvedSystemErrors().then(setErrors);
  };

  useEffect(() => { load(); }, []);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    await resolveSystemError(id);
    await load();
    setResolvingId(null);
  };

  if (errors === null || errors.length === 0) return null;

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-4 h-4" /> Çözülmemiş Sistem Hataları ({errors.length})
        </CardTitle>
        <CardDescription>Arka plan işlerinde (cron) veya API uçlarında yakalanan son hatalar.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {errors.map(err => (
            <li key={err.id} className="flex items-start justify-between gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
              <div className="min-w-0">
                <p className="text-muted-foreground font-mono text-xs">{err.source} · {new Date(err.created_at).toLocaleString('tr-TR')}</p>
                <p className="text-foreground truncate">{err.message}</p>
              </div>
              <button
                onClick={() => handleResolve(err.id)}
                disabled={resolvingId === err.id}
                title="Çözüldü olarak işaretle"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-400 transition-colors shrink-0 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
