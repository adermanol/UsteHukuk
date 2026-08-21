-- Müvekkil durum linki: şifre/kullanıcı adıyla giriş formu YOK. Personel bir
-- (dosya, müvekkil) çifti için tek kullanımlık bir link üretir, kendisi
-- WhatsApp/SMS/e-posta ile müvekkile gönderir. Link, o TEK dosyanın durumunu
-- gösterir — bir müvekkilin 2 dosyası varsa 2 ayrı link olur, bir dosyanın
-- 3 müvekkili varsa her biri aynı dosya için kendi ayrı linkini alır.
CREATE TABLE case_status_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_hash       TEXT NOT NULL UNIQUE,   -- sha256(ham token) — ham token DB'ye asla yazılmaz
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES auth.users(id),
  regenerated_at   TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE (case_id, client_id)             -- bu dosya + bu müvekkil için tek aktif link
);

-- KASITLI OLARAK RLS AÇIK, HİÇ POLİTİKA YOK — varsayılan-red. Bu tabloya
-- yalnızca supabaseAdmin (service-role, sunucu taraflı) erişebilir; anon/
-- authenticated hiçbir zaman doğrudan sorgulayamaz. Müvekkil linke token ile
-- erişir, Supabase oturumu hiç kullanmaz (bkz. src/modules/client-portal).
ALTER TABLE case_status_links ENABLE ROW LEVEL SECURITY;
