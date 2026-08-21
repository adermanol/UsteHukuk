"use client"

import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, ShieldCheck, User, GraduationCap, Crown } from 'lucide-react'
import {
  fetchTeamMembers,
  fetchCurrentProfile,
  updateMemberRole,
  toggleMemberActive,
  ProfileRow,
  TeamRole,
  TeamNotConfiguredError,
} from '../services/teamRepository'

const ROLE_LABELS: Record<TeamRole, string> = {
  master: 'Master',
  yonetici: 'Yönetici',
  avukat: 'Avukat',
  stajyer: 'Stajyer',
};

const ROLE_ICONS: Record<TeamRole, typeof ShieldCheck> = {
  master: Crown,
  yonetici: ShieldCheck,
  avukat: User,
  stajyer: GraduationCap,
};

const ROLE_COLORS: Record<TeamRole, string> = {
  master: 'text-amber-300 bg-amber-500/10',
  yonetici: 'text-[var(--primary)] bg-[var(--primary)]/10',
  avukat: 'text-blue-400 bg-blue-500/10',
  stajyer: 'text-muted-foreground bg-gray-500/10',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function TeamPanel() {
  const [items, setItems] = useState<ProfileRow[] | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = async () => {
    setError(null);
    try {
      const [members, me] = await Promise.all([fetchTeamMembers(), fetchCurrentProfile()]);
      setItems(members);
      setCurrentProfile(me);
    } catch (err) {
      if (err instanceof TeamNotConfiguredError) {
        setError(err.message);
      } else {
        console.error('Ekip listesi yüklenemedi:', err);
        setError('Ekip listesi yüklenirken beklenmeyen bir hata oluştu.');
      }
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isYonetici = currentProfile?.role === 'yonetici' || currentProfile?.role === 'master';

  const handleRoleChange = (id: string, role: TeamRole) => {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await updateMemberRole(id, role);
      setStatusMessage(result.message);
      if (result.success) {
        setItems(prev => prev?.map(i => (i.id === id ? { ...i, role } : i)) ?? prev);
      }
    });
  };

  const handleActiveToggle = (id: string, isActive: boolean) => {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await toggleMemberActive(id, isActive);
      setStatusMessage(result.message);
      if (result.success) {
        setItems(prev => prev?.map(i => (i.id === id ? { ...i, is_active: isActive } : i)) ?? prev);
      }
    });
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Ekip Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!isYonetici && currentProfile) {
    return (
      <div className="glass-card p-8 text-center">
        <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Yalnızca Yönetici Erişebilir</h3>
        <p className="text-sm text-muted-foreground">
          Ekip üyelerinin rollerini görüntülemek ve düzenlemek için yönetici yetkisi gereklidir.
          Mevcut rolünüz: <span className="text-muted-foreground">{ROLE_LABELS[currentProfile.role]}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
      {items !== null && items.length === 0 && (
        <p className="text-sm text-muted-foreground">Henüz ekip üyesi yok.</p>
      )}
      {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
      {items?.map(item => {
        const RoleIcon = ROLE_ICONS[item.role];
        // Kendi satırınızda rol/durum değiştirmek engellenir — büronun tek
        // yöneticisinin/master'ının kendini kilitlemesini önlemek için
        // kasıtlı (bkz. teamRepository.ts, sunucu tarafında da uygulanır).
        const isSelf = item.id === currentProfile?.id;
        return (
          <div
            key={item.id}
            className={`glass-card p-4 flex flex-wrap items-center gap-4 ${!item.is_active ? 'opacity-50' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ROLE_COLORS[item.role]}`}>
              <RoleIcon size={18} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-[180px]">
              <p className="text-sm text-muted-foreground">{item.full_name || item.email || 'İsimsiz kullanıcı'}{isSelf && <span className="text-muted-foreground"> (siz)</span>}</p>
              <p className="text-xs text-muted-foreground">{item.email} · Katılım: {formatDate(item.created_at)}</p>
            </div>
            <select
              value={item.role}
              disabled={isPending || isSelf}
              onChange={e => handleRoleChange(item.id, e.target.value as TeamRole)}
              className="bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40 disabled:opacity-40"
            >
              {(Object.keys(ROLE_LABELS) as TeamRole[]).map(r => (
                <option key={r} value={r} className="bg-[var(--background)]">{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button
              onClick={() => handleActiveToggle(item.id, !item.is_active)}
              disabled={isPending || (isSelf && item.is_active)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${
                item.is_active
                  ? 'border-border text-muted-foreground hover:text-rose-400 hover:border-rose-400/30'
                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              {item.is_active ? 'Devre Dışı Bırak' : 'Etkinleştir'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
