// Dźwięki TV: syntezowane tony WebAudio + nagrania (mem, „please”) grane
// z buforów przez ten sam AudioContext. Używane WYŁĄCZNIE w trybie TV.
//
// Przeglądarki blokują dźwięk, dopóki ktoś nie kliknie w stronę. Kontekst
// startuje wtedy jako „suspended” — wykrywamy to (audioState) i TV pokazuje
// baner „kliknij, żeby włączyć dźwięk”, zamiast po cichu milczeć.
let ctx = null
const buffers = new Map() // src -> Promise<AudioBuffer>
const listeners = new Set()
let pleaseSources = []
let memeSources = []

function notify() {
  const st = audioState()
  listeners.forEach((f) => f(st))
}

export function initAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctx.addEventListener?.('statechange', notify)
    }
  } catch { /* brak WebAudio */ }
  return ctx
}

export function unlockAudio() {
  initAudio()
  try {
    if (ctx && ctx.state !== 'running') ctx.resume().then(notify, notify)
  } catch { /* ignore */ }
  return ctx
}

// 'on' — dźwięk gra; 'locked' — przeglądarka czeka na kliknięcie
export const audioState = () => (ctx && ctx.state === 'running' ? 'on' : 'locked')

export function onAudioStateChange(f) {
  listeners.add(f)
  return () => listeners.delete(f)
}

const running = () => ctx && ctx.state === 'running'

function loadBuffer(src) {
  if (!buffers.has(src)) {
    initAudio()
    const p = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.arrayBuffer()
      })
      .then(
        (data) =>
          new Promise((res, rej) => ctx.decodeAudioData(data, res, rej))
      )
    p.catch(() => buffers.delete(src)) // pozwól spróbować ponownie
    buffers.set(src, p)
  }
  return buffers.get(src)
}

export const preloadSound = (src) => loadBuffer(src).catch(() => {})

// Odtwarza nagranie `times` razy pod rząd; start/dur (s) wycinają fragment,
// który kończy się krótkim wyciszeniem. Zwraca listę źródeł (do stop).
async function playFile(src, times = 1, { vol = 1, start = 0, dur = null } = {}) {
  if (!running()) return []
  const buf = await loadBuffer(src)
  if (!running()) return []
  const offset = Math.min(start, Math.max(0, buf.duration - 0.05))
  const len = Math.min(dur ?? Infinity, buf.duration - offset)
  const gain = ctx.createGain()
  gain.connect(ctx.destination)
  const t0 = ctx.currentTime + 0.03
  gain.gain.setValueAtTime(vol, t0)
  const out = []
  for (let i = 0; i < times; i++) {
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.connect(gain)
    s.start(t0 + i * len, offset, len)
    out.push(s)
  }
  if (dur != null && len > 0.6) {
    const end = t0 + times * len
    gain.gain.setValueAtTime(vol, end - 0.4)
    gain.gain.linearRampToValueAtTime(0.0001, end)
  }
  return out
}

const stopAll = (list) =>
  list.forEach((s) => {
    try {
      s.stop()
    } catch { /* już zatrzymane */ }
  })

// zatrzymuje nagranie „please” (np. gdy zaczyna się nowa runda)
export function stopPlease() {
  stopAll(pleaseSources)
  pleaseSources = []
  try {
    window.speechSynthesis?.cancel()
  } catch { /* ignore */ }
}

// awaryjnie, gdy nagranie nie chce się odtworzyć: synteza mowy + pozytywka
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
  if (!running()) return
  const t0 = ctx.currentTime + 0.05
  const melody = [523.25, 659.25, 783.99, 987.77, 1046.5, 987.77, 783.99, 659.25]
  for (let rep = 0; rep < 8; rep++) {
    melody.forEach((f, i) => {
      tone({ freq: f, type: 'sine', t0: t0 + rep * 1.28 + i * 0.16, dur: 0.3, vol: 0.06 })
    })
  }
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
    if (!running()) return
    const base = ctx.currentTime + 0.05
    for (let i = 0; i < Math.min(count, 8); i++) {
      const t = base + i * 0.35
      tone({ freq: 1318.5, type: 'sine', t0: t, dur: 0.5, vol: 0.22 })
      tone({ freq: 2637, type: 'sine', t0: t, dur: 0.35, vol: 0.08 })
    }
  },

  // buzzer „womp womp” przy pudle
  miss() {
    if (!running()) return
    const t = ctx.currentTime + 0.03
    tone({ freq: 200, type: 'sawtooth', t0: t, dur: 0.28, vol: 0.15, slideTo: 150 })
    tone({ freq: 150, type: 'sawtooth', t0: t + 0.3, dur: 0.45, vol: 0.17, slideTo: 95 })
  },

  // EASTER EGG „świadkowa”: nagranie please.m4a (audio z please.mov) ×10
  please() {
    stopPlease()
    if (!running()) return
    playFile('/icons/please.m4a', 10).then(
      (srcs) => (pleaseSources = srcs),
      () => pleaseFallback()
    )
  },

  // soundboard: nagranie-mem ({ src, start, dur }); nowe przerywa poprzednie
  meme(m) {
    stopAll(memeSources)
    memeSources = []
    if (!running() || !m) return
    playFile(m.src, 1, { start: m.start || 0, dur: m.dur ?? null }).then(
      (srcs) => (memeSources = srcs),
      (err) => console.warn('[IKA] Nie udało się odtworzyć', m.src, err)
    )
  },

  // fanfary przy odgadnięciu hasła / podium
  win() {
    if (!running()) return
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
