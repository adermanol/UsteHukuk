import { CalendarClock, ShieldAlert, MapPin } from 'lucide-react'
import { resolveStatusLink, fetchPortalCaseView, fetchPortalEvents } from '@/modules/client-portal'

export default async function PortalDurumPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveStatusLink(token);

  if (!resolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#131110] px-6">
        <div className="max-w-sm text-center">
          <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="font-serif text-xl text-[#ece5dd] mb-2">Bağlantı Geçersiz</h1>
          <p className="text-sm text-[#ece5dd]/60">Bu bağlantı geçersiz veya erişime kapatılmış. Lütfen bürodan yeni bir bağlantı isteyin.</p>
        </div>
      </div>
    );
  }

  const [caseView, events] = await Promise.all([
    fetchPortalCaseView(resolved.caseId),
    fetchPortalEvents(resolved.caseId),
  ]);

  if (!caseView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#131110] px-6">
        <div className="max-w-sm text-center">
          <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="font-serif text-xl text-[#ece5dd] mb-2">Bağlantı Geçersiz</h1>
          <p className="text-sm text-[#ece5dd]/60">Bu bağlantı geçersiz veya erişime kapatılmış. Lütfen bürodan yeni bir bağlantı isteyin.</p>
        </div>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="min-h-screen bg-[#131110] text-[#ece5dd] px-5 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <p className="font-serif text-[15px] tracking-[0.2em] uppercase text-[var(--primary,#cda372)] mb-1">Dosya Durumu</p>
          <h1 className="font-serif text-2xl text-[#ece5dd]">{caseView.title}</h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3">
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-[var(--primary,#cda372)]/15 text-[var(--primary,#cda372)]">
            {caseView.statusLabel}
          </span>
          <div className="grid grid-cols-1 gap-2 text-sm pt-2">
            {caseView.courtName && <p className="text-[#ece5dd]/60">Mahkeme/Kurum: <span className="text-[#ece5dd]">{caseView.courtName}</span></p>}
            <p className="text-[#ece5dd]/60">Açılış: <span className="text-[#ece5dd]">{new Date(caseView.openedAt).toLocaleDateString('tr-TR')}</span></p>
            {caseView.closedAt && <p className="text-[#ece5dd]/60">Kapanış: <span className="text-[#ece5dd]">{new Date(caseView.closedAt).toLocaleDateString('tr-TR')}</span></p>}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3">
          <h2 className="font-serif text-lg text-[#ece5dd] flex items-center gap-2"><CalendarClock size={18} className="text-[var(--primary,#cda372)]" /> Randevular</h2>
          {events.length === 0 && <p className="text-sm text-[#ece5dd]/60">Planlanmış bir randevu bulunmuyor.</p>}
          {events.map(e => {
            const isPast = new Date(e.startsAt) < now;
            return (
              <div key={e.id} className={`border border-white/10 rounded-xl p-3 ${isPast ? 'opacity-50' : ''}`}>
                <p className="text-sm text-[#ece5dd]">{e.title}</p>
                <p className="text-xs text-[#ece5dd]/60 mt-1">{new Date(e.startsAt).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</p>
                {e.locationNote && <p className="text-xs text-[#ece5dd]/60 flex items-center gap-1 mt-1"><MapPin size={11} /> {e.locationNote}</p>}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-[#ece5dd]/60 text-center leading-relaxed">
          Bu sayfa yalnızca dosyanızın genel durumunu ve randevularını gösterir. Detaylı bilgi için lütfen büronuzla iletişime geçin.
        </p>
      </div>
    </div>
  );
}
