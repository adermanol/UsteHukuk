"use client"

import { CardElement, ElementType } from '../types'
import { Type, QrCode, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onAdd: (element: CardElement) => void;
  onSetBackground: (url: string) => void;
  currentBackground: string;
}

export function Toolbox({ onAdd, onSetBackground, currentBackground }: Props) {
  const handleAdd = (type: ElementType) => {
    const id = `el-${Date.now()}`
    
    let newEl: CardElement = {
      id,
      type,
      x: 100,
      y: 100,
      width: 150,
      height: type === 'text' ? 40 : 150,
      content: type === 'text' ? 'Yeni Metin' : type === 'qr' ? 'https://ustehukuk.com' : 'https://via.placeholder.com/150',
      style: {
        fontFamily: 'sans-serif',
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'left'
      }
    }

    onAdd(newEl)
  }

  const textures = [
    { name: 'Koyu Mat', url: '/textures/dark_matte_paper_1784243736352.png' },
    { name: 'Kraft (Doğal)', url: '/textures/kraft_paper_1784243728816.png' },
    { name: 'Sedef (Pearl)', url: '/textures/pearl_paper_1784243753308.png' },
    { name: 'Keten (Linen)', url: '/textures/white_linen_paper_1784243718443.png' }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Element Ekle</h4>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleAdd('text')}>
          <Type size={18} /> Metin Ekle
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleAdd('qr')}>
          <QrCode size={18} /> QR Kod Ekle
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kağıt Dokusu (Background)</h4>
        <Button 
          variant={currentBackground === '' ? 'default' : 'outline'} 
          className="w-full justify-start text-xs" 
          onClick={() => onSetBackground('')}
        >
          Düz Renk (Boş)
        </Button>
        {textures.map((t, idx) => (
          <Button 
            key={idx}
            variant={currentBackground === t.url ? 'default' : 'outline'} 
            className="w-full justify-start text-xs" 
            onClick={() => onSetBackground(t.url)}
          >
            {t.name}
          </Button>
        ))}
      </div>
    </div>
  )
}
