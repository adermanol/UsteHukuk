import { DesignerLayout } from '@/modules/business-card-designer'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'

export default function BusinessCardPage() {
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <main className="flex-1 md:pl-[88px] pb-tabbar-safe md:pb-0 font-sans overflow-hidden bg-[var(--background)]">
        <DesignerLayout />
      </main>
      <MobileTabBar />
    </div>
  )
}
