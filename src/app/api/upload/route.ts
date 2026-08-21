import { NextResponse } from 'next/server'
import path from 'path'
import crypto from 'crypto'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/core/database/supabase-admin'
import { createServerSupabaseClient } from '@/core/database/supabase-server'
import { checkRateLimit, getClientIp } from '@/core/rate-limit'
import { reportSystemError } from '@/core/system-error-log'

// Güvenlik denetimi (2026-08-11): bu uç nokta üç farklı bağlamdan
// çağrılıyor, her biri farklı bir görünürlük gerektiriyor:
//   - 'cms-public'              : takım fotoğrafı, blog kapak görseli —
//                                 zaten kamuya açık olması GEREKEN varlıklar.
//                                 Yalnızca oturum açmış personel yükleyebilir,
//                                 sonuç herkese açık bir URL'dir (mevcut
//                                 `uploads` bucket'ı — geriye dönük uyumlu).
//   - 'staff-private'           : masraf makbuzu gibi personel-içi belgeler.
//                                 Oturum gerekir, `private-documents`
//                                 bucket'ına yazılır, imzalı URL döner.
//   - 'consultation-attachment' : herkese açık danışma formu eki/fotoğrafı.
//                                 Oturum GEREKMEZ (form zaten kimliksiz) ama
//                                 `private-documents` bucket'ına yazılır —
//                                 önceden herkese açık bucket'a düşen kimlik/
//                                 belge taramaları artık tahmin edilebilir
//                                 bir URL ile açığa çıkmaz.
// Dosya adı artık crypto.randomUUID() — eski `Date.now()+Math.random()`
// deseni CSPRNG değildi.
type UploadKind = 'cms-public' | 'staff-private' | 'consultation-attachment';
const PUBLIC_BUCKET = 'uploads';
const PRIVATE_BUCKET = 'private-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 yıl

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const UPLOAD_RATE_LIMIT_MAX = 20;
const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function POST(req: Request) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Depolama yapılandırılmadı.' }, { status: 503 })
    }

    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await checkRateLimit(`upload:${ip}`, UPLOAD_RATE_LIMIT_MAX, UPLOAD_RATE_LIMIT_WINDOW_MS);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Çok fazla dosya yükleme isteği. Lütfen birkaç saniye sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const kindRaw = formData.get('kind');
    // Bilinmeyen/eksik `kind` güvenli tarafta hata verir — varsayılan olarak
    // en geniş erişimli (cms-public) davranışa asla düşülmez.
    const kind: UploadKind | null =
      kindRaw === 'cms-public' || kindRaw === 'staff-private' || kindRaw === 'consultation-attachment'
        ? kindRaw
        : null;
    if (!kind) {
      return NextResponse.json({ error: 'Geçersiz yükleme türü.' }, { status: 400 })
    }

    if (kind !== 'consultation-attachment') {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Yetkisiz istek.' }, { status: 401 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `İzin verilmeyen dosya türü: ${ext || 'bilinmiyor'}` }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Dosya boyutu 10MB sınırını aşıyor.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filename = `${crypto.randomUUID()}${ext}`
    const bucket = kind === 'cms-public' ? PUBLIC_BUCKET : PRIVATE_BUCKET;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filename, buffer, { contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream' })

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Dosya yüklenemedi.' }, { status: 500 })
    }

    if (bucket === PUBLIC_BUCKET) {
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename)
      return NextResponse.json({ success: true, url: data.publicUrl })
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filename, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed) {
      console.error('Supabase Storage signed URL error:', signError)
      return NextResponse.json({ error: 'Dosya yüklendi ama bağlantı üretilemedi.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: signed.signedUrl })

  } catch (error) {
    console.error('Upload error:', error)
    void reportSystemError('api:upload', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
