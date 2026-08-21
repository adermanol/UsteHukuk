-- Güvenlik denetimi (2026-08-11) sonrası Kritik şiddetteki bulguların
-- düzeltmesi. Her madde ayrı ayrı, minimum mevcut davranışı bozacak şekilde
-- uygulanır — canlıda kullanılan gerçek okuma yolları (public site render,
-- anonim sohbet asistanı) tek tek izlenip kırılmayacak şekilde düzeltildi.

-- =============================================================
-- 1) documents (RAG bilgi bankası) herkese açık okunabiliyordu.
-- =============================================================
-- Doğrudan tablo SELECT'i artık yalnızca authenticated (dashboard personeli)
-- içindir — anon anahtarıyla `/rest/v1/documents` üzerinden tüm bilgi
-- bankasının toplu kazınması engellenir.
--
-- ÖNEMLİ: anonim sohbet asistanı (`/api/chat`, oturumsuz ziyaretçiler için)
-- RAG araması yapmak üzere `match_documents()` RPC'sini anon istemciyle
-- çağırıyor (bkz. src/modules/knowledge-base/services/ragService.ts). Bu
-- fonksiyon SECURITY DEFINER OLMADIĞI için üstteki SELECT kısıtlamasını
-- miras alırdı ve anonim sohbet RAG'ı sessizce boş sonuç dönerdi. Bunu
-- önlemek için fonksiyon SECURITY DEFINER yapılır — yalnızca bu KONTROLLÜ,
-- salt-okunur, en-benzer-N-satırı-döndüren arama yolu anon'a açık kalır;
-- tabloya doğrudan/toplu erişim kapanır.
DROP POLICY IF EXISTS "Allow public read for docs" ON documents;
CREATE POLICY "Allow authenticated select for documents" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    documents.id,
    documents.title,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION match_documents(vector(768), float, int) TO anon, authenticated;

-- =============================================================
-- 2) Eski, kullanılmayan CMS taslak tabloları — hiç RLS'i yoktu.
-- =============================================================
-- 00000000000000_schema.sql'de tanımlı, DEPLOYMENT.md'nin "çalıştırmayın"
-- dediği taslak tablolar. Canlı DB'de doğrulandı: hiçbiri mevcut değil
-- (bu ifadeler no-op olarak çalışır). Dosya seviyesinde risk kapatılır —
-- ileride biri o dosyayı yanlışlıkla çalıştırırsa bile RLS'siz, herkese
-- açık yazılabilir tablolar oluşmaz. `practice_areas` bilinçli olarak BU
-- LİSTEYE ALINMADI: gerçek, aktif kullanılan bir tablo adıyla çakışıyor.
DROP TABLE IF EXISTS general_settings CASCADE;
DROP TABLE IF EXISTS hero_section CASCADE;
DROP TABLE IF EXISTS why_choose_us CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;

-- =============================================================
-- 3) case_clients: INSERT'te sahiplik kontrolü yoktu.
-- =============================================================
-- WITH CHECK (true), USING politikasının UPDATE/DELETE'te uyguladığı
-- sahiplik kontrolünü INSERT'te uygulamıyordu — bir kullanıcı sahibi
-- olmadığı bir dosyaya (case) keyfi bir client_id bağlayabilirdi.
DROP POLICY IF EXISTS "Allow write for case_clients" ON case_clients;
CREATE POLICY "Allow write for case_clients" ON case_clients FOR ALL USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_clients.case_id
          AND (is_yonetici() OR (c.owner_id = auth.uid() AND current_user_role() != 'stajyer')))
) WITH CHECK (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_clients.case_id
          AND (is_yonetici() OR (c.owner_id = auth.uid() AND current_user_role() != 'stajyer')))
);

-- =============================================================
-- 4) app_settings: anon SELECT tüm anahtarlara açıktı.
-- =============================================================
-- Bugün zararsız (tema/CMS/sağlayıcı seçimi), ama ileride hassas bir
-- anahtar eklenirse anında herkese açık olurdu. Yalnızca gerçekten
-- oturumsuz okunması GEREKEN anahtarlar allowlist'e alınır:
--   - cms_data, theme: public site render'ı (getCmsData/getThemeSetting,
--     oturumsuz server component'lerden çağrılır)
--   - llm_settings: yalnızca `{activeProvider}` tutar (API anahtarı DEĞİL,
--     bunlar env değişkeninde) ve anonim /api/chat tarafından okunur
-- token_counter_reset_at gibi başka bir anahtarın oturumsuz okunmasına
-- gerek yok — authenticated'e düşer.
DROP POLICY IF EXISTS "Allow public select for app_settings" ON app_settings;
CREATE POLICY "Allow public select for known public app_settings keys" ON app_settings
  FOR SELECT USING (key IN ('cms_data', 'theme', 'llm_settings'));
CREATE POLICY "Allow authenticated select for app_settings" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================
-- 5) clients: stajyer rolü kalıcı silme yapabiliyordu.
-- =============================================================
-- SELECT/UPDATE bilinçli olarak "authenticated" bırakıldı (20260727000200
-- migration'ının kendi notu: paylaşımlı vaka yükü, tüm personel görebilir)
-- — bu davranış değiştirilmiyor. Yalnızca kalıcı SİLME, stajyer/intern
-- rolünden alınıyor; diğer roller (avukat/yönetici/master) etkilenmiyor.
DROP POLICY IF EXISTS "Allow authenticated delete for clients" ON clients;
CREATE POLICY "Allow non-stajyer delete for clients" ON clients
  FOR DELETE USING (auth.role() = 'authenticated' AND current_user_role() != 'stajyer');
