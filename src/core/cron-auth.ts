import { timingSafeEqual } from 'crypto'
import * as Sentry from '@sentry/nextjs'
import { reportSystemError } from './system-error-log'

/**
 * Cron route'ları için paylaşılan yetki kontrolü. Güvenlik denetimi
 * (2026-08-11) öncesi her route kendi `?secret=` query-string fallback'ini
 * taşıyordu — bu, `CRON_SECRET`'ı Vercel erişim loglarına ve olası referrer
 * zincirine yazardı. Artık yalnızca `Authorization: Bearer <secret>` header'ı
 * kabul edilir (Vercel Cron GET tetiklemesinde bunu zaten otomatik gönderir)
 * ve karşılaştırma zamana-duyarsız (`timingSafeEqual`) yapılır — `===` ile
 * karakter karakter erken çıkış, teorik bir timing-attack yüzeyi bırakırdı.
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization');
  if (!header) return false;
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Cron route'ları hatayı yakalayıp bir JSON 500 döndürüyor — bu, Next.js'in
 * otomatik `onRequestError` instrumentation kancasının (bkz. src/
 * instrumentation.ts) TETİKLENMEMESİ anlamına gelir (yalnızca yakalanmamış
 * hatalarda çalışır). Bu yüzden her cron route'u kendi catch bloğunda bu
 * fonksiyonu açıkça çağırmalı — aksi halde örn. gece yarısı duruşma
 * hatırlatma cron'u (agenda-reminders) sessizce başarısız olmaya devam eder.
 * SENTRY_DSN tanımlı değilse Sentry SDK zaten devre dışıdır — bu çağrı
 * no-op olur ama `system_errors` (Supabase, hesap gerektirmez) tarafı yine
 * de çalışır, dashboard'da görünür (bkz. SystemErrorsCard).
 */
export function reportCronError(routeName: string, error: unknown) {
  Sentry.captureException(error, { tags: { cron: routeName } });
  void reportSystemError(`cron:${routeName}`, error);
}
