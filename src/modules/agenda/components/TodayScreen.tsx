"use client"

import { useEffect, useState } from 'react'
import { AlertTriangle, Phone, Navigation, ClipboardCheck, Calculator, CalendarPlus, Clock, Pencil, Trash2, X } from 'lucide-react'
import {
  fetchTodayEventsWithContact, fetchUpcomingDeadlines, fetchRecessPeriods, fetchNonWorkingDays,
  postponeEvent, completeEvent, updateEvent, deleteEvent, CaseEventWithContact, CaseEventRow, AgendaNotConfiguredError,
} from '../services/agendaRepository'
import { RecessPeriod } from '../services/deadlineEngine'
import { DeadlineCalculator } from './DeadlineCalculator'

const HEARING_CHECKLIST = ['Vekaletname aslı', 'Baro kartı', 'Delil listesi', 'Tanık listesi', 'Harç makbuzu'];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}
function remainingDays(dueDate: string): number {
  const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

/** <input type="datetime-local"> yerel saat bekler, ISO string'i doğrudan
 * kabul etmez — saat dilimi düzeltmesiyle dönüştürülür. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function HearingCard({ event, onChanged }: { event: CaseEventWithContact; onChanged: () => void }) {
  const [showChecklist, setShowChecklist] = useState(false);
  const [showPostpone, setShowPostpone] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  const [editStartsAt, setEditStartsAt] = useState(toDatetimeLocal(event.starts_at));
  const [editLocation, setEditLocation] = useState(event.location_note ?? '');
  const isPast = new Date(event.starts_at) < new Date() && event.status === 'planlandi';

  const handlePostpone = async () => {
    if (!newDate) return;
    setIsPending(true);
    await postponeEvent(event.id, new Date(`${newDate}T09:00:00`).toISOString());
    setIsPending(false);
    setShowPostpone(false);
    onChanged();
  };

  const handleComplete = async () => {
    setIsPending(true);
    await completeEvent(event.id, null);
    setIsPending(false);
    onChanged();
  };

  const startEdit = () => {
    setEditTitle(event.title);
    setEditStartsAt(toDatetimeLocal(event.starts_at));
    setEditLocation(event.location_note ?? '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsPending(true);
    await updateEvent(event.id, {
      title: editTitle.trim(),
      starts_at: new Date(editStartsAt).toISOString(),
      location_note: editLocation.trim() || null,
    });
    setIsPending(false);
    setIsEditing(false);
    onChanged();
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${event.title}" duruşmasını silmek istediğinize emin misiniz?`)) return;
    setIsPending(true);
    await deleteEvent(event.id);
    setIsPending(false);
    onChanged();
  };

  if (isEditing) {
    return (
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Duruşmayı Düzenle</p>
          <button onClick={() => setIsEditing(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><X size={15} /></button>
        </div>
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
          placeholder="Başlık"
        />
        <input
          type="datetime-local"
          value={editStartsAt}
          onChange={e => setEditStartsAt(e.target.value)}
          className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
        />
        <input
          value={editLocation}
          onChange={e => setEditLocation(e.target.value)}
          className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
          placeholder="Konum (ör. D Blok 3. kat, 12 no.lu salon)"
        />
        <div className="flex items-center gap-2">
          <button onClick={handleSaveEdit} disabled={isPending || !editTitle.trim()} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] disabled:opacity-50">Kaydet</button>
          <button onClick={() => setIsEditing(false)} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground">İptal</button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl font-serif text-foreground">{formatTime(event.starts_at)}</p>
          <p className="text-sm text-muted-foreground">{event.title}</p>
          {event.institutions && <p className="text-xs text-[var(--primary)]/80 mt-0.5">{event.institutions.name}</p>}
          {event.location_note && <p className="text-xs text-muted-foreground mt-0.5">{event.location_note}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${event.status === 'planlandi' ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground bg-gray-500/10'}`}>
            {event.status === 'planlandi' ? 'Planlandı' : event.status}
          </span>
          <button onClick={startEdit} className="p-1 text-muted-foreground hover:text-[var(--primary)] transition-colors" aria-label="Düzenle"><Pencil size={13} /></button>
          <button onClick={handleDelete} disabled={isPending} className="p-1 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-40" aria-label="Sil"><Trash2 size={13} /></button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {event.clients?.phone && (
          <a href={`tel:${event.clients.phone}`} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <Phone size={13} /> Müvekkili Ara
          </a>
        )}
        {(() => {
          const inst = event.institutions;
          const dest = inst?.lat != null && inst?.lng != null
            ? `${inst.lat},${inst.lng}`
            : inst?.address || event.location_note;
          if (!dest) return null;
          return (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-[var(--primary)] transition-colors"
            >
              <Navigation size={13} /> Yol Tarifi
            </a>
          );
        })()}
        {event.institutions?.phone && (
          <a href={`tel:${event.institutions.phone}`} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <Phone size={13} /> Kaleme Sor
          </a>
        )}
        <button onClick={() => setShowChecklist(v => !v)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-[var(--primary)] transition-colors">
          <ClipboardCheck size={13} /> Kontrol Listesi
        </button>
      </div>

      {event.institutions && (event.institutions.entrance_note || event.institutions.parking_note || event.institutions.procedure_note) && (
        <div className="text-xs text-muted-foreground space-y-1 bg-muted rounded-lg p-2.5">
          {event.institutions.procedure_note && <p><span className="text-muted-foreground">Prosedür:</span> {event.institutions.procedure_note}</p>}
          {event.institutions.entrance_note && <p><span className="text-muted-foreground">Giriş:</span> {event.institutions.entrance_note}</p>}
          {event.institutions.parking_note && <p><span className="text-muted-foreground">Otopark:</span> {event.institutions.parking_note}</p>}
        </div>
      )}

      {showChecklist && (
        <ul className="space-y-1 pl-1">
          {HEARING_CHECKLIST.map(item => (
            <li key={item} className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> {item}
            </li>
          ))}
        </ul>
      )}

      {isPast && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Duruşma Çıkışı</p>
          {!showPostpone ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleComplete} disabled={isPending} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] disabled:opacity-50">Karar Verildi</button>
              <button onClick={() => setShowPostpone(true)} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground">Ertelendi</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40" />
              <button onClick={handlePostpone} disabled={isPending || !newDate} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] disabled:opacity-50">Yeni Tarihi Kaydet</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  not: 'Not', gorev: 'Görev', muvekkil_gorusmesi: 'Müvekkil Görüşmesi', kurum_randevusu: 'Kurum Randevusu',
  cezaevi_gorusmesi: 'Cezaevi Görüşmesi', kesif: 'Keşif', ifade: 'İfade', icra_islemi: 'İcra İşlemi',
};

function DeadlineRow({ deadline, onChanged }: { deadline: CaseEventRow; onChanged: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(deadline.title);
  const [editDueDate, setEditDueDate] = useState(deadline.computed_due_date ?? '');
  const [isPending, setIsPending] = useState(false);
  const days = deadline.computed_due_date ? remainingDays(deadline.computed_due_date) : null;

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setIsPending(true);
    const dueDateChanged = editDueDate !== (deadline.computed_due_date ?? '');
    await updateEvent(deadline.id, {
      title: editTitle.trim(),
      computed_due_date: editDueDate || null,
      // Hesaplanan tarih elle değiştirildiyse, bunun bir hesaplama motoru
      // çıktısı değil bilinçli bir düzeltme olduğu işaretlenir.
      ...(dueDateChanged ? { is_manual_override: true } : {}),
    });
    setIsPending(false);
    setIsEditing(false);
    onChanged();
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${deadline.title}" süresini silmek istediğinize emin misiniz?`)) return;
    setIsPending(true);
    await deleteEvent(deadline.id);
    setIsPending(false);
    onChanged();
  };

  if (isEditing) {
    return (
      <div className="glass-card p-3 space-y-2">
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
        />
        <input
          type="date"
          value={editDueDate}
          onChange={e => setEditDueDate(e.target.value)}
          className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40"
        />
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={isPending || !editTitle.trim()} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] disabled:opacity-50">Kaydet</button>
          <button onClick={() => setIsEditing(false)} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground">İptal</button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <Clock size={16} className={days !== null && days <= 3 ? 'text-rose-400' : 'text-[var(--primary)]'} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">{deadline.title}</p>
        <p className="text-xs text-muted-foreground">{deadline.computed_due_date && new Date(deadline.computed_due_date).toLocaleDateString('tr-TR')}</p>
      </div>
      {days !== null && (
        <span className={`text-xs font-semibold shrink-0 ${days <= 3 ? 'text-rose-400' : 'text-muted-foreground'}`}>{days} gün</span>
      )}
      <button onClick={() => setIsEditing(true)} className="p-1 text-muted-foreground hover:text-[var(--primary)] transition-colors shrink-0" aria-label="Düzenle"><Pencil size={13} /></button>
      <button onClick={handleDelete} disabled={isPending} className="p-1 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-40 shrink-0" aria-label="Sil"><Trash2 size={13} /></button>
    </div>
  );
}

function NoteRow({ event, onChanged }: { event: CaseEventWithContact; onChanged: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setIsPending(true);
    await updateEvent(event.id, { title: editTitle.trim() });
    setIsPending(false);
    setIsEditing(false);
    onChanged();
  };

  const handleDelete = async () => {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    setIsPending(true);
    await deleteEvent(event.id);
    setIsPending(false);
    onChanged();
  };

  if (isEditing) {
    return (
      <div className="glass-card p-3 space-y-2">
        <textarea
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          rows={2}
          className="w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40 resize-y"
        />
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={isPending || !editTitle.trim()} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] disabled:opacity-50">Kaydet</button>
          <button onClick={() => setIsEditing(false)} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground">İptal</button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wide text-[var(--primary)]/80 font-semibold">{NOTE_TYPE_LABELS[event.event_type] ?? event.event_type}</span>
        <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{event.title}</p>
      </div>
      <button onClick={() => setIsEditing(true)} className="p-1 text-muted-foreground hover:text-[var(--primary)] transition-colors shrink-0" aria-label="Düzenle"><Pencil size={13} /></button>
      <button onClick={handleDelete} disabled={isPending} className="p-1 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-40 shrink-0" aria-label="Sil"><Trash2 size={13} /></button>
    </div>
  );
}

export function TodayScreen() {
  const [events, setEvents] = useState<CaseEventWithContact[] | null>(null);
  const [deadlines, setDeadlines] = useState<CaseEventRow[] | null>(null);
  const [recessPeriods, setRecessPeriods] = useState<RecessPeriod[]>([]);
  const [coveredYears, setCoveredYears] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'none' | 'calculator'>('none');

  const load = async () => {
    setError(null);
    try {
      const [ev, dl, rp, nwd] = await Promise.all([
        fetchTodayEventsWithContact(), fetchUpcomingDeadlines(7), fetchRecessPeriods(), fetchNonWorkingDays(),
      ]);
      setEvents(ev);
      setDeadlines(dl);
      setRecessPeriods(rp);
      setCoveredYears(nwd.coveredYears);
    } catch (err) {
      if (err instanceof AgendaNotConfiguredError) setError(err.message);
      else { console.error('Ajanda yüklenemedi:', err); setError('Ajanda yüklenirken beklenmeyen bir hata oluştu.'); }
      setEvents([]); setDeadlines([]);
    }
  };

  useEffect(() => { load(); }, []);

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Ajanda Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const today = new Date();
  const activeRecess = recessPeriods.find(r => today >= new Date(r.startsOn) && today <= new Date(r.endsOn));
  const currentYearCovered = coveredYears.has(today.getFullYear());

  return (
    <div className="space-y-5 max-w-2xl">
      {activeRecess && (
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="shrink-0" />
          Adli tatil ({formatDayMonth(activeRecess.startsOn)} – {formatDayMonth(activeRecess.endsOn)}). Süre hesaplamaları HMK m.104 uzatmasını uygular.
        </div>
      )}
      {!currentYearCovered && (
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="shrink-0" />
          {today.getFullYear()} yılı tatil günleri girilmemiş — o yıla düşen süreler doğrulanmalı.
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bugünkü Duruşmalar</h3>
        {events === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {events !== null && events.filter(e => e.event_type === 'durusma').length === 0 && <p className="text-sm text-muted-foreground">Bugün için planlanmış duruşma yok.</p>}
        <div className="space-y-3">
          {events?.filter(e => e.event_type === 'durusma').map(ev => <HearingCard key={ev.id} event={ev} onChanged={load} />)}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Yaklaşan Süreler (7 Gün)</h3>
        {deadlines !== null && deadlines.length === 0 && <p className="text-sm text-muted-foreground">Önümüzdeki 7 gün içinde vadesi dolan süre yok.</p>}
        <div className="space-y-2">
          {deadlines?.map(d => <DeadlineRow key={d.id} deadline={d} onChanged={load} />)}
        </div>
      </div>

      {events !== null && events.filter(e => e.event_type !== 'durusma').length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bugünün Diğer Kayıtları</h3>
          <div className="space-y-2">
            {events.filter(e => e.event_type !== 'durusma').map(ev => <NoteRow key={ev.id} event={ev} onChanged={load} />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Hızlı İşlem</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setActiveTool(activeTool === 'calculator' ? 'none' : 'calculator')} className="glass-card p-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <Calculator size={16} /> Süre Hesapla
          </button>
          <a href="/dashboard/dosyalar" className="glass-card p-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <CalendarPlus size={16} /> Duruşma Ekle
          </a>
        </div>
      </div>

      {activeTool === 'calculator' && <DeadlineCalculator onSaved={load} />}
    </div>
  );
}
