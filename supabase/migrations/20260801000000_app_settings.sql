-- Merkezi ayarlar deposu. CMS içeriği (`cms-data.json`) ve LLM sağlayıcı
-- ayarları (`llm-settings.json`) şimdiye kadar `fs.writeFileSync` ile diske
-- yazılıyordu — Vercel'de bu dizin salt-okunur, yani üretimde yapılan
-- değişiklikler kalıcı olmuyordu (fark edilmemiş, kritik bir hata). Bu
-- tablo o iki dosyanın ve yeni tema/sayaç ayarlarının tek doğru kaynağı
-- olur; `src/lib/cms.ts` ve `src/lib/llmSettings.ts` fonksiyon imzaları
-- aynı kalır, yalnızca fs yerine bu tabloyu okur/yazar.
CREATE TABLE app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- SELECT herkese açık (anon dahil): public site tema/CMS içeriğini render
-- ederken oturum yok. Yazma yalnızca yönetici — bu politika, master rolü
-- eklendiğinde (20260802000000_master_tenants.sql) is_master() da
-- kapsayacak şekilde DROP+CREATE ile genişletilir.
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select for app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow yonetici write for app_settings" ON app_settings FOR ALL USING (is_yonetici()) WITH CHECK (is_yonetici());
