import { useEffect, useRef, useState } from 'react'
import confetti from '../lib/confetti.js'
import { useGame, sortedPlayers, usedInfo } from '../lib/store.jsx'
import { useFreshAction } from '../lib/hooks.js'
import { ALPHABET } from '../lib/alphabet.js'
import { sounds, unlockAudio, stopPlease } from '../lib/sound.js'
import Board from '../components/Board.jsx'
import { Logo, Avatar, ModeBadge, QRJoin, Spinner } from '../components/common.jsx'

// EASTER EGG: to hasło dostaje własną animację i dźwięk 💍
const SPECIAL_PHRASE = 'CZY ZOSTANIESZ MOJĄ ŚWIADKOWĄ'
const isSpecialPhrase = (p) =>
  (p || '')
    .replace(/[^A-ZĄĆĘŁŃÓŚŹŻ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim() === SPECIAL_PHRASE

export default function TV() {
  const { state, ready } = useGame()
  useWakeLock()
  const special = ready && isSpecialPhrase(state.phrase)
  useConfetti(
    ready && !special && (state.status === 'finished' || state.status === 'over')
  )
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem('ika-tv-sound') !== '0'
  )
  useTvSounds(ready ? state.lastAction : null, soundOn, special)

  // gdy hasło-niespodzianka jest w grze, ładujemy kota i nagranie zawczasu
  useEffect(() => {
    if (special) {
      const img = new Image()
      img.src = '/icons/shrek-cat.png'
      const preload = new Audio('/icons/please.m4a')
      preload.preload = 'auto'
    }
  }, [special])

  if (!ready) return <Spinner />
  const s = state
  const players = sortedPlayers(s.players)

  const soundBtn = (
    <button
      className="btn btn--ghost btn--small"
      title="Dźwięki na TV"
      onClick={() => {
        const next = !soundOn
        setSoundOn(next)
        localStorage.setItem('ika-tv-sound', next ? '1' : '0')
        if (next) unlockAudio()
      }}
    >
      {soundOn ? '🔊' : '🔇'}
    </button>
  )

  if (s.status === 'over') return <TVOver s={s} players={players} soundBtn={soundBtn} />

  return (
    <div className="tv">
      <header className="tv-header">
        <Logo small />
        {s.category && s.status !== 'idle' && (
          <div className="tv-category">{s.category}</div>
        )}
        <div className="tv-header-right">
          <ModeBadge />
          {soundBtn}
          <FullscreenButton />
        </div>
      </header>

      <main className="tv-main">
        <Board
          phrase={s.status === 'idle' ? '' : s.phrase}
          revealed={s.revealed}
          lastAction={s.lastAction}
          size="tv"
        />
        {s.status === 'idle' && <IdleOverlay players={players} />}
        <MissOverlay lastAction={s.lastAction} />
      </main>

      {s.status === 'finished' ? (
        <WinnerBanner s={s} />
      ) : (
        <div className="tv-ticker" key={s.lastAction?.ts || 'x'}>
          {tickerText(s.lastAction, s.players)}
        </div>
      )}

      <UsedStrip used={s.used} visible={s.status === 'playing'} />

      {players.length > 0 && (
        <footer className="tv-players">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`tv-player ${
                s.activePlayerId === p.id ? 'tv-player--active' : ''
              } ${s.winnerId === p.id ? 'tv-player--winner' : ''} ${
                p.online === false ? 'tv-player--off' : ''
              }`}
            >
              {s.activePlayerId === p.id && (
                <span className="tv-player-mic">🎤 odpowiada</span>
              )}
              {s.hostId === p.id && (
                <span className="tv-player-mic tv-player-host">🎩 prowadzi</span>
              )}
              <Avatar player={p} size="min(3.4vw, 4.8vh)" />
              <span className="tv-player-name">
                {['🥇', '🥈', '🥉'][i] || ''} {p.name}
              </span>
              <span className="tv-player-score" key={p.score}>
                {p.score || 0}
              </span>
            </div>
          ))}
        </footer>
      )}

      {s.status !== 'idle' && (
        <div className="tv-qr-corner">
          <QRJoin size={72} />
          <span>dołącz</span>
        </div>
      )}

      {s.status === 'finished' &&
        (special ? (
          <SwiadkowaOverlay s={s} />
        ) : s.winnerId ? (
          <WinOverlay s={s} />
        ) : null)}
    </div>
  )
}

// 💍 Specjalna animacja dla hasła „Czy zostaniesz moją świadkową”
function SwiadkowaOverlay({ s }) {
  const winner = s.winnerId ? s.players[s.winnerId] : null
  useEffect(() => {
    const end = Date.now() + 10000
    const t = setInterval(() => {
      confetti({
        particleCount: 10,
        spread: 120,
        startVelocity: 22,
        gravity: 0.55,
        ticks: 220,
        colors: ['#ff6b9d', '#ff8fab', '#ffc2d1', '#ff4d84', '#ffffff'],
        origin: { x: Math.random(), y: Math.random() * 0.35 },
      })
      if (Date.now() > end) clearInterval(t)
    }, 300)
    return () => {
      clearInterval(t)
      stopPlease()
    }
  }, [])
  const hearts = ['💖', '💍', '💘', '💝', '💖', '🥺', '💖', '💍', '💗', '💖']
  return (
    <div className="swk-overlay">
      {hearts.map((e, i) => (
        <span
          key={i}
          className="swk-heart"
          style={{
            left: `${4 + i * 10}%`,
            animationDelay: `${i * 0.55}s`,
            animationDuration: `${4.6 + (i % 4) * 0.9}s`,
            fontSize: `min(${3 + (i % 3) * 1.4}vw, ${4.5 + (i % 3) * 2}vh)`,
          }}
        >
          {e}
        </span>
      ))}
      <div className="swk-cat-roam">
        <img src="/icons/shrek-cat.png" alt="" className="swk-cat" />
      </div>
      <div className="swk-text">
        <div className="swk-title">CZY ZOSTANIESZ</div>
        <div className="swk-title swk-title--2">MOJĄ ŚWIADKOWĄ? 💍</div>
        {winner && (
          <div className="swk-name">
            <Avatar player={winner} size="min(6vw, 9vh)" /> {winner.name}! 🥹
          </div>
        )}
        <div className="swk-please">please, please, please… 🥺</div>
      </div>
    </div>
  )
}

// Wielka animacja zwycięzcy — pełny ekran, tylko na TV
function WinOverlay({ s }) {
  const winner = s.players[s.winnerId]
  return (
    <div className="win-overlay">
      <div className="win-rays" />
      <div className="win-card">
        <div className="win-crown">👑</div>
        <div className="win-avatar">
          <Avatar player={winner} size="min(15vw, 22vh)" />
        </div>
        <div className="win-title">HASŁO ODGADNIĘTE!</div>
        <div className="win-name">{winner?.name || '???'}</div>
        <div className="win-pts">+100 pkt</div>
        <div className="win-phrase">
          {[...s.phrase].map((ch, i) =>
            ch === ' ' ? (
              <span key={i} className="win-phrase-sp" />
            ) : (
              <span key={i} className="win-phrase-ch" style={{ animationDelay: `${1 + i * 0.05}s` }}>
                {ch}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// Dźwięki sterowane akcjami gry (tylko TV)
function useTvSounds(lastAction, soundOn, special = false) {
  const lastTs = useRef(0)

  // pierwszy klik/dotyk na TV odblokowuje audio (polityka autoplay)
  useEffect(() => {
    const unlock = () => unlockAudio()
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    return () => {
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    const a = lastAction
    if (!a || a.ts === lastTs.current) return
    lastTs.current = a.ts
    if (Date.now() - a.ts > 4000) return // stare zdarzenia (np. po odświeżeniu) pomijamy
    if (!soundOn) return
    if (special && (a.type === 'win' || a.type === 'end')) sounds.please()
    else if (a.type === 'hit') sounds.hit(a.count)
    else if (a.type === 'miss') sounds.miss()
    else if (a.type === 'win' || a.type === 'gameover') sounds.win()
  }, [lastAction, soundOn, special])
}

// ——— Podium na koniec gry ———
function TVOver({ s, players, soundBtn }) {
  const top = players.slice(0, 3)
  const rest = players.slice(3)
  // kolejność wizualna: 2. | 1. | 3.
  const order = [top[1], top[0], top[2]].filter(Boolean)
  return (
    <div className="tv">
      <header className="tv-header">
        <Logo small />
        <div className="tv-header-right">
          <ModeBadge />
          {soundBtn}
          <FullscreenButton />
        </div>
      </header>
      <div className="tv-over">
        <h1 className="tv-over-title">🏁 KONIEC GRY!</h1>
        <div className="podium">
          {order.map((p) => {
            const place = players.indexOf(p) + 1
            return (
              <div key={p.id} className={`podium-col podium-col--${place}`}>
                <Avatar
                  player={p}
                  size={place === 1 ? 'min(10vw, 15vh)' : 'min(7.5vw, 11vh)'}
                />
                <span className="podium-name">{p.name}</span>
                <span className="podium-score">{p.score || 0} pkt</span>
                <div className={`podium-base podium-base--${place}`}>{place}</div>
              </div>
            )
          })}
        </div>
        {rest.length > 0 && (
          <div className="tv-over-rest">
            {rest.map((p, i) => (
              <span key={p.id} className="chip chip--muted">
                {i + 4}. <Avatar player={p} size="min(2.2vw, 3vh)" /> {p.name} · {p.score || 0}
              </span>
            ))}
          </div>
        )}
        <p className="tv-over-hint">Brawa dla wszystkich! 👏 Gospodarz może zacząć nową grę.</p>
      </div>
    </div>
  )
}

function tickerText(a, players) {
  if (!a) return 'Miłej zabawy! 🎡'
  const name = a.playerId ? players[a.playerId]?.name : null
  switch (a.type) {
    case 'start':
      return '🎬 Nowa runda — zgadujcie litery!'
    case 'turn':
      return `🎤 Odpowiada: ${name ?? '…'}`
    case 'hit':
      return `✔ ${name ?? 'Prowadzący'} trafia: ${a.letter} ×${a.count}${
        a.playerId ? ` · +${a.count * 10} pkt` : ''
      }`
    case 'miss':
      return `✗ Nie ma litery ${a.letter}${name ? ` (${name})` : ''}`
    case 'win':
      return `🏆 ${name ?? '…'} zgaduje hasło! +100 pkt`
    case 'end':
      return '🎉 Hasło odsłonięte!'
    case 'host':
      return name
        ? `🎩 Prowadzenie przejmuje: ${name}!`
        : '🎩 Prowadzenie wraca do gospodarza'
    case 'hostDecline':
      return `😅 ${name ?? 'Ktoś'} nie chce prowadzić`
    case 'gameover':
      return '🏁 Koniec gry!'
    case 'reset':
      return '⏳ Za chwilę nowe hasło…'
    default:
      return ''
  }
}

function IdleOverlay({ players }) {
  return (
    <div className="tv-idle">
      <div className="tv-idle-inner">
        <h1>Zeskanuj i dołącz do gry!</h1>
        <QRJoin size={200} />
        <div className="tv-idle-url">{window.location.origin}/play</div>
        {players.length > 0 && (
          <div className="tv-idle-players">
            {players.map((p) => (
              <span key={p.id} className="chip">
                <Avatar player={p} size={20} /> {p.name}
              </span>
            ))}
          </div>
        )}
        <p>⏳ Czekamy, aż prowadzący wpisze hasło…</p>
      </div>
    </div>
  )
}

function MissOverlay({ lastAction }) {
  const fresh = useFreshAction(lastAction, 1800)
  if (!fresh || fresh.type !== 'miss') return null
  return (
    <div className="tv-miss" key={fresh.ts}>
      <div className="tv-miss-x">✗</div>
      <div className="tv-miss-letter">{fresh.letter}</div>
    </div>
  )
}

function WinnerBanner({ s }) {
  const winner = s.winnerId ? s.players[s.winnerId] : null
  return (
    <div className="tv-winner">
      {winner ? (
        <>
          <Avatar player={winner} size="min(4vw, 5.5vh)" /> 🏆 WYGRYWA{' '}
          <b>{winner.name}</b>! <span className="tv-winner-pts">+100 pkt</span>
        </>
      ) : (
        <>🎉 HASŁO ODGADNIĘTE!</>
      )}
    </div>
  )
}

function UsedStrip({ used, visible }) {
  if (!visible) return null
  return (
    <div className="tv-used">
      {ALPHABET.map((L) => {
        const r = usedInfo(used[L])?.r
        return (
          <span
            key={L}
            className={`tv-used-l ${
              r === 'hit' ? 'tv-used-l--hit' : r === 'miss' ? 'tv-used-l--miss' : ''
            }`}
          >
            {L}
          </span>
        )
      })}
    </div>
  )
}

function FullscreenButton() {
  return (
    <button
      className="btn btn--ghost btn--small"
      onClick={() => {
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen?.()
      }}
    >
      ⛶
    </button>
  )
}

function useWakeLock() {
  useEffect(() => {
    let lock = null
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock?.request('screen')
      } catch { /* TV może nie wspierać — trudno */ }
    }
    acquire()
    const onVis = () => document.visibilityState === 'visible' && acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release?.()
    }
  }, [])
}

function useConfetti(active) {
  const ran = useRef(false)
  useEffect(() => {
    if (!active) {
      ran.current = false
      return
    }
    if (ran.current) return
    ran.current = true
    const end = Date.now() + 4000
    const t = setInterval(() => {
      confetti({
        particleCount: 70,
        spread: 75,
        startVelocity: 45,
        origin: { x: Math.random(), y: 0.75 },
        colors: ['#2ee6d2', '#ffd34d', '#ff4d6d', '#ffffff', '#2c55ec'],
      })
      if (Date.now() > end) clearInterval(t)
    }, 350)
    return () => clearInterval(t)
  }, [active])
}
