import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useGame, sortedPlayers } from '../lib/store.jsx'
import { useFreshAction } from '../lib/hooks.js'
import { ALPHABET } from '../lib/alphabet.js'
import Board from '../components/Board.jsx'
import { Logo, ModeBadge, QRJoin, Spinner } from '../components/common.jsx'

export default function TV() {
  const { state, ready } = useGame()
  useWakeLock()
  useConfetti(ready && state.status === 'finished')

  if (!ready) return <Spinner />
  const s = state
  const players = sortedPlayers(s.players)

  return (
    <div className="tv">
      <header className="tv-header">
        <Logo small />
        {s.category && s.status !== 'idle' && (
          <div className="tv-category">{s.category}</div>
        )}
        <div className="tv-header-right">
          <ModeBadge />
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
                {p.name}
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
          🏆 WYGRYWA <b>{winner.name}</b>! <span className="tv-winner-pts">+100 pkt</span>
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
      {ALPHABET.map((L) => (
        <span
          key={L}
          className={`tv-used-l ${
            used[L] === 'hit'
              ? 'tv-used-l--hit'
              : used[L] === 'miss'
                ? 'tv-used-l--miss'
                : ''
          }`}
        >
          {L}
        </span>
      ))}
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
