"use client"

import { useState } from 'react'
import { UploadCloud, Loader2, FileCheck2, CheckCircle2, ImagePlus } from 'lucide-react'
import Image from 'next/image'
import { isMockSupabase } from '@/core/database/supabase'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { CONSULTATION_AREA_IDS } from '@/modules/practice-areas'

const CHANNEL_IDS = ['zoom_teams', 'encrypted_call'] as const;
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];

export function ConsultationRequestForm() {
  const { dict, dir } = useLocale();
  const f = dict.consultationForm;

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [practiceAreaId, setPracticeAreaId] = useState<typeof CONSULTATION_AREA_IDS[number]>(CONSULTATION_AREA_IDS[0])
  const [summary, setSummary] = useState('')
  const [channel, setChannel] = useState<typeof CHANNEL_IDS[number]>('zoom_teams')
  const [consent1, setConsent1] = useState(false)
  const [consent2, setConsent2] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const channelLabel = (id: typeof CHANNEL_IDS[number]) => id === 'zoom_teams' ? f.channels.zoomTeams : f.channels.encryptedCall;

  const handleFile = async (selected: File) => {
    setError(null);
    const ext = '.' + selected.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setError(f.errorUnsupportedFile);
      return;
    }
    setFile(selected);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selected);
      formData.append('kind', 'consultation-attachment');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed');
      setAttachmentUrl(json.url);
    } catch (err) {
      console.error(err);
      setError(f.errorUploadFailed);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!consent1 || !consent2) {
      setError(f.errorConsentRequired);
      return;
    }

    if (isMockSupabase()) {
      setError(f.errorNotConfigured);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/consultation-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          practiceAreaId,
          caseType: f.legalAreas[practiceAreaId],
          details: summary,
          preferredChannel: channel,
          attachmentUrl,
          imageUrl,
          consent1,
          consent2,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Talep gönderilemedi.');
      setSuccess(true);
    } catch (err) {
      console.error('Consultation request error:', err);
      const detail = err instanceof Error && err.message ? ` (${err.message})` : '';
      setError(f.errorGeneric + detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="font-serif text-2xl text-white mb-2">{f.successTitle}</h3>
        <p className="text-white/60 text-sm">{f.successText}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} dir={dir} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-8 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">{f.fullName}</label>
          <input
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1.5">{f.phone}</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">{f.email}</label>
        <input
          required
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">{f.legalArea}</label>
        <select
          value={practiceAreaId}
          onChange={e => setPracticeAreaId(e.target.value as typeof CONSULTATION_AREA_IDS[number])}
          className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[var(--primary)]"
        >
          {CONSULTATION_AREA_IDS.map(id => (
            <option key={id} value={id}>{f.legalAreas[id]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">{f.summaryLabel}</label>
        <textarea
          required
          value={summary}
          onChange={e => setSummary(e.target.value)}
          className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-2.5 text-white h-28 focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">{f.attachLabel}</label>
        <label className="flex items-center gap-3 border border-dashed border-white/15 hover:border-[var(--primary)]/40 rounded-lg px-4 py-3 cursor-pointer bg-white/5 transition-colors">
          <input
            type="file"
            className="hidden"
            accept={ALLOWED_EXT.join(',')}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
          ) : attachmentUrl ? (
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <UploadCloud className="w-5 h-5 text-white/60" />
          )}
          <span className="text-sm text-white/60">{file ? file.name : f.chooseFile}</span>
        </label>
      </div>

      {/* Image Dropzone */}
      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          {f.imageUploadLabel}
        </label>
        <label
          className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
            imageUrl ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/15 hover:border-[var(--primary)]/40 bg-white/5'
          }`}
        >
          <input
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.heic"
            onChange={async (e) => {
              const selected = e.target.files?.[0];
              if (!selected) return;
              if (!selected.type.startsWith('image/')) {
                setError(f.errorInvalidImage);
                return;
              }
              setIsUploadingImage(true);
              setError(null);
              try {
                const formData = new FormData();
                formData.append('file', selected);
                formData.append('kind', 'consultation-attachment');
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const json = await res.json();
                if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed');
                setImageUrl(json.url);
              } catch {
                setError(f.errorImageUploadFailed);
              } finally {
                setIsUploadingImage(false);
              }
            }}
            disabled={isUploadingImage}
          />
          {isUploadingImage ? (
            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
          ) : imageUrl ? (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden">
              <Image src={imageUrl} alt="Yüklenen görsel" fill className="object-cover" />
            </div>
          ) : (
            <ImagePlus className="w-8 h-8 text-white/60" />
          )}
          <span className="text-xs text-white/60">
            {imageUrl ? f.imageUploadedLabel : f.imageDropLabel}
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">{f.channelLabel}</label>
        <div className="flex flex-wrap gap-4">
          {CHANNEL_IDS.map(id => (
            <label key={id} className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input
                type="radio"
                name="channel"
                checked={channel === id}
                onChange={() => setChannel(id)}
                className="accent-[var(--primary)]"
              />
              {channelLabel(id)}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-white/15">
        <label className="flex items-start gap-3 text-xs text-white/60 cursor-pointer">
          <input type="checkbox" checked={consent1} onChange={e => setConsent1(e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />
          {f.consent1}
        </label>
        <label className="flex items-start gap-3 text-xs text-white/60 cursor-pointer">
          <input type="checkbox" checked={consent2} onChange={e => setConsent2(e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />
          {f.consent2}
          {' '}
          <a href="/hukuki/online-danismanlik-aydinlatma" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{f.disclosureLink}</a>
          {' | '}
          <a href="/hukuki/online-danismanlik-sozlesmesi" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
            {f.consultationAgreementLink}
          </a>
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || isUploading || isUploadingImage}
        className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-black font-bold py-3.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {isSubmitting ? f.sending : f.submit}
      </button>
    </form>
  );
}
