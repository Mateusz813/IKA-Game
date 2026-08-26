import confettiLib from 'canvas-confetti'

// Własna kanwa bez web workera / OffscreenCanvas — starsze przeglądarki
// w telewizorach bywają z tym na bakier. Konfetti to ozdoba: każdy błąd
// połykamy, żeby nigdy nie wywalić gry.
let instance = null

export default function confetti(opts) {
  try {
    if (!instance) {
      const canvas = document.createElement('canvas')
      canvas.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:70'
      document.body.appendChild(canvas)
      instance = confettiLib.create(canvas, { resize: true, useWorker: false })
    }
    instance(opts)
  } catch { /* ignore */ }
}
