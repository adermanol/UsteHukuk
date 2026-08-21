"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Cookie } from 'lucide-react'
import { COOKIE_CONSENT_KEY } from '@/lib/cookieConsent'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export function CookieBanner() {
  const { dict, dir } = useLocale();
  const t = dict.cookieBanner;
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay for a smoother UX
      const timer = setTimeout(() => setIsVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: true, timestamp: new Date().toISOString() }))
    setIsVisible(false)
  }

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: false, timestamp: new Date().toISOString() }))
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div dir={dir} className="fixed bottom-0 left-0 right-0 z-[9999] animate-in slide-in-from-bottom duration-500">
      <div className="bg-[var(--background)]/95 backdrop-blur-xl border-t border-border shadow-2xl shadow-black/50">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-8 md:py-5">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p>
                  {t.message}{' '}
                  <Link
                    href="/hukuki/cerez-politikasi"
                    className="text-[var(--primary)] hover:underline font-medium"
                  >
                    {t.policyLinkLabel}
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
              <button
                onClick={handleReject}
                className="flex-1 md:flex-initial text-sm px-5 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border transition-all"
              >
                {t.reject}
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 md:flex-initial text-sm px-5 py-2.5 rounded-lg bg-[var(--primary)] text-black font-semibold hover:bg-[var(--primary)]/90 transition-all"
              >
                {t.accept}
              </button>
              <button
                onClick={handleReject}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors md:hidden"
                aria-label={t.closeAriaLabel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
