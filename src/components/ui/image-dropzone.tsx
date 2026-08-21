"use client"

import React, { useCallback, useState } from 'react'
import { UploadCloud, Loader2, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ImageDropzoneProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageDropzone({ value, onChange }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir görsel dosyası yükleyin.')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    // Bu paylaşılan bileşen yalnızca dashboard içi CMS/blog editöründe
    // kullanılıyor (takım fotoğrafı, blog kapak görseli) — kamuya açık
    // olması amaçlanan varlıklar, oturum gerektirir.
    formData.append('kind', 'cms-public')

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (data.url) {
        onChange(data.url)
      } else {
        alert('Yükleme başarısız oldu.')
      }
    } catch (err) {
      console.error(err)
      alert('Yükleme sırasında hata oluştu.')
    } finally {
      setIsUploading(false)
    }
  }

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFile(e.dataTransfer.files[0])
    }
  }, [onChange])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-4">
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden ${
          isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-border bg-muted'
        }`}
      >
        <input 
          type="file" 
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={onFileChange}
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm font-medium">Yükleniyor...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="w-8 h-8" />
            <span className="text-sm font-medium">Sürükle bırak veya tıklayarak seç</span>
          </div>
        )}
      </div>

      {value && (
        <div className="flex items-center gap-4 bg-muted p-2 rounded-lg border border-border">
          <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
            <Image src={value} alt="Preview" fill className="object-cover" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs text-muted-foreground truncate">{value}</p>
          </div>
        </div>
      )}
    </div>
  )
}
