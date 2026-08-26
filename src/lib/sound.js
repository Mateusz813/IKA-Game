// Dźwięki syntezowane WebAudio — zero plików, działa offline.
// Używane WYŁĄCZNIE w trybie TV.
let ctx = null
let pleaseAudio = null

// zatrzymuje nagranie „please” (np. gdy zaczyna się nowa runda)
export function stopPlease() {
  if (pleaseAudio) {
    try {
      pleaseAudio.pause()
    } catch { /* ignore */ }
    pleaseAudio = null
  }
  try {
    window.speechSynthesis?.cancel()
  } catch { /* ignore */ }
}

// awaryjnie, gdy nagranie nie chce się odtworzyć (kodek/autoplay):
// synteza mowy + pozytywka jak wcześniej
function pleaseFallback() {
  const untilMs = Date.now() + 10000
  try {
    const synth = window.speechSynthesis
    if (synth) {
      synth.cancel()
      const speak = () => {
        if (Date.now() > untilMs) return
        const u = new SpeechSynthesisUtterance('please, please, please')
        u.lang = 'en-US'
        u.pitch = 1.5
        u.rate = 1.0
        u.onend = () => setTimeout(speak, 150)
        synth.speak(u)
      }
      speak()
    }
  } catch { /* ignore */ }
  if (!ctx) return
  const t0 = ctx.currentTime + 0.05
  const melody = [523.25, 659.25, 783.99, 987.77, 1046.5, 987.77, 783.99, 659.25]
  for (let rep = 0; rep < 8; rep++) {
    melody.forEach((f, i) => {
      tone({ freq: f, type: 'sine', t0: t0 + rep * 1.28 + i * 0.16, dur: 0.3, vol: 0.06 })
    })
  }
}

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* brak WebAudio — trudno, gramy bez dźwięku */ }
  return ctx
}

function tone({ freq, type = 'sine', t0, dur, vol = 0.25, slideTo = null }) {
  const c = ctx
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

export const sounds = {
  // jasny „ding” na każdy odsłaniany kafelek — w rytmie animacji odkrywania (0.35s)
  hit(count = 1) {
    if (!unlockAudio()) return
    const base = ctx.currentTime + 0.05
    for (let i = 0; i < Math.min(count, 8); i++) {
      const t = base + i * 0.35
      tone({ freq: 1318.5, type: 'sine', t0: t, dur: 0.5, vol: 0.22 })
      tone({ freq: 2637, type: 'sine', t0: t, dur: 0.35, vol: 0.08 })
    }
  },

  // buzzer „womp womp” przy pudle
  miss() {
    if (!unlockAudio()) return
    const t = ctx.currentTime + 0.03
    tone({ freq: 200, type: 'sawtooth', t0: t, dur: 0.28, vol: 0.15, slideTo: 150 })
    tone({ freq: 150, type: 'sawtooth', t0: t + 0.3, dur: 0.45, vol: 0.17, slideTo: 95 })
  },

  // EASTER EGG „świadkowa”: nagranie please.m4a (audio z please.mov) ×10
  please() {
    unlockAudio()
    stopPlease()
    let plays = 0
    const a = new Audio('/icons/please.m4a')
    pleaseAudio = a
    a.preload = 'auto'
    a.volume = 1
    a.addEventListener('ended', () => {
      plays++
      if (plays < 10 && pleaseAudio === a) {
        a.currentTime = 0
        a.play().catch(() => {})
      }
    })
    a.play().catch(() => pleaseFallback())
  },

  // fanfary przy odgadnięciu hasła / podium
  win() {
    if (!unlockAudio()) return
    const t0 = ctx.currentTime + 0.05
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      const t = t0 + i * 0.14
      tone({ freq: f, type: 'triangle', t0: t, dur: i === notes.length - 1 ? 1.4 : 0.35, vol: 0.22 })
      tone({ freq: f * 2, type: 'sine', t0: t, dur: 0.3, vol: 0.07 })
    })
    ;[523.25, 659.25, 783.99].forEach((f) =>
      tone({ freq: f, type: 'triangle', t0: t0 + 0.56, dur: 1.5, vol: 0.09 })
    )
    for (let i = 0; i < 6; i++)
      tone({ freq: 2093 + i * 220, type: 'sine', t0: t0 + 0.7 + i * 0.09, dur: 0.25, vol: 0.05 })
  },
}
