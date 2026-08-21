// Sunum için ekran görüntüsü yakalama script'i. Tek seferlik kullanım
// içindir, üretim koduna dahil değildir.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// .env.local'i elle yükle (bu script Next.js dışında çalışıyor).
const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const BASE_URL = 'http://localhost:3000';
const OUT_DIR = process.argv[2] || path.join(__dirname, '..', 'screenshots');
const DEMO_EMAIL = `demo-sunum-${Date.now()}@lawlm.local`;
const DEMO_PASSWORD = 'DemoSunum!' + Math.random().toString(36).slice(2, 10);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function shoot(page, url, filename, opts = {}) {
  await page.goto(BASE_URL + url, { waitUntil: 'networkidle', timeout: 30000 });
  if (opts.wait) await page.waitForTimeout(opts.wait);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: opts.fullPage !== false, type: 'jpeg', quality: 60 });
  console.log('captured', filename);
}

async function main() {
  console.log('Demo kullanıcı oluşturuluyor:', DEMO_EMAIL);
  const { data: userData, error: createErr } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    // Public sayfalar
    await shoot(page, '/', '01-anasayfa.jpg', { wait: 1500 });

    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', domain: 'localhost', path: '/' }]);
    await shoot(page, '/', '02-anasayfa-en.jpg', { wait: 1500 });
    await page.context().clearCookies();

    await shoot(page, '/login', '03-login.jpg', { wait: 500 });

    // Giriş yap
    await page.goto(BASE_URL + '/login');
    await page.fill('input[type="email"]', DEMO_EMAIL);
    await page.fill('input[type="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForTimeout(1500);

    await shoot(page, '/dashboard', '04-dashboard-panel.jpg', { wait: 1500 });
    await shoot(page, '/dashboard/analytics', '05-analitik.jpg', { wait: 1500 });
    await shoot(page, '/dashboard/documents', '06-dokuman-sihirbazi.jpg', { wait: 1000 });
    await shoot(page, '/dashboard/knowledge', '07-bilgi-bankasi.jpg', { wait: 1000 });
    await shoot(page, '/dashboard/legislation', '08-mevzuat-radari.jpg', { wait: 1500 });
    await shoot(page, '/dashboard/settings', '09-llm-ayarlari.jpg', { wait: 1000 });
    await shoot(page, '/dashboard/cms', '10-cms-yonetimi.jpg', { wait: 1000, fullPage: false });
    await shoot(page, '/business-card', '11-kartvizit-tasarimci.jpg', { wait: 1500 });

    console.log('Tüm ekran görüntüleri alındı.');
  } finally {
    await browser.close();
    console.log('Demo kullanıcı siliniyor...');
    await admin.auth.admin.deleteUser(userData.user.id);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
