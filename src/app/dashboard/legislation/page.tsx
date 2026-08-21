import { RadarPanel } from '@/modules/legislation-radar'
import { Radar } from 'lucide-react'

export default function LegislationPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]"><Radar size={22} strokeWidth={1.5} /></span>
        Mevzuat & Güncel Bilgiler Radarı
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Resmî Gazete, Mevzuat Bilgi Sistemi, KVKK ve Rekabet Kurumu'nu yapay zekâ kullanmadan, doğrudan kaynak metni üzerinden düzenli tarayan sistem. Her kayıt orijinal kaynağa bağlantı verir.
      </p>

      <div className="max-w-3xl">
        <RadarPanel />
      </div>
    </div>
  )
}
