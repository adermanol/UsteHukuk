-- Aşama 8: İzmir için doğrulanabilir çekirdek kurum listesi.
--
-- ÖNEMLİ: 20260729005000_institutions.sql'deki ilke korunur — bu satırlar
-- hafızadan ÜRETİLMEDİ, her biri canlı web araması ile (Adalet Bakanlığı
-- resmi adliye siteleri, TKGM, İzmir Barosu resmi sitesi gibi kaynaklardan)
-- doğrulanarak eklendi. Buna rağmen `verified_at` KASITLI OLARAK NULL
-- bırakılır — bu, büronun kendi doğrulaması içindir, bir web aramasının
-- doğrulaması değildir. `notes` alanına kaynağın web araması olduğu ve
-- büro tarafından teyit edilmesi gerektiği açıkça not düşülür; personel
-- bu satırları körü körüne güvenmemeli, ilk kullanımdan önce teyit etmelidir.
INSERT INTO institutions (kind, name, city, district, address, phone, website, notes, verified_at) VALUES
  ('adliye', 'İzmir Adliyesi (Ana Bina)', 'İzmir', 'Bayraklı',
   'Adalet Mahallesi, Şehit Polis Fethi Sekin Caddesi No:11/A, Bayraklı/İzmir',
   '0232 411 20 00', 'https://izmir.adalet.gov.tr',
   'Kaynak: Adalet Bakanlığı resmi sitesi (web araması, 2026-08). Büro tarafından doğrulanmadı — kullanmadan önce teyit edin. İzmir Adliyesi tek binada değil, şehrin farklı noktalarında birden fazla yerleşkede hizmet verir; mahkemeye göre bina değişebilir.',
   NULL),
  ('adliye', 'Karşıyaka Adliyesi (Ana Bina)', 'İzmir', 'Karşıyaka',
   'Bahariye Mahallesi No:15, Karşıyaka/İzmir',
   '0232 368 03 03', 'https://karsiyaka.adalet.gov.tr',
   'Kaynak: Adalet Bakanlığı resmi sitesi (web araması, 2026-08). Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL),
  ('goc_idaresi', 'İzmir İl Göç İdaresi Müdürlüğü', 'İzmir', 'Konak',
   'Konak Mahallesi, 855 Sokak No:40D, Konak/İzmir',
   '0232 402 44 62', 'https://izmir.goc.gov.tr',
   'Kaynak: web araması (2026-08), resmi site izmir.goc.gov.tr üzerinden teyit edilebilir. Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL),
  ('cezaevi', 'İzmir Kadın Kapalı Ceza İnfaz Kurumu (Şakran)', 'İzmir', 'Aliağa',
   'İzmir Aliağa Ceza İnfaz Kurumları Kampüsü, Bahçedere Köyü No:63/24, Yeni Şakran/Aliağa-İzmir',
   '0232 618 10 52', 'https://izmirkkcik.adalet.gov.tr',
   'Kaynak: Adalet Bakanlığı resmi sitesi (web araması, 2026-08). Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL),
  ('cezaevi', 'İzmir 1 Nolu T Tipi Kapalı Ceza İnfaz Kurumu (Şakran)', 'İzmir', 'Aliağa',
   'Aliağa Ceza İnfaz Kurumları Kampüsü, Bahçedere Köyü, Yeni Şakran/Aliağa-İzmir',
   '0232 618 10 03', NULL,
   'Kaynak: web araması (2026-08). Adres, kampüs genelinden alınmıştır — tam kapı numarası büro tarafından teyit edilmelidir.',
   NULL),
  ('baro', 'İzmir Barosu', 'İzmir', 'Konak',
   '1456 Sokak No:14, Alsancak/İzmir',
   '0232 463 00 14', 'https://www.izmirbarosu.org.tr',
   'Kaynak: web araması (2026-08), resmi site izmirbarosu.org.tr üzerinden teyit edilebilir. Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL),
  ('tapu', 'Konak Tapu Müdürlüğü', 'İzmir', 'Konak',
   '1474 Sokak No:10-12, Alsancak/İzmir',
   '0232 280 21 01', 'https://www.tkgm.gov.tr/izmir-bm/konak-tapu-mudurlugu',
   'Kaynak: TKGM resmi sayfası (web araması, 2026-08). Büro tarafından doğrulanmadı — kullanmadan önce teyit edin.',
   NULL);
