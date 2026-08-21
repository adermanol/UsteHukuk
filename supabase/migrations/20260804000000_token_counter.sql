-- Aşama 6: token sayacı sıfırlama. Sıfırlama zamanı yeni bir tablo/kolon
-- GEREKTİRMEZ — mevcut genel amaçlı `app_settings` (bkz.
-- 20260801000000_app_settings.sql) key='token_counter_reset_at' altında
-- tutulur, yazma zaten is_yonetici()/is_master() ile korunuyor.
--
-- `llm_logs` satırları ASLA silinmez (denetim/analitik geçmişi korunur) —
-- yalnızca görüntüleme penceresi `created_at > p_since` ile sınırlanır. Bu
-- fonksiyon SECURITY INVOKER'dır: mevcut `llm_logs` SELECT RLS politikası
-- neyse (bugün: herhangi bir authenticated kullanıcı — Aşama 5'te
-- sıkılaştırılması ayrıca planlanıyor) ona tabidir, sayaç bu politikayı
-- atlamaz.
CREATE OR REPLACE FUNCTION total_llm_tokens(p_since TIMESTAMPTZ DEFAULT NULL)
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(SUM(tokens_used), 0)::BIGINT
  FROM llm_logs
  WHERE p_since IS NULL OR created_at > p_since;
$$;

GRANT EXECUTE ON FUNCTION total_llm_tokens(TIMESTAMPTZ) TO authenticated;
