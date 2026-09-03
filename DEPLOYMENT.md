# Yeni Büro Kurulum Rehberi (Beyaz Etiket Dağıtım)

Bu proje **büro başına ayrı bir Supabase + Vercel projesi** ile dağıtılır — hukuk bürolarının müvekkil verisi fiziksel olarak birbirinden tamamen izole tutulur (paylaşımlı `tenant_id` tabanlı bir mimari değildir). Aynı kod tabanından yeni bir büroya kurulum yapmak, aşağıdaki adımların tekrarlanmasıdır.

## 1. Repoyu steril hale getirin

Önceki büronun verisini/ayarlarını temizleyip yeni kurulum için hazırlar:

```bash
npm run new-client -- --name "Örnek Hukuk Bürosu" --accent "#2a6f6f"
```

Bu script:
- `.env.local` şablonunu oluşturur (`.env.example`'dan),
- `data/cms-data.json`'u boş şablondan (`data/cms-data.template.json`) yeniden oluşturur ve büro adını yerleştirir,
- `data/llm-settings.json`'u otomatik moda sıfırlar,
- `public/uploads/` klasörünü temizler (önceki büronun yüklediği fotoğraflar/dosyalar kalmasın diye — bu adım özellikle önemlidir),
- terminale kalan manuel adımların bir checklist'ini basar.

## 2. Supabase projesi

1. [supabase.com](https://supabase.com)'da yeni proje oluşturun.
2. Project Settings → API'den `Project URL`, `anon public` key, `service_role` key değerlerini alın.
3. SQL Editor'de **sadece** şu migration'ları, sırayla çalıştırın:
   - `supabase/migrations/20260717000000_initial_schema.sql`
   - `supabase/migrations/20260718000000_legal_feed.sql`
   - `supabase/migrations/20260724000000_consultation_fields.sql`
   - `supabase/migrations/20260725000000_lmstudio_embeddings.sql`
   - `supabase/migrations/20260726000000_legal_feed_search.sql`
   - `supabase/migrations/20260727000000_applications_helpers.sql`
   - `supabase/migrations/20260727000100_documents_created_at.sql`
   - `supabase/migrations/20260727000200_rls_hardening.sql`
   - `supabase/migrations/20260728000000_clients_delete_policy.sql`
   - `supabase/migrations/20260728000100_legal_codes.sql`
   - `supabase/migrations/20260729000000_profiles_roles.sql`
   - `supabase/migrations/20260729001000_practice_areas.sql`
   - `supabase/migrations/20260729002000_cases.sql`
   - `supabase/migrations/20260729003000_agenda.sql`
   - `supabase/migrations/20260729004000_finance.sql`
   - `supabase/migrations/20260729005000_institutions.sql`
   - `supabase/migrations/20260729006000_analytics_rpc.sql`
   - `supabase/migrations/20260729007000_notifications.sql`
   - `supabase/migrations/20260729008000_case_law.sql`
   - `supabase/migrations/20260729010000_notifications_messaging.sql`
   - `supabase/migrations/20260730000000_case_clients.sql`
   - `supabase/migrations/20260730001000_client_receivables_rpc.sql`
   - `supabase/migrations/20260730002000_case_status_links.sql`
   - `supabase/migrations/20260730003000_office_budget.sql`
   - `supabase/migrations/20260731000000_clients_image_url.sql`
   - `supabase/migrations/20260801000000_app_settings.sql`
   - `supabase/migrations/20260802000000_master_tenants.sql`
   - `supabase/migrations/20260803000000_nav_order.sql`
   - `supabase/migrations/20260804000000_token_counter.sql`
   - `supabase/migrations/20260805000000_security_hardening.sql`
   - `supabase/migrations/20260806000000_blog_posts.sql`
   - `supabase/migrations/20260807000000_izmir_institutions_seed.sql`
   - `supabase/migrations/20260808000000_critical_security_hardening.sql`
   - `supabase/migrations/20260809000000_status_link_expiry.sql`
   - `supabase/migrations/20260810000000_private_documents_bucket.sql`
   - `supabase/migrations/20260811000000_self_hosted_ops.sql`
   - `supabase/migrations/20260812000000_case_documents.sql`
   - `supabase/migrations/20260821000000_procedure_runs_delete.sql`

   **`00000000000000_schema.sql`'i çalıştırmayın.** Bu, projede fiilen kullanılmayan eski bir CMS tablo taslağıdır (`general_settings`, `hero_section`, vb.) — gerçek site içeriği ve LLM sağlayıcı ayarları `app_settings` tablosunda (`key='cms_data'` / `key='llm_settings'`) tutulur, bu eski taslak tablolarda değil. Çalıştırmak zarar vermez ama gereksiz karışıklık yaratır.

   > `20260801000000_app_settings.sql` çalıştırıldıktan sonra, önceden `data/cms-data.json` ve `data/llm-settings.json` dosyalarında tutulan içeriği tabloya taşımak için `scripts/seed-app-settings.js` (veya scratchpad'deki eşdeğeri) bir kerelik çalıştırılmalıdır — aksi halde CMS/LLM sağlayıcı ayarları varsayılan değerlere döner.

   (`npm run new-client` bu listeyi `supabase/migrations/`'dan otomatik okuyup güncel haliyle terminale basar — elle takip etmeniz gerekmez.)
4. Storage → New bucket'tan **`uploads`** adında, **Public** işaretli bir bucket oluşturun (10MB dosya boyutu limiti, izin verilen türler: pdf/doc/docx/jpg/jpeg/png/webp). Yalnızca kamuya açık olması GEREKEN varlıklar (takım fotoğrafı, blog kapak görseli — CMS/blog editöründen yüklenir) buraya yazılır. Danışma formu ekleri/kimlik fotoğrafları ve masraf makbuzları gibi özel belgeler `20260810000000_private_documents_bucket.sql` migration'ının otomatik oluşturduğu **`private-documents`** (private) bucket'ına gider — bunun için ayrıca panelden bir şey yapmanıza gerek yok, migration yeterli. `src/app/api/upload/route.ts` hangi bucket'a yazılacağına isteğin `kind` alanına göre kendisi karar verir.
5. Büronun ilk kullanıcısını (kurucu avukat) **Authentication → Users panelinizden sizin oluşturmanıza gerek yok** — site canlıya alındıktan sonra devralan avukat, `/login` sayfasındaki "İlk kurulum ekranına git" linkinden veya doğrudan `/ilk-kurulum` adresinden kendi hesabını (ad soyad, e-posta, şifre) kendisi açar. Bu ekran yalnızca `profiles` tablosu boşken çalışır ve ilk hesap oluşturulduğu an kalıcı olarak kilitlenir (`/login`'e yönlendirir) — bu sayede teslimden sonra hiçbir hesap açma işlemi için sizin müdahalenize gerek kalmaz. **Bu ilk hesap otomatik olarak `yonetici` rolüyle açılır** (`profiles` tablosundaki bootstrap tetikleyicisi: hiç yönetici yoksa ilk kayıt olan kullanıcı yönetici olur). Sonraki kullanıcılar `/dashboard/ekip`'ten yönetici tarafından rol atanır (yönetici / avukat / stajyer — stajyer finansal verilere erişemez, avukat yalnızca kendi dosyalarını görür). Alternatif olarak siz de yine Authentication → Users panelinden elle bir kullanıcı oluşturabilirsiniz — `/ilk-kurulum` bunun yerini almaz, yalnızca isteğe bağlı, daha kolay bir alternatiftir.

   **`profiles` tablosu zaten dolu olan (ör. sizin test hesaplarınızın kaldığı) bir ortamda** `/ilk-kurulum` artık çalışmaz (kilitlidir). Bu durumda büronun gerçek hesabı, mevcut hesaplardan biriyle giriş yapılıp `/dashboard/ekip`'teki **"Yeni Üye Davet Et"** ile açılır — girilen e-postaya bir davet bağlantısı gönderilir, alıcı `/davet` sayfasından kendi şifresini belirler (varsayılan rol `avukat`), ardından mevcut yönetici Ekip panelinden onu `yonetici`/`master` rolüne yükseltir. Bu da Supabase Dashboard'a erişim gerektirmez.
6. **(Opsiyonel ama önerilir) Passkey (parmak izi/Face ID) girişini açmak için:** Authentication → Passkeys ekranından "Enable Passkey authentication"ı açın, şu üç alanı doldurun:
   - **Relying Party Display Name**: Büronun adı (ör. "Üste Hukuk Bürosu") — kullanıcıya passkey isteminde gösterilir.
   - **Relying Party ID**: Sitenin çıplak alan adı, şema/port olmadan (ör. `ustehukuk.com`) — `localhost`'ta test ederken `localhost` yazılır.
   - **Relying Party Origins**: Sitenin tam adresi/adresleri, virgülle ayrılmış (ör. `https://ustehukuk.com`), yerelde `http://localhost:3000` eklenmeli.
   Bu, büronun kendi Supabase panelinden bir kerelik yapılan bir ayardır — kod tarafı (`src/app/login/page.tsx`, `/dashboard/settings`'teki Passkey bölümü) zaten hazır, bu adım atlanırsa yalnızca passkey butonu hata verir, parola ile giriş etkilenmez. Bu özellik şu an Supabase'de **Beta** aşamasındadır.

## 3. Ortam değişkenleri (`.env.local`)

| Değişken | Kaynak |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Adım 2'deki Supabase projesi |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | **Vercel'de zorunlu** (yerelde `next dev` için gerekmez) — sırasıyla `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` ile AYNI değer, sadece önek'siz. Canlıya alma sırasında (2026-08-21) gözlemlendi: bu projenin Vercel build/runtime ortamında `NEXT_PUBLIC_` önekli değişkenler ne build-anında (`next.config.ts`, `next/image` alan adı izinleri) ne çalışma zamanında (server action'lar, route handler'lar, middleware) ne de tarayıcı paketinde güvenilir şekilde görünüyor — kod artık önce bu önek'siz ikizini deniyor, yoksa `NEXT_PUBLIC_` sürümüne düşüyor. **Bu ikisini eklemeden sistem canlıda çalışmaz** (giriş yapılamaz, görseller yüklenemez/gösterilemez, ilk kurulum ekranı yanlış "yapılandırılmadı" der) — kök nedeni netleşmedi, bu yalnızca gözlemlenmiş bir platform davranışına karşı savunma. |
| `OPENAI_API_KEY` ve/veya `ANTHROPIC_API_KEY` | En az biri; hiçbiri yoksa sistem dürüstçe "yapılandırılmadı" durumunda çalışır |
| `LM_STUDIO_BASE_URL`, `LM_STUDIO_MODEL`, `LM_STUDIO_EMBEDDING_MODEL` | Yalnızca büro yerel bir LLM (LM Studio) kullanmak isterse; aksi halde varsayılan değerler zararsızdır. `LM_STUDIO_EMBEDDING_MODEL`, Bilgi Bankası aramasının kullandığı yerel embedding modelidir (LM Studio'da ayrıca yüklenmesi gerekir — sohbet modeliyle aynı model değildir) |
| `CRON_SECRET` | Rastgele bir dize; Mevzuat Radarı'nın günlük taraması için |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Opsiyonel — [upstash.com](https://upstash.com)'da ücretsiz bir Redis veritabanı oluşturup "REST API" bölümünden alınır. Tanımlanmazsa sistem otomatik olarak bellek içi (tek instance'a özel, daha zayıf) rate limitleme kullanır — hiçbir şey kırılmaz, yalnızca `/api/chat`, `/api/upload`, `/api/consultation-request` ve müvekkil durum linki gibi herkese açık uçların DoS/spam korumasının Vercel'in çoklu serverless instance'ları arasında paylaşılmadığı anlamına gelir |
| `SENTRY_DSN` (sunucu) ve `NEXT_PUBLIC_SENTRY_DSN` (tarayıcı, aynı DSN) | Opsiyonel — [sentry.io](https://sentry.io)'da ücretsiz bir proje oluşturup "Client Keys (DSN)" bölümünden alınır. Tanımlanmazsa hata izleme tamamen devre dışı kalır (`src/instrumentation.ts` / `src/instrumentation-client.ts`), hiçbir davranış değişmez. Eklendiğinde özellikle cron job hataları (`agenda-reminders` — duruşma/süre hatırlatması — dahil) otomatik raporlanır |

Aktif LLM sağlayıcısı (Anthropic / OpenAI / LM Studio) `.env` değil, `/dashboard/settings` üzerinden çalışma zamanında tek tıkla seçilir.

## 4. Marka kimliği

- **Logo:** `public/logo-icon.svg` **ve** `src/app/icon.svg` (favicon) dosyalarını büronun logosuyla değiştirin (aynı dosya adlarını koruyun, kod hiçbir yerde değişmesin).
- **Hero görseli:** `public/lady-justice.png`.
- **Vurgu rengi:** `src/app/globals.css`'teki `:root` ve `.dark` bloklarındaki `--primary` (ve isteğe bağlı `--background`/`--card`/vb.) oklch değerlerini güncelleyin. Tüm bileşenler bu tek token'ı kullanır (`var(--primary)`) — başka hiçbir dosyada renk değişikliği gerekmez.
- **İçerik:** `/dashboard/cms` üzerinden büronun gerçek iletişim bilgilerini, ekibini, uzmanlık alanlarını ve 7 dildeki (TR/EN/RU/FR/DE/AR/FA) metinlerini girin.

## 5. Deploy

1. Vercel'de yeni proje oluşturup bu repoyu bağlayın.
2. Adım 3'teki ortam değişkenlerini Vercel proje ayarlarına ekleyin.
3. `vercel.json`'daki dört cron job otomatik aktif olur — Vercel projesinde Cron Jobs sekmesinden çalıştıklarını doğrulayın:
   - `/api/cron/legal-radar` — günlük 04:00 UTC
   - `/api/cron/legal-codes-sync` — günlük 04:00 UTC
   - `/api/cron/agenda-reminders` — günlük 03:00 UTC (İkamet izni yenileme sürelerini otomatik ajandaya ekler, duruşma/süre hatırlatma bildirimleri üretir)
   - `/api/cron/case-law-sync` — günlük 05:00 UTC (büronun pratik alanlarına hedefli içtihat taraması, Adalet Bakanlığı'nın resmî emsal-karar servisinden)
4. İlk deploy sonrası `/login`'den giriş yapıp `/dashboard/settings`'ten bir LLM sağlayıcı seçin, `/dashboard/legislation`'dan "Şimdi Tara"yı ve **"Kanun Metinleri" bölümündeki "Şimdi Senkronize Et"i** bir kez manuel çalıştırarak hem radarın hem 15 kanunluk çekirdek kanun veritabanının (`src/modules/legal-codes/registry.ts`) çalıştığını doğrulayın — ilk senkron ~15 PDF indirip ayrıştırdığı için birkaç dakika sürebilir, cron'u beklemek gerekmez.
5. **`/dashboard/ajanda/kurallar`'dan süre hesaplayıcının kural setini gözden geçirin.** Her kural, büro onaylayana kadar hesaplayıcıda "doğrulanmadı" rozeti taşır — hukuki sorumluluk gerektiren bir adımdır, atlanmamalı. Ayrıca `judicial_recess_periods` (adli tatil) ve `non_working_days` (resmî tatil/dini bayram) tablolarının güncel yılı kapsadığını kontrol edin; dini bayramlar hareketli olduğu için her yıl elle güncellenmesi gerekir.
6. **`/dashboard/kurumlar`'a büronun gerçekten kullandığı kurumları girin** (İzmir Adliyesi, ilgili cezaevleri, göç idaresi vb.). Sistem ulusal bir adres rehberiyle gelmez — sıfır kurum kaydıyla başlar, mobil saha araçlarının (tıkla-ara, tıkla-yol tarifi, cezaevi görüşü föyü) değeri bu veri girilmeden ortaya çıkmaz.
7. **Çok kullanıcılı büro ise `/dashboard/ekip`'ten personele rol atayın.** Varsayılan rol `avukat`'tır; finansal verilere erişmemesi gereken stajyerler `stajyer` rolüne çekilmelidir.

## 6. Çok dilli içerik notu

TR/EN dışındaki diller (`ru`/`fr`/`de`/`ar`/`fa`) CMS'te başlangıçta boş bırakılır (otomatik/sahte çeviri üretilmez). Büro bu dilleri gerçekten sunmak istiyorsa `/dashboard/cms`'teki her çevrilebilir alanın dil sekmelerinden gerçek çeviriyi girmesi gerekir.
