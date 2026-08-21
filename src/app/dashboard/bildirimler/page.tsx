import { NotificationsPanel } from '@/modules/notifications'
import { Bell } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]"><Bell size={22} strokeWidth={1.5} /></span>
        Bildirimler
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Büro içi duyurular, doğrudan mesajlar ve sistem hatırlatmaları. Yönetici tüm büroya duyuru gönderebilir; herkes birbirine mesaj yazabilir.
      </p>

      <NotificationsPanel />
    </div>
  )
}
