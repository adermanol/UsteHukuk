-- SaaS platform temeli — YALNIZCA TEMEL. Gerçek çok-kiracılı izolasyon
-- (cases/clients/ledger_entries gibi ~15-20 iş tablosuna tenant_id +
-- genişletilmiş RLS) bilerek BU MİGRATION'A DAHİL EDİLMEDİ: bugün sistemde
-- tek bir kiracı (Üste Hukuk) var, ikinci bir büro olmadan izolasyonu canlı
-- test etmenin yolu yok — doğrulanamayan bir RLS değişikliği, tam olarak
-- önlemeye çalıştığı türden bir veri sızıntısı riski taşır. Gerçek bir
-- ikinci kiracı sisteme alınacağı gün, o kiracıyla birlikte ve iki-kiracılı
-- canlı testle yapılacak.
--
-- Burada kurulan: kiracı kaydı (tenants), master rolü ve is_master()
-- yardımcı fonksiyonu, ve mevcut "master avukat yetkilendiremiyoruz"
-- hatasının kök nedeni olan sessiz RLS başarısızlığının düzeltilmesi.

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  feature_flags JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO tenants (slug, name) VALUES ('uste-hukuk', 'Üste Hukuk Bürosu')
  ON CONFLICT (slug) DO NOTHING;

-- Bugün her profildeki tenant_id tek bir değere (uste-hukuk) sabitlenir —
-- gerçek çok-kiracılı davranış (RLS'in tenant_id'ye göre satır filtrelemesi)
-- yalnızca ikinci bir kiracı eklendiğinde devreye girer.
ALTER TABLE profiles ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE profiles SET tenant_id = (SELECT id FROM tenants WHERE slug = 'uste-hukuk') WHERE tenant_id IS NULL;

-- 'master' rolü yönetici'nin üstünde, kiracıya bağlı DEĞİL — tüm
-- kiracıları görür (platformu işleten taraf, büronun kendisi değil).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('master', 'yonetici', 'avukat', 'stajyer'));

CREATE OR REPLACE FUNCTION is_master() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT current_user_role() = 'master' $$;
GRANT EXECUTE ON FUNCTION is_master() TO authenticated;

-- app_settings yazma politikası master'ı da kapsayacak şekilde genişletilir
-- (bkz. 20260801000000_app_settings.sql'deki not).
DROP POLICY IF EXISTS "Allow yonetici write for app_settings" ON app_settings;
CREATE POLICY "Allow yonetici or master write for app_settings" ON app_settings
  FOR ALL USING (is_yonetici() OR is_master()) WITH CHECK (is_yonetici() OR is_master());

-- master her kiracıdaki her profili görebilir/düzenleyebilir (mevcut
-- "Allow self select"/"Allow yonetici update" politikalarıyla OR'lanır).
CREATE POLICY "Allow master select for profiles" ON profiles FOR SELECT USING (is_master());
CREATE POLICY "Allow master update for profiles" ON profiles FOR UPDATE USING (is_master());

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow master all for tenants" ON tenants FOR ALL USING (is_master()) WITH CHECK (is_master());
-- Kendi kiracısını herkes okuyabilir (ör. dashboard'da büro adını göstermek için).
CREATE POLICY "Allow authenticated select own tenant" ON tenants FOR SELECT USING (
  id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
