/**
 * Sistemin izlediği çekirdek kanunlar. Her girdi mevzuat.gov.tr'de doğrudan
 * PDF döndüğü canlı olarak doğrulanmış bir (MevzuatTur, MevzuatTertip,
 * MevzuatNo) üçlüsüne karşılık gelir — bkz.
 * https://www.mevzuat.gov.tr/MevzuatMetin/{tur}.{tertip}.{no}.pdf
 *
 * Yeni bir kanun eklemek için buraya tek satır eklemek yeterli; sync,
 * arama ve radar entegrasyonu registry'yi otomatik olarak kullanır.
 */
export interface LegalCodeRegistryEntry {
  mevzuatNo: number;
  name: string;
  shortName: string;
  mevzuatTur: number;
  mevzuatTertip: number;
}

export const LEGAL_CODE_REGISTRY: LegalCodeRegistryEntry[] = [
  { mevzuatNo: 6098, name: 'Türk Borçlar Kanunu', shortName: 'TBK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 4721, name: 'Türk Medeni Kanunu', shortName: 'TMK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 6102, name: 'Türk Ticaret Kanunu', shortName: 'TTK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 5237, name: 'Türk Ceza Kanunu', shortName: 'TCK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 5271, name: 'Ceza Muhakemesi Kanunu', shortName: 'CMK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 6100, name: 'Hukuk Muhakemeleri Kanunu', shortName: 'HMK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 4857, name: 'İş Kanunu', shortName: 'İş K.', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 2004, name: 'İcra ve İflas Kanunu', shortName: 'İİK', mevzuatTur: 1, mevzuatTertip: 3 },
  { mevzuatNo: 1136, name: 'Avukatlık Kanunu', shortName: 'Av. K.', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 6698, name: 'Kişisel Verilerin Korunması Kanunu', shortName: 'KVKK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 6458, name: 'Yabancılar ve Uluslararası Koruma Kanunu', shortName: 'YUKK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 5651, name: 'İnternet Ortamında Yapılan Yayınların Düzenlenmesi Hakkında Kanun', shortName: 'İnternet K.', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 6362, name: 'Sermaye Piyasası Kanunu', shortName: 'SPK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 6502, name: 'Tüketicinin Korunması Hakkında Kanun', shortName: 'TKHK', mevzuatTur: 1, mevzuatTertip: 5 },
  { mevzuatNo: 634, name: 'Kat Mülkiyeti Kanunu', shortName: 'KMK', mevzuatTur: 1, mevzuatTertip: 5 },
];

export function buildSourceUrl(entry: LegalCodeRegistryEntry): string {
  return `https://www.mevzuat.gov.tr/MevzuatMetin/${entry.mevzuatTur}.${entry.mevzuatTertip}.${entry.mevzuatNo}.pdf`;
}
