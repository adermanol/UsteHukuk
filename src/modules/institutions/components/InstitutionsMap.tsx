"use client"

import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { InstitutionRow, InstitutionKind } from '../services/institutionsRepository'

// Leaflet'in varsayılan marker ikonları bundler'lar altında (Webpack/
// Turbopack) kırık görsel yolları üretir — bilinen bir sorun. Bunun yerine
// kurum türüne göre renkli, saf CSS divIcon kullanılır; harici görsel
// dosyasına bağımlılık kalmaz.
const KIND_COLORS: Record<InstitutionKind, string> = {
  adliye: '#cda372', cezaevi: '#e05252', goc_idaresi: '#5b8def', emniyet: '#5b8def', jandarma: '#5b8def',
  icra_dairesi: '#e0a352', noter: '#7fd1ae', tapu: '#7fd1ae', nufus: '#7fd1ae', sgk: '#7fd1ae', vergi: '#7fd1ae',
  belediye: '#a385e0', baro: '#cda372', arabuluculuk: '#a385e0', bilirkisi: '#a385e0', konsolosluk: '#5b8def', diger: '#9aa0a6',
};

function makeIcon(color: string, isFavorite: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:${isFavorite ? 20 : 16}px;height:${isFavorite ? 20 : 16}px;border-radius:50%;background:${color};border:2px solid rgba(0,0,0,0.6);box-shadow:0 0 8px rgba(0,0,0,0.5);"></div>`,
    iconSize: [isFavorite ? 20 : 16, isFavorite ? 20 : 16],
    iconAnchor: [isFavorite ? 10 : 8, isFavorite ? 10 : 8],
  });
}

const IZMIR_CENTER: [number, number] = [38.4237, 27.1428];

export function InstitutionsMap({
  institutions,
  selectedId,
  onSelect,
  route,
}: {
  institutions: InstitutionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** "Bugünün Rotası": sıralı institution id listesi, dolu ise hat çizilir. */
  route?: string[];
}) {
  const withCoords = useMemo(() => institutions.filter(i => i.lat != null && i.lng != null), [institutions]);

  const center = useMemo((): [number, number] => {
    if (withCoords.length === 0) return IZMIR_CENTER;
    const avg = withCoords.reduce((acc, i) => [acc[0] + i.lat!, acc[1] + i.lng!], [0, 0]);
    return [avg[0] / withCoords.length, avg[1] / withCoords.length];
  }, [withCoords]);

  const routeCoords = useMemo(() => {
    if (!route || route.length < 2) return null;
    const byId = new Map(withCoords.map(i => [i.id, i]));
    const points = route.map(id => byId.get(id)).filter((i): i is InstitutionRow => !!i).map(i => [i.lat!, i.lng!] as [number, number]);
    return points.length >= 2 ? points : null;
  }, [route, withCoords]);

  if (withCoords.length === 0) {
    return (
      <div className="glass-card p-8 text-center h-[420px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Haritada gösterilecek konumlu kurum yok. Bir kurum eklerken konum aratarak koordinat ekleyin.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-border h-[420px]">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routeCoords && <Polyline positions={routeCoords} pathOptions={{ color: '#cda372', weight: 3, dashArray: '6 6' }} />}
        {withCoords.map(inst => (
          <Marker
            key={inst.id}
            position={[inst.lat!, inst.lng!]}
            icon={makeIcon(KIND_COLORS[inst.kind], inst.is_favorite || inst.id === selectedId)}
            eventHandlers={{ click: () => onSelect(inst.id) }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{inst.name}</p>
                {inst.address && <p className="text-xs text-muted-foreground mt-1">{inst.address}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
