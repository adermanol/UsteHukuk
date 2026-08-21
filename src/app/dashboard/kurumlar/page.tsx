import { InstitutionsPanel } from '@/modules/institutions'
import { Landmark } from 'lucide-react'

export default function InstitutionsPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]"><Landmark size={22} strokeWidth={1.5} /></span>
        Kurumlar
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Adliye, cezaevi, göç idaresi ve devlet kurumları rehberi. Tıkla-ara, tıkla-yol tarifi ve kurum bazlı kontrol listeleri.
      </p>

      <InstitutionsPanel />
    </div>
  )
}
