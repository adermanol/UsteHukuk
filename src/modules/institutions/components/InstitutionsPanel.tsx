"use client"

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { AlertTriangle, Plus, Phone, Navigation, X, WifiOff, ClipboardCheck, Building2, Star, List, Map as MapIcon, Route, Upload } from 'lucide-react'
import {
  fetchInstitutions, createInstitution, fetchInstitutionContacts, fetchChecklistForKind, saveProcedureRun,
  toggleFavorite, distanceKm,
  InstitutionRow, InstitutionKind, InstitutionContactRow, EditableInstitutionFields, ChecklistItemRow,
  InstitutionsNotConfiguredError,
} from '../services/institutionsRepository'
import { writeCache, readCache, formatCacheAge } from '../services/offlineCache'
import { PrisonVisitSheet } from './PrisonVisitSheet'
import { LocationSearchInput } from './LocationSearchInput'
import { InstitutionsCsvImport } from './InstitutionsCsvImport'
import { GeocodeResult } from '../services/geocode'
import { fetchTodayInstitutionRoute } from '@/modules/agenda'

// Leaflet window/document'a bağımlı — SSR'da render edilemez.
const InstitutionsMap = dynamic(() => import('./InstitutionsMap').then(m => m.InstitutionsMap), {
  ssr: false,
  loading: () => <div className="glass-card h-[420px] flex items-center justify-center text-sm text-muted-foreground">Harita yükleniyor...</div>,
});

const KIND_LABELS: Record<InstitutionKind, string> = {
  adliye: 'Adliye', cezaevi: 'Cezaevi', goc_idaresi: 'Göç İdaresi', emniyet: 'Emniyet', jandarma: 'Jandarma',
  icra_dairesi: 'İcra Dairesi', noter: 'Noter', tapu: 'Tapu', nufus: 'Nüfus Müdürlüğü', sgk: 'SGK', vergi: 'Vergi Dairesi',
  belediye: 'Belediye', baro: 'Baro', arabuluculuk: 'Arabuluculuk Merkezi', bilirkisi: 'Bilirkişi', konsolosluk: 'Konsolosluk', diger: 'Diğer',
};

const inputClass = "w-full bg-muted border border-border rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none focus:border-[var(--primary)]/40";
const labelClass = "text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block";

const EMPTY_FIELDS: EditableInstitutionFields = {
  kind: 'adliye', name: '', city: null, district: null, address: null, lat: null, lng: null, phone: null, alt_phone: null,
  email: null, website: null, working_hours: null, entrance_note: null, parking_note: null, procedure_note: null, notes: null,
};

const CACHE_KEY = 'institutions';

function ChecklistRunner({ institution }: { institution: InstitutionRow }) {
  const [items, setItems] = useState<ChecklistItemRow[] | null>(null);
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklistForKind(institution.kind, institution.id)
      .then(res => { setChecklistId(res?.checklist.id ?? null); setItems(res?.items ?? []); })
      .catch(() => setItems([]));
  }, [institution.id, institution.kind]);

  if (items === null) return null;
  if (items.length === 0) return null;

  const toggle = (id: string) => setChecked(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const handleSave = async () => {
    if (!checklistId) return;
    const result = await saveProcedureRun(checklistId, Array.from(checked), null, null);
    setMessage(result.message);
  };

  return (
    <div className="border-t border-border pt-4 space-y-2">
      <p className={labelClass}>Kontrol Listesi</p>
      {items.map(item => (
        <label key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={checked.has(item.id)} onChange={() => toggle(item.id)} className="accent-[var(--primary)]" />
          {item.label}
        </label>
      ))}
      <button onClick={handleSave} className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--primary)]/40 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors">
        Tamamlandı Olarak Kaydet
      </button>
      {message && <span className="ml-2 text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}

function NearbyInstitutions({ institution, allItems, onSelect }: { institution: InstitutionRow; allItems: InstitutionRow[]; onSelect: (id: string) => void }) {
  const nearby = useMemo(() => {
    if (institution.lat == null || institution.lng == null) return [];
    return allItems
      .filter(i => i.id !== institution.id && i.lat != null && i.lng != null)
      .map(i => ({ institution: i, km: distanceKm(institution.lat!, institution.lng!, i.lat!, i.lng!) }))
      .filter(x => x.km <= 3)
      .sort((a, b) => a.km - b.km)
      .slice(0, 5);
  }, [institution, allItems]);

  if (institution.lat == null) return null;
  if (nearby.length === 0) return null;

  return (
    <div className="border-t border-border pt-4 space-y-2">
      <p className={labelClass}>Yakındakiler (3 km içinde)</p>
      {nearby.map(({ institution: n, km }) => (
        <button key={n.id} onClick={() => onSelect(n.id)} className="w-full flex items-center justify-between text-sm text-left hover:text-[var(--primary)] transition-colors">
          <span className="text-muted-foreground">{n.name} <span className="text-muted-foreground text-xs">({KIND_LABELS[n.kind]})</span></span>
          <span className="text-xs text-muted-foreground shrink-0">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</span>
        </button>
      ))}
    </div>
  );
}

function InstitutionDetail({ institution, allItems, onSelectNearby, onFavoriteToggled }: {
  institution: InstitutionRow;
  allItems: InstitutionRow[];
  onSelectNearby: (id: string) => void;
  onFavoriteToggled: (id: string, isFavorite: boolean) => void;
}) {
  const [contacts, setContacts] = useState<InstitutionContactRow[]>([]);
  const [showPrisonSheet, setShowPrisonSheet] = useState(false);
  const [isFavPending, setIsFavPending] = useState(false);

  useEffect(() => { fetchInstitutionContacts(institution.id).then(setContacts).catch(() => setContacts([])); }, [institution.id]);

  const mapsHref = institution.lat != null && institution.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${institution.lat},${institution.lng}`
    : institution.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(institution.address)}`
    : null;

  const handleFavorite = async () => {
    setIsFavPending(true);
    const result = await toggleFavorite(institution.id, !institution.is_favorite);
    setIsFavPending(false);
    if (result.success) onFavoriteToggled(institution.id, !institution.is_favorite);
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-[var(--primary)] bg-[var(--primary)]/10">{KIND_LABELS[institution.kind]}</span>
          <h3 className="font-serif text-xl text-foreground mt-2">{institution.name}</h3>
          {institution.address && <p className="text-sm text-muted-foreground mt-1">{institution.address}</p>}
        </div>
        <button onClick={handleFavorite} disabled={isFavPending} className="p-1.5 text-muted-foreground hover:text-[var(--primary)] transition-colors shrink-0" aria-label="Favori">
          <Star size={18} className={institution.is_favorite ? 'fill-[var(--primary)] text-[var(--primary)]' : ''} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {institution.phone && (
          <a href={`tel:${institution.phone}`} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <Phone size={13} /> Ara
          </a>
        )}
        {mapsHref && (
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <Navigation size={13} /> Yol Tarifi
          </a>
        )}
        {institution.kind === 'cezaevi' && (
          <button onClick={() => setShowPrisonSheet(true)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-[var(--primary)] transition-colors">
            <ClipboardCheck size={13} /> Görüşü Hazırla
          </button>
        )}
      </div>

      {(institution.entrance_note || institution.parking_note || institution.procedure_note) && (
        <div className="space-y-2 text-sm">
          {institution.procedure_note && <p><span className="text-muted-foreground">Prosedür: </span><span className="text-muted-foreground">{institution.procedure_note}</span></p>}
          {institution.entrance_note && <p><span className="text-muted-foreground">Giriş: </span><span className="text-muted-foreground">{institution.entrance_note}</span></p>}
          {institution.parking_note && <p><span className="text-muted-foreground">Otopark: </span><span className="text-muted-foreground">{institution.parking_note}</span></p>}
        </div>
      )}

      {contacts.length > 0 && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className={labelClass}>Kalem / İletişim</p>
          {contacts.map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <div><p className="text-muted-foreground">{c.full_name} <span className="text-muted-foreground">({c.role})</span></p>{c.unit && <p className="text-xs text-muted-foreground">{c.unit}</p>}</div>
              {c.phone && <a href={`tel:${c.phone}`} className="text-[var(--primary)] hover:underline text-xs">Ara</a>}
            </div>
          ))}
        </div>
      )}

      <NearbyInstitutions institution={institution} allItems={allItems} onSelect={onSelectNearby} />

      <ChecklistRunner institution={institution} />

      {institution.kind === 'cezaevi' && <PrisonVisitSheet open={showPrisonSheet} onClose={() => setShowPrisonSheet(false)} institution={institution} />}
    </div>
  );
}

export function InstitutionsPanel() {
  const [items, setItems] = useState<InstitutionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheAge, setCacheAge] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<InstitutionKind | 'all'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [fields, setFields] = useState<EditableInstitutionFields>({ ...EMPTY_FIELDS });
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [todayRoute, setTodayRoute] = useState<string[]>([]);

  const load = async () => {
    setError(null);
    const cached = readCache<InstitutionRow[]>(CACHE_KEY);
    if (cached) { setItems(cached.data); setCacheAge(cached.cachedAt); }
    try {
      const fresh = await fetchInstitutions();
      setItems(fresh);
      setCacheAge(null);
      writeCache(CACHE_KEY, fresh);
    } catch (err) {
      if (!cached) {
        if (err instanceof InstitutionsNotConfiguredError) setError(err.message);
        else { console.error('Kurum rehberi yüklenemedi:', err); setError('Kurum rehberi yüklenirken beklenmeyen bir hata oluştu.'); }
        setItems([]);
      }
      // Cache varsa sessizce ondan devam et — OfflineBanner zaten gösterilecek.
    }
  };

  useEffect(() => {
    load();
    fetchTodayInstitutionRoute().then(setTodayRoute).catch(() => setTodayRoute([]));
  }, []);

  const selected = useMemo(() => items?.find(i => i.id === selectedId) ?? null, [items, selectedId]);
  const filtered = useMemo(() => {
    if (items === null) return null;
    return filterKind === 'all' ? items : items.filter(i => i.kind === filterKind);
  }, [items, filterKind]);

  const handleFavoriteToggled = (id: string, isFavorite: boolean) => {
    setItems(prev => prev?.map(i => (i.id === id ? { ...i, is_favorite: isFavorite } : i)) ?? prev);
  };

  const handleGeocodeSelect = (result: GeocodeResult) => {
    setFields(f => ({ ...f, city: result.city ?? f.city, district: result.district ?? f.district, address: result.address, lat: result.lat, lng: result.lng }));
  };

  const saveNew = () => {
    if (!fields.name.trim()) return;
    setStatusMessage(null);
    startTransition(async () => {
      const result = await createInstitution(fields);
      setStatusMessage(result.message);
      if (result.success) { setIsCreating(false); setFields({ ...EMPTY_FIELDS }); load(); }
    });
  };

  if (error) {
    return (
      <div className="glass-card p-8 text-center border-amber-500/30">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">Kurum Rehberi Yapılandırılmadı</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cacheAge && (
        <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 rounded-lg px-3 py-2">
          <WifiOff size={13} /> Çevrimdışı — son güncelleme {formatCacheAge(cacheAge)}
        </div>
      )}

      {todayRoute.length >= 2 && (
        <div className="flex items-center gap-2 text-[var(--primary)] text-xs bg-[var(--primary)]/10 rounded-lg px-3 py-2">
          <Route size={13} /> Bugün {todayRoute.length} kurum bağlantılı etkinliğiniz var — haritada rotayı görün.
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterKind('all')} className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${filterKind === 'all' ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-border text-muted-foreground hover:text-foreground'}`}>Tümü</button>
          {(['adliye', 'cezaevi', 'goc_idaresi', 'icra_dairesi', 'noter', 'tapu', 'nufus', 'sgk', 'vergi'] as InstitutionKind[]).map(k => (
            <button key={k} onClick={() => setFilterKind(k)} className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${filterKind === k ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-border text-muted-foreground hover:text-foreground'}`}>{KIND_LABELS[k]}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-muted border border-border rounded-full p-1 shrink-0">
          <button onClick={() => setView('list')} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${view === 'list' ? 'bg-[var(--primary)] text-[var(--background)]' : 'text-muted-foreground hover:text-foreground'}`}>
            <List size={13} /> Liste
          </button>
          <button onClick={() => setView('map')} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${view === 'map' ? 'bg-[var(--primary)] text-[var(--background)]' : 'text-muted-foreground hover:text-foreground'}`}>
            <MapIcon size={13} /> Harita
          </button>
        </div>
      </div>

      {view === 'map' && filtered && (
        <InstitutionsMap
          institutions={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          route={todayRoute}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsCreating(true)} className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2.5 rounded-xl border border-dashed border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors">
              <Plus size={16} /> Yeni Kurum
            </button>
            <button onClick={() => setShowImport(true)} title="CSV İçe Aktar" className="shrink-0 flex items-center justify-center p-2.5 rounded-xl border border-border text-muted-foreground hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-colors">
              <Upload size={16} />
            </button>
          </div>
          {showImport && (
            <InstitutionsCsvImport
              onClose={() => setShowImport(false)}
              onImported={() => { setShowImport(false); load(); }}
            />
          )}
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
            {filtered === null && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
            {filtered !== null && filtered.length === 0 && (
              <div className="glass-card p-6 text-center">
                <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Henüz kurum eklenmemiş. İzmir Adliyesi&apos;ni ekleyerek başlayın.</p>
              </div>
            )}
            {filtered?.map(item => (
              <button
                key={item.id}
                onClick={() => { setSelectedId(item.id); setIsCreating(false); }}
                className={`w-full text-left bg-muted hover:bg-muted border rounded-xl p-3 transition-colors ${selectedId === item.id ? 'border-[var(--primary)]/40' : 'border-border hover:border-[var(--primary)]/20'}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-[var(--primary)] bg-[var(--primary)]/10">{KIND_LABELS[item.kind]}</span>
                  {item.is_favorite && <Star size={11} className="fill-[var(--primary)] text-[var(--primary)]" />}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{item.name}</p>
                {item.city && <p className="text-xs text-muted-foreground mt-0.5">{item.city}{item.district ? ` / ${item.district}` : ''}</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {isCreating && (
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg text-foreground">Yeni Kurum</h3>
                <button onClick={() => setIsCreating(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
              </div>
              <div>
                <label className={labelClass}>Konum Ara (isteğe bağlı, adres/koordinatı otomatik doldurur)</label>
                <LocationSearchInput onSelect={handleGeocodeSelect} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tür</label>
                  <select value={fields.kind} onChange={e => setFields(f => ({ ...f, kind: e.target.value as InstitutionKind }))} className={inputClass}>
                    {(Object.keys(KIND_LABELS) as InstitutionKind[]).map(k => <option key={k} value={k} className="bg-[var(--background)]">{KIND_LABELS[k]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ad</label>
                  <input value={fields.name} onChange={e => setFields(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="İzmir Adliyesi" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Şehir</label><input value={fields.city ?? ''} onChange={e => setFields(f => ({ ...f, city: e.target.value || null }))} className={inputClass} /></div>
                <div><label className={labelClass}>İlçe</label><input value={fields.district ?? ''} onChange={e => setFields(f => ({ ...f, district: e.target.value || null }))} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Adres</label><input value={fields.address ?? ''} onChange={e => setFields(f => ({ ...f, address: e.target.value || null }))} className={inputClass} /></div>
              {fields.lat != null && fields.lng != null && (
                <p className="text-[11px] text-emerald-400">✓ Koordinat eklendi ({fields.lat.toFixed(4)}, {fields.lng.toFixed(4)}) — haritada görünecek.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Telefon</label><input value={fields.phone ?? ''} onChange={e => setFields(f => ({ ...f, phone: e.target.value || null }))} className={inputClass} /></div>
                <div><label className={labelClass}>Çalışma Saatleri</label><input value={fields.working_hours ?? ''} onChange={e => setFields(f => ({ ...f, working_hours: e.target.value || null }))} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Prosedür Notu</label><input value={fields.procedure_note ?? ''} onChange={e => setFields(f => ({ ...f, procedure_note: e.target.value || null }))} className={inputClass} placeholder="Randevu zorunlu, 09:00-11:00 arası aranır" /></div>
              <div><label className={labelClass}>Giriş Notu</label><input value={fields.entrance_note ?? ''} onChange={e => setFields(f => ({ ...f, entrance_note: e.target.value || null }))} className={inputClass} placeholder="Avukat girişi B kapısı" /></div>
              <div className="flex items-center gap-2">
                <button onClick={saveNew} disabled={isPending || !fields.name.trim()} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50">Kaydet</button>
                {statusMessage && <span className="text-xs text-muted-foreground">{statusMessage}</span>}
              </div>
            </div>
          )}

          {!isCreating && selected && (
            <InstitutionDetail
              institution={selected}
              allItems={items ?? []}
              onSelectNearby={setSelectedId}
              onFavoriteToggled={handleFavoriteToggled}
            />
          )}

          {!isCreating && !selected && (
            <div className="glass-card p-8 text-center h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Detayları görmek için soldan bir kurum seçin veya yeni kurum ekleyin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
