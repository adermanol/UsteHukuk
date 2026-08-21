import { Crown } from 'lucide-react'
import { MasterPanel } from '@/modules/master'

export default function MasterPage() {
  return (
    <div className="p-6 md:p-10 min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300"><Crown size={22} strokeWidth={1.5} /></span>
        Platform Kontrol Merkezi
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Kiracı kaydı ve platform geneli özet. Büro içi dosya/finans verisine erişim yoktur.
      </p>

      <MasterPanel />
    </div>
  )
}
