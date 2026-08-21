"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Calculator, CalendarPlus, StickyNote, MessageSquare } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { openChatWidget } from '@/modules/intake-assistant'
import { QuickExpenseSheet } from '@/modules/finance'
import { createEvent } from '@/modules/agenda'

/** Mobil alt çubuğun merkez FAB'ı: sahada en sık yapılan dört işlemi (masraf
 * ekleme, süre hesaplama, duruşma ekleme, not alma) artı sohbet asistanını
 * tek dokunuşla erişilebilir kılar. Önceden bu FAB doğrudan sohbeti
 * açıyordu; sohbet artık menünün bir öğesi, davranış değişikliği kullanıcı
 * tarafından onaylandı. */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [view, setView] = useState<'menu' | 'expense' | 'note'>('menu');
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);

  const close = () => { onClose(); setView('menu'); setNoteMessage(null); setNoteText(''); };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setIsSaving(true);
    const result = await createEvent({
      case_id: null, client_id: null, event_type: 'not', title: noteText.trim(),
      starts_at: new Date().toISOString(), ends_at: null, all_day: true, location_note: null,
    });
    setIsSaving(false);
    setNoteMessage(result.message);
    if (result.success) close();
  };

  if (view === 'expense') {
    return <QuickExpenseSheet open={open} onClose={close} />;
  }

  return (
    <BottomSheet open={open} onClose={close} title={view === 'note' ? 'Not Al' : 'Hızlı Ekle'}>
      {view === 'menu' && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setView('expense')} className="glass-card p-4 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <Receipt size={22} /> Masraf Ekle
          </button>
          <button onClick={() => { close(); router.push('/dashboard/ajanda'); }} className="glass-card p-4 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <Calculator size={22} /> Süre Hesapla
          </button>
          <button onClick={() => { close(); router.push('/dashboard/dosyalar'); }} className="glass-card p-4 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <CalendarPlus size={22} /> Duruşma Ekle
          </button>
          <button onClick={() => setView('note')} className="glass-card p-4 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <StickyNote size={22} /> Not Al
          </button>
          <button onClick={() => { close(); openChatWidget(); }} className="glass-card p-4 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-[var(--primary)] transition-colors col-span-2">
            <MessageSquare size={22} /> Sohbet Asistanı
          </button>
        </div>
      )}

      {view === 'note' && (
        <div className="space-y-3">
          <textarea
            autoFocus
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={4}
            placeholder="Hızlı not..."
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40 resize-y"
          />
          <button onClick={handleSaveNote} disabled={isSaving || !noteText.trim()} className="w-full text-sm font-medium py-2.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50">
            Kaydet
          </button>
          {noteMessage && <p className="text-xs text-muted-foreground text-center">{noteMessage}</p>}
        </div>
      )}
    </BottomSheet>
  );
}
