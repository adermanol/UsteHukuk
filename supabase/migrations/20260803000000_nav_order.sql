-- Aşama 4: dashboard menüsü sıralaması. Kullanıcı bazlı, NULL = varsayılan
-- sıra (NAV_REGISTRY'deki tanım sırası). `set_nav_order` bir SECURITY
-- DEFINER RPC'dir — normal "Allow yonetici update for profiles" politikası
-- yalnızca yönetici/master'ın BAŞKALARININ rolünü/durumunu değiştirmesine
-- izin verir, kişisel menü tercihini ise HERKESİN kendi satırında
-- değiştirebilmesi gerekir. Bunu genel bir "self update" RLS politikasıyla
-- açmak yerine (role/is_active'i de yanlışlıkla açabilir), yalnızca
-- nav_order kolonunu ve yalnızca çağıranın kendi satırını dokunan dar bir
-- fonksiyon kullanılır.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nav_order TEXT[];

CREATE OR REPLACE FUNCTION set_nav_order(new_order TEXT[])
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles SET nav_order = new_order WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION set_nav_order(TEXT[]) TO authenticated;
