import { useEffect, useRef, useState } from 'react'
import { safePlay } from '../lib/media.js'
import { Avatar } from './common.jsx'

// 🎬 Story: jeden film na cały ekran (scenki sklejone z przenikaniami
// zawczasu — scripts/build-story.py). Jeden plik = zero przerw między
// scenkami i działa na telewizorach z jednym dekoderem wideo.
export default function StoryOverlay({ meme, who, onDone }) {
  const { src, chapters } = meme.story
  const rootRef = useRef(null)
  const videoRef = useRef(null)
  const stopRef = useRef(() => {})
  const startRef = useRef(() => {})
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const [scene, setScene] = useState(1)
  const [needTap, setNeedTap] = useState(false) // dźwięk zablokowany — gra wyciszone
  const [needStart, setNeedStart] = useState(false) // nic nie ruszyło — kliknij ▶
  const [error, setError] = useState(null)

  useEffect(() => {
    const v = videoRef.current
    let closed = false
    const timers = new Set()
    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t)
        fn()
      }, ms)
      timers.add(t)
    }

    const play = () =>
      safePlay(v)
        .then(() => setNeedStart(false))
        .catch((e) => {
          if (e?.name !== 'NotAllowedError') return
          // bez dźwięku przeglądarka zwykle pozwala — gramy wyciszone
          v.muted = true
          setNeedTap(true)
          safePlay(v).catch(() => setNeedStart(true))
        })

    const finish = () => {
      if (closed) return
      closed = true
      rootRef.current?.classList.add('story--out')
      later(() => doneRef.current(), 900)
    }
    stopRef.current = finish
    startRef.current = () => {
      v.muted = false
      setNeedTap(false)
      play()
    }

    // która scenka trwa (pasek postępu)
    const onTime = () => {
      const t = v.currentTime
      let n = 1
      chapters.forEach((start, i) => {
        if (t >= start) n = i + 1
      })
      setScene(n)
    }
    const onError = () => {
      setError(`Nie udało się odtworzyć filmu (kod ${v.error?.code ?? '?'})`)
      later(finish, 4000)
    }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('ended', finish)
    v.addEventListener('error', onError)

    play()
    // telewizor nie ruszył sam — pokaż przycisk ▶
    later(() => {
      if (!closed && v.currentTime === 0) setNeedStart(true)
    }, 3000)

    const onKey = (e) => e.key === 'Escape' && finish()
    window.addEventListener('keydown', onKey)

    return () => {
      closed = true
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', onKey)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('ended', finish)
      v.removeEventListener('error', onError)
      v.pause()
    }
  }, [meme, chapters])

  return (
    <div className="story" ref={rootRef}>
      <video ref={videoRef} className="story-video story-video--on" src={src} playsInline preload="auto" />

      <div className="story-top">
        <span className="story-badge">
          🎬 STORY{who ? <> · <Avatar player={who} size="min(2.6vw, 3.6vh)" /> {who.name}</> : null}
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
