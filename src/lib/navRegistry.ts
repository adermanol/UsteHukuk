// Aşama 4: dashboard menüsü sıralaması. Masaüstü ana rayın (DesktopSidebar)
// 7 hedefi burada tek bir kayıt olarak tanımlanır — hem sabit varsayılan
// sırayı hem de ayarlardan yeniden sıralanabilir listeyi besler.
// `nav_order` (profiles.nav_order) yalnızca id dizisidir; href/icon/label
// her zaman buradan çözülür — böylece link hedefleri değişse bile
// kullanıcının kayıtlı sırası bozulmaz.
import { Home, CalendarClock, FolderOpen, Users, Wallet, Landmark, BarChart2, type LucideIcon } from 'lucide-react'

export interface NavRegistryItem {
  id: string;
  href: string;
  icon: LucideIcon;
  label: string;
}

export const NAV_REGISTRY: NavRegistryItem[] = [
  { id: 'panel', href: '/dashboard', icon: Home, label: 'Panel' },
  { id: 'ajanda', href: '/dashboard/ajanda', icon: CalendarClock, label: 'Ajanda' },
  { id: 'dosyalar', href: '/dashboard/dosyalar', icon: FolderOpen, label: 'Dosyalar' },
  { id: 'basvurular', href: '/dashboard/applications', icon: Users, label: 'Başvurular' },
  { id: 'finans', href: '/dashboard/finans', icon: Wallet, label: 'Finans' },
  { id: 'kurumlar', href: '/dashboard/kurumlar', icon: Landmark, label: 'Kurumlar' },
  { id: 'analitik', href: '/dashboard/analytics', icon: BarChart2, label: 'Analitik Panel' },
];

export const DEFAULT_NAV_ORDER: string[] = NAV_REGISTRY.map(i => i.id);

/** MobileTabBar yalnızca ilk 4 öğeyi sabit sekme olarak gösterebilir (FAB'ın
 * sağında/solunda 2'şer slot) — masaüstü rayının "Panel önce" varsayılanı
 * mobilde anlamsız (Panel zaten "Daha Fazla"da erişilebilir, günlük en çok
 * kullanılan 4 hedef öne çıkarılır). Kullanıcı ayarlardan sırayı
 * özelleştirdiğinde bu varsayılan devre dışı kalır — tek bir kayıtlı sıra
 * hem masaüstünü hem mobili besler. */
export const MOBILE_DEFAULT_ORDER: string[] = ['ajanda', 'dosyalar', 'kurumlar', 'finans', 'panel', 'basvurular', 'analitik'];

/** `nav_order`'daki id'leri NAV_REGISTRY sırasına göre diziler. Kayıtlı
 * sırada olmayan (silinmiş/değişmiş) id'ler yok sayılır; kayıtlı sırada
 * hiç geçmeyen (yeni eklenen) öğeler listenin sonuna eklenir — böylece
 * eski bir kayıt asla bir menü öğesini tamamen kaybettirmez. */
export function resolveNavOrder(order: string[] | null | undefined): NavRegistryItem[] {
  if (!order || order.length === 0) return NAV_REGISTRY;
  const byId = new Map(NAV_REGISTRY.map(i => [i.id, i]));
  const ordered: NavRegistryItem[] = [];
  for (const id of order) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  for (const item of byId.values()) ordered.push(item);
  return ordered;
}
