-- Güvenlik denetimi (2026-08-11): müvekkil durum linkleri süresiz
-- geçerliydi — WhatsApp üzerinden iletilen bir link sonsuza dek erişim
-- sağlardı, manuel iptal dışında hiçbir kapanma yolu yoktu. 90 günlük
-- bir son kullanma tarihi eklenir; süre dolunca link `resolveStatusLink`
-- tarafından geçersiz sayılır (satır silinmez, personel yine görebilir/
-- yenileyebilir).
ALTER TABLE case_status_links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Mevcut satırlar için geriye dönük doldurma: en son yenilenme (veya hiç
-- yenilenmediyse oluşturulma) tarihinden 90 gün sonrası.
UPDATE case_status_links
   SET expires_at = COALESCE(regenerated_at, created_at) + INTERVAL '90 days'
 WHERE expires_at IS NULL;
