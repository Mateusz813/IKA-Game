import { useEffect, useRef, useState } from 'react'
import { safePlay } from '../lib/media.js'
import { Avatar } from './common.jsx'

const FADE = 0.7 // sekundy przenikania między scenkami
const STEP = 100 // ms — pętla kontrolna (setTimeout działa też w tle)

// 🎬 Story: scenki jedna po drugiej na cały ekran.
// Jeden odtwarzacz wideo — telewizory często mają tylko jeden sprzętowy
// dekoder, a drugi <video> potrafi zablokować pierwszy (czarny ekran).
// Przenikanie: ostatnia klatka scenki trafia na <canvas>, który płynnie
// znika nad kolejną scenką. Kolejne scenki ładujemy w tle do pamięci.
export default function StoryOverlay({ meme, who, onDone }) {
  const rootRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const stopRef = useRef(() => {})
  const startRef = useRef(() => {})
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const [scene, setScene] = useState(1)
  const [needTap, setNeedTap] = useState(false) // dźwięk zablokowany — gra wyciszone
  const [needStart, setNeedStart] = useState(false) // nic nie ruszyło — kliknij ▶
  const [error, setError] = useState(null)

  useEffect(() => {
    const scenes = meme.story
    const v = videoRef.current
    const c = canvasRef.current
    let idx = 0
    let closed = false
    let switching = false
    let lastT = -1
    let lastMove = performance.now()
    const blobUrls = new Map()
    const timers = new Set()
    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t)
        fn()
      }, ms)
      timers.add(t)
    }

    // kolejne scenki do pamięci (blob) — przełączenie bez czekania na sieć
    ;(async () => {
      for (let i = 1; i < scenes.length && !closed; i++) {
        try {
          const r = await fetch(scenes[i])
          if (!r.ok) continue
          const b = await r.blob()
          if (closed) return
          blobUrls.set(i, URL.createObjectURL(b))
        } catch { /* zostanie adres sieciowy */ }
      }
    })()

    const play = () =>
      safePlay(v)
        .then(() => setNeedStart(false))
        .catch((e) => {
          if (e?.name === 'NotAllowedError') {
            // bez dźwięku przeglądarka zwykle pozwala — gramy wyciszone
            v.muted = true
            setNeedTap(true)
            safePlay(v).catch(() => setNeedStart(true))
          }
        })

    const rampVolume = () => {
      const t0 = performance.now()
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / 300)
        try {
          v.volume = k
        } catch { /* niektóre TV nie pozwalają zmieniać głośności */ }
        if (k < 1 && !closed) later(step, 30)
      }
      step()
    }

    const load = (i) => {
      v.src = blobUrls.get(i) || scenes[i]
      try {
        v.load()
      } catch { /* ignore */ }
      lastT = -1
      lastMove = performance.now()
      rampVolume()
      play()
    }

    const snapshot = () => {
      try {
        if (!v.videoWidth) return false
        c.width = v.videoWidth
        c.height = v.videoHeight
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        return true
      } catch {
        return false
      }
    }

    const finish = () => {
      if (closed) return
      closed = true
      rootRef.current?.classList.add('story--out')
      later(() => doneRef.current(), 900)
    }
    stopRef.current = finish

    const next = () => {
      if (closed || switching) return
      if (idx >= scenes.length - 1) return finish()
      switching = true
      // zamrożona ostatnia klatka nad odtwarzaczem (albo przejście przez czerń)
      const frozen = snapshot()
      c.style.transition = 'none'
      c.style.opacity = frozen ? '1' : '0'
      if (!frozen) {
        v.style.transition = 'none'
        v.style.opacity = '0'
      }
      idx += 1
      setScene(idx + 1)
      load(idx)
      let revealed = false
      const reveal = () => {
        if (revealed || closed) return
        revealed = true
        v.removeEventListener('playing', reveal)
        c.style.transition = `opacity ${FADE}s`
        c.style.opacity = '0'
        v.style.transition = `opacity ${FADE}s`
        v.style.opacity = '1'
        later(() => (switching = false), FADE * 1000)
      }
      v.addEventListener('playing', reveal)
      later(reveal, 1500) // gdyby „playing” nie przyszło
    }

    const onEnded = () => next()
    const onError = () => {
      const code = v.error?.code
      console.warn('[Story] nie da się odtworzyć scenki', idx + 1, code)
      setError(`Scenka ${idx + 1}: błąd odtwarzania (kod ${code ?? '?'})`)
      later(next, 800)
    }
    v.addEventListener('ended', onEnded)
    v.addEventListener('error', onError)

    // pętla kontrolna: koniec scenki (gdy „ended” nie przyjdzie) i zawieszenie
    const tick = () => {
      if (closed) return
      const now = performance.now()
      if (v.currentTime !== lastT) {
        lastT = v.currentTime
        lastMove = now
      }
      if (!switching && v.duration && isFinite(v.duration) && v.currentTime >= v.duration - 0.08) next()
      else if (!switching && now - lastMove > 5000) {
        if (idx === 0 && v.currentTime === 0) setNeedStart(true) // nic nie ruszyło
        else next() // scenka się zawiesiła — dalej
        lastMove = now
      }
      later(tick, STEP)
    }

    startRef.current = () => {
      v.muted = false
      setNeedTap(false)
      play()
    }

    c.style.opacity = '0'
    v.style.opacity = '1'
    load(0)
    later(() => {
      if (!closed && v.currentTime === 0 && v.paused) setNeedStart(true)
    }, 3000)
    tick()

    const onKey = (e) => e.key === 'Escape' && finish()
    window.addEventListener('keydown', onKey)

    return () => {
      closed = true
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', onKey)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('error', onError)
      v.pause()
      v.removeAttribute('src')
      try {
        v.load()
      } catch { /* ignore */ }
      blobUrls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [meme])

  return (
    <div className="story" ref={rootRef}>
      <video ref={videoRef} className="story-video" playsInline preload="auto" />
      <canvas ref={canvasRef} className="story-video story-frame" />

      <div className="story-top">
        <span className="story-badge">
          🎬 STORY{who ? <> · <Avatar player={who} size="min(2.6vw, 3.6vh)" /> {who.name}</> : null}
        </span>
        <span className="story-progress">
          {meme.story.map((_, i) => (
            <span key={i} className={`story-dot ${i < scene ? 'story-dot--on' : ''}`} />
          ))}
        </span>
        <button className="btn btn--ghost btn--small" onClick={() => stopRef.current()}>
          ✖
        </button>
      </div>

      {needStart ? (
        <button className="btn btn--gold story-unmute story-start" onClick={() => startRef.current()}>
          ▶ Kliknij, żeby odtworzyć Story
        </button>
      ) : (
        needTap && (
          <button className="btn btn--gold story-unmute" onClick={() => startRef.current()}>
            🔊 Kliknij, żeby włączyć dźwięk
          </button>
        )
      )}

      {error && <div className="story-error">{error}</div>}
    </div>
  )
}
