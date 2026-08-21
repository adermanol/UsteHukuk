"use client"

import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, Building2, Users, Cpu, Power } from 'lucide-react'
import { fetchTenants, toggleTenantActive, fetchPlatformStats, TenantRow, PlatformStats, MasterNotConfiguredError } from '../services/masterRepository'

const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

export function MasterPanel() {
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = async () => {
    setError(null);
    try {
      const [tenantRows, platformStats] = await Promise.all([fetchTenants(), fetchPlatformStats()]);
      setTenants(tenantRows);
      setStats(platformStats);
    } catch (err) {
      if (err instanceof MasterNotConfiguredError) setError(err.message);
      else { console.error('Master paneli yüklenemedi:', err); setError('Master paneli yüklenirken beklenmeyen bir hata oluştu.'); }
      setTenants([]);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = (id: string, isActive: boolean) => {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await toggleTenantActive(id, isActive);
      setStatusMessage(result.message);
      if (result.success) setTenants(prev => prev?.map(t => (t.id === id ? { ...t, is_active: isActive } : t)) ?? prev);
    });
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Master Paneli Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 border-amber-500/20 bg-amber-500/5">
        <p className="text-xs text-amber-300 leading-relaxed">
          Bu ekran platform sahibi (siz) içindir — büro personelinin dosya/finans verisine erişmez, yalnızca kiracı kaydını ve platform genelindeki teknik özeti yönetir. Bugün sistemde tek bir kiracı (Üste Hukuk Bürosu) var; gerçek çok-kiracılı veri izolasyonu ikinci bir büro sisteme alınırken kurulacak.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-4"><Building2 size={16} className="text-[var(--primary)] mb-2" /><p className={labelClass}>Kiracılar</p><p className="text-lg font-serif text-foreground">{stats.activeTenants} / {stats.totalTenants}</p></div>
          <div className="glass-card p-4"><Users size={16} className="text-[var(--primary)] mb-2" /><p className={labelClass}>Toplam Personel</p><p className="text-lg font-serif text-foreground">{stats.totalStaff}</p></div>
          <div className="glass-card p-4"><Cpu size={16} className="text-[var(--primary)] mb-2" /><p className={labelClass}>Toplam Token</p><p className="text-lg font-serif text-foreground">{stats.totalTokens.toLocaleString('tr-TR')}</p></div>
        </div>
      )}

      <div className="space-y-2">
        <p className={labelClass}>Kiracılar</p>
        {tenants === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
        {tenants?.map(t => (
          <div key={t.id} className="glass-card p-4 flex items-center gap-4 flex-wrap">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.is_active ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground bg-gray-500/10'}`}>
              <Building2 size={18} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm text-muted-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.slug}</p>
            </div>
            <button
              onClick={() => handleToggle(t.id, !t.is_active)}
              disabled={isPending}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                t.is_active ? 'border-border text-muted-foreground hover:text-rose-400 hover:border-rose-400/30' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Power size={12} /> {t.is_active ? 'Devre Dışı Bırak' : 'Etkinleştir'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
