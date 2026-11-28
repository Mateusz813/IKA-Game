import { useEffect, useRef, useState } from 'react'
import { safePlay } from '../lib/media.js'
import { loadYouTubeApi } from './YouTubeMeme.jsx'
import { Avatar } from './common.jsx'

// 🎬 Story / Nasza Historia: jeden film na cały ekran (scenki sklejone z przenikaniami
// zawczasu — scripts/build-story.py). Jeden plik = zero przerw między
// scenkami i działa na telewizorach z jednym dekoderem wideo.
// Opcjonalna muzyka w tle (story.music) gra z małego, widocznego odtwarzacza
// YouTube w rogu — zasady YouTube nie pozwalają na ukryty odtwarzacz.
export default function StoryOverlay({ meme, who, onDone }) {
  const { src, chapters, music = [], musicVolume = 25, musicHidden = false } = meme.story
  const rootRef = useRef(null)
  const videoRef = useRef(null)
  const musicRef = useRef(null)
  const stopRef = useRef(() => {})
  const startRef = useRef(() => {})
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const [scene, setScene] = useState(1)
  const [needTap, setNeedTap] = useState(false) // dźwięk zablokowany — gra wyciszone
  const [error, setError] = useState(null)
  const [musicOff, setMusicOff] = useState(false) // TV nie uciągnął filmu + muzyki naraz

  useEffect(() => {
    const v = videoRef.current
    let closed = false
    let player = null // odtwarzacz muzyki w tle
    let track = -1 // który utwór z `music` gra
    let switching = false
    const timers = new Set()
    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t)
        fn()
      }, ms)
      timers.add(t)
    }

    // ——— muzyka w tle ———
    const trackFor = (sceneIdx) => {
      let k = -1
      music.forEach((m, i) => {
        if (sceneIdx >= m.from) k = i
      })
      return k
    }
    const fadeMusic = (to, ms, then) => {
      if (!player?.getVolume) return then?.()
      let from = 0
      try {
        from = player.getVolume()
      } catch { /* jeszcze nie gotowy */ }
      const t0 = performance.now()
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms)
        try {
          player.setVolume(Math.round(from + (to - from) * k))
        } catch { /* zamknięty */ }
        if (k < 1) later(step, 40)
        else then?.()
      }
      step()
    }
    const playTrack = (k) => {
      const m = music[k]
      if (!m || !player?.loadVideoById) return
      track = k
      if (switching) return
      switching = true
      // płynna zmiana utworu: ściszenie → nowy utwór od `start` → podgłośnienie
      fadeMusic(0, 700, () => {
        try {
          player.loadVideoById({ videoId: m.id, startSeconds: m.start || 0 })
          player.setVolume(0)
        } catch { /* ignore */ }
        later(() => fadeMusic(musicVolume, 900, () => (switching = false)), 400)
      })
    }
    if (music.length) {
      loadYouTubeApi()
        .then((YT) => {
          if (closed || !musicRef.current) return
          const first = music[Math.max(0, trackFor(0))]
          track = music.indexOf(first)
          player = new YT.Player(musicRef.current, {
            host: 'https://www.youtube-nocookie.com',
            videoId: first.id,
            width: '100%',
            height: '100%',
            playerVars: {
              start: first.start || 0,
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
                e.target.setVolume(musicVolume)
                e.target.playVideo()
              },
            },
          })
        })
        .catch(() => {})
    }

    // ——— film ———
    const play = () =>
      safePlay(v).catch((e) => {
        if (e?.name !== 'NotAllowedError') return
        // bez dźwięku przeglądarka zwykle pozwala — gramy wyciszone
        v.muted = true
        setNeedTap(true)
        safePlay(v).catch(() => {})
      })

    const finish = () => {
      if (closed) return
      closed = true
      rootRef.current?.classList.add('story--out')
      fadeMusic(0, 800)
      later(() => doneRef.current(), 900)
    }
    stopRef.current = finish
    startRef.current = () => {
      v.muted = false
      setNeedTap(false)
      play()
      try {
        player?.unMute()
        player?.playVideo()
      } catch { /* ignore */ }
    }

    // która scenka trwa (pasek postępu + zmiana muzyki)
    const onTime = () => {
      const t = v.currentTime
      let n = 0
      chapters.forEach((start, i) => {
        if (t >= start) n = i
      })
      setScene(n + 1)
      const k = trackFor(n)
      if (k >= 0 && k !== track) playTrack(k)
    }
    const onError = () => {
      setError(`Nie udało się odtworzyć filmu (kod ${v.error?.code ?? '?'})`)
      later(finish, 4000)
    }
    // Telewizor z jednym dekoderem: odtwarzacz YouTube (to też wideo) potrafi
    // zatrzymać nasz film. Wtedy film ma pierwszeństwo — wyłączamy muzykę
    // i wznawiamy film od miejsca, w którym stanął.
    const dropMusic = (reason) => {
      if (!player) return false
      console.warn('[Story] wyłączam muzykę:', reason, 'readyState', v.readyState, 't', v.currentTime)
      try {
        player.destroy()
      } catch { /* ignore */ }
      player = null
      setMusicOff(true)
      return true
    }
    const onPause = () => {
      // schowana karta: przeglądarka sama pauzuje (np. wyciszone wideo) — to nie konflikt
      if (closed || v.ended || document.hidden) return
      if (dropMusic('pause')) later(() => !closed && play(), 250)
    }
    let lastT = -1
    let lastMove = performance.now()
    const watchdog = () => {
      if (closed) return
      const now = performance.now()
      if (v.currentTime !== lastT) {
        lastT = v.currentTime
        lastMove = now
      } else if (
        player &&
        lastT > 0 &&
        !v.ended &&
        !v.paused &&
        !v.seeking &&
        !document.hidden &&
        v.readyState >= 3 && // dane są, a obraz stoi — to nie zwykłe doładowywanie
        now - lastMove > 3000
      ) {
        // obraz stanął, a muzyka gra — to samo, tylko bez zdarzenia „pause”
        dropMusic('stall')
        const at = v.currentTime
        try {
          v.load()
          v.currentTime = at
        } catch { /* ignore */ }
        play()
        lastMove = now
      }
      later(watchdog, 500)
    }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('ended', finish)
    v.addEventListener('error', onError)
    v.addEventListener('pause', onPause)

    play()
    watchdog()
    // film rusza sam: gdy się doładuje (canplay) albo — gdyby stał — co 2 s ponawiamy start
    const onCanPlay = () => !closed && v.paused && !v.ended && play()
    v.addEventListener('canplay', onCanPlay)
    const kick = () => {
      if (closed) return
      if (v.paused && !v.ended && v.currentTime === 0) play()
      if (v.currentTime === 0) later(kick, 2000)
    }
    later(kick, 2000)

    const onKey = (e) => e.key === 'Escape' && finish()
    window.addEventListener('keydown', onKey)

    return () => {
      closed = true
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', onKey)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('ended', finish)
      v.removeEventListener('error', onError)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('canplay', onCanPlay)
      v.pause()
      try {
        player?.destroy()
      } catch { /* ignore */ }
    }
  }, [meme]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="story" ref={rootRef}>
      <video ref={videoRef} className="story-video story-video--on" src={src} playsInline preload="auto" />

      <div className="story-top">
        <span className="story-badge">
          {meme.emoji} {meme.label.toLocaleUpperCase('pl-PL')}
          {who ? <> · <Avatar player={who} size="min(2.6vw, 3.6vh)" /> {who.name}</> : null}
        </span>
        <span className="story-progress">
          {chapters.map((_, i) => (
            <span key={i} className={`story-dot ${i < scene ? 'story-dot--on' : ''}`} />
          ))}
        </span>
        <button className="btn btn--ghost btn--small" onClick={() => stopRef.current()}>
          ✖
        </button>
      </div>

      {needTap && (
        <button className="btn btn--gold story-unmute" onClick={() => startRef.current()}>
          🔊 Kliknij, żeby włączyć dźwięk
        </button>
      )}

      {music.length > 0 && (
        <div className={`story-music ${musicHidden ? 'story-music--hidden' : ''}`}>
          <span className="story-music-label">🎵 w tle</span>
          <div className="story-music-frame">
            <div ref={musicRef} />
          </div>
        </div>
      )}

      {musicOff && (
        <div className="story-error story-note">
          🎵 Ten telewizor nie gra filmu i muzyki z YouTube naraz — gra sam film
        </div>
      )}
      {error && <div className="story-error">{error}</div>}
    </div>
  )
}
