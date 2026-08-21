import * as Sentry from '@sentry/nextjs'

// bkz. src/instrumentation.ts — NEXT_PUBLIC_SENTRY_DSN tanımlanmadığı
// sürece devre dışı kalır, mevcut davranışı etkilemez.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
