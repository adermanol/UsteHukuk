// Belge içeriğinin biçimden bağımsız (nötr) modeli. Her belge türünün
// hukuki metni/alan yapısı TEK YERDE (buildContent) tanımlanır; hem .docx
// hem .pdf render'ı aynı düğüm dizisini tüketir — iki format arasında
// içerik driftine (biri güncellenip diğeri unutulmasına) karşı tek doğru
// kaynak. Yeni bir çıktı formatı eklemek yalnızca yeni bir renderer
// gerektirir, içerik tanımına dokunmaz.
export interface PartyInput {
  ad: string;
  tcVergiNo: string;
  adres: string;
}

export type ContentNode =
  | { type: 'title'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'keyvalue'; label: string; value: string }
  | { type: 'partiesTable'; parties: PartyInput[] }
  | { type: 'body'; lines: string[] }
  | { type: 'closing'; text: string }
  | { type: 'signature'; label: string };

function title(text: string): ContentNode { return { type: 'title', text }; }
function heading(text: string): ContentNode { return { type: 'heading', text }; }
function kv(label: string, value: string): ContentNode { return { type: 'keyvalue', label, value: value || '—' }; }
function parties(list: PartyInput[]): ContentNode { return { type: 'partiesTable', parties: list }; }
function body(text: string): ContentNode {
  const lines = (text || '—').split('\n').filter(l => l.trim().length > 0);
  return { type: 'body', lines: lines.length > 0 ? lines : ['—'] };
}
function closing(text: string): ContentNode { return { type: 'closing', text }; }
function signature(label: string): ContentNode { return { type: 'signature', label }; }

/** Her belge türü, ilgili şablon dosyasının (eskiden public/templates/*.docx,
 * artık kullanılmıyor) taşıdığı AYNI hukuki metin/alan yapısını korur —
 * yalnızca sunum katmanı (başlık/etiket biçimlendirme, taraflar tablosu,
 * imza satırı) profesyonelleştirildi. Yeni bir hukuki içerik/madde
 * EKLENMEDİ. */
export function buildContent(docType: string, fields: Record<string, any>): ContentNode[] {
  const partyList: PartyInput[] = fields.parties ?? [];

  switch (docType) {
    case 'ihtarname':
      return [
        title('İHTARNAME'),
        heading('TARAFLAR'), parties(partyList),
        kv('Konu', fields.konu),
        kv('Yasal Dayanak', fields.yasalDayanak),
        kv('Son Ödeme/İfa Tarihi', fields.sonOdemeTarihi),
        kv('Düzenleme Tarihi', fields.tarih),
        heading('AÇIKLAMALAR'), body(fields.talepMetni),
        closing('Yukarıda belirtilen hususların yerine getirilmesi, aksi halde yasal yollara başvurulacağı ihtaren bildirilir.'),
        signature('İhtarı Keşide Eden'),
      ];

    case 'vekaletname':
      return [
        title('ÖZEL VEKALETNAME'),
        heading('TARAFLAR'), parties(partyList),
        kv('Yasal Dayanak', fields.yasalDayanak),
        kv('Düzenleme Tarihi', fields.tarih),
        heading('YETKİ KAPSAMI'), body(fields.yetkiKapsami),
        closing('İşbu vekaletname yukarıda belirtilen yetki kapsamıyla sınırlı olarak düzenlenmiştir.'),
        signature('Vekalet Eden'),
      ];

    case 'sozlesme':
      return [
        title('GİZLİLİK SÖZLEŞMESİ (NDA)'),
        heading('TARAFLAR'), parties(partyList),
        kv('Gizlilik Süresi', fields.gizlilikSuresi),
        kv('Yasal Dayanak', fields.yasalDayanak),
        kv('Düzenleme Tarihi', fields.tarih),
        heading('SÖZLEŞME KONUSU'), body(fields.sozlesmeKonusu),
        closing('Taraflar, işbu sözleşme kapsamında paylaşılan her türlü bilgiyi gizli tutmayı ve üçüncü kişilerle paylaşmamayı kabul ve taahhüt eder.'),
        signature('Taraflar'),
      ];

    case 'kiraSozlesmesi':
      return [
        title('KİRA SÖZLEŞMESİ'),
        heading('TARAFLAR'), parties(partyList),
        kv('Kira Bedeli', fields.kiraBedeli),
        kv('Kira Süresi', fields.kiraSuresi),
        kv('Yasal Dayanak', fields.yasalDayanak),
        kv('Başlangıç Tarihi', fields.baslangicTarihi),
        heading('TAŞINMAZ ADRESİ'), body(fields.tasinmazAdresi),
        closing('Kiraya veren, yukarıda adresi belirtilen taşınmazı, işbu sözleşmede belirtilen bedel ve süre ile kiracıya kiralamayı; kiracı ise kiralamayı ve kira bedelini zamanında ödemeyi kabul eder.'),
        signature('Kiraya Veren / Kiracı'),
      ];

    case 'isSozlesmesi':
      return [
        title('İŞ SÖZLEŞMESİ'),
        heading('TARAFLAR'), parties(partyList),
        kv('Pozisyon / Görev', fields.pozisyon),
        kv('Ücret', fields.ucret),
        kv('Çalışma Şekli', fields.calismaSekli),
        kv('Yasal Dayanak', fields.yasalDayanak),
        kv('Başlangıç Tarihi', fields.baslangicTarihi),
        closing('İşveren ve işçi, yukarıda belirtilen pozisyon, ücret ve çalışma koşulları ile işbu iş sözleşmesini serbest iradeleriyle akdetmişlerdir.'),
        signature('İşveren / İşçi'),
      ];

    case 'davaDilekcesi':
      return [
        title('DAVA DİLEKÇESİ'),
        kv('Mahkeme', fields.mahkeme),
        heading('TARAFLAR'), parties(partyList),
        kv('Yasal Dayanak', fields.yasalDayanak),
        kv('Düzenleme Tarihi', fields.tarih),
        heading('DAVA KONUSU'), body(fields.davaKonusu),
        heading('TALEP SONUCU'), body(fields.talepSonucu),
        closing('Yukarıda arz ve izah edilen nedenlerle davamızın kabulüne karar verilmesini saygıyla talep ederiz.'),
        signature('Davacı Vekili'),
      ];

    default:
      throw new Error(`Bilinmeyen doküman türü: ${docType}`);
  }
}
