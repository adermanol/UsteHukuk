-- Upstash/Sentry hesabı açmadan aynı korumayı sağlayan, sisteme kendi
-- içine yazılmış eşdeğerler. Supabase zaten bu uygulamanın zorunlu
-- bağımlılığı (Upstash/Sentry gibi opsiyonel eklentiler değil) — rate
-- limit sayaçlarını ve hata kayıtlarını ayrı bir üçüncü taraf yerine
-- doğrudan burada, aynı Postgres'te tutmak yeni bir hesap gerektirmez ve
-- Vercel'in çoklu serverless instance'ları arasında zaten paylaşılır
-- (Upstash'in çözdüğü sorunun aynısını, ek bir bağımlılık olmadan çözer).

-- =============================================================
-- 1) Kalıcı/paylaşımlı rate limiting (Upstash'e alternatif)
-- =============================================================
CREATE TABLE rate_limit_buckets (
  key      TEXT PRIMARY KEY,
  count    INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- KASITLI OLARAK RLS AÇIK, HİÇ POLİTİKA YOK — yalnızca aşağıdaki SECURITY
-- DEFINER fonksiyon (servis-rolüyle çağrılır) bu tabloya dokunur.
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Tek bir atomik INSERT..ON CONFLICT..RETURNING ile okuma+yazma yarış
-- koşulunu (race condition) önler — iki eşzamanlı istek aynı anahtarı aynı
-- anda artırmaya çalışsa bile Postgres'in satır kilidi sırayı garanti eder.
CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_max INT, p_window_seconds INT)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INT;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Bindirilmiş bir bakım süpürmesi: her çağrının ~%1'inde, 1 günden eski
  -- süresi dolmuş kovalar silinir — ayrı bir cron/bakım işine gerek kalmaz.
  IF random() < 0.01 THEN
    DELETE FROM rate_limit_buckets WHERE reset_at < v_now - INTERVAL '1 day';
  END IF;

  INSERT INTO rate_limit_buckets AS b (key, count, reset_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE SET
    count    = CASE WHEN b.reset_at <= v_now THEN 1 ELSE b.count + 1 END,
    reset_at = CASE WHEN b.reset_at <= v_now THEN v_now + (p_window_seconds || ' seconds')::interval ELSE b.reset_at END
  RETURNING b.count, b.reset_at INTO v_count, v_reset_at;

  IF v_count > p_max THEN
    RETURN QUERY SELECT false, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now)))::INT);
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INT, INT) TO service_role;

-- =============================================================
-- 2) Hata kaydı ve dashboard'da görünürlük (Sentry'ye alternatif)
-- =============================================================
CREATE TABLE system_errors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source      TEXT NOT NULL,       -- 'cron:agenda-reminders', 'api:chat' vb.
  message     TEXT NOT NULL,
  stack       TEXT,
  context     JSONB,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);
CREATE INDEX idx_system_errors_unresolved ON system_errors (created_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;
-- Yazma yalnızca servis-rolüyle (RLS atlanır) — istemci hiçbir zaman
-- doğrudan hata satırı ekleyemez, sahte "sistem hatası" üretilemez.
CREATE POLICY "Allow yonetici or master select for system_errors" ON system_errors
  FOR SELECT USING (is_yonetici() OR is_master());
CREATE POLICY "Allow yonetici or master update for system_errors" ON system_errors
  FOR UPDATE USING (is_yonetici() OR is_master()) WITH CHECK (is_yonetici() OR is_master());
