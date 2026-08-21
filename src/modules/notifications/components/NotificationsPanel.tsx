"use client"

import { useEffect, useState, useTransition } from 'react'
import { AlertTriangle, Bell, Megaphone, MessageSquare, Settings2, Send, Trash2, CheckCheck } from 'lucide-react'
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
  NotificationWithSender,
  NotificationKind,
  NotificationsNotConfiguredError,
} from '../services/notificationsRepository'
import { fetchTeamMembers, fetchCurrentProfile, ProfileRow } from '@/modules/team'

const KIND_LABELS: Record<NotificationKind, string> = {
  sistem: 'Sistem',
  duyuru: 'Duyuru',
  mesaj: 'Mesaj',
};

const KIND_ICONS: Record<NotificationKind, typeof Bell> = {
  sistem: Settings2,
  duyuru: Megaphone,
  mesaj: MessageSquare,
};

const KIND_COLORS: Record<NotificationKind, string> = {
  sistem: 'text-muted-foreground bg-gray-500/10',
  duyuru: 'text-[var(--primary)] bg-[var(--primary)]/10',
  mesaj: 'text-blue-400 bg-blue-500/10',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function NotificationsPanel() {
  const [items, setItems] = useState<NotificationWithSender[] | null>(null);
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [recipient, setRecipient] = useState<string>('__broadcast__');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = async () => {
    setError(null);
    try {
      const [notifs, me] = await Promise.all([fetchNotifications(), fetchCurrentProfile()]);
      setItems(notifs);
      setCurrentProfile(me);
      try {
        setMembers(await fetchTeamMembers());
      } catch {
        setMembers(me ? [me] : []);
      }
    } catch (err) {
      if (err instanceof NotificationsNotConfiguredError) {
        setError(err.message);
      } else {
        console.error('Bildirimler yüklenemedi:', err);
        setError('Bildirimler yüklenirken beklenmeyen bir hata oluştu.');
      }
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isYonetici = currentProfile?.role === 'yonetici';

  const handleMarkRead = (id: string) => {
    setItems(prev => prev?.map(i => (i.id === id ? { ...i, is_read: true } : i)) ?? prev);
    markAsRead(id);
  };

  const handleMarkAllRead = () => {
    setItems(prev => prev?.map(i => ({ ...i, is_read: true })) ?? prev);
    markAllAsRead();
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteNotification(id);
      if (result.success) {
        setItems(prev => prev?.filter(i => i.id !== id) ?? prev);
      } else {
        setStatusMessage(result.message);
      }
    });
  };

  const handleSend = () => {
    if (!title.trim()) {
      setStatusMessage('Başlık boş olamaz.');
      return;
    }
    setStatusMessage(null);
    startTransition(async () => {
      const result = await sendNotification({
        recipientId: recipient === '__broadcast__' ? null : recipient,
        title,
        body: body || null,
      });
      setStatusMessage(result.message);
      if (result.success) {
        setTitle('');
        setBody('');
        load();
      }
    });
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Bildirimler Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const unreadCount = items?.filter(i => !i.is_read).length ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3 order-2 lg:order-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tümü okundu'}</p>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-[var(--primary)] transition-colors"
            >
              <CheckCheck size={14} /> Tümünü okundu işaretle
            </button>
          )}
        </div>

        {items === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {items !== null && items.length === 0 && (
          <div className="glass-card p-8 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Henüz bildirim yok.</p>
          </div>
        )}

        {items?.map(item => {
          const KindIcon = KIND_ICONS[item.kind];
          const canDelete = isYonetici || item.sender_id === currentProfile?.id;
          return (
            <div
              key={item.id}
              onClick={() => !item.is_read && handleMarkRead(item.id)}
              className={`glass-card p-4 flex gap-4 cursor-pointer transition-colors ${
                !item.is_read ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${KIND_COLORS[item.kind]}`}>
                <KindIcon size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-muted-foreground font-medium">{item.title}</p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{KIND_LABELS[item.kind]}</span>
                  {!item.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />}
                </div>
                {item.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">{item.body}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  {item.sender?.full_name || item.sender?.email || (item.kind === 'sistem' ? 'Sistem' : 'Bilinmeyen')} · {formatDateTime(item.created_at)}
                </p>
              </div>
              {canDelete && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0 self-start"
                  aria-label="Sil"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="glass-card p-5 h-fit order-1 lg:order-2 lg:sticky lg:top-6">
        <h3 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2"><Send size={18} strokeWidth={1.5} /> Mesaj Gönder</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Alıcı</label>
            <select
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
            >
              {isYonetici && <option value="__broadcast__" className="bg-[var(--background)]">Herkese (Duyuru)</option>}
              {members.filter(m => m.id !== currentProfile?.id).map(m => (
                <option key={m.id} value={m.id} className="bg-[var(--background)]">{m.full_name || m.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Başlık</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Kısa başlık"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mesaj (opsiyonel)</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              placeholder="Detay yazın..."
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40 resize-none"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isPending || !title.trim()}
            className="w-full bg-[var(--primary)] text-[var(--background)] font-medium text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Send size={15} /> Gönder
          </button>
          {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
        </div>
      </div>
    </div>
  );
}
