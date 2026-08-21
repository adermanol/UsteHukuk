// Doküman Sihirbazı .docx şablon üreticisi.
// Alan listesi src/modules/document-wizard/templates/registry.ts ile birebir
// eşleşmelidir (bu script CommonJS/Node ile çalıştığı için registry.ts'i
// doğrudan import edemiyor — TypeScript kaynağı elle senkron tutulmalı).
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');

function heading(text) {
  return new Paragraph({ children: [new TextRun({ text, bold: true, size: 32 })] });
}

function empty() {
  return new Paragraph({ text: '' });
}

function labelField(label, tag) {
  return new Paragraph({
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: `{${tag}}` })],
  });
}

function bodyText(text) {
  return new Paragraph({ text });
}

// Tekrarlanabilir taraf bloğu — docxtemplater'ın yerleşik {#tag}...{/tag} döngü
// sözdizimini kullanır, ek modül gerektirmez.
function partiesLoop() {
  return [
    new Paragraph({ children: [new TextRun({ text: 'TARAFLAR', bold: true })] }),
    new Paragraph({ text: '{#parties}' }),
    new Paragraph({
      children: [new TextRun({ text: 'Ad Soyad / Unvan: ', bold: true }), new TextRun({ text: '{ad}' })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'TC Kimlik No / Vergi No: ', bold: true }), new TextRun({ text: '{tcVergiNo}' })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Adres: ', bold: true }), new TextRun({ text: '{adres}' })],
    }),
    empty(),
    new Paragraph({ text: '{/parties}' }),
  ];
}

const templates = [
  {
    file: 'ihtarname-sablon.docx',
    title: 'İHTARNAME',
    children: [
      ...partiesLoop(),
      labelField('KONU', 'konu'),
      labelField('YASAL DAYANAK', 'yasalDayanak'),
      labelField('SON ÖDEME/İFA TARİHİ', 'sonOdemeTarihi'),
      labelField('DÜZENLEME TARİHİ', 'tarih'),
      empty(),
      bodyText('AÇIKLAMALAR:'),
      new Paragraph({ text: '{talepMetni}' }),
      empty(),
      bodyText('Yukarıda belirtilen hususların yerine getirilmesi, aksi halde yasal yollara başvurulacağı ihtaren bildirilir.'),
      empty(),
      bodyText('İhtarı Keşide Eden'),
    ],
  },
  {
    file: 'vekaletname-sablon.docx',
    title: 'ÖZEL VEKALETNAME',
    children: [
      ...partiesLoop(),
      labelField('YASAL DAYANAK', 'yasalDayanak'),
      labelField('DÜZENLEME TARİHİ', 'tarih'),
      empty(),
      bodyText('YETKİ KAPSAMI:'),
      new Paragraph({ text: '{yetkiKapsami}' }),
      empty(),
      bodyText('İşbu vekaletname yukarıda belirtilen yetki kapsamıyla sınırlı olarak düzenlenmiştir.'),
      empty(),
      bodyText('Vekalet Eden'),
    ],
  },
  {
    file: 'sozlesme-sablon.docx',
    title: 'GİZLİLİK SÖZLEŞMESİ (NDA)',
    children: [
      ...partiesLoop(),
      labelField('GİZLİLİK SÜRESİ', 'gizlilikSuresi'),
      labelField('YASAL DAYANAK', 'yasalDayanak'),
      labelField('DÜZENLEME TARİHİ', 'tarih'),
      empty(),
      bodyText('SÖZLEŞME KONUSU:'),
      new Paragraph({ text: '{sozlesmeKonusu}' }),
      empty(),
      bodyText('Taraflar, işbu sözleşme kapsamında paylaşılan her türlü bilgiyi gizli tutmayı ve üçüncü kişilerle paylaşmamayı kabul ve taahhüt eder.'),
      empty(),
      bodyText('Taraflar'),
    ],
  },
  {
    file: 'kira-sozlesmesi-sablon.docx',
    title: 'KİRA SÖZLEŞMESİ',
    children: [
      ...partiesLoop(),
      labelField('KİRA BEDELİ', 'kiraBedeli'),
      labelField('KİRA SÜRESİ', 'kiraSuresi'),
      labelField('YASAL DAYANAK', 'yasalDayanak'),
      labelField('BAŞLANGIÇ TARİHİ', 'baslangicTarihi'),
      empty(),
      bodyText('TAŞINMAZ ADRESİ:'),
      new Paragraph({ text: '{tasinmazAdresi}' }),
      empty(),
      bodyText('Kiraya veren, yukarıda adresi belirtilen taşınmazı, işbu sözleşmede belirtilen bedel ve süre ile kiracıya kiralamayı; kiracı ise kiralamayı ve kira bedelini zamanında ödemeyi kabul eder.'),
      empty(),
      bodyText('Kiraya Veren / Kiracı'),
    ],
  },
  {
    file: 'is-sozlesmesi-sablon.docx',
    title: 'İŞ SÖZLEŞMESİ',
    children: [
      ...partiesLoop(),
      labelField('POZİSYON / GÖREV', 'pozisyon'),
      labelField('ÜCRET', 'ucret'),
      labelField('ÇALIŞMA ŞEKLİ', 'calismaSekli'),
      labelField('YASAL DAYANAK', 'yasalDayanak'),
      labelField('BAŞLANGIÇ TARİHİ', 'baslangicTarihi'),
      empty(),
      bodyText('İşveren ve işçi, yukarıda belirtilen pozisyon, ücret ve çalışma koşulları ile işbu iş sözleşmesini serbest iradeleriyle akdetmişlerdir.'),
      empty(),
      bodyText('İşveren / İşçi'),
    ],
  },
  {
    file: 'dava-dilekcesi-sablon.docx',
    title: 'DAVA DİLEKÇESİ',
    children: [
      labelField('MAHKEME', 'mahkeme'),
      ...partiesLoop(),
      labelField('YASAL DAYANAK', 'yasalDayanak'),
      labelField('DÜZENLEME TARİHİ', 'tarih'),
      empty(),
      bodyText('DAVA KONUSU:'),
      new Paragraph({ text: '{davaKonusu}' }),
      empty(),
      bodyText('TALEP SONUCU:'),
      new Paragraph({ text: '{talepSonucu}' }),
      empty(),
      bodyText('Yukarıda arz ve izah edilen nedenlerle davamızın kabulüne karar verilmesini saygıyla talep ederiz.'),
      empty(),
      bodyText('Davacı Vekili'),
    ],
  },
];

const outDir = path.join(__dirname, '..', 'public', 'templates');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

templates.forEach(({ file, title, children }) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [heading(title), empty(), ...children],
      },
    ],
  });

  Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(path.join(outDir, file), buffer);
    console.log(`${file} created successfully.`);
  });
});
