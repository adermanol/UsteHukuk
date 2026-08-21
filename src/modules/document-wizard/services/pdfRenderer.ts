import fs from 'fs'
import path from 'path'
import { ContentNode, PartyInput } from './contentModel'
import type { CmsData } from '@/lib/cms'

// pdfmake'in server (Node) API'si TypeScript tipi taşımıyor; docDefinition
// içerikleri kütüphanenin kendi (belgelenmiş ama tipsiz) JSON şemasına göre
// `any` ile kuruluyor. Font/imza satırı vb. görsel ayrıntılar
// letterhead.ts/buildDocumentBody.ts'teki .docx render'ıyla aynı marka
// paletini (BRAND_COLOR) hedefler, piksel-eşleştirme hedeflenmez.
const BRAND_COLOR = '#594438';
const MUTED_COLOR = '#666666';

const FONTS_DIR = path.join(process.cwd(), 'src', 'modules', 'document-wizard', 'fonts');
const FONTS = {
  Roboto: {
    normal: path.join(FONTS_DIR, 'Roboto-Regular.ttf'),
    bold: path.join(FONTS_DIR, 'Roboto-Medium.ttf'),
    italics: path.join(FONTS_DIR, 'Roboto-Italic.ttf'),
    bolditalics: path.join(FONTS_DIR, 'Roboto-MediumItalic.ttf'),
  },
};

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');
const LOGO_ASPECT_RATIO = 519 / 600; // scripts/rasterize-logo.js çıktısının en-boy oranı

function readLogoDataUri(): string | null {
  try {
    const buf = fs.readFileSync(LOGO_PATH);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function partiesTableDef(parties: PartyInput[]) {
  return {
    table: {
      headerRows: 1,
      widths: ['30%', '30%', '40%'],
      body: [
        [
          { text: 'Ad Soyad / Unvan', bold: true, color: BRAND_COLOR, fillColor: '#F2ECE6', fontSize: 9 },
          { text: 'TC Kimlik No / Vergi No', bold: true, color: BRAND_COLOR, fillColor: '#F2ECE6', fontSize: 9 },
          { text: 'Adres', bold: true, color: BRAND_COLOR, fillColor: '#F2ECE6', fontSize: 9 },
        ],
        ...parties.map(p => [
          { text: p.ad || '—', fontSize: 9 },
          { text: p.tcVergiNo || '—', fontSize: 9 },
          { text: p.adres || '—', fontSize: 9 },
        ]),
      ],
    },
    layout: {
      hLineColor: () => '#CCCCCC',
      vLineColor: () => '#CCCCCC',
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
    },
    margin: [0, 0, 0, 12] as [number, number, number, number],
  };
}

function renderNode(node: ContentNode): any {
  switch (node.type) {
    case 'title':
      return { text: node.text, fontSize: 20, bold: true, alignment: 'center', margin: [0, 0, 0, 16] };
    case 'heading':
      return { text: node.text, fontSize: 12, bold: true, color: BRAND_COLOR, margin: [0, 12, 0, 6] };
    case 'keyvalue':
      return { text: [{ text: `${node.label}: `, bold: true }, { text: node.value }], margin: [0, 0, 0, 4], fontSize: 10 };
    case 'partiesTable':
      return partiesTableDef(node.parties);
    case 'body':
      return node.lines.map(line => ({ text: line, margin: [0, 0, 0, 4], fontSize: 10 }));
    case 'closing':
      return { text: node.text, italics: true, margin: [0, 16, 0, 24], fontSize: 10 };
    case 'signature':
      return {
        stack: [
          { canvas: [{ type: 'line', x1: 300, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#999999' }], margin: [0, 30, 0, 4] },
          { text: node.label, bold: true, alignment: 'right', fontSize: 10 },
        ],
      };
  }
}

export function buildPdfDocDefinition(nodes: ContentNode[], general: CmsData['general']) {
  const logo = readLogoDataUri();
  const logoHeight = 28;
  const logoWidth = Math.round(logoHeight * LOGO_ASPECT_RATIO);
  const footerText = [general.address, general.phone, general.email].filter(Boolean).join('   ·   ');

  return {
    pageMargins: [40, 90, 40, 60] as [number, number, number, number],
    header: {
      margin: [40, 24, 40, 0] as [number, number, number, number],
      stack: [
        {
          columns: [
            ...(logo ? [{ image: logo, width: logoWidth, height: logoHeight }] : []),
            { text: general.logoText || 'Hukuk Bürosu', bold: true, fontSize: 16, color: BRAND_COLOR, margin: [8, 4, 0, 0] },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 515, y2: 6, lineWidth: 1, lineColor: BRAND_COLOR }] },
      ],
    },
    footer: {
      margin: [40, 12, 40, 0] as [number, number, number, number],
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#CCCCCC' }] },
        { text: footerText, fontSize: 8, color: MUTED_COLOR, alignment: 'center', margin: [0, 4, 0, 0] },
      ],
    },
    content: nodes.flatMap(renderNode),
    defaultStyle: { font: 'Roboto' },
  };
}

// pdfmake'in Node "unified" API'si (v0.3+): `require('pdfmake')` tekil bir
// örnek döner, `setFonts`/`setLocalAccessPolicy` bir kez çağrılır (modül
// yüklendiğinde — istek başına değil, serverless fonksiyonun soğuk
// başlangıçları arası yeniden kullanılır). Tip tanımı yok, `require` ile
// alınır (ESM import sözdizimi CJS interop hatası verir).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfMake = require('pdfmake');
pdfMake.setFonts(FONTS);
// Font dosyaları (src/modules/document-wizard/fonts/*.ttf) yerel diskten
// okunuyor — pdfmake bunu da "yerel erişim politikası" kapsamında görüyor.
// Burada KULLANICI TARAFINDAN BELİRLENEN hiçbir yol yok (yalnızca sabit,
// projeye gömülü font dosyaları), bu yüzden true güvenli.
pdfMake.setLocalAccessPolicy(() => true);
pdfMake.setUrlAccessPolicy(() => false);

export async function generatePdfBuffer(docDefinition: ReturnType<typeof buildPdfDocDefinition>): Promise<Buffer> {
  const doc = pdfMake.createPdf(docDefinition);
  return doc.getBuffer();
}

