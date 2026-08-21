import { LivingBackground } from "@/components/layout/LivingBackground";
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { MobileTabBar } from '@/components/layout/MobileTabBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LivingBackground />
      <div className="relative z-0 flex min-h-screen">
        <DesktopSidebar />
        <main className="flex-1 md:pl-[88px] pb-tabbar-safe md:pb-8 font-sans overflow-x-hidden">
          {children}
        </main>
        <MobileTabBar />
      </div>
    </>
  );
}
