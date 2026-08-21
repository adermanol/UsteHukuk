"use client"

export const COOKIE_CONSENT_KEY = 'ustehukuk_cookie_consent';

/**
 * Güvenlik/KVKK denetimi (2026-08-11): `CookieBanner`'daki "Reddet" butonu
 * hiçbir şeyi etkilemiyordu — rıza hiçbir yerde okunmuyordu. Bugün gerçek
 * bir üçüncü taraf izleyici (GA/Meta Pixel vb.) yok, bu yüzden risk şu an
 * "yanlış beyan"dı (metin kabul varsayıyordu). İleride bir izleyici/analitik
 * SDK'sı eklenirse, o kod bu fonksiyonu ÇAĞIRMADAN yüklenmemeli — zorunlu
 * olmayan (functional dışı) hiçbir çerez/izleyici, kullanıcı açıkça kabul
 * etmeden çalışmamalı.
 */
export function hasNonEssentialCookieConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { accepted?: boolean };
    return parsed.accepted === true;
  } catch {
    return false;
  }
}
