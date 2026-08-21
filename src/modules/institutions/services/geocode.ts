"use server"

/**
 * OpenStreetMap Nominatim üzerinden ücretsiz, API anahtarı gerektirmeyen
 * konum arama. Sunucu tarafında çağrılır ki (a) Nominatim kullanım
 * politikasının istediği tanımlayıcı User-Agent tutarlı şekilde gönderilsin,
 * (b) istek sıklığı uygulama tarafında (debounce ile) kontrol edilsin.
 * Yalnızca büronun kurum eklerken elle koordinat girmesini önlemek için
 * kullanılır — toplu/otomatik sorgu yapılmaz.
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LawLM-KurumArama/1.0 (+https://lawlm.local; hukuk burosu ic kullanim araci)';

export interface GeocodeResult {
  displayName: string;
  address: string;
  city: string | null;
  district: string | null;
  lat: number;
  lng: number;
}

export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  const term = query.trim();
  if (term.length < 3) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', term);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'tr');
  url.searchParams.set('limit', '6');
  url.searchParams.set('accept-language', 'tr');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const results = await res.json();

    return (results as any[]).map(r => ({
      displayName: r.display_name,
      address: r.display_name,
      city: r.address?.province || r.address?.city || r.address?.state || null,
      district: r.address?.district || r.address?.town || r.address?.county || null,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));
  } catch (err) {
    console.error('Konum arama hatası:', err);
    return [];
  }
}
