"use server"

import { supabase, isMockSupabase } from '@/core/database/supabase'
import { createServerSupabaseClient } from '@/core/database/supabase-server'
import { Translatable, Locale, LOCALES, DEFAULT_LOCALE } from '@/lib/i18n/locales'

// CMS içeriği daha önce `data/cms-data.json`'a fs.writeFileSync ile
// yazılıyordu — Vercel'de bu dizin salt-okunur, üretimde CMS değişiklikleri
// kalıcı olmuyordu (bkz. 20260801000000_app_settings.sql). Artık tek satırlık
// bir `app_settings` kaydında (`key='cms_data'`) tutuluyor; okuma herkese
// açık (public site render için oturumsuz), yazma yalnızca yönetici/master.
const CMS_SETTINGS_KEY = 'cms_data'

export interface CmsData {
  general: {
    logoText: string;
    address: string;
    phone: string;
    email: string;
    whatsapp: string;
    mapEmbedUrl?: string;
    paymentUrl?: string;
    footerTagline: Translatable;
    socials: {
      facebook: { url: string; enabled: boolean };
      twitter: { url: string; enabled: boolean };
      linkedin: { url: string; enabled: boolean };
      instagram?: { url: string; enabled: boolean };
    }
  };
  hero: {
    title: Translatable;
    subtitle: Translatable;
  };
  whyChooseUs: {
    title: Translatable;
    subtitle: Translatable;
    paragraph1: Translatable;
    paragraph2: Translatable;
  };
  practiceAreas: {
    id: string;
    title: Translatable;
    description: Translatable;
    services: Translatable[];
    icon: string;
  }[];
  team: {
    id: string;
    name: string;
    title: Translatable;
    bio: Translatable;
    imageUrl: string;
    isStarred?: boolean;
    socials: {
      linkedin?: string;
      twitter?: string;
    }
  }[];
  consultation: {
    title: Translatable;
    intro: Translatable;
    steps: {
      title: Translatable;
      description: Translatable;
    }[];
    securityNote: Translatable;
  };
  legalPages: {
    slug: string;
    title: Translatable;
    content: Translatable;
    isActive: boolean;
  }[];
}

function mkTranslatable(partial: Partial<Record<Locale, string>>): Translatable {
  const result = {} as Translatable;
  for (const locale of LOCALES) result[locale] = partial[locale] ?? '';
  return result;
}

const EMPTY_TRANSLATABLE: Translatable = mkTranslatable({});

function defaultCmsData(): CmsData {
  return {
    general: {
      logoText: "AttorCO",
      address: "Los Angeles Gournadi",
      phone: "+1 (212) 255-5511",
      email: "mail@attorco.com",
      whatsapp: "+1234567890",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d192697.79327429182!2d28.871754029471182!3d41.0054958097034!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14caa7040068086b%3A0xe1ccfe98bc01b0d0!2zxLBzdGFuYnVs!5e0!3m2!1str!2str!4v1700000000000!5m2!1str!2str",
      footerTagline: EMPTY_TRANSLATABLE,
      socials: {
        facebook: { url: "#", enabled: true },
        twitter: { url: "#", enabled: true },
        linkedin: { url: "#", enabled: true },
        instagram: { url: "", enabled: false }
      }
    },
    hero: {
      title: mkTranslatable({ tr: "Her Müvekkile Tek Tek Adanmış Hizmet.", en: "Dedicated To One Client At A Time." }),
      subtitle: mkTranslatable({ tr: "ADALET İÇİN MÜCADELE EDİYORUZ", en: "WE FIGHT FOR JUSTICE" }),
    },
    whyChooseUs: {
      title: mkTranslatable({ tr: "NEDEN BİZİ SEÇMELİSİNİZ", en: "WHY CHOOSE US" }),
      subtitle: EMPTY_TRANSLATABLE,
      paragraph1: EMPTY_TRANSLATABLE,
      paragraph2: EMPTY_TRANSLATABLE,
    },
    practiceAreas: [],
    team: [],
    consultation: {
      title: EMPTY_TRANSLATABLE,
      intro: EMPTY_TRANSLATABLE,
      steps: [],
      securityNote: EMPTY_TRANSLATABLE,
    },
    legalPages: [],
  };
}

/**
 * Eski CMS kayıtlarını {tr,en,ar,fa,ru,fr,de} şekline sarmalar. Zaten
 * desteklenen bir locale seti varsa mevcut değerler korunur, eksik olan
 * yeni diller boş string ile başlar — sahte/otomatik çeviri üretilmez,
 * büro bunları CMS panelinden gerçek çeviriyle doldurur.
 */
function toTranslatable(value: unknown): Translatable {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return mkTranslatable(
      Object.fromEntries(LOCALES.map(l => [l, typeof obj[l] === 'string' ? obj[l] as string : '']))
    );
  }
  if (typeof value === 'string') {
    return mkTranslatable({ [DEFAULT_LOCALE]: value });
  }
  return EMPTY_TRANSLATABLE;
}

function migrateTranslatableFields(rawData: any): void {
  if (rawData.general) {
    rawData.general.footerTagline = toTranslatable(rawData.general.footerTagline);
  }
  if (rawData.hero) {
    rawData.hero.title = toTranslatable(rawData.hero.title);
    rawData.hero.subtitle = toTranslatable(rawData.hero.subtitle);
  }
  if (rawData.whyChooseUs) {
    rawData.whyChooseUs.title = toTranslatable(rawData.whyChooseUs.title);
    rawData.whyChooseUs.subtitle = toTranslatable(rawData.whyChooseUs.subtitle);
    rawData.whyChooseUs.paragraph1 = toTranslatable(rawData.whyChooseUs.paragraph1);
    rawData.whyChooseUs.paragraph2 = toTranslatable(rawData.whyChooseUs.paragraph2);
  }
  if (Array.isArray(rawData.practiceAreas)) {
    rawData.practiceAreas = rawData.practiceAreas.map((area: any) => ({
      ...area,
      title: toTranslatable(area.title),
      description: toTranslatable(area.description),
      services: Array.isArray(area.services) ? area.services.map(toTranslatable) : [],
    }));
  }
  if (Array.isArray(rawData.team)) {
    rawData.team = rawData.team.map((member: any) => ({
      ...member,
      title: toTranslatable(member.title),
      bio: toTranslatable(member.bio),
    }));
  }
  if (!rawData.consultation) {
    rawData.consultation = { title: {}, intro: {}, steps: [], securityNote: {} };
  }
  rawData.consultation.title = toTranslatable(rawData.consultation.title);
  rawData.consultation.intro = toTranslatable(rawData.consultation.intro);
  rawData.consultation.securityNote = toTranslatable(rawData.consultation.securityNote);
  rawData.consultation.steps = Array.isArray(rawData.consultation.steps)
    ? rawData.consultation.steps.map((step: any) => ({
        title: toTranslatable(step.title),
        description: toTranslatable(step.description),
      }))
    : [];

  // Legal pages migration
  if (!rawData.legalPages) {
    rawData.legalPages = [];
  }
  rawData.legalPages = rawData.legalPages.map((page: any) => ({
    ...page,
    title: toTranslatable(page.title),
    content: toTranslatable(page.content),
    isActive: page.isActive ?? true,
  }));
}

export async function getCmsData(): Promise<CmsData> {
  try {
    if (isMockSupabase()) return defaultCmsData();

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', CMS_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    if (!data) return defaultCmsData();

    const rawData = data.value as any;

    // Migration for general.socials
    if (rawData.general && rawData.general.socials) {
      const s = rawData.general.socials;
      if (typeof s.facebook === 'string') {
        rawData.general.socials = {
          facebook: { url: s.facebook, enabled: !!s.facebook },
          twitter: { url: s.twitter, enabled: !!s.twitter },
          linkedin: { url: s.linkedin, enabled: !!s.linkedin },
          instagram: { url: '', enabled: false }
        };
      }
    }

    if (rawData.general && !rawData.general.mapEmbedUrl) {
      rawData.general.mapEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d192697.79327429182!2d28.871754029471182!3d41.0054958097034!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14caa7040068086b%3A0xe1ccfe98bc01b0d0!2zxLBzdGFuYnVs!5e0!3m2!1str!2str!4v1700000000000!5m2!1str!2str";
    }

    migrateTranslatableFields(rawData);

    return rawData as CmsData;
  } catch (error) {
    console.error('Error reading CMS data:', error);
    return defaultCmsData();
  }
}

export async function updateCmsData(newData: CmsData): Promise<{ success: boolean; message: string }> {
  try {
    const supabaseServer = await createServerSupabaseClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    const { error } = await supabaseServer.from('app_settings').upsert({
      key: CMS_SETTINGS_KEY,
      value: newData,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    if (error) {
      console.error('Error updating CMS data:', error);
      return { success: false, message: 'Veriler güncellenirken bir hata oluştu (yalnızca yönetici/master düzenleyebilir).' };
    }
    return { success: true, message: 'CMS verileri başarıyla güncellendi.' };
  } catch (error) {
    console.error('Error updating CMS data:', error);
    return { success: false, message: 'Veriler güncellenirken bir hata oluştu.' };
  }
}
