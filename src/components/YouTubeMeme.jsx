import { useEffect, useRef } from 'react'
import { memeCaption } from '../lib/memes.js'
import { Avatar } from './common.jsx'

// Oficjalny YouTube IFrame Player API — ładowany raz, dopiero gdy potrzebny
let apiPromise = null
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise)
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve(window.YT)
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.onerror = () => {
        apiPromise = null
        reject(new Error('YouTube API niedostępne'))
      }
      document.head.appendChild(tag)
    })
  return apiPromise
}

// Okienko na TV z własnym filmikiem (public/video) — gra z dźwiękiem i znika.
export function VideoMeme({ meme, who, onDone }) {
  const ref = useRef(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const v = ref.current
    if (!v) return
    let closed = false
    const close = () => {
      if (closed) return
      closed = true
      doneRef.current()
    }
    v.muted = false
    v.play().catch((e) => {
      if (e?.name === 'AbortError') return // przerwane pauzą (np. ponowny montaż) — nie błąd
      if (e?.name !== 'NotAllowedError') return close()
      // przeglądarka zablokowała dźwięk — grajmy chociaż obraz
      v.muted = true
      v.play().catch(() => {})
    })
    v.addEventListener('ended', close)
    v.addEventListener('error', close)
    const safety = setTimeout(close, 60 * 1000)
    return () => {
      closed = true
      clearTimeout(safety)
      v.pause()
    }
  }, [meme])

  return (
    <div className="yt-meme">
      <div className="yt-meme-card">
        <div className="yt-meme-caption">
          <span className="yt-meme-title">{memeCaption(meme)}</span>
          {who && (
            <span className="yt-meme-who">
              <Avatar player={who} size="min(3vw, 4.4vh)" /> 🔊 {who.name}
            </span>
          )}
        </div>
        <div className="yt-meme-frame">
          <video ref={ref} src={meme.video} playsInline preload="auto" />
        </div>
      </div>
    </div>
  )
}

// Okienko na TV: fragment filmu (start–end) z dźwiękiem, potem samo znika.
// Odtwarzacz musi być widoczny — tak wymagają zasady YouTube.
export default function YouTubeMeme({ meme, who, onDone }) {
  const hostRef = useRef(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const { id, start = 0, end } = meme.youtube
    let player = null
    let closed = false
    const close = () => {
      if (closed) return
      closed = true
      doneRef.current()
    }
    // zapas na buforowanie, gdyby odtwarzacz nie zgłosił końca;
    // bez `end` (cały film) liczymy od długości filmu po załadowaniu
    let safety = setTimeout(close, end != null ? (end - start + 15) * 1000 : 10 * 60 * 1000)
    let kick = null

    loadYouTubeApi()
      .then((YT) => {
        if (closed || !hostRef.current) return
        player = new YT.Player(hostRef.current, {
          host: 'https://www.youtube-nocookie.com',
          videoId: id,
          width: '100%',
          height: '100%',
          playerVars: {
            start,
            ...(end != null ? { end } : {}),
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
              if (end == null) {
                const total = e.target.getDuration?.() || 0
                if (total > 0) {
                  clearTimeout(safety)
                  safety = setTimeout(close, (total - start + 15) * 1000)
                }
              }
              e.target.unMute()
              e.target.setVolume(100)
              e.target.playVideo()
              // przeglądarka zablokowała dźwięk? grajmy chociaż obraz
              kick = setTimeout(() => {
                const st = e.target.getPlayerState?.()
                if (st !== YT.PlayerState.PLAYING && st !== YT.PlayerState.BUFFERING) {
                  e.target.mute()
                  e.target.playVideo()
                }
              }, 2500)
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) close()
            },
            onError: close,
          },
        })
      })
      .catch(close)

    return () => {
      closed = true
      clearTimeout(safety)
      clearTimeout(kick)
      try {
        player?.destroy()
      } catch { /* ignore */ }
    }
  }, [meme])

  return (
    <div className="yt-meme">
      <div className="yt-meme-card">
        <div className="yt-meme-caption">
          <span className="yt-meme-title">{memeCaption(meme)}</span>
          {who && (
            <span className="yt-meme-who">
              <Avatar player={who} size="min(3vw, 4.4vh)" /> 🔊 {who.name}
            </span>
          )}
        </div>
        <div className="yt-meme-frame">
          <div ref={hostRef} />
        </div>
      </div>
    </div>
  )
}
