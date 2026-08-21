import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, isMockSupabase } from '@/core/database/supabase'
import { checkRateLimit, getClientIp } from '@/core/rate-limit'
import { CONSULTATION_AREA_IDS } from '@/modules/practice-areas'

// Güvenlik denetimi (2026-08-11): ConsultationRequestForm daha önce
// tarayıcıdan doğrudan `supabase.from('clients').insert(...)` çağırıyordu —
// hiçbir sunucu tarafı yol olmadığı için rate-limit uygulanamıyordu (anon
// anahtarla sınırsız PII satırı yazılabilirdi). Artık bu route üzerinden
// geçer; RLS "Allow public insert for clients" politikası değişmedi, aynı
// anon istemci kullanılıyor — yalnızca IP başına hız sınırı ve gövde
// doğrulaması eklendi.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 dakika

const consultationSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(200).or(z.literal('')).optional(),
  phone: z.string().min(1).max(50),
  practiceAreaId: z.enum(CONSULTATION_AREA_IDS as unknown as [string, ...string[]]),
  caseType: z.string().max(300),
  details: z.string().max(4000),
  preferredChannel: z.enum(['zoom_teams', 'encrypted_call']),
  attachmentUrl: z.string().url().max(2000).nullable().optional(),
  imageUrl: z.string().url().max(2000).nullable().optional(),
  consent1: z.boolean(),
  consent2: z.boolean(),
});

export async function POST(req: Request) {
  if (isMockSupabase()) {
    return NextResponse.json({ error: 'Supabase yapılandırılmadı.' }, { status: 503 });
  }

  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await checkRateLimit(`consultation:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = consultationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz form verisi.' }, { status: 400 });
  }
  const f = parsed.data;

  if (!f.consent1 || !f.consent2) {
    return NextResponse.json({ error: 'Onay kutuları işaretlenmelidir.' }, { status: 400 });
  }

  const { error } = await supabase.from('clients').insert({
    full_name: f.fullName,
    email: f.email || null,
    phone: f.phone,
    practice_area_id: f.practiceAreaId,
    case_type: f.caseType,
    details: f.details,
    preferred_channel: f.preferredChannel,
    attachment_url: f.attachmentUrl || null,
    image_url: f.imageUrl || null,
    consents: { fee_notice: f.consent1, kvkk: f.consent2, timestamp: new Date().toISOString() },
    source: 'website_consultation',
  });

  if (error) {
    console.error('consultation-request insert error:', error);
    return NextResponse.json({ error: 'Talep kaydedilirken bir hata oluştu.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
