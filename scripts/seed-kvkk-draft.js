// Bir kerelik ekleme: Aşama 11 KVKK taslağını cms_data.legalPages dizisine
// isActive:false (taslak, yayında değil) olarak ekler. Büronun kendi KVKK
// sorumlusu/avukatı `/dashboard/cms` ekranından inceleyip düzenleyebilir,
// mevcut bir sayfaya birleştirebilir veya doğrudan yayına alabilir — yayına
// alma anahtarı tamamen büroda kalır, bu script hiçbir mevcut sayfayı
// değiştirmez veya yayınlamaz. Zaten eklenmişse tekrar eklemez (idempotent).
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.join(__dirname, '..');
const envPath = path.join(ROOT, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('HATA: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY .env.local içinde bulunamadı.');
  process.exit(1);
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const DRAFT_CONTENT_TR = `ÜSTE HUKUK BÜROSU
SİSTEMDE KULLANILAN DİJİTAL YAPILARA İLİŞKİN KVKK EK MADDELER TASLAĞI

İşbu taslak, büronun mevcut KVKK aydınlatma/politika metinlerine eklenmesi
önerilen bölümleri içerir. Bu metin bir TASLAKTIR — yayına alınmadan önce
büronun kendi KVKK sorumlusu/avukatı tarafından incelenmeli, gerekirse
düzenlenmeli ve uygun görülen mevcut aydınlatma metnine/metinlerine
eklenmelidir. Aşağıdaki maddeler, sistemde fiilen kullanılan ancak mevcut
metinlerde açıkça yer almayan dijital yapıları kapsar.

1. Yapay Zekâ Sohbet Asistanı ve LLM Kullanım Kayıtları
Ustehukuk.com üzerinden erişilen yapay zekâ destekli sohbet asistanı ile
yapılan yazışmalar, hizmet kalitesinin sağlanması, talebinizin doğru birime
yönlendirilmesi ve hukuki danışmanlık sürecinin desteklenmesi amacıyla
işlenir. Sohbet içerikleri ve ilişkili kullanım verileri (zaman damgası,
kullanılan modül, işlem hacmi) büronun güvenli veri tabanında saklanır;
büro personeli tarafından yalnızca yetki seviyesine göre görüntülenebilir.
Sohbet asistanı büronun kendi sunucusunda çalışan yerel bir modeli veya
(yalnızca yerel model kullanılamadığında) bulut tabanlı bir yapay zekâ
sağlayıcısını kullanabilir; bulut sağlayıcı kullanıldığında ilgili
sağlayıcının kendi veri işleme koşulları da geçerli olur.

2. Bulut Depolama
Vekâletname, dilekçe, belge örneği gibi dosya eklerini ve fotoğraf/görsel
yüklemelerini içerebilen belgeler, güvenli bulut depolama altyapısında
(erişim kontrolüne tabi, şifreli bağlantı üzerinden) saklanır. Bu belgelere
yalnızca ilgili dosyayla bağlantılı, yetkilendirilmiş büro personeli erişim
sağlayabilir.

3. Müvekkil Durum Sorgulama Linki
Dosyanızın güncel durumunu görüntülemeniz için tarafınıza iletilen,
kimliğe özel benzersiz bir bağlantı (link) üretilir. Bu bağlantı yalnızca
ilgili dosyanın genel durum bilgisini (aşama, bir sonraki adım gibi) görmenizi
sağlar; bağlantının üçüncü kişilerle paylaşılması durumunda oluşabilecek
yetkisiz erişimden büro sorumlu tutulamaz, bu nedenle bağlantıyı yalnızca
kendiniz kullanmanız ve paylaşmamanız önemle rica olunur.

4. Konum ve Harita Servisleri
Kurum rehberi ve yol tarifi özelliklerinde, tarafınızca girilen veya seçilen
adres bilgileri, konum arama/haritalama hizmeti sağlayan üçüncü taraf servis
sağlayıcılarına iletilerek adresin haritada gösterilmesi ve yol tarifi
üretilmesi sağlanır. Bu işlem sırasında yalnızca aranan adres bilgisi ilgili
servise iletilir; kimliğinizi doğrudan belirten bir veri paylaşılmaz.

5. Tarayıcınızda Yerel Depolama (localStorage) Kullanımı
Web sitemiz ve dashboard uygulamamız, oturum tercihlerinizi (ör. dil seçimi,
görünüm teması, form taslakları) tarayıcınızda yerel olarak saklamak için
tarayıcı yerel depolama (localStorage) teknolojisini kullanabilir. Bu veriler
yalnızca kendi cihazınızda tutulur, büronun sunucularına otomatik olarak
iletilmez ve tarayıcı ayarlarınızdan istediğiniz zaman temizlenebilir.

6. Yabancı Kimlik / Pasaport Numarası Alanları
Göç ve yabancılar hukuku kapsamındaki başvurularda, T.C. vatandaşı olmayan
ilgili kişilerin kimlik tespiti amacıyla yabancı kimlik numarası, pasaport
numarası ve uyruk bilgisi gibi özel nitelikli olmayan ancak hassasiyet
gerektiren kimlik verileri talep edilebilir ve işlenebilir. Bu veriler
yalnızca ilgili başvuru/dosya süreciyle sınırlı olarak kullanılır.

Bu taslağın hazırlanma amacı, büronun dijital altyapısında kullanılan tüm
yapıların KVKK aydınlatma metinlerinde şeffaf şekilde yer almasını sağlamaktır.
Yayına alınmadan önce büronun hukuki değerlendirmesinden geçmesi gerekir.`;

async function main() {
  const { data, error } = await admin.from('app_settings').select('value').eq('key', 'cms_data').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('cms_data bulunamadı — önce app_settings migration ve scripts/seed-app-settings.js çalıştırılmalı.');

  const cmsData = data.value;
  const slug = 'kvkk-ek-maddeler-taslagi';
  if ((cmsData.legalPages || []).some(p => p.slug === slug)) {
    console.log('Taslak zaten mevcut, tekrar eklenmedi:', slug);
    return;
  }

  const emptyTr = { tr: '', en: '', ar: '', fa: '', ru: '', fr: '', de: '' };
  cmsData.legalPages = [
    ...(cmsData.legalPages || []),
    {
      slug,
      title: { ...emptyTr, tr: 'KVKK Ek Maddeler Taslağı (Dijital Yapılar) — TASLAK, YAYINDA DEĞİL' },
      content: { ...emptyTr, tr: DRAFT_CONTENT_TR },
      isActive: false,
    },
  ];

  const { error: writeErr } = await admin.from('app_settings').update({ value: cmsData, updated_at: new Date().toISOString() }).eq('key', 'cms_data');
  if (writeErr) throw writeErr;
  console.log('KVKK taslağı eklendi (isActive: false):', slug);
  console.log('Büro /dashboard/cms > Hukuki Metinler bölümünden inceleyip düzenleyebilir.');
}
main().catch(err => { console.error('HATA:', err); process.exit(1); });
