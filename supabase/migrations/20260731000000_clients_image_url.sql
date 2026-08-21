-- Web sitesindeki danışma formuna eklenen "Görsel/Fotoğraf Yükleyin" alanı
-- (ConsultationRequestForm.tsx) attachment_url'den ayrı, ayrı bir image_url
-- kolonuna yazıyor — örn. müvekkilin olay yeri/belge fotoğrafı gibi
-- attachment_url'deki resmi belgeden (PDF/Word) farklı, görsel ağırlıklı bir
-- ek. attachment_url deseniyle birebir aynı: opsiyonel, herkese açık
-- formdan anonim insert ile yazılabilir (mevcut "Allow public insert for
-- clients" politikası zaten tüm kolonları kapsıyor, ek bir politika gerekmez).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS image_url TEXT;
