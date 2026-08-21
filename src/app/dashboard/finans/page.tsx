import { LedgerPanel } from '@/modules/finance'
import { Wallet } from 'lucide-react'

export default function FinancePage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]"><Wallet size={22} strokeWidth={1.5} /></span>
        Finans
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Gelir, gider ve tahsilat takibi. Bu bir yönetim raporlama defteridir; muhasebe kayıtlarının veya mali müşavir hizmetinin yerini almaz.
      </p>

      <LedgerPanel />
    </div>
  )
}
