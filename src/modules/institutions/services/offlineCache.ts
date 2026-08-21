/**
 * Sahada telefon çoğu zaman tam ihtiyaç duyulan anda kullanılamaz —
 * cezaevinde kapıda dolaba giriyor, adliye bodrumunda sinyal yok. Bu yüzden
 * kurum kartları ve ajanda verisi açılışta localStorage'dan hemen render
 * edilir, ağ isteği arkada tazeler. Service worker gerekmez — bu 40 satır
 * gerçek vakaların çoğunu kapsar.
 */
interface CacheEnvelope<T> { data: T; cachedAt: string }

const PREFIX = 'lawlm-offline-cache:';

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = { data, cachedAt: new Date().toISOString() };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // Depolama dolu/erişilemez olabilir — sessizce yoksay, bu bir önbellek.
  }
}

export function readCache<T>(key: string): { data: T; cachedAt: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

export function formatCacheAge(cachedAt: string): string {
  return new Date(cachedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
