"use client"

import { useState } from 'react'
import { Scale, Briefcase, Users, FileText, Gavel, Shield, Home, Rocket, Globe, Plane, Cpu, ShieldAlert } from 'lucide-react'
import { CmsData } from '@/lib/cms'
import { pick } from '@/lib/i18n/locales'
import { useLocale } from '@/lib/i18n/LocaleProvider'

const iconMap: Record<string, React.ReactNode> = {
  Scale: <Scale className="w-8 h-8" />,
  Briefcase: <Briefcase className="w-8 h-8" />,
  Users: <Users className="w-8 h-8" />,
  FileText: <FileText className="w-8 h-8" />,
  Gavel: <Gavel className="w-8 h-8" />,
  Shield: <Shield className="w-8 h-8" />,
  Home: <Home className="w-8 h-8" />,
  Rocket: <Rocket className="w-8 h-8" />,
  Globe: <Globe className="w-8 h-8" />,
  Plane: <Plane className="w-8 h-8" />,
  Cpu: <Cpu className="w-8 h-8" />,
  ShieldAlert: <ShieldAlert className="w-8 h-8" />,
}

export function PracticeAreasTabs({ areas }: { areas: CmsData['practiceAreas'] }) {
  const [activeTab, setActiveTab] = useState(areas[0]?.id || '')
  const { locale, dict } = useLocale();

  if (!areas || areas.length === 0) return null;

  return (
    <div className="bg-[var(--background)] py-16 px-5 md:py-24 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-[var(--primary)] uppercase tracking-[0.2em] text-xs font-bold mb-4">{dict.practiceAreas.eyebrow}</h3>
          <h2 className="font-serif text-3xl md:text-5xl text-foreground">{dict.practiceAreas.heading}</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          {/* Tabs Menu — mobilde doğal sayfa akışında serbestçe uzar (iç içe
              kaydırma tuzağı olmasın diye); yalnızca md: ve üstünde, içerikle
              yan yana dururken kendi iç kaydırmasına sahip olur. */}
          <div className="flex flex-col gap-2 md:w-1/3 border-s border-border md:max-h-[720px] md:overflow-y-auto pe-2">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => setActiveTab(area.id)}
                className={`text-start px-8 py-5 transition-all font-medium border-s-2 -ms-[1px] ${
                  activeTab === area.id
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {pick(area.title, locale)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="md:w-2/3">
            {areas.map((area) => (
              <div
                key={area.id}
                className={`transition-all duration-500 ${activeTab === area.id ? 'opacity-100 block' : 'opacity-0 hidden'}`}
              >
                <div className="text-[var(--primary)] mb-6">
                  {iconMap[area.icon] || <Scale className="w-8 h-8" />}
                </div>
                <h3 className="font-serif text-3xl text-foreground mb-6">{pick(area.title, locale)}</h3>
                <p className="text-muted-foreground leading-relaxed text-lg mb-8">
                  {pick(area.description, locale)}
                </p>
                {area.services?.length > 0 && (
                  <ul className="space-y-3 mb-8">
                    {area.services.map((service, i) => {
                      const text = pick(service, locale);
                      if (!text) return null;
                      return (
                        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                          <span>{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <a
                  href="#danisma"
                  className="inline-block border border-[var(--primary)] text-[var(--primary)] px-8 py-3 hover:bg-[var(--primary)] hover:text-black transition-colors font-medium text-sm tracking-wider"
                >
                  {dict.practiceAreas.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
