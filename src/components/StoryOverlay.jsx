import { useEffect, useRef, useState } from 'react'
import { loadYouTubeApi } from './YouTubeMeme.jsx'
import { Avatar } from './common.jsx'

const FADE = 0.7 // sekundy przenikania między scenkami
const STEP = 40 // ms — pętla na setTimeout (działa też w tle, rAF nie)

// 🎬 Story: scenki jedna po drugiej na cały ekran, z płynnym przenikaniem
// obrazu i dźwięku. Muzyka gra cicho z małego, widocznego odtwarzacza
// YouTube w rogu (zasady YouTube nie pozwalają na ukryty odtwarzacz).
export default function StoryOverlay({ meme, who, onDone }) {
  const rootRef = useRef(null)
  const aRef = useRef(null)
  const bRef = useRef(null)
  const musicRef = useRef(null)
  const stopRef = useRef(() => {})
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const [needTap, setNeedTap] = useState(false)
  const [scene, setScene] = useState(1)

  useEffect(() => {
    const scenes = meme.story
    const vids = [aRef.current, bRef.current]
    let active = 0
    let idx = 0
    let fading = false
    let closed = false
    let music = null
    const timers = new Set()
    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t)
        fn()
      }, ms)
      timers.add(t)
    }

    const playSafe = (v) =>
      v.play().catch((e) => {
        if (e?.name !== 'NotAllowedError') return
        // przeglądarka zablokowała dźwięk — obraz gra, prosimy o kliknięcie
        vids.forEach((x) => (x.muted = true))
        v.play().catch(() => {})
        setNeedTap(true)
      })
    const load = (v, i) => {
      v.src = scenes[i]
      v.load()
    }

    load(vids[0], 0)
    if (scenes[1]) load(vids[1], 1)
    vids[0].style.opacity = '1'
    vids[1].style.opacity = '0'
    vids[0].volume = 1
    vids[1].volume = 0
    playSafe(vids[0])

    const fadeMusic = (to, ms) => {
      if (!music?.getVolume) return
      const from = music.getVolume()
      const t0 = performance.now()
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms)
        try {
          music.setVolume(Math.round(from + (to - from) * k))
        } catch { /* odtwarzacz już zamknięty */ }
        if (k < 1) later(step, STEP)
      }
      step()
    }

    const finish = () => {
      if (closed) return
      closed = true
      rootRef.current?.classList.add('story--out')
      fadeMusic(0, 800)
      later(() => doneRef.current(), 900)
    }
    stopRef.current = finish

    const crossfade = () => {
      fading = true
      const cur = vids[active]
      const nxt = vids[1 - active]
      nxt.currentTime = 0
      nxt.volume = 0
      playSafe(nxt)
      const t0 = performance.now()
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / (FADE * 1000))
        nxt.style.opacity = String(k)
        cur.style.opacity = String(1 - k)
        nxt.volume = k
        cur.volume = 1 - k
        if (k < 1) return later(step, STEP)
        cur.pause()
        active = 1 - active
        idx += 1
        setScene(idx + 1)
        fading = false
        if (scenes[idx + 1]) load(cur, idx + 1)
      }
      step()
    }

    const tick = () => {
      if (closed) return
      const cur = vids[active]
      if (!fading && cur.duration && cur.currentTime > 0) {
        const left = cur.duration - cur.currentTime
        if (idx < scenes.length - 1 && left <= FADE) crossfade()
        else if (idx === scenes.length - 1 && (cur.ended || left <= 0.05)) finish()
      }
      later(tick, STEP)
    }
    tick()

    // muzyka w tle — cicho, od podanej sekundy
    if (meme.music) {
      loadYouTubeApi()
        .then((YT) => {
          if (closed || !musicRef.current) return
          music = new YT.Player(musicRef.current, {
            host: 'https://www.youtube-nocookie.com',
            videoId: meme.music.id,
            width: '100%',
            height: '100%',
            playerVars: {
              start: meme.music.start || 0,
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
              playsinline: 1,
              iv_load_policy: 3,
              origin: window.location.origin,
            },
            events: {
              onReady: (e) => {
                e.target.unMute()
                e.target.setVolume(meme.music.volume ?? 12)
                e.target.playVideo()
              },
            },
          })
        })
        .catch(() => {})
    }

    const onKey = (e) => e.key === 'Escape' && finish()
    window.addEventListener('keydown', onKey)

    return () => {
      closed = true
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', onKey)
      vids.forEach((v) => {
        v.pause()
        v.removeAttribute('src')
        v.load()
      })
      try {
        music?.destroy()
      } catch { /* ignore */ }
    }
  }, [meme])

  return (
    <div className="story" ref={rootRef}>
      <video ref={aRef} className="story-video" playsInline preload="auto" />
      <video ref={bRef} className="story-video" playsInline preload="auto" />

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

      {needTap && (
        <button
          className="btn btn--gold story-unmute"
          onClick={() => {
            ;[aRef.current, bRef.current].forEach((v) => (v.muted = false))
            setNeedTap(false)
          }}
        >
          🔊 Kliknij, żeby włączyć dźwięk
        </button>
      )}

      {meme.music && (
        <div className="story-music">
          <span className="story-music-label">🎵 w tle</span>
          <div className="story-music-frame">
            <div ref={musicRef} />
          </div>
        </div>
      )}
    </div>
  )
}
