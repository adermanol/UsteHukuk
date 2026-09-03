"use client"

import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, ShieldCheck, User, GraduationCap, Crown, UserPlus, Send, Trash2 } from 'lucide-react'
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
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMessage(null);
    setIsSendingInvite(true);
    try {
      const res = await fetch('/api/team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, fullName: inviteFullName }),
      });
      const result = await res.json();
      if (result.success) {
        setInviteMessage(`Davet e-postası ${inviteEmail} adresine gönderildi. Bağlantıya tıklayıp şifresini belirledikten sonra burada listede görünecek — rolünü (yönetici/master dahil) o zaman atayabilirsiniz.`);
        setInviteEmail('');
        setInviteFullName('');
        setIsInviting(false);
      } else {
        setInviteMessage(result.error || 'Davet gönderilemedi.');
      }
    } catch (err) {
      console.error('Invite request failed:', err);
      setInviteMessage('Davet gönderilirken beklenmeyen bir hata oluştu.');
    } finally {
      setIsSendingInvite(false);
    }
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

  const handleDelete = (member: ProfileRow) => {
    if (!confirm(`"${member.full_name || member.email}" hesabını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/team-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: member.id }),
        });
        const result = await res.json();
        if (result.success) {
          setItems(prev => prev?.filter(i => i.id !== member.id) ?? prev);
          setStatusMessage('Hesap silindi.');
        } else {
          setStatusMessage(result.error || 'Hesap silinemedi.');
        }
      } catch (err) {
        console.error('Delete request failed:', err);
        setStatusMessage('Hesap silinirken beklenmeyen bir hata oluştu.');
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
      <button
        onClick={() => { setIsInviting(v => !v); setInviteMessage(null); }}
        className="flex items-center justify-center gap-2 text-sm font-medium px-3 py-2.5 rounded-xl border border-dashed border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors w-full sm:w-auto"
      >
        <UserPlus size={16} /> Yeni Üye Davet Et
      </button>

      {isInviting && (
        <form onSubmit={handleInvite} className="glass-card p-5 space-y-3">
          <h3 className="font-serif text-lg text-foreground">Ekibe Davet Gönder</h3>
          <p className="text-xs text-muted-foreground">
            Girdiğiniz e-posta adresine bir davet bağlantısı gönderilir. Davet edilen kişi bağlantıya tıklayıp kendi şifresini belirledikten sonra bu listede görünür — varsayılan rolü &ldquo;avukat&rdquo;tır, aşağıdaki rol menüsünden istediğiniz role (yönetici/master dahil) yükseltebilirsiniz.
          </p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ad Soyad</label>
            <input
              type="text"
              value={inviteFullName}
              onChange={e => setInviteFullName(e.target.value)}
              placeholder="Av. Adı Soyadı"
              required
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--primary)]/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">E-posta</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="avukat@buro.com"
              required
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--primary)]/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSendingInvite}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
            >
              <Send size={12} /> {isSendingInvite ? 'Gönderiliyor...' : 'Daveti Gönder'}
            </button>
            <button type="button" onClick={() => setIsInviting(false)} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors">
              İptal
            </button>
          </div>
        </form>
      )}
      {inviteMessage && <p className="text-xs text-muted-foreground">{inviteMessage}</p>}

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
            <button
              onClick={() => handleDelete(item)}
              disabled={isPending || isSelf}
              title="Hesabı kalıcı olarak sil"
              className="min-w-9 min-h-9 flex items-center justify-center text-muted-foreground hover:text-rose-400 transition-colors shrink-0 disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
