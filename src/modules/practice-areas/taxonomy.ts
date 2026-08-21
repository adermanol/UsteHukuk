/**
 * Kanonik hukuk alanı taksonomisi. Kaynak doğruluk burasıdır; Postgres'teki
 * `practice_areas` tablosu (supabase/migrations/20260729001000_practice_areas.sql)
 * yalnızca FK bütünlüğü ve SQL JOIN/GROUP BY için bunun aynasıdır — iki
 * taraf değişirse birlikte güncellenmelidir.
 */
export interface PracticeArea {
  id: string;
  labelTr: string;
  cmsAreaId: string | null;   // data/cms-data.json 'pa-N' köprüsü
  sortOrder: number;
}

export const PRACTICE_AREA_TAXONOMY: PracticeArea[] = [
  { id: 'sirketler-ticaret',        labelTr: 'Şirketler ve Ticaret Hukuku',              cmsAreaId: 'pa-1',  sortOrder: 10 },
  { id: 'sozlesmeler',              labelTr: 'Sözleşmeler Hukuku ve Risk Analizi',        cmsAreaId: 'pa-2',  sortOrder: 20 },
  { id: 'esya-kentsel-donusum',     labelTr: 'Eşya ve Kentsel Dönüşüm Hukuku',            cmsAreaId: 'pa-3',  sortOrder: 30 },
  { id: 'aile-miras',               labelTr: 'Aile, Miras ve Varlık Yönetimi',            cmsAreaId: 'pa-4',  sortOrder: 40 },
  { id: 'startup',                  labelTr: 'Startup ve Girişimcilik Hukuku',            cmsAreaId: 'pa-5',  sortOrder: 50 },
  { id: 'uluslararasi-sozlesmeler', labelTr: 'Uluslararası Sözleşmeler Hukuku',           cmsAreaId: 'pa-6',  sortOrder: 60 },
  { id: 'goc-yabancilar',           labelTr: 'Göç, Yabancılar ve Uluslararası Mobilite',  cmsAreaId: 'pa-7',  sortOrder: 70 },
  { id: 'mukayeseli-hukuk',         labelTr: 'Mukayeseli Hukuk ve Kanunlar İhtilafı',     cmsAreaId: 'pa-8',  sortOrder: 80 },
  { id: 'bilisim-yz-dijital',       labelTr: 'Bilişim, Yapay Zekâ ve Dijital Haklar',     cmsAreaId: 'pa-9',  sortOrder: 90 },
  { id: 'bilisim-ceza',             labelTr: 'Bilişim Ceza Hukuku ve Siber Kriminoloji',  cmsAreaId: 'pa-10', sortOrder: 100 },
  { id: 'is-hukuku',                labelTr: 'İş ve Sosyal Güvenlik Hukuku',              cmsAreaId: null,    sortOrder: 110 },
  { id: 'icra-iflas',               labelTr: 'İcra ve İflas Hukuku',                      cmsAreaId: null,    sortOrder: 120 },
  { id: 'ceza-genel',               labelTr: 'Ceza Hukuku (Genel)',                       cmsAreaId: null,    sortOrder: 130 },
  { id: 'idare-vergi',              labelTr: 'İdare ve Vergi Hukuku',                     cmsAreaId: null,    sortOrder: 140 },
  { id: 'tuketici',                 labelTr: 'Tüketici Hukuku',                           cmsAreaId: null,    sortOrder: 150 },
  { id: 'gayrimenkul-kira',         labelTr: 'Gayrimenkul ve Kira Hukuku',                cmsAreaId: null,    sortOrder: 160 },
  { id: 'diger',                    labelTr: 'Diğer',                                     cmsAreaId: null,    sortOrder: 900 },
];

export function labelFor(practiceAreaId: string | null | undefined): string {
  if (!practiceAreaId) return 'Eşleştirilmemiş';
  return PRACTICE_AREA_TAXONOMY.find(a => a.id === practiceAreaId)?.labelTr ?? practiceAreaId;
}

export function normalizeAlias(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Kurumsal web sitesindeki 7 dilli danışma formunun gösterdiği alt küme.
 * Büronun pazarladığı ve i18n dictionary.ts'te (consultationForm.legalAreas)
 * tam çevirisi bulunan 6 kavram — kalan 11 kanonik alan yalnızca dashboard
 * içi kullanım (dosya/başvuru sınıflandırması) içindir ve henüz çevrilmemiş.
 * Sıra dictionary.ts'teki obje anahtar sırasıyla birebir aynı kalmalıdır.
 */
export const CONSULTATION_AREA_IDS = [
  'bilisim-yz-dijital',
  'startup',
  'uluslararasi-sozlesmeler',
  'bilisim-ceza',
  'sirketler-ticaret',
  'aile-miras',
] as const;

export type ConsultationAreaId = typeof CONSULTATION_AREA_IDS[number];
