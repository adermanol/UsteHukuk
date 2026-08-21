export type DocumentFieldType = 'text' | 'textarea' | 'date' | 'select' | 'legal-reference' | 'party';

export interface DocumentFieldDef {
  id: string;
  label: string;
  type: DocumentFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DocumentTemplateDef {
  id: string;
  label: string;
  description: string;
  fields: DocumentFieldDef[];
}

const PARTIES_FIELD = (label: string): DocumentFieldDef => ({
  id: 'parties',
  label,
  type: 'party',
  required: true,
});

const LEGAL_REFERENCE_FIELD = (id = 'yasalDayanak', label = 'Yasal Dayanak (Kanun / Madde)'): DocumentFieldDef => ({
  id,
  label,
  type: 'legal-reference',
});

export const DOCUMENT_TEMPLATES: DocumentTemplateDef[] = [
  {
    id: 'ihtarname',
    label: 'İhtarname',
    description: 'Karşı tarafa resmi ihtar/uyarı bildirimi.',
    fields: [
      PARTIES_FIELD('Taraflar (Gönderen / Muhatap)'),
      { id: 'konu', label: 'Konu', type: 'text', required: true, placeholder: 'Örn. Alacak Tahsili' },
      { id: 'talepMetni', label: 'Talep Metni', type: 'textarea', required: true },
      LEGAL_REFERENCE_FIELD(),
      { id: 'sonOdemeTarihi', label: 'Son Ödeme/İfa Tarihi', type: 'date' },
      { id: 'tarih', label: 'Düzenleme Tarihi', type: 'date', required: true },
    ],
  },
  {
    id: 'vekaletname',
    label: 'Özel Vekaletname',
    description: 'Belirli işler için vekalet yetkisi veren belge.',
    fields: [
      PARTIES_FIELD('Taraflar (Vekalet Eden / Vekil)'),
      { id: 'yetkiKapsami', label: 'Yetki Kapsamı', type: 'textarea', required: true },
      LEGAL_REFERENCE_FIELD(),
      { id: 'tarih', label: 'Düzenleme Tarihi', type: 'date', required: true },
    ],
  },
  {
    id: 'sozlesme',
    label: 'Gizlilik Sözleşmesi (NDA)',
    description: 'Taraflar arası bilgi gizliliği sözleşmesi.',
    fields: [
      PARTIES_FIELD('Taraflar'),
      { id: 'sozlesmeKonusu', label: 'Sözleşme Konusu', type: 'textarea', required: true },
      { id: 'gizlilikSuresi', label: 'Gizlilik Süresi', type: 'select', options: ['1 Yıl', '2 Yıl', '3 Yıl', '5 Yıl', 'Süresiz'] },
      LEGAL_REFERENCE_FIELD(),
      { id: 'tarih', label: 'Düzenleme Tarihi', type: 'date', required: true },
    ],
  },
  {
    id: 'kiraSozlesmesi',
    label: 'Kira Sözleşmesi',
    description: 'Taşınmaz kiralama sözleşmesi.',
    fields: [
      PARTIES_FIELD('Taraflar (Kiraya Veren / Kiracı)'),
      { id: 'tasinmazAdresi', label: 'Taşınmaz Adresi', type: 'textarea', required: true },
      { id: 'kiraBedeli', label: 'Kira Bedeli', type: 'text', required: true, placeholder: 'Örn. 25.000 TL/ay' },
      { id: 'kiraSuresi', label: 'Kira Süresi', type: 'select', options: ['1 Yıl', '2 Yıl', '3 Yıl', 'Belirsiz Süreli'] },
      LEGAL_REFERENCE_FIELD('yasalDayanak', 'Yasal Dayanak (Örn. TBK md. 299 vd.)'),
      { id: 'baslangicTarihi', label: 'Başlangıç Tarihi', type: 'date', required: true },
    ],
  },
  {
    id: 'isSozlesmesi',
    label: 'İş Sözleşmesi',
    description: 'İşveren-işçi arası çalışma sözleşmesi.',
    fields: [
      PARTIES_FIELD('Taraflar (İşveren / İşçi)'),
      { id: 'pozisyon', label: 'Pozisyon / Görev', type: 'text', required: true },
      { id: 'ucret', label: 'Ücret', type: 'text', required: true, placeholder: 'Örn. Brüt 45.000 TL/ay' },
      { id: 'calismaSekli', label: 'Çalışma Şekli', type: 'select', options: ['Tam Zamanlı', 'Yarı Zamanlı', 'Belirli Süreli', 'Belirsiz Süreli'] },
      LEGAL_REFERENCE_FIELD('yasalDayanak', 'Yasal Dayanak (Örn. 4857 sayılı İş Kanunu)'),
      { id: 'baslangicTarihi', label: 'Başlangıç Tarihi', type: 'date', required: true },
    ],
  },
  {
    id: 'davaDilekcesi',
    label: 'Dava Dilekçesi',
    description: 'Mahkemeye sunulacak genel dava dilekçesi taslağı.',
    fields: [
      PARTIES_FIELD('Taraflar (Davacı / Davalı)'),
      { id: 'mahkeme', label: 'Mahkeme', type: 'text', required: true, placeholder: 'Örn. İzmir 3. Asliye Hukuk Mahkemesi' },
      { id: 'davaKonusu', label: 'Dava Konusu', type: 'textarea', required: true },
      { id: 'talepSonucu', label: 'Talep Sonucu', type: 'textarea', required: true },
      LEGAL_REFERENCE_FIELD('yasalDayanak', 'Yasal Dayanak'),
      { id: 'tarih', label: 'Düzenleme Tarihi', type: 'date', required: true },
    ],
  },
];

export function getTemplate(id: string): DocumentTemplateDef | undefined {
  return DOCUMENT_TEMPLATES.find(t => t.id === id);
}
