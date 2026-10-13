import { ImageResponse } from 'next/og'

// SEO denetimi (2026-10, bkz. GEO_Research/): sitede og:image tanımlı
// değildi — bağlantı WhatsApp'ta veya sosyal ağlarda paylaşıldığında
// görselsiz, dolayısıyla tıklanma olasılığı düşük bir kart çıkıyordu.
//
// Görsel çalışma anında üretilir (statik dosya tasarlamaya gerek yok) ve
// sitenin mevcut renk/tipografi diliyle uyumludur; sitenin GÖRÜNÜMÜNDE
// hiçbir değişiklik yapmaz, yalnızca paylaşım kartını etkiler.

export const runtime = 'nodejs';
export const alt = 'Üste Hukuk Bürosu — İzmir Alsancak';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          // Sitenin koyu zemin + altın vurgu paletiyle uyumlu.
          background: 'linear-gradient(135deg, #10151f 0%, #1b2233 100%)',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', width: 90, height: 5, background: '#c9a227', marginBottom: 44 }} />
        <div style={{ display: 'flex', fontSize: 68, color: '#f5f3ef', fontWeight: 700, letterSpacing: -1 }}>
          Üste Hukuk Bürosu
        </div>
        <div style={{ display: 'flex', fontSize: 33, color: '#c9a227', marginTop: 20 }}>
          İzmir Alsancak · Avukatlık ve Hukuki Danışmanlık
        </div>
        <div style={{ display: 'flex', fontSize: 25, color: '#9aa3b2', marginTop: 30, lineHeight: 1.45, maxWidth: 940 }}>
          Şirketler, sözleşmeler, bilişim, yapay zekâ, KVKK, göç ve uluslararası hukuk
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: '#6b7280', marginTop: 'auto' }}>
          ustehukuk.com
        </div>
      </div>
    ),
    size,
  );
}
