// Bir kerelik taşıma: mevcut data/cms-data.json ve data/llm-settings.json
// içeriğini yeni app_settings tablosuna yazar. supabase/migrations/
// 20260801000000_app_settings.sql migration'ı ÇALIŞTIRILDIKTAN SONRA bir
// kez çalıştırılır (`node scripts/seed-app-settings.js`).
//
// data/cms-data.json veya data/llm-settings.json artık yoksa (örn. temiz bir
// kurulumda), o anahtar için var olan varsayılanlar app_settings'e hiç
// yazılmaz — src/lib/cms.ts / src/lib/llmSettings.ts kendi dahili varsayılan
// değerleriyle zaten sorunsuz çalışır.
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

async function seedKey(key, filePath) {
  const abs = path.join(ROOT, filePath);
  if (!fs.existsSync(abs)) {
    console.log(`${filePath} bulunamadı, ${key} atlanıyor (varsayılanlar kullanılacak).`);
    return;
  }
  const value = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const { error } = await admin.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`${key} yazılamadı: ${error.message}`);
  console.log(`${key} yazıldı.`);
}

async function main() {
  await seedKey('cms_data', 'data/cms-data.json');
  await seedKey('llm_settings', 'data/llm-settings.json');

  const { data, error: verifyErr } = await admin.from('app_settings').select('key, updated_at');
  if (verifyErr) throw verifyErr;
  console.log('app_settings içeriği:', data);
}
main().catch(err => { console.error('HATA:', err); process.exit(1); });
