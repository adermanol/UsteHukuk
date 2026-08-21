"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase, isMockSupabase } from '@/core/database/supabase'
import { checkConflictOfInterest } from '../services/conflictCheck'
import { PRACTICE_AREA_TAXONOMY } from '@/modules/practice-areas'

export function IntakeForm() {
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    phone: '',
    practiceAreaId: PRACTICE_AREA_TAXONOMY[0].id,
    opposingParty: '',
    caseDescription: ''
  })
  const [conflictStatus, setConflictStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isMockSupabase()) {
      setConflictStatus('Supabase yapılandırılmadı: başvuru kaydedilemedi. Lütfen .env.local dosyasına Supabase bilgilerini ekleyin.')
      setLoading(false)
      return
    }

    // Çıkar çatışması kontrolü
    if (formData.opposingParty) {
      const result = await checkConflictOfInterest(formData.opposingParty)
      if (result.hasConflict) {
        setConflictStatus(`UYARI: ${result.details}`)
        setLoading(false)
        return
      }
    }

    setConflictStatus('Kontrol başarılı, çıkar çatışması bulunamadı. Talep kaydediliyor...')

    try {
      const area = PRACTICE_AREA_TAXONOMY.find(a => a.id === formData.practiceAreaId);
      const { error } = await supabase.from('clients').insert({
        full_name: formData.clientName,
        email: formData.email || null,
        phone: formData.phone || null,
        practice_area_id: formData.practiceAreaId,
        case_type: area?.labelTr ?? formData.practiceAreaId,
        details: `Karşı Taraf: ${formData.opposingParty}\nÖzet: ${formData.caseDescription}`
      })
      if (error) throw error;
      setConflictStatus('Başvuru başarıyla veritabanına kaydedildi.')
      setFormData({ clientName: '', email: '', phone: '', practiceAreaId: PRACTICE_AREA_TAXONOMY[0].id, opposingParty: '', caseDescription: '' })
    } catch (error) {
      console.error("Kayıt hatası:", error);
      setConflictStatus('Kayıt sırasında veritabanı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Yeni Başvuru (Intake)</CardTitle>
        <CardDescription>Lütfen müvekkil adayı ve karşı taraf bilgilerini girin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Müvekkil Adayı Adı</Label>
            <Input
              id="clientName"
              placeholder="Örn. Ahmet Yılmaz"
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@eposta.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="05xx xxx xx xx"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="caseType">Hukuki Alan</Label>
            <select
              id="caseType"
              value={formData.practiceAreaId}
              onChange={(e) => setFormData({...formData, practiceAreaId: e.target.value})}
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            >
              {PRACTICE_AREA_TAXONOMY.map(area => (
                <option key={area.id} value={area.id} className="bg-background text-foreground">{area.labelTr}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="opposingParty">Karşı Taraf (Çıkar Çatışması Kontrolü)</Label>
            <Input 
              id="opposingParty" 
              placeholder="Örn. Örnek Rakip A.Ş."
              value={formData.opposingParty}
              onChange={(e) => setFormData({...formData, opposingParty: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caseDescription">Konu Özeti</Label>
            <Textarea 
              id="caseDescription" 
              placeholder="Hukuki uyuşmazlık hakkında kısa bilgi..."
              value={formData.caseDescription}
              onChange={(e) => setFormData({...formData, caseDescription: e.target.value})}
            />
          </div>
          <Button type="submit" className="w-full">Başvuruyu Kaydet ve Kontrol Et</Button>
        </form>
      </CardContent>
      {conflictStatus && (
        <CardFooter>
          <div className={`text-sm ${conflictStatus.includes('UYARI') ? 'text-red-500 font-semibold' : 'text-green-500'}`}>
            {conflictStatus}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
