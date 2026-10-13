// Sitenin kanonik adresi. Tek yerde tutulur: canonical etiketleri, sitemap,
// robots, llms.txt ve JSON-LD yapısal verisinin hepsi buradan okur — aksi
// halde alan adı değiştiğinde (ya da beyaz etiket dağıtımda yeni bir büroya
// kurulduğunda) birbirinden habersiz birkaç yerde elle güncellemek gerekirdi.
//
// `www.` DEĞİL: www.ustehukuk.com zaten ustehukuk.com'a yönleniyor; arama
// motorlarına ve yapay zekâ motorlarına tek ve tutarlı bir biçim bildirmek
// için her yerde bu biçim kullanılır (bkz. GEO_Research/ raporları).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://ustehukuk.com';

/** Mutlak URL üretir: `abs('/blog/x')` → `https://ustehukuk.com/blog/x` */
export function abs(path: string): string {
  return new URL(path, SITE_URL).toString();
}
