import { ApplicationsPanel } from '@/modules/applications/components/ApplicationsPanel'
import { Users } from 'lucide-react'

export default function ApplicationsPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400"><Users size={22} strokeWidth={1.5} /></span>
        Başvurular
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Dashboard'dan ve web sitesindeki online danışma talebi formundan gelen tüm müvekkil başvurularını görüntüleyin ve durumlarını yönetin.
      </p>

      <ApplicationsPanel />
    </div>
  )
}
