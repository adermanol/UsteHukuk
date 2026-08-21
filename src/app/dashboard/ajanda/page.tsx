import { TodayScreen } from '@/modules/agenda'
import { CalendarClock } from 'lucide-react'

export default function AjandaPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]"><CalendarClock size={22} strokeWidth={1.5} /></span>
        Bugün
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Bugünkü duruşmalarınız, yaklaşan süreleriniz ve hızlı işlemler.
      </p>

      <TodayScreen />
    </div>
  )
}
