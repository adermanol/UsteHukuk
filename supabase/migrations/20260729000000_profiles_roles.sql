-- Çok kullanıcılı temel: rol tabanlı erişim (yönetici / avukat / stajyer).
-- Bu andan itibaren dosya, ajanda ve finans tabloları "auth.role() =
-- 'authenticated' ise her şeyi görür" yerine role/owner_id bazlı RLS
-- kullanacak — bu yüzden diğer tüm Faz 1 migration'larından önce gelir.

-- e-posta burada tekrarlanır: anon anahtarla auth.users doğrudan
-- okunamadığı için (yalnızca service-role erişebilir), Ekip panelinin
-- normal "use client" + anon-client CRUD deseniyle (applicationsRepository
-- ile aynı desen) çalışabilmesi için trigger'da bir kez kopyalanır.
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'avukat' CHECK (role IN ('yonetici', 'avukat', 'stajyer')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- auth.users'a yeni kullanıcı eklendiğinde otomatik profil açar (varsayılan
-- rol 'avukat'). Büronun ilk hesabı burada 'avukat' olarak açılır; hemen
-- altındaki bootstrap adımı ilk profili 'yonetici'ye yükseltir — aksi halde
-- rol atayabilecek hiç kimse olmaz.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name) VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Rol kontrol fonksiyonları SECURITY DEFINER olmak ZORUNDA: profiles
-- üzerindeki bir RLS politikası kendi tablosunu bu fonksiyonla sorgulayınca,
-- fonksiyon SECURITY INVOKER olsaydı politika kendi kendini çağırıp sonsuz
-- özyinelemeye girerdi. SET search_path = public, arama yolu enjeksiyonuna
-- karşı standart önlem.
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active;
$$;

CREATE OR REPLACE FUNCTION is_yonetici() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() = 'yonetici';
$$;

CREATE OR REPLACE FUNCTION can_see_finance() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() IN ('yonetici', 'avukat');
$$;

GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_yonetici() TO authenticated;
GRANT EXECUTE ON FUNCTION can_see_finance() TO authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow self select for profiles" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_yonetici());
CREATE POLICY "Allow yonetici update for profiles" ON profiles
  FOR UPDATE USING (is_yonetici());

-- Bootstrap: hiç 'yonetici' yoksa (büronun ilk girişi), ilk profili
-- 'yonetici' yapar. Tek seferlik — bir yonetici oluştuktan sonra devre dışı
-- kalır çünkü WHERE koşulu artık hiç satıra uymaz.
CREATE OR REPLACE FUNCTION bootstrap_first_yonetici() RETURNS TRIGGER
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'yonetici') THEN
    UPDATE profiles SET role = 'yonetici' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_profile_created_bootstrap
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION bootstrap_first_yonetici();
