-- Aşama 5: ultimate security güçlendirmesi.
--
-- 1) llm_logs SELECT RLS sıkılaştırma: bugün herhangi bir authenticated
--    kullanıcı (stajyer dahil) tüm prompt/response içeriğini okuyabiliyor —
--    bu, müvekkil dosya detaylarını içerebilir. is_yonetici()/is_master()
--    ile sınırlandırılır. NOT: bu değişiklikten sonra avukat/stajyer
--    rolündeki kullanıcılar Dashboard'daki "İşlenen Token" sayacını ve
--    "Sistem Aktiviteleri" listesini artık görmez (uygulama tarafında bu
--    kartlar rol bazlı gizlenir — bkz. Dashboard.tsx).
DROP POLICY IF EXISTS "Allow authenticated select for logs" ON llm_logs;
CREATE POLICY "Allow yonetici or master select for logs" ON llm_logs
  FOR SELECT USING (is_yonetici() OR is_master());

-- 2) Hassas eylemler için basit bir denetim kaydı. Uygulama kodu tabloya
--    DOĞRUDAN INSERT yapmaz (RLS'te bilinçli olarak hiç INSERT politikası
--    yok) — yalnızca SECURITY DEFINER `log_audit_event` fonksiyonu üzerinden
--    yazılır, böylece bir istemci kendi adına sahte/silme niteliğinde kayıt
--    üretemez ve `actor_id` her zaman gerçek `auth.uid()`'dir.
CREATE TABLE audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID REFERENCES auth.users(id),
  action     TEXT NOT NULL,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow yonetici or master select for audit_log" ON audit_log
  FOR SELECT USING (is_yonetici() OR is_master());

CREATE OR REPLACE FUNCTION log_audit_event(p_action TEXT, p_details JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO audit_log (actor_id, action, details) VALUES (auth.uid(), p_action, p_details);
$$;

GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, JSONB) TO authenticated;

-- Şimdilik yalnızca en yüksek riskli/en ucuz noktalar kaydedilir: rol
-- değişikliği, aktif/pasif durum değişikliği, token sayacı sıfırlama,
-- kiracı aktif/pasif değişikliği (bkz. teamRepository.ts / tokenCounter.ts /
-- masterRepository.ts). Müvekkil raporu indirme ve durum linki üretimi bu
-- kapsamda DEĞİL — ayrı, o akışlara dokunan bir sonraki adımda eklenebilir.
