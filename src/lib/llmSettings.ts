"use server"

import { supabase, isMockSupabase } from '@/core/database/supabase'
import { createServerSupabaseClient } from '@/core/database/supabase-server'

export type LlmProvider = 'anthropic' | 'openai' | 'lmstudio';

export interface LlmSettings {
  /** null = otomatik seçim (Anthropic > OpenAI > yapılandırılmadı) */
  activeProvider: LlmProvider | null;
}

// LLM sağlayıcı seçimi daha önce `data/llm-settings.json`'a fs.writeFileSync
// ile yazılıyordu — Vercel'de bu dizin salt-okunur, üretimde sağlayıcı
// değişikliği kalıcı olmuyordu. Artık `app_settings` tablosunda tutuluyor
// (bkz. 20260801000000_app_settings.sql). Bu ayar sohbet/RAG çağrısı
// başına en az bir kez okunduğu için (`callLLM`, `embedQuery`) kısa ömürlü
// bir bellek içi önbellek eklendi — her ayar değişikliğinde en geç 10sn
// içinde yansır, arada gereksiz ağ gidiş-gelişini önler.
const LLM_SETTINGS_KEY = 'llm_settings';
const DEFAULT_SETTINGS: LlmSettings = { activeProvider: null };
const CACHE_TTL_MS = 10_000;
let cache: { value: LlmSettings; expiresAt: number } | null = null;

export async function getLlmSettings(): Promise<LlmSettings> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  try {
    if (isMockSupabase()) return DEFAULT_SETTINGS;
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', LLM_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    const settings: LlmSettings = data ? { ...DEFAULT_SETTINGS, ...(data.value as Partial<LlmSettings>) } : DEFAULT_SETTINGS;
    cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateLlmSettings(settings: LlmSettings): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseServer = await createServerSupabaseClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const { error } = await supabaseServer.from('app_settings').upsert({
      key: LLM_SETTINGS_KEY,
      value: settings,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    if (error) {
      console.error('Error updating LLM settings:', error);
      return { success: false, message: 'Ayar güncellenirken bir hata oluştu (yalnızca yönetici/master düzenleyebilir).' };
    }
    cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };
    return { success: true, message: 'LLM sağlayıcı ayarı güncellendi.' };
  } catch (error) {
    console.error('Error updating LLM settings:', error);
    return { success: false, message: 'Ayar güncellenirken bir hata oluştu.' };
  }
}

/** Her sağlayıcının kullanılabilir olup olmadığını (anahtar tanımlı mı) döner; anahtar değerlerini asla döndürmez. */
export async function getAvailableProviders(): Promise<Record<LlmProvider, boolean>> {
  return {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    // LM Studio anahtar gerektirmez; erişilebilirliği yalnızca gerçek çağrı anında anlaşılır.
    lmstudio: true,
  };
}

/**
 * Canlıya alma hatası (2026-08-23): aktif sağlayıcı 'lmstudio' olarak
 * kalmışken (yerel geliştirmeden kalan bir ayar) canlıda gerçek bir sohbet
 * denemesi `LM_STUDIO_BASE_URL` varsayılanı olan localhost'a bağlanmaya
 * çalışıp ECONNREFUSED ile patlıyor, sistem hatası kaydı düşüyor ve
 * kullanıcıya boş/anlamsız bir sohbet ekranı gösteriyordu. Sohbet
 * widget'ını (ve genel olarak sohbet özelliğini) yalnızca GERÇEKTEN
 * çalışacak bir sağlayıcı varken göster: bulut sağlayıcılardan biri
 * (anahtar tanımlı) VEYA LM Studio için `LM_STUDIO_BASE_URL` açıkça
 * ayarlanmış (varsayılan localhost'a bırakılmamış — bu, Vercel gibi bir
 * bulut ortamında asla erişilebilir olmaz).
 */
export async function isChatAvailable(): Promise<boolean> {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasReachableLmStudio = !!process.env.LM_STUDIO_BASE_URL;
  if (hasAnthropic || hasOpenAI) return true;

  const { activeProvider } = await getLlmSettings();
  if (activeProvider === 'lmstudio') return hasReachableLmStudio;
  // activeProvider null/otomatik ise ve bulut anahtarı yoksa, geriye
  // yalnızca LM Studio kalır — aynı erişilebilirlik koşulu geçerli.
  return hasReachableLmStudio;
}
