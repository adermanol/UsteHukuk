import { LLMProviderSelector, ThemeSelector, NavOrderSettings, MfaSettings, PasskeySettings, PasswordSettings } from '@/modules/admin-dashboard'
import { Settings, Palette, ListOrdered, ShieldCheck, Fingerprint, KeyRound } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-10 md:pl-[120px] min-h-screen text-foreground bg-transparent">
      <h1 className="text-3xl font-serif font-bold mb-4 flex items-center gap-3">
        <span className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]"><Settings size={22} strokeWidth={1.5} /></span>
        Sistem Ayarları
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-lg">
        Yapay zeka sağlayıcısını ve görünüm temasını yönetin.
      </p>

      <div className="max-w-3xl space-y-10">
        <section>
          <h2 className="font-serif text-xl text-foreground mb-1">Yapay Zekâ Sağlayıcısı</h2>
          <p className="text-sm text-muted-foreground mb-4">LM Studio seçildiğinde tüm istekler bilgisayarınızda çalışan yerel modele gider — veri dışarı çıkmaz.</p>
          <LLMProviderSelector />
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mb-1 flex items-center gap-2"><Palette size={18} className="text-[var(--primary)]" /> Görünüm</h2>
          <p className="text-sm text-muted-foreground mb-4">Tarayıcınız için hemen değiştirin veya büro geneli varsayılanı belirleyin.</p>
          <ThemeSelector />
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mb-1 flex items-center gap-2"><KeyRound size={18} className="text-[var(--primary)]" /> Şifre</h2>
          <p className="text-sm text-muted-foreground mb-4">Hesabınızın şifresini değiştirin.</p>
          <PasswordSettings />
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mb-1 flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--primary)]" /> İki Adımlı Doğrulama</h2>
          <p className="text-sm text-muted-foreground mb-4">Hesabınıza ek bir güvenlik katmanı ekleyin — etkinleştirdikten sonra girişte parolaya ek olarak bir kimlik doğrulayıcı kodu istenir.</p>
          <MfaSettings />
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mb-1 flex items-center gap-2"><Fingerprint size={18} className="text-[var(--primary)]" /> Passkey (Parmak İzi / Face ID)</h2>
          <p className="text-sm text-muted-foreground mb-4">Bu cihazın kendi kimlik doğrulama donanımıyla parolasız giriş yapın — girişte "Passkey ile Giriş Yap" seçeneği olarak görünür.</p>
          <PasskeySettings />
        </section>

        <section>
          <h2 className="font-serif text-xl text-foreground mb-1 flex items-center gap-2"><ListOrdered size={18} className="text-[var(--primary)]" /> Menü Sıralaması</h2>
          <p className="text-sm text-muted-foreground mb-4">Sol menüdeki (masaüstü) ve alt sekme çubuğundaki (mobil) ana bölümlerin sırasını kendi hesabınız için değiştirin — mobilde ilk 4 öğe sekme olarak, kalanı "Daha Fazla" içinde görünür.</p>
          <NavOrderSettings />
        </section>
      </div>
    </div>
  )
}
