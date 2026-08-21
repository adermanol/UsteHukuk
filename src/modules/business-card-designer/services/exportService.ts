import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const html2canvasOptions = {
  scale: 3, 
  useCORS: true,
  ignoreElements: (element: Element) => element.classList.contains('hide-on-export')
}

export const exportCanvasAsPNG = async (elementId: string, filename: string = 'kartvizit.png') => {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, html2canvasOptions)
  const dataUrl = canvas.toDataURL('image/png')
  
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export const exportCanvasAsPDF = async (elementId: string, filename: string = 'kartvizit.pdf') => {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, html2canvasOptions)
  const imgData = canvas.toDataURL('image/jpeg', 1.0)
  
  // 85x50 mm (bıçak payı hariç standart). PDF'e çevirirken oranlı yerleştiriyoruz.
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [91, 56] })
  pdf.addImage(imgData, 'JPEG', 0, 0, 91, 56)
  pdf.save(filename)
}

export const exportDualPDF = async (frontId: string, backId: string, filename: string = 'kartvizit_cift_yonlu.pdf') => {
  const frontEl = document.getElementById(frontId)
  const backEl = document.getElementById(backId)
  if (!frontEl || !backEl) return

  const frontCanvas = await html2canvas(frontEl, html2canvasOptions)
  const frontData = frontCanvas.toDataURL('image/jpeg', 1.0)

  const backCanvas = await html2canvas(backEl, html2canvasOptions)
  const backData = backCanvas.toDataURL('image/jpeg', 1.0)

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [91, 56] })
  
  // Sayfa 1: Ön
  pdf.addImage(frontData, 'JPEG', 0, 0, 91, 56)
  
  // Sayfa 2: Arka
  pdf.addPage([91, 56], 'landscape')
  pdf.addImage(backData, 'JPEG', 0, 0, 91, 56)

  pdf.save(filename)
}
