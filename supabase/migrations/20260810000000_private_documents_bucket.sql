-- Güvenlik denetimi (2026-08-11): mevcut `uploads` bucket'ı tamamen public —
-- takım fotoğrafları/blog kapak görselleri gibi zaten kamuya açık olması
-- GEREKEN varlıklar için bu doğru, ama danışma formu ekleri (kimlik/
-- vekaletname taranmış belgeler) ve masraf makbuzları da aynı public
-- bucket'a düşüyordu — tahmin edilebilir/sızabilir bir URL bu belgeleri
-- herkese açık ederdi.
--
-- Yeni `private-documents` bucket'ı PUBLIC DEĞİL. Bu bucket'a yalnızca
-- servis-rolü (src/app/api/upload/route.ts, her zaman sunucu tarafında)
-- yazar; okuma yalnızca kısa/uzun ömürlü İMZALI URL (createSignedUrl) ile
-- yapılır — imzalı URL, bucket/objects RLS politikalarını atlayarak tek bir
-- nesneye zaman sınırlı erişim verir, bu yüzden ayrıca bir SELECT
-- politikası tanımlanmasına gerek yoktur.
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-documents', 'private-documents', false)
ON CONFLICT (id) DO NOTHING;
