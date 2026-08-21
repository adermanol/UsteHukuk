/**
 * İçtihat tarama kayıtları. Her satır Bedesten emsal-karar aramasında
 * çalıştırılan tek bir anahtar kelime ve o kelimenin bağlandığı pratik
 * alanı belirtir. legal-codes/registry.ts ile aynı disiplin: küçük,
 * doğrulanmış bir kapsamla başla, büyüt — "tüm içtihadı indir" değil.
 *
 * Yeni bir arama eklemek için buraya tek satır eklemek yeterlidir.
 */
export interface CaseLawSearchEntry {
  keyword: string;
  practiceAreaId: string;
  label: string;
}

export const CASE_LAW_SEARCH_REGISTRY: CaseLawSearchEntry[] = [
  { keyword: 'kıdem tazminatı',                 practiceAreaId: 'is-hukuku',                label: 'Kıdem Tazminatı' },
  { keyword: 'işe iade davası',                  practiceAreaId: 'is-hukuku',                label: 'İşe İade' },
  { keyword: 'kira bedelinin tespiti',           practiceAreaId: 'gayrimenkul-kira',         label: 'Kira Bedeli Tespiti' },
  { keyword: 'kiracının tahliyesi',              practiceAreaId: 'gayrimenkul-kira',         label: 'Kiracı Tahliyesi' },
  { keyword: 'boşanma mal paylaşımı',            practiceAreaId: 'aile-miras',               label: 'Boşanma / Mal Paylaşımı' },
  { keyword: 'mirasın reddi',                    practiceAreaId: 'aile-miras',               label: 'Mirasın Reddi' },
  { keyword: 'icra takibine itiraz',             practiceAreaId: 'icra-iflas',               label: 'İcra Takibine İtiraz' },
  { keyword: 'iflasın ertelenmesi',              practiceAreaId: 'icra-iflas',               label: 'İflas Erteleme' },
  { keyword: 'ticari sözleşme tazminat',         practiceAreaId: 'sirketler-ticaret',        label: 'Ticari Sözleşme Tazminatı' },
  { keyword: 'ortaklığın feshi haklı sebep',     practiceAreaId: 'startup',                  label: 'Ortaklığın Feshi' },
  { keyword: 'sözleşmenin ifası imkansızlığı',   practiceAreaId: 'sozlesmeler',              label: 'İfa İmkânsızlığı' },
  { keyword: 'kişisel verilerin korunması',      practiceAreaId: 'bilisim-yz-dijital',       label: 'Kişisel Verilerin Korunması' },
  { keyword: 'bilişim suçu',                     practiceAreaId: 'bilisim-ceza',             label: 'Bilişim Suçu' },
  { keyword: 'sınır dışı etme iptali',           practiceAreaId: 'goc-yabancilar',           label: 'Sınır Dışı Etme İptali' },
  { keyword: 'iptal davası yürütmenin durdurulması', practiceAreaId: 'idare-vergi',          label: 'Yürütmenin Durdurulması' },
  { keyword: 'ayıplı mal tüketici hakları',      practiceAreaId: 'tuketici',                 label: 'Ayıplı Mal / Tüketici Hakları' },
  { keyword: 'kentsel dönüşüm kira yardımı',     practiceAreaId: 'esya-kentsel-donusum',     label: 'Kentsel Dönüşüm Kira Yardımı' },

  // Aşama 9: Yargıtay daire/konu bazlı genişletme. Bedesten'in `emsal-karar`
  // ucu bir mahkeme/court filtresi desteklemiyor (bkz. bedestenClient.ts) —
  // yargitay.gov.tr ayrı bir veri kümesi değil, aynı verinin (Yargıtay
  // kararları zaten bu uçtan dönüyor, `decision_type: 'Yargıtay Kararı'`)
  // ikinci bir erişim yolu. Bu yüzden en ucuz kazanım, mevcut boruyu daha
  // hedefli/derin anahtar kelimelerle beslemektir — ayrı bir yargitay.gov.tr
  // istemcisi (CaseLawSource soyutlaması) ayrı, daha maliyetli bir sonraki
  // adım olarak kalır.
  { keyword: 'fazla mesai ücreti alacağı',       practiceAreaId: 'is-hukuku',                label: 'Fazla Mesai Ücreti' },
  { keyword: 'mobbing manevi tazminat',          practiceAreaId: 'is-hukuku',                label: 'Mobbing Tazminatı' },
  { keyword: 'tahliye taahhütnamesi',            practiceAreaId: 'gayrimenkul-kira',         label: 'Tahliye Taahhütnamesi' },
  { keyword: 'kat mülkiyeti ortak gider alacağı', practiceAreaId: 'gayrimenkul-kira',        label: 'Kat Mülkiyeti Ortak Gider' },
  { keyword: 'velayetin değiştirilmesi',         practiceAreaId: 'aile-miras',               label: 'Velayet Değişikliği' },
  { keyword: 'yoksulluk nafakası artırımı',      practiceAreaId: 'aile-miras',               label: 'Nafaka Artırımı' },
  { keyword: 'saklı pay tenkis davası',          practiceAreaId: 'aile-miras',               label: 'Tenkis Davası' },
  { keyword: 'menfi tespit davası',              practiceAreaId: 'icra-iflas',               label: 'Menfi Tespit Davası' },
  { keyword: 'ihtiyati haciz kararına itiraz',   practiceAreaId: 'icra-iflas',               label: 'İhtiyati Haciz İtirazı' },
  { keyword: 'haksız rekabetin tespiti',         practiceAreaId: 'sirketler-ticaret',        label: 'Haksız Rekabet' },
  { keyword: 'çek iptali davası',                practiceAreaId: 'sirketler-ticaret',        label: 'Çek İptali' },
  { keyword: 'sözleşmeden dönme tazminat',       practiceAreaId: 'sozlesmeler',              label: 'Sözleşmeden Dönme' },
  { keyword: 'kişisel veri ihlali tazminat',     practiceAreaId: 'bilisim-yz-dijital',       label: 'Veri İhlali Tazminatı' },
  { keyword: 'bilişim yoluyla dolandırıcılık',   practiceAreaId: 'bilisim-ceza',             label: 'Bilişim Yoluyla Dolandırıcılık' },
  { keyword: 'uluslararası koruma başvurusunun reddi', practiceAreaId: 'goc-yabancilar',     label: 'Uluslararası Koruma Ret' },
  { keyword: 'vergi ziyaı cezası iptali',        practiceAreaId: 'idare-vergi',              label: 'Vergi Ziyaı Cezası İptali' },
  { keyword: 'kapıdan satışta cayma hakkı',      practiceAreaId: 'tuketici',                 label: 'Kapıdan Satış Cayma Hakkı' },
  { keyword: 'riskli yapı tespitine itiraz',     practiceAreaId: 'esya-kentsel-donusum',     label: 'Riskli Yapı Tespitine İtiraz' },
];
