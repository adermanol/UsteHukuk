// Bir kerelik dönüştürme: doküman otomasyonu antetli şablonlarında logo
// gömmek için `docx` kütüphanesi PNG/JPG/GIF/BMP kabul eder, SVG doğrudan
// desteklenmez (bir raster fallback zorunlu). `public/logo-icon.svg`
// buradan `public/logo.png` olarak üretilir — çalışma zamanında her
// belgede yeniden rasterize edilmez, statik bir varlık olarak repoya
// eklenir. Yalnızca bu script için devDependency olarak eklenen `sharp`,
// üretim koduna hiç import edilmez (bundle/cold-start etkisi yok).
const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'logo-icon.svg');
const OUT = path.join(__dirname, '..', 'public', 'logo.png');

sharp(SRC, { density: 300 })
  .resize({ height: 600 })
  .png()
  .toFile(OUT)
  .then(info => console.log('logo.png oluşturuldu:', info))
  .catch(err => { console.error('Rasterize hatası:', err); process.exit(1); });
