"use server"

import { supabase, isMockSupabase } from '@/core/database/supabase'
import { createServerSupabaseClient } from '@/core/database/supabase-server'

export type ThemeSetting = 'light' | 'dark' | 'system';

const THEME_SETTINGS_KEY = 'theme';
const DEFAULT_THEME: ThemeSetting = 'light';

/** Büro geneli varsayılan tema — `app_settings`'te tutulur (bkz.
 * 20260801000000_app_settings.sql), public site render'ı için oturumsuz
 * okunabilir olması gerekir. Kullanıcı isterse next-themes ile tarayıcıda
 * geçici olarak değiştirebilir (localStorage override, sunucu varsayılanını
 * etkilemez). */
export async function getThemeSetting(): Promise<ThemeSetting> {
  try {
    if (isMockSupabase()) return DEFAULT_THEME;
    const { data, error } = await supabase.from('app_settings').select('value').eq('key', THEME_SETTINGS_KEY).maybeSingle();
    if (error) throw error;
    const value = (data?.value as { theme?: ThemeSetting } | undefined)?.theme;
    return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export async function updateThemeSetting(theme: ThemeSetting): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseServer = await createServerSupabaseClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const { error } = await supabaseServer.from('app_settings').upsert({
      key: THEME_SETTINGS_KEY,
      value: { theme },
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    if (error) {
      console.error('Error updating theme setting:', error);
      return { success: false, message: 'Tema güncellenirken bir hata oluştu (yalnızca yönetici/master düzenleyebilir).' };
    }
    return { success: true, message: 'Büro geneli tema güncellendi.' };
  } catch (error) {
    console.error('Error updating theme setting:', error);
    return { success: false, message: 'Tema güncellenirken bir hata oluştu.' };
  }
}
