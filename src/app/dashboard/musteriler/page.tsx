import { Suspense } from 'react'
import { Contact } from 'lucide-react'
import { ClientsPanel } from '@/modules/clients'

export default function ClientsPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]"><Contact size={22} strokeWidth={1.5} /></span>
        Müvekkiller
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Müvekkil bazlı dosya durumu, finans özeti, müvekkil raporu ve dosya durum linkleri.
      </p>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Yükleniyor...</p>}>
        <ClientsPanel />
      </Suspense>
    </div>
  )
}
