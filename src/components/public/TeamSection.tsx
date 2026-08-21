"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CmsData } from '@/lib/cms'
import { pick } from '@/lib/i18n/locales'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export function TeamSection({ team }: { team: CmsData['team'] }) {
  const [selectedMember, setSelectedMember] = useState<CmsData['team'][0] | null>(null)
  const { locale, dict } = useLocale();

  if (!team || team.length === 0) return null;

  // Split team into heroes (starred) and others
  let heroes = team.filter(m => m.isStarred);
  let others = team.filter(m => !m.isStarred);
  
  // If no one is starred, optionally fallback to making the first one hero, or keep them all in grid. 
  // Let's keep them all in grid if no one is starred, as requested (only if starred -> hero).
  // But wait, if they have only 1 lawyer, maybe make it hero automatically?
  if (team.length === 1 && heroes.length === 0) {
    heroes = team;
    others = [];
  }

  return (
    <div className="bg-[var(--secondary)] py-16 px-5 md:py-24 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h3 className="text-[var(--primary)] uppercase tracking-[0.2em] text-xs font-bold mb-4">{dict.team.eyebrow}</h3>
          <h2 className="font-serif text-3xl md:text-5xl text-foreground">{dict.team.heading}</h2>
        </div>

        {/* Heroes (Starred) */}
        <div className="space-y-24 mb-24">
          {heroes.map(hero => (
            <div key={hero.id} className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2 relative h-[360px] md:h-[600px] w-full">
                <Image 
                  src={hero.imageUrl} 
                  alt={hero.name} 
                  fill 
                  className="object-cover rounded-xl"
                />
              </div>
              <div className="md:w-1/2">
                <h3 className="font-serif text-4xl text-foreground mb-2">{hero.name}</h3>
                <p className="text-[var(--primary)] font-medium tracking-wider text-sm mb-6 uppercase">{pick(hero.title, locale)}</p>
                <div className="w-12 h-px bg-[var(--primary)] mb-8"></div>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  {pick(hero.bio, locale)}
                </p>
                <div className="flex gap-4">
                  {hero.socials?.linkedin && (
                    <Link href={hero.socials.linkedin} className="text-foreground hover:text-[var(--primary)]">LinkedIn</Link>
                  )}
                  {hero.socials?.twitter && (
                    <Link href={hero.socials.twitter} className="text-foreground hover:text-[var(--primary)]">Twitter</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Others (Non-Starred) Grid */}
        {others.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {others.map((member) => (
              <div 
                key={member.id} 
                className="group relative h-[450px] w-full overflow-hidden cursor-pointer"
                onClick={() => setSelectedMember(member)}
              >
                <Image 
                  src={member.imageUrl} 
                  alt={member.name} 
                  fill 
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute bottom-0 start-0 w-full p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="font-serif text-2xl text-white mb-1">{member.name}</h3>
                  <p className="text-[var(--primary)] text-xs font-bold tracking-widest uppercase">{pick(member.title, locale)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attorney Detail Modal — uzun biyografili bir üyede içerik ekran
            boyunu aşarsa kaydırılabilir kalsın diye hem dış sarmalayıcı hem
            iç kart kendi max-h/overflow'una sahip. */}
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedMember(null)}>
            <div className="bg-[var(--background)] max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-2 end-2 p-2 text-muted-foreground hover:text-foreground z-10"
                aria-label="Kapat"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className="md:w-2/5 relative h-[300px] md:h-auto">
                <Image 
                  src={selectedMember.imageUrl} 
                  alt={selectedMember.name} 
                  fill 
                  className="object-cover"
                />
              </div>
              <div className="md:w-3/5 p-10 md:p-16">
                <h3 className="font-serif text-4xl text-foreground mb-2">{selectedMember.name}</h3>
                <p className="text-[var(--primary)] font-medium tracking-wider text-sm mb-6 uppercase">{pick(selectedMember.title, locale)}</p>
                <div className="w-12 h-px bg-[var(--primary)] mb-8"></div>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  {pick(selectedMember.bio, locale)}
                </p>
                <div className="flex gap-6">
                  {selectedMember.socials.linkedin && (
                    <Link href={selectedMember.socials.linkedin} className="text-sm font-bold tracking-widest uppercase text-foreground hover:text-[var(--primary)]">LinkedIn</Link>
                  )}
                  {selectedMember.socials.twitter && (
                    <Link href={selectedMember.socials.twitter} className="text-sm font-bold tracking-widest uppercase text-foreground hover:text-[var(--primary)]">Twitter</Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
