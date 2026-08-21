"use client"

import { useState, useEffect } from 'react'
import { getCmsData, updateCmsData, CmsData } from '@/lib/cms'
import { Translatable, LOCALES } from '@/lib/i18n/locales'
import { Save, Plus, Trash2, Star, FileText, ExternalLink } from 'lucide-react'
import { ImageDropzone } from '@/components/ui/image-dropzone'
import { TranslatableField } from '@/components/ui/TranslatableField'
import { CollapsibleSection, CollapsibleItem } from '@/components/ui/CollapsibleSection'

function emptyTranslatable(tr = '', en = ''): Translatable {
  const result = {} as Translatable;
  for (const l of LOCALES) result[l] = l === 'tr' ? tr : l === 'en' ? en : '';
  return result;
}

export default function CMSPanel() {
  const [data, setData] = useState<CmsData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getCmsData().then(res => setData(res))
  }, [])

  const handleSave = async () => {
    if (!data) return
    setIsSaving(true)
    setMessage('Kaydediliyor...')
    const result = await updateCmsData(data)
    setMessage(result.message)
    setIsSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (!data) return <div className="p-8 text-foreground">Yükleniyor...</div>

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:pl-[32px] text-foreground">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-serif font-bold text-foreground">İçerik Yönetimi (CMS)</h1>
        <div className="flex items-center gap-4">
          {message && <span className="text-emerald-400 text-sm font-medium">{message}</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--background)] px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <CollapsibleSection title="Genel Ayarlar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Logo Metni</label>
              <input
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)]"
                value={data.general.logoText}
                onChange={e => setData({...data, general: {...data.general, logoText: e.target.value}})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Telefon</label>
              <input
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)]"
                value={data.general.phone}
                onChange={e => setData({...data, general: {...data.general, phone: e.target.value}})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">E-posta</label>
              <input
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)]"
                value={data.general.email}
                onChange={e => setData({...data, general: {...data.general, email: e.target.value}})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">WhatsApp Numarası</label>
              <input
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)]"
                value={data.general.whatsapp}
                onChange={e => setData({...data, general: {...data.general, whatsapp: e.target.value}})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Adres</label>
              <input
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)]"
                value={data.general.address}
                onChange={e => setData({...data, general: {...data.general, address: e.target.value}})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Google Haritalar Yerleştirme (Embed) URL</label>
              <input
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)] font-mono text-xs"
                placeholder="https://www.google.com/maps/embed?pb=..."
                value={data.general.mapEmbedUrl || ''}
                onChange={e => setData({...data, general: {...data.general, mapEmbedUrl: e.target.value}})}
              />
              <p className="text-xs text-muted-foreground mt-1">Google Maps'ten "Harita Yerleştir" diyerek aldığınız linkin sadece "src" içindeki kısmını kopyalayın.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-2">Ödeme Linki (POS)</label>
              <input
                className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-[var(--primary)] font-mono text-xs"
                placeholder="https://pos.mokaunited.com/..."
                value={data.general.paymentUrl || ''}
                onChange={e => setData({...data, general: {...data.general, paymentUrl: e.target.value}})}
              />
              <p className="text-xs text-muted-foreground mt-1">MokaUnited veya benzeri POS ödeme sayfası linki. Dolu ise sitede "Ödeme Yap" butonu görünür.</p>
            </div>
            <div className="md:col-span-2">
              <TranslatableField
                label="Footer Tanıtım Metni"
                value={data.general.footerTagline}
                onChange={next => setData({...data, general: {...data.general, footerTagline: next}})}
                multiline
              />
            </div>

            {/* Socials Settings */}
            <div className="md:col-span-2 pt-6 border-t border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">Sosyal Medya Bağlantıları</h3>
              <div className="space-y-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map(platform => {
                  const plat = platform as keyof typeof data.general.socials;
                  const social = data.general.socials[plat] || { url: '', enabled: false };
                  return (
                    <div key={platform} className="flex items-center gap-4 bg-muted p-4 rounded-xl border border-border">
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={social.enabled}
                          onChange={e => setData({
                            ...data,
                            general: {
                              ...data.general,
                              socials: {
                                ...data.general.socials,
                                [plat]: { ...social, enabled: e.target.checked }
                              }
                            }
                          })}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                      </label>
                      <div className="flex-1">
                        <input
                          className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-[var(--primary)]"
                          placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                          value={social.url}
                          onChange={e => setData({
                            ...data,
                            general: {
                              ...data.general,
                              socials: {
                                ...data.general.socials,
                                [plat]: { ...social, url: e.target.value }
                              }
                            }
                          })}
                          disabled={!social.enabled}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Hero Settings */}
        <CollapsibleSection title="Ana Sayfa Karşılama (Hero)">
          <div className="space-y-6">
            <TranslatableField
              label="Ana Başlık"
              value={data.hero.title}
              onChange={next => setData({...data, hero: {...data.hero, title: next}})}
            />
            <TranslatableField
              label="Üst Bilgi (Subtitle)"
              value={data.hero.subtitle}
              onChange={next => setData({...data, hero: {...data.hero, subtitle: next}})}
            />
          </div>
        </CollapsibleSection>

        {/* Why Choose Us Settings */}
        <CollapsibleSection title="Neden Bizi Seçmelisiniz">
          <div className="space-y-6">
            <TranslatableField
              label="Etiket Başlık"
              value={data.whyChooseUs.title}
              onChange={next => setData({...data, whyChooseUs: {...data.whyChooseUs, title: next}})}
            />
            <TranslatableField
              label="Alt Başlık"
              value={data.whyChooseUs.subtitle}
              onChange={next => setData({...data, whyChooseUs: {...data.whyChooseUs, subtitle: next}})}
            />
            <TranslatableField
              label="Paragraf 1"
              value={data.whyChooseUs.paragraph1}
              onChange={next => setData({...data, whyChooseUs: {...data.whyChooseUs, paragraph1: next}})}
              multiline
            />
            <TranslatableField
              label="Paragraf 2"
              value={data.whyChooseUs.paragraph2}
              onChange={next => setData({...data, whyChooseUs: {...data.whyChooseUs, paragraph2: next}})}
              multiline
            />
          </div>
        </CollapsibleSection>

        {/* Practice Areas Settings */}
        <CollapsibleSection
          title="Uzmanlık Alanları"
          headerActions={
            <button
              onClick={() => setData({...data, practiceAreas: [...data.practiceAreas, {
                id: Date.now().toString(),
                title: emptyTranslatable('Yeni Alan', 'New Area'),
                description: emptyTranslatable(),
                services: [],
                icon: 'Scale',
              }]})}
              className="flex items-center gap-1 text-sm bg-accent hover:bg-accent px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Alan Ekle
            </button>
          }
        >
          <div className="space-y-4">
            {data.practiceAreas.map((area, index) => (
              <CollapsibleItem
                key={area.id}
                summary={area.title.tr || 'Yeni Alan'}
                headerActions={
                  <button
                    onClick={() => {
                      const next = [...data.practiceAreas];
                      next.splice(index, 1);
                      setData({...data, practiceAreas: next});
                    }}
                    className="min-w-9 min-h-9 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                }
              >
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">İkon (lucide-react adı: Scale, Briefcase, Users, FileText, Gavel, Shield)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
                    value={area.icon}
                    onChange={e => {
                      const next = [...data.practiceAreas];
                      next[index] = { ...next[index], icon: e.target.value };
                      setData({...data, practiceAreas: next});
                    }}
                  />
                </div>
                <TranslatableField
                  label="Başlık"
                  value={area.title}
                  onChange={val => {
                    const next = [...data.practiceAreas];
                    next[index] = { ...next[index], title: val };
                    setData({...data, practiceAreas: next});
                  }}
                />
                <TranslatableField
                  label="Açıklama"
                  value={area.description}
                  onChange={val => {
                    const next = [...data.practiceAreas];
                    next[index] = { ...next[index], description: val };
                    setData({...data, practiceAreas: next});
                  }}
                  multiline
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-muted-foreground">Hizmet Kapsamı (madde madde)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...data.practiceAreas];
                        next[index] = { ...next[index], services: [...next[index].services, emptyTranslatable()] };
                        setData({...data, practiceAreas: next});
                      }}
                      className="flex items-center gap-1 text-xs bg-accent hover:bg-accent px-2 py-1 rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Madde Ekle
                    </button>
                  </div>
                  <div className="space-y-3">
                    {area.services.map((service, sIndex) => (
                      <div key={sIndex} className="flex items-start gap-2 bg-background p-3 rounded-lg border border-border">
                        <div className="flex-1">
                          <TranslatableField
                            label={`Madde ${sIndex + 1}`}
                            value={service}
                            onChange={val => {
                              const next = [...data.practiceAreas];
                              const services = [...next[index].services];
                              services[sIndex] = val;
                              next[index] = { ...next[index], services };
                              setData({...data, practiceAreas: next});
                            }}
                            multiline
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...data.practiceAreas];
                            const services = [...next[index].services];
                            services.splice(sIndex, 1);
                            next[index] = { ...next[index], services };
                            setData({...data, practiceAreas: next});
                          }}
                          className="text-red-400/70 hover:text-red-400 mt-6"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleItem>
            ))}
          </div>
        </CollapsibleSection>

        {/* Team Settings */}
        <CollapsibleSection
          title="Avukat Kadrosu"
          headerActions={
            <button
              onClick={() => setData({...data, team: [...data.team, {
                id: Date.now().toString(),
                name: 'Yeni Avukat',
                title: emptyTranslatable(),
                bio: emptyTranslatable(),
                imageUrl: 'https://i.pravatar.cc/300',
                socials: {},
              }]})}
              className="flex items-center gap-1 text-sm bg-accent hover:bg-accent px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Kişi Ekle
            </button>
          }
        >
          <div className="space-y-4">
            {data.team.map((member, index) => (
              <CollapsibleItem
                key={member.id}
                summary={member.name || 'Yeni Avukat'}
                headerActions={
                  <button
                    onClick={() => {
                      const newTeam = [...data.team];
                      newTeam.splice(index, 1);
                      setData({...data, team: newTeam});
                    }}
                    className="min-w-9 min-h-9 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                }
              >
                <button
                  onClick={() => {
                    const newTeam = [...data.team];
                    newTeam[index].isStarred = !newTeam[index].isStarred;
                    setData({...data, team: newTeam});
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    member.isStarred
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-accent border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Star className={`w-4 h-4 ${member.isStarred ? 'fill-amber-400' : ''}`} />
                  {member.isStarred ? 'Ana Avukat (Hero)' : 'Normal Görünüm'}
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">İsim Soyisim</label>
                    <input
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
                      value={member.name}
                      onChange={e => {
                        const newTeam = [...data.team];
                        newTeam[index].name = e.target.value;
                        setData({...data, team: newTeam});
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <TranslatableField
                      label="Ünvan"
                      value={member.title}
                      onChange={val => {
                        const newTeam = [...data.team];
                        newTeam[index] = { ...newTeam[index], title: val };
                        setData({...data, team: newTeam});
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <TranslatableField
                      label="Özgeçmiş (Bio)"
                      value={member.bio}
                      onChange={val => {
                        const newTeam = [...data.team];
                        newTeam[index] = { ...newTeam[index], bio: val };
                        setData({...data, team: newTeam});
                      }}
                      multiline
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Profil Fotoğrafı</label>
                    <ImageDropzone
                      value={member.imageUrl}
                      onChange={(url) => {
                        const newTeam = [...data.team];
                        newTeam[index].imageUrl = url;
                        setData({...data, team: newTeam});
                      }}
                    />
                  </div>
                </div>
              </CollapsibleItem>
            ))}
          </div>
        </CollapsibleSection>

        {/* Online Consultation Settings */}
        <CollapsibleSection title="Online Danışma Bölümü">
          <div className="space-y-6">
            <TranslatableField
              label="Bölüm Başlığı"
              value={data.consultation.title}
              onChange={next => setData({...data, consultation: {...data.consultation, title: next}})}
            />
            <TranslatableField
              label="Giriş Metni"
              value={data.consultation.intro}
              onChange={next => setData({...data, consultation: {...data.consultation, intro: next}})}
              multiline
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-muted-foreground">Süreç Adımları</label>
                <button
                  type="button"
                  onClick={() => setData({...data, consultation: {...data.consultation, steps: [...data.consultation.steps, { title: emptyTranslatable(), description: emptyTranslatable() }]}})}
                  className="flex items-center gap-1 text-xs bg-accent hover:bg-accent px-2 py-1 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" /> Adım Ekle
                </button>
              </div>
              <div className="space-y-3">
                {data.consultation.steps.map((step, sIndex) => (
                  <CollapsibleItem
                    key={sIndex}
                    summary={`Adım ${sIndex + 1}${step.title.tr ? ` — ${step.title.tr}` : ''}`}
                    headerActions={
                      <button
                        type="button"
                        onClick={() => {
                          const steps = [...data.consultation.steps];
                          steps.splice(sIndex, 1);
                          setData({...data, consultation: {...data.consultation, steps}});
                        }}
                        className="min-w-9 min-h-9 flex items-center justify-center text-red-400/70 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    }
                  >
                    <TranslatableField
                      label="Başlık"
                      value={step.title}
                      onChange={val => {
                        const steps = [...data.consultation.steps];
                        steps[sIndex] = { ...steps[sIndex], title: val };
                        setData({...data, consultation: {...data.consultation, steps}});
                      }}
                    />
                    <TranslatableField
                      label="Açıklama"
                      value={step.description}
                      onChange={val => {
                        const steps = [...data.consultation.steps];
                        steps[sIndex] = { ...steps[sIndex], description: val };
                        setData({...data, consultation: {...data.consultation, steps}});
                      }}
                      multiline
                    />
                  </CollapsibleItem>
                ))}
              </div>
            </div>

            <TranslatableField
              label="Güvenlik/Gizlilik Notu"
              value={data.consultation.securityNote}
              onChange={next => setData({...data, consultation: {...data.consultation, securityNote: next}})}
              multiline
            />
          </div>
        </CollapsibleSection>

        {/* Legal Pages Settings */}
        <CollapsibleSection
          title="Hukuki Metinler"
          icon={<FileText className="w-5 h-5" />}
          headerActions={
            <button
              onClick={() => setData({...data, legalPages: [...data.legalPages, {
                slug: `sayfa-${Date.now()}`,
                title: emptyTranslatable('Yeni Hukuki Metin', 'New Legal Page'),
                content: emptyTranslatable(),
                isActive: true,
              }]})}
              className="flex items-center gap-1 text-sm bg-accent hover:bg-accent px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Sayfa Ekle
            </button>
          }
        >
          <div className="space-y-4">
            {data.legalPages.map((page, index) => (
              <CollapsibleItem
                key={page.slug + index}
                summary={
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${page.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                    {page.title.tr || page.slug}
                  </span>
                }
                headerActions={
                  <div className="flex items-center gap-2">
                    <a
                      href={`/hukuki/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-[var(--primary)] flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => {
                        const next = [...data.legalPages];
                        next.splice(index, 1);
                        setData({...data, legalPages: next});
                      }}
                      className="min-w-9 min-h-9 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                }
              >
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={page.isActive}
                      onChange={e => {
                        const next = [...data.legalPages];
                        next[index] = { ...next[index], isActive: e.target.checked };
                        setData({...data, legalPages: next});
                      }}
                    />
                    <div className="w-11 h-6 bg-background peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                  <span className={`text-sm font-medium ${page.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {page.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">URL Slug</label>
                  <input
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-mono"
                    value={page.slug}
                    onChange={e => {
                      const next = [...data.legalPages];
                      next[index] = { ...next[index], slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') };
                      setData({...data, legalPages: next});
                    }}
                  />
                </div>

                <TranslatableField
                  label="Sayfa Başlığı"
                  value={page.title}
                  onChange={val => {
                    const next = [...data.legalPages];
                    next[index] = { ...next[index], title: val };
                    setData({...data, legalPages: next});
                  }}
                />
                <TranslatableField
                  label="İçerik"
                  value={page.content}
                  onChange={val => {
                    const next = [...data.legalPages];
                    next[index] = { ...next[index], content: val };
                    setData({...data, legalPages: next});
                  }}
                  multiline
                />
              </CollapsibleItem>
            ))}
          </div>
        </CollapsibleSection>

      </div>
    </div>
  )
}
