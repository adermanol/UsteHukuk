import fs from 'fs'
import path from 'path'
import { Header, Footer, Paragraph, TextRun, ImageRun, AlignmentType, BorderStyle, TabStopType, TabStopPosition } from 'docx'
import type { CmsData } from '@/lib/cms'

// Doküman otomasyonu merkezinde üretilen HER belge artık büronun logosunu
// ve iletişim bilgilerini taşıyan profesyonel bir antetli (letterhead)
// olarak oluşturulur — bkz. buildDocumentBody.ts, generate-doc/route.ts.
// Logo `public/logo.png`'den okunur: `docx` kütüphanesi SVG'yi doğrudan
// gömemiyor (bir raster fallback zorunlu), bu yüzden `public/logo-icon.svg`
// bir kerelik `scripts/rasterize-logo.js` ile PNG'ye dönüştürüldü — her
// belge üretiminde yeniden rasterize edilmez, statik dosya okunur.
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');
const LOGO_ASPECT_RATIO = 519 / 600; // scripts/rasterize-logo.js çıktısının en-boy oranı

const BRAND_COLOR = '594438'; // logodaki koyu kahve — public/globals.css'teki --primary ailesiyle aynı sıcak ton

function readLogoBuffer(): Buffer | null {
  try {
    return fs.readFileSync(LOGO_PATH);
  } catch {
    return null;
  }
}

export function buildLetterheadHeader(general: CmsData['general']): Header {
  const logo = readLogoBuffer();
  const logoHeight = 44;
  const logoWidth = Math.round(logoHeight * LOGO_ASPECT_RATIO);

  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND_COLOR, space: 8 } },
        children: [
          ...(logo
            ? [
                new ImageRun({
                  type: 'png',
                  data: logo,
                  transformation: { width: logoWidth, height: logoHeight },
                }),
                new TextRun({ text: '\t' }),
              ]
            : []),
          new TextRun({
            text: general.logoText || 'Hukuk Bürosu',
            bold: true,
            size: 32,
            color: BRAND_COLOR,
            font: 'Georgia',
          }),
        ],
        tabStops: [{ type: TabStopType.LEFT, position: 500 }],
      }),
    ],
  });
}

export function buildLetterheadFooter(general: CmsData['general']): Footer {
  const parts = [general.address, general.phone, general.email].filter(Boolean).join('   ·   ');
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 8 } },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: parts, size: 16, color: '666666' }),
        ],
      }),
    ],
  });
}
