import * as Sentry from '@sentry/nextjs'

// Aşama 9 (güvenlik denetimi, 2026-08-11): hiç hata izleme/uyarı sistemi
// yoktu — örn. gece yarısı duruşma hatırlatma cron'u (agenda-reminders)
// sessizce başarısız olursa kimse haberdar olmuyordu. SENTRY_DSN
// tanımlanmadığı sürece Sentry SDK'sı kendi kendine devre dışı kalır
// (resmi davranış), bu yüzden env değişkeni eklenene kadar sistemde
// hiçbir işlevsel/performans değişikliği olmaz.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
