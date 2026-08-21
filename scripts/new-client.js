#!/usr/bin/env node
// "Kısmi sistem compile" / steril müşteri kurulum script'i.
//
// Bu proje büro başına ayrı bir Supabase + Vercel projesiyle dağıtılır (bkz.
// DEPLOYMENT.md). Bu script, bir sonraki büroya geçmeden önce repoyu önceki
// büronun verisinden temizler ve yeni kurulum için bir checklist basar.
//
// Kullanım:
//   node scripts/new-client.js --name "Örnek Hukuk Bürosu"
//   node scripts/new-client.js --name "Örnek Hukuk Bürosu" --accent "#cda372"

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const firmName = args.name || 'Yeni Hukuk Bürosu';
const accent = args.accent || null;

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');

function log(step, msg) {
  console.log(`\x1b[36m[${step}]\x1b[0m ${msg}`);
}

// 1) .env.local şablonu
const envExamplePath = path.join(root, '.env.example');
const envLocalPath = path.join(root, '.env.local');
if (fs.existsSync(envLocalPath)) {
  log('1/5', '.env.local zaten var, dokunulmadı. Değerleri elle kontrol edin.');
} else if (fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envLocalPath);
  log('1/5', '.env.example -> .env.local kopyalandı. Şimdi doldurmanız gerekiyor (adım 2\'ye bakın).');
} else {
  log('1/5', 'UYARI: .env.example bulunamadı, .env.local oluşturulamadı.');
}

// 2) CMS içeriğini sıfırla
const templatePath = path.join(dataDir, 'cms-data.template.json');
const cmsDataPath = path.join(dataDir, 'cms-data.json');
if (fs.existsSync(templatePath)) {
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  template.general.logoText = firmName;
  fs.writeFileSync(cmsDataPath, JSON.stringify(template, null, 2), 'utf8');
  log('2/5', `data/cms-data.json sıfırlandı, büro adı "${firmName}" olarak ayarlandı.`);
} else {
  log('2/5', 'UYARI: data/cms-data.template.json bulunamadı, CMS verisi sıfırlanamadı.');
}

// 3) LLM sağlayıcı ayarını sıfırla
const llmSettingsPath = path.join(dataDir, 'llm-settings.json');
fs.writeFileSync(llmSettingsPath, JSON.stringify({ activeProvider: null }, null, 2), 'utf8');
log('3/5', 'data/llm-settings.json otomatik moda sıfırlandı.');

// 4) Önceki büronun yüklediği dosyaları temizle (steril ortam)
const uploadsDir = path.join(root, 'public', 'uploads');
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir).filter(f => f !== '.gitkeep');
  for (const file of files) {
    fs.unlinkSync(path.join(uploadsDir, file));
  }
  log('4/5', `public/uploads/ temizlendi (${files.length} dosya silindi).`);
} else {
  fs.mkdirSync(uploadsDir, { recursive: true });
  log('4/5', 'public/uploads/ oluşturuldu (boş).');
}

// 5) Kurulum checklist'i — migration listesi supabase/migrations/'dan dinamik
// olarak okunur, böylece yeni bir migration eklendiğinde bu script elle
// güncellenmeyi unutulsa bile listeden düşmez (önceki sürümde checklist 2
// migration'da kalmış, DEPLOYMENT.md 7'ye çıkmıştı — bu drift'i tekrarlamamak için).
const migrationsDir = path.join(root, 'supabase', 'migrations');
const SKIP_MIGRATIONS = new Set(['00000000000000_schema.sql']);
const migrations = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && !SKIP_MIGRATIONS.has(f)).sort()
  : [];

log('5/5', 'Kod tarafı hazır. Kalan adımlar:');
console.log(`
  [ ] Yeni bir Supabase projesi oluşturun (supabase.com).
  [ ] SQL Editor'de şu migration'ları SIRAYLA çalıştırın:
${migrations.map(m => `        supabase/migrations/${m}`).join('\n')}
      NOT: 00000000000000_schema.sql çalıştırılmasın — bu projede kullanılmayan,
      dosya tabanlı CMS'in (data/cms-data.json) yerini tutmayan eski bir taslak.
  [ ] Storage'da "uploads" adında PUBLIC bir bucket oluşturun (10MB dosya
      limiti, pdf/doc/docx/jpg/jpeg/png/webp) — CMS görselleri ve web
      sitesindeki danışma formu ek dosyaları buraya yazılır.
  [ ] .env.local dosyasını doldurun: Supabase URL/anon/service-role key,
      OPENAI_API_KEY ve/veya ANTHROPIC_API_KEY, CRON_SECRET.
  [ ] Authentication > Users'tan büronun ilk hesabını oluşturun — bu hesap
      otomatik olarak "yonetici" rolüyle açılır (profiles tablosundaki
      bootstrap tetikleyicisi). Sonraki personel /dashboard/ekip'ten
      yönetici tarafından rol atanır (yönetici / avukat / stajyer).
  [ ] public/logo-icon.svg, src/app/icon.svg ve public/lady-justice.png
      dosyalarını büronun kendi logosu/görseliyle değiştirin.
  ${accent
    ? `[ ] src/app/globals.css'teki :root/.dark --primary oklch değerini "${accent}" rengine karşılık gelecek şekilde güncelleyin.`
    : `[ ] Marka rengini değiştirmek isterseniz src/app/globals.css'teki :root/.dark --primary oklch değerini güncelleyin.`}
  [ ] /dashboard/cms üzerinden büronun gerçek içeriğini (ekip, uzmanlık alanları,
      iletişim bilgileri) girin.
  [ ] Vercel'e deploy edin, dört cron job'ın (${'/api/cron/legal-radar'},
      ${'/api/cron/legal-codes-sync'}, ${'/api/cron/agenda-reminders'},
      ${'/api/cron/case-law-sync'}) aktif olduğunu doğrulayın.
  [ ] /dashboard/legislation'daki "Kanun Metinleri" bölümünden "Şimdi
      Senkronize Et"i bir kez manuel çalıştırarak 15 çekirdek kanunun ilk
      indirmesini yapın (cron'u beklemeden; birkaç dakika sürebilir).
  [ ] /dashboard/ajanda/kurallar'dan süre hesaplayıcının kural setini
      gözden geçirip doğrulayın — her kural büro onaylayana kadar
      "doğrulanmadı" rozeti taşır. judicial_recess_periods ve
      non_working_days tablolarının güncel yılı kapsadığını kontrol edin.
  [ ] /dashboard/kurumlar'a büronun kullandığı adliye/cezaevi/göç idaresi
      kayıtlarını girin — sistem sıfır kurum kaydıyla gelir, saha
      araçlarının (tıkla-ara, tıkla-yol tarifi, cezaevi görüşü föyü) değeri
      bu veri girilmeden ortaya çıkmaz.

  Detaylı adımlar için DEPLOYMENT.md dosyasına bakın.
`);
