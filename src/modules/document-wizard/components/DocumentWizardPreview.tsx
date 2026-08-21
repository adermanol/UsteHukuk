"use client"

import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'
import { DOCUMENT_TEMPLATES } from '../templates/registry'

export function DocumentWizardPreview() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Taraf bilgileri, yasal dayanaklar ve büro arşivinden alınan referanslarla saniyeler içinde belge oluşturun.
      </p>
      <ul className="space-y-1.5">
        {DOCUMENT_TEMPLATES.map(t => (
          <li key={t.id} className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText size={13} className="text-blue-400 shrink-0" />
            {t.label}
          </li>
        ))}
      </ul>
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90 transition-colors"
      >
        Sihirbazı Aç <ArrowRight size={15} />
      </Link>
    </div>
  );
}
