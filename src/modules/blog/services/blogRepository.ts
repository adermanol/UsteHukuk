"use server"

import { supabase, isMockSupabase } from '@/core/database/supabase'
import { createServerSupabaseClient } from '@/core/database/supabase-server'
import type { Translatable } from '@/lib/i18n/locales'

export type BlogPostStatus = 'draft' | 'published';

export interface BlogPost {
  id: string;
  slug: string;
  title: Translatable;
  excerpt: Translatable;
  content: Translatable;
  cover_image_url: string | null;
  author_id: string | null;
  status: BlogPostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = 'id, slug, title, excerpt, content, cover_image_url, author_id, status, published_at, created_at, updated_at';

/** Public site: yalnızca yayınlanmış yazılar (RLS zaten bunu zorunlu kılar,
 * `.eq('status','published')` sorguyu daha net/verimli kılmak için eklenir).
 * `getCmsData()` ile aynı savunmacı desen: bu fonksiyon ANA SAYFADAN
 * doğrudan çağrılır — bir hata fırlatması TÜM siteyi 500'e düşürür (örn.
 * migration henüz uygulanmamışsa), bu yüzden hata durumunda boş dizi döner. */
export async function fetchPublishedPosts(limit?: number): Promise<BlogPost[]> {
  try {
    if (isMockSupabase()) return [];
    let query = supabase.from('blog_posts').select(COLUMNS).eq('status', 'published').order('published_at', { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Error fetching published blog posts:', error);
    return [];
  }
}

export async function fetchPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    if (isMockSupabase()) return null;
    const { data, error } = await supabase.from('blog_posts').select(COLUMNS).eq('slug', slug).eq('status', 'published').maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    return null;
  }
}

/** Dashboard editörü: RLS "Allow yonetici or master select for all
 * blog_posts" gereği taslaklar dahil tüm yazıları döner (yönetici/master
 * olmayan bir hesap çağırırsa boş dizi döner). */
export async function fetchAllPostsForDashboard(): Promise<BlogPost[]> {
  if (isMockSupabase()) return [];
  const { data, error } = await supabase.from('blog_posts').select(COLUMNS).order('created_at', { ascending: false });
  if (error) throw new Error(`Yazılar alınamadı: ${error.message}`);
  return data ?? [];
}

export interface BlogPostInput {
  slug: string;
  title: Translatable;
  excerpt: Translatable;
  content: Translatable;
  cover_image_url: string | null;
  status: BlogPostStatus;
}

export async function createPost(input: BlogPostInput): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseServer = await createServerSupabaseClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const published_at = input.status === 'published' ? new Date().toISOString() : null;
    const { error } = await supabaseServer.from('blog_posts').insert({ ...input, author_id: user?.id ?? null, published_at });
    if (error) return { success: false, message: `Yazı oluşturulamadı: ${error.message}` };
    return { success: true, message: 'Yazı oluşturuldu.' };
  } catch {
    return { success: false, message: 'Yazı oluşturulurken bir hata oluştu.' };
  }
}

export async function updatePost(id: string, input: BlogPostInput, previousStatus: BlogPostStatus): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseServer = await createServerSupabaseClient();
    // İlk kez yayınlanıyorsa published_at damgalanır; zaten yayınlanmış bir
    // yazı düzenlenirken published_at korunur (yeniden yayınlanmış gibi
    // görünmesin diye).
    const published_at = input.status === 'published' && previousStatus !== 'published' ? new Date().toISOString() : undefined;
    const payload = published_at ? { ...input, published_at } : input;
    const { data, error } = await supabaseServer.from('blog_posts').update(payload).eq('id', id).select('id');
    if (error) return { success: false, message: `Yazı güncellenemedi: ${error.message}` };
    if (!data || data.length === 0) return { success: false, message: 'Yazı güncellenemedi — yetkiniz olmayabilir.' };
    return { success: true, message: 'Yazı güncellendi.' };
  } catch {
    return { success: false, message: 'Yazı güncellenirken bir hata oluştu.' };
  }
}

export async function deletePost(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseServer = await createServerSupabaseClient();
    const { error } = await supabaseServer.from('blog_posts').delete().eq('id', id);
    if (error) return { success: false, message: `Yazı silinemedi: ${error.message}` };
    return { success: true, message: 'Yazı silindi.' };
  } catch {
    return { success: false, message: 'Yazı silinirken bir hata oluştu.' };
  }
}
