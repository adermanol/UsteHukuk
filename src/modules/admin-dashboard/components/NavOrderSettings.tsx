"use client"

import { useEffect, useState, useTransition } from 'react'
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { fetchCurrentProfile, updateNavOrder } from '@/modules/team'
import { NAV_REGISTRY, resolveNavOrder } from '@/lib/navRegistry'

/** Masaüstü ana rayın (DesktopSidebar) 7 hedefinin kişisel görüntüleme
 * sırasını yönetir. Yukarı/aşağı oklarla taşınır — sürükle-bırak
 * kütüphanesi eklenmez (bu ölçekte gereksiz bağımlılık). */
export function NavOrderSettings() {
  const [order, setOrder] = useState<string[]>(NAV_REGISTRY.map(i => i.id));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchCurrentProfile()
      .then(p => setOrder(resolveNavOrder(p?.nav_order).map(i => i.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setMessage(null);
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateNavOrder(order);
      setMessage(result.message);
    });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Yükleniyor...</p>;

  const items = resolveNavOrder(order);

  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-1.5">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/40"
          >
            <GripVertical size={16} className="text-muted-foreground shrink-0" />
            <item.icon size={18} strokeWidth={1.5} className="text-[var(--primary)] shrink-0" />
            <span className="text-sm text-foreground flex-1">{item.label}</span>
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`${item.label} yukarı taşı`}
                className="p-0.5 rounded text-muted-foreground hover:text-[var(--primary)] disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label={`${item.label} aşağı taşı`}
                className="p-0.5 rounded text-muted-foreground hover:text-[var(--primary)] disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
        >
          Sırayı Kaydet
        </button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}
