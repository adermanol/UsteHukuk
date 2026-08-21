import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { supabaseAdmin, isSupabaseAdminConfigured } from './database/supabase-admin'

// Aşama 6 (güvenlik denetimi, 2026-08-11) + takip (2026-08-12, Upstash/
// Sentry hesabı açmadan): saf bellek içi limiter Vercel serverless'te
// etkisizdi — her soğuk başlangıçta sıfırlanır, eşzamanlı lambda'lar
// arasında paylaşılmaz. Üç katmanlı öncelik sırası:
//   1. Upstash Redis — UPSTASH_REDIS_REST_URL/TOKEN tanımlıysa (opsiyonel,
//      en yüksek performans, ekstra hesap gerektirir).
//   2. Supabase Postgres (`check_rate_limit` RPC'si, bkz.
//      20260811000000_self_hosted_ops.sql) — Supabase zaten bu uygulamanın
//      ZORUNLU bağımlılığı, yeni bir hesap GEREKTİRMEZ; Vercel'in çoklu
//      serverless instance'ları arasında Upstash ile aynı şekilde paylaşılır.
//      supabaseAdmin yapılandırılıysa (neredeyse her zaman) bu katman
//      kullanılır — pratikte varsayılan budur.
//   3. Bellek içi — yalnızca Supabase de yapılandırılmamışsa (yerel/mock
//      geliştirme) son çare.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const isUpstashConfigured = Boolean(redisUrl && redisToken);
const redis = isUpstashConfigured ? new Redis({ url: redisUrl!, token: redisToken! }) : null;

const limiterCache = new Map<string, Ratelimit>();
function getUpstashLimiter(max: number, windowMs: number): Ratelimit {
  const cacheKey = `${max}:${windowMs}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(max, `${Math.max(1, Math.ceil(windowMs / 1000))} s`),
      analytics: false,
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

async function checkRateLimitPostgres(key: string, max: number, windowMs: number): Promise<RateLimitResult | null> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
  });
  if (error || !data || data.length === 0) {
    console.error('Postgres rate limit error, bellek içi limitere düşülüyor:', error);
    return null;
  }
  const row = data[0];
  return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds };
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimitInMemory(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  if (isUpstashConfigured) {
    try {
      const limiter = getUpstashLimiter(max, windowMs);
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        retryAfterSeconds: result.success ? 0 : Math.max(0, Math.ceil((result.reset - Date.now()) / 1000)),
      };
    } catch (err) {
      console.error('Upstash rate limit error, Postgres/bellek içi limitere düşülüyor:', err);
    }
  }

  if (isSupabaseAdminConfigured()) {
    const result = await checkRateLimitPostgres(key, max, windowMs);
    if (result) return result;
  }

  return checkRateLimitInMemory(key, max, windowMs);
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
