"use client"

import { useState } from 'react'
import { CardElement } from '../types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Trash2, Type } from 'lucide-react'

interface Props {
  selectedElement?: CardElement;
  onUpdate: (props: Partial<CardElement>) => void;
  onDelete: () => void;
}

export function PropertiesPanel({ selectedElement, onUpdate, onDelete }: Props) {
  const [localFonts, setLocalFonts] = useState<string[]>([])
  
  if (!selectedElement) {
    return <div className="text-sm text-muted-foreground">Tuvalden bir öğe seçin.</div>
  }

  const loadLocalFonts = async () => {
    try {
      if ('queryLocalFonts' in window) {
        // @ts-ignore
        const fonts = await window.queryLocalFonts();
        const fontNames = Array.from(new Set(fonts.map((f: any) => f.family))) as string[];
        setLocalFonts(fontNames.sort());
      } else {
        alert("Tarayıcınız yerel font API'sini desteklemiyor. (Sadece Chromium tabanlı tarayıcılarda çalışır).");
      }
    } catch (err) {
      console.error(err);
      alert("Fontlara erişim izni reddedildi veya bir hata oluştu.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* İçerik Düzenleme (Metin veya Link) */}
      <div className="space-y-2">
        <Label>{selectedElement.type === 'qr' ? 'QR Link/İçerik' : selectedElement.type === 'image' ? 'Resim URL' : 'Metin'}</Label>
        <Input 
          value={selectedElement.content} 
          onChange={(e) => onUpdate({ content: e.target.value })} 
        />
      </div>

      {/* Font Ayarları (Sadece Metin) */}
      {selectedElement.type === 'text' && (
        <>
          <div className="space-y-2">
            <Label>Font (Yazı Tipi)</Label>
            <div className="flex gap-2">
              {localFonts.length > 0 ? (
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedElement.style.fontFamily || 'sans-serif'}
                  onChange={(e) => onUpdate({ style: { ...selectedElement.style, fontFamily: e.target.value } })}
                >
                  <option value="sans-serif">Varsayılan (Sans-serif)</option>
                  <option value="serif">Varsayılan (Serif)</option>
                  <option value="monospace">Monospace</option>
                  {localFonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                  ))}
                </select>
              ) : (
                <Input 
                  placeholder="Arial, Times New Roman..."
                  value={selectedElement.style.fontFamily || 'sans-serif'} 
                  onChange={(e) => onUpdate({ style: { ...selectedElement.style, fontFamily: e.target.value } })} 
                />
              )}
            </div>
            {localFonts.length === 0 && (
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={loadLocalFonts}>
                <Type size={14} className="mr-2" /> Bilgisayardaki Fontları Yükle
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Yazı Boyutu (px)</Label>
            <Input 
              type="number" 
              value={selectedElement.style.fontSize || 16} 
              onChange={(e) => onUpdate({ style: { ...selectedElement.style, fontSize: Number(e.target.value) } })} 
            />
          </div>
        </>
      )}

      {/* Renk */}
      {selectedElement.type !== 'image' && (
        <div className="space-y-2">
          <Label>Renk (Hex)</Label>
          <div className="flex gap-2">
            <input 
              type="color" 
              value={selectedElement.style.color || '#ffffff'}
              onChange={(e) => onUpdate({ style: { ...selectedElement.style, color: e.target.value } })}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <Input 
              value={selectedElement.style.color || '#ffffff'} 
              onChange={(e) => onUpdate({ style: { ...selectedElement.style, color: e.target.value } })} 
            />
          </div>
        </div>
      )}

      {/* Sil Butonu ve Ortak Ayarlar */}
      <div className="mt-8 pt-4 border-t border-border space-y-4">
        
        {/* Arka Plan Özel Ayarları (Move & Scale) */}
        {selectedElement.id.includes('bg') && (
          <>
            <div className="space-y-2">
              <Label>Yatay Pozisyon (X)</Label>
              <div className="flex gap-2 items-center">
                <input type="range" min="-800" max="800" value={selectedElement.x} onChange={(e) => onUpdate({ x: Number(e.target.value) })} className="flex-1" />
                <span className="text-xs w-8 text-right">{selectedElement.x}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dikey Pozisyon (Y)</Label>
              <div className="flex gap-2 items-center">
                <input type="range" min="-800" max="800" value={selectedElement.y} onChange={(e) => onUpdate({ y: Number(e.target.value) })} className="flex-1" />
                <span className="text-xs w-8 text-right">{selectedElement.y}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ölçek (Scale)</Label>
              <div className="flex gap-2 items-center">
                <input type="range" min="0.1" max="5.0" step="0.1" value={selectedElement.style.scale || 1} onChange={(e) => onUpdate({ style: { ...selectedElement.style, scale: Number(e.target.value) } })} className="flex-1" />
                <span className="text-xs w-8 text-right">{selectedElement.style.scale || 1}x</span>
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Döndürme Açısı (Derece)</Label>
          <div className="flex gap-2 items-center">
            <input 
              type="range" 
              min="0" 
              max="360" 
              value={selectedElement.style.rotation || 0} 
              onChange={(e) => onUpdate({ style: { ...selectedElement.style, rotation: Number(e.target.value) } })}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right">{selectedElement.style.rotation || 0}°</span>
          </div>
        </div>

        <Button variant="destructive" className="w-full gap-2" onClick={onDelete}>
          <Trash2 size={18} /> Öğeyi Sil
        </Button>
      </div>
    </div>
  )
}
