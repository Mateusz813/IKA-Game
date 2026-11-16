import { useEffect, useRef, useState } from 'react'
import confetti from '../lib/confetti.js'
import {
  useGame,
  sortedPlayers,
  usedInfo,
  hostQueue,
  roundLabel,
  settingsLabel,
} from '../lib/store.jsx'
import { useFreshAction, serverNow } from '../lib/hooks.js'
import { sync } from '../lib/sync/index.js'
import { ALPHABET } from '../lib/alphabet.js'
import { MEMES, memeById } from '../lib/memes.js'
import {
  sounds,
  initAudio,
  unlockAudio,
  stopPlease,
  audioState,
  onAudioStateChange,
  preloadSound,
} from '../lib/sound.js'
import Board from '../components/Board.jsx'
import YouTubeMeme from '../components/YouTubeMeme.jsx'
import { Logo, Avatar, ConfirmButton, ModeBadge, QRJoin, Spinner } from '../components/common.jsx'

// EASTER EGG: to hasło dostaje własną animację i dźwięk 💍
const SPECIAL_PHRASE = 'CZY ZOSTANIESZ MOJĄ ŚWIADKOWĄ'
const isSpecialPhrase = (p) =>
  (p || '')
    .replace(/[^A-ZĄĆĘŁŃÓŚŹŻ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim() === SPECIAL_PHRASE

const CELEBRATE = ['win', 'allRevealed']

export default function TV() {
  const { state: s, ready, actions } = useGame()
  useWakeLock()
  const special = ready && isSpecialPhrase(s.phrase)
  const celebrate = useFreshAction(
    CELEBRATE.includes(s.lastAction?.type) ? s.lastAction : null,
    special ? 12000 : 8000
  )
  const players = sortedPlayers(s.players)
  // bez graczy zawsze pokazujemy poczekalnię (np. stan po poprzedniej imprezie)
  const phase = ready && !players.length ? 'lobby' : s.status
  useConfetti(ready && !special && (!!celebrate || phase === 'over'))

  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('ika-tv-sound') !== '0')
  const audio = useAudioUnlock()
  const [ytMeme, setYtMeme] = useState(null)
  useTvSounds(ready ? s.lastAction : null, soundOn, special)
  useMemeSound(ready ? s.meme : null, soundOn, setYtMeme)
  useReportTvAudio(ready, soundOn ? audio : 'muted', s.tvAudio?.state, actions)

  // gdy hasło-niespodzianka jest w grze, ładujemy kota i nagranie zawczasu
  useEffect(() => {
    if (special) {
      const img = new Image()
      img.src = '/icons/shrek-cat.png'
      preloadSound('/icons/please.m4a')
    }
  }, [special])

  if (!ready) return <Spinner />

  const audioBanner = (
    <>
      {soundOn && audio === 'locked' && (
        <button className="tv-audio-lock" onClick={() => unlockAudio()}>
          🔇 Kliknij tutaj, żeby włączyć dźwięki gry
        </button>
      )}
      {ytMeme && (
        <YouTubeMeme
          key={ytMeme.ts}
          meme={ytMeme.def}
          who={ytMeme.by ? s.players[ytMeme.by] : null}
          onDone={() => setYtMeme(null)}
        />
      )}
    </>
  )

  const headerRight = (
    <div className="tv-header-right">
      <ModeBadge />
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
      <FullscreenButton />
    </div>
  )

  if (phase === 'over' && !celebrate)
    return (
      <>
        <TVOver s={s} players={players} headerRight={headerRight} actions={actions} />
        <MemeFlash meme={s.meme} players={s.players} />
        {audioBanner}
      </>
    )

  const showPhrase = phase === 'playing' || phase === 'finished' || !!celebrate
  return (
    <div className="tv">
      {audioBanner}
      <header className="tv-header">
        <Logo small />
        {phase === 'playing' && s.category && <div className="tv-category">{s.category}</div>}
        {['entering', 'playing', 'finished'].includes(phase) && (
          <div className="tv-round">{roundLabel(s)}</div>
        )}
        {headerRight}
      </header>

      <main className="tv-main">
        <Board
          phrase={showPhrase ? s.phrase : ''}
          revealed={s.revealed}
          lastAction={s.lastAction}
          size="tv"
        />
        {phase === 'lobby' && <LobbyOverlay s={s} players={players} />}
        {phase === 'entering' && <HostWritingOverlay s={s} />}
        <MissOverlay lastAction={s.lastAction} />
        <WrongSolveOverlay lastAction={s.lastAction} players={s.players} />
      </main>

      <MemeFlash meme={s.meme} players={s.players} />

      {phase === 'finished' ? (
        <NextHostBar s={s} />
      ) : phase === 'playing' ? (
        <div className="tv-ticker" key={s.lastAction?.ts || 'x'}>
          {tickerText(s.lastAction, s.players)}
        </div>
      ) : null}

      <UsedStrip used={s.used} visible={phase === 'playing'} />

      {players.length > 0 && (
        <footer className="tv-players">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`tv-player ${s.activePlayerId === p.id ? 'tv-player--active' : ''} ${
                s.winnerId === p.id && phase === 'finished' ? 'tv-player--winner' : ''
              } ${p.online === false ? 'tv-player--off' : ''}`}
            >
              {s.activePlayerId === p.id && <span className="tv-player-mic">🎤 zgaduje</span>}
              {s.hostId === p.id && phase !== 'lobby' && (
                <span className="tv-player-mic tv-player-host">🎩 prowadzi</span>
              )}
              <Avatar player={p} size="min(3.4vw, 4.8vh)" />
              <span className="tv-player-name">
                {phase !== 'lobby' ? ['🥇', '🥈', '🥉'][i] || '' : ''} {p.name}
              </span>
              <span className="tv-player-score" key={p.score}>
                {p.score || 0}
              </span>
            </div>
          ))}
        </footer>
      )}

      {phase !== 'lobby' && (
        <div className="tv-qr-corner">
          <QRJoin size={72} />
          <span>dołącz</span>
        </div>
      )}

      {celebrate &&
        (special ? (
          <SwiadkowaOverlay s={s} />
        ) : (
          <WinOverlay s={s} winnerId={celebrate.playerId} />
        ))}
    </div>
  )
}

// ——— poczekalnia ———
function LobbyOverlay({ s, players }) {
  return (
    <div className="tv-idle">
      <div className="tv-idle-inner">
        <h1>🎡 Zeskanuj telefonem i dołącz!</h1>
        <QRJoin size={200} />
        <div className="tv-idle-url">{window.location.origin}/play</div>
        {players.length > 0 ? (
          <div className="tv-idle-players">
            {players.map((p) => (
              <span key={p.id} className="chip">
                <Avatar player={p} size={20} /> {p.name}
              </span>
            ))}
          </div>
        ) : (
          <p>Nikt jeszcze nie dołączył — bądź pierwszy!</p>
        )}
        <p className="tv-steps">
          Gdy wszyscy są w grze, ktoś klika <b>▶ Zaczynamy!</b> na telefonie
          <br />
          Gramy: <b>{settingsLabel(s.settings)}</b>
        </p>
        <p className="tv-idle-install">
          📲 Dodaj do ekranu głównego (iPhone): <b>Udostępnij</b> 📤 → przewiń w dół →{' '}
          <b>„Dodaj do ekranu głównego”</b>
        </p>
      </div>
    </div>
  )
}

// ——— ktoś wpisuje hasło ———
function HostWritingOverlay({ s }) {
  const host = s.players[s.hostId]
  const queue = hostQueue(s.players, s.hostId).slice(0, 4)
  return (
    <div className="tv-idle">
      <div className="tv-idle-inner tv-writing">
        <div className="tv-writing-avatar">
          <Avatar player={host} size="min(12vw, 18vh)" />
        </div>
        <h1>🎩 {host?.name || '…'} wymyśla hasło…</h1>
        <p>Plansza pojawi się za chwilę ✍️</p>
        {queue.length > 0 && (
          <p className="tv-queue">Potem prowadzą: {queue.map((p) => p.name).join(' → ')}</p>
        )}
      </div>
    </div>
  )
}

// Pasek po zakończonym haśle: kto zgadł + kto teraz wymyśla
function NextHostBar({ s }) {
  const winner = s.winnerId ? s.players[s.winnerId] : null
  const next = s.players[s.hostId]
  return (
    <div className="tv-winner">
      {winner ? (
        <>
          🏆 <b>{winner.name}</b> odgadł(a) hasło! <span className="tv-winner-pts">+100</span>
        </>
      ) : (
        <>🎉 Hasło odsłonięte!</>
      )}
      <span className="tv-next-host">
        {' '}
        · 🎩 teraz hasło wymyśla <b>{next?.name || '…'}</b>
      </span>
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

// Wielka animacja końca hasła — ze zwycięzcą albo „wszystkie litery odsłonięte”
function WinOverlay({ s, winnerId }) {
  const winner = winnerId ? s.players[winnerId] : null
  return (
    <div className="win-overlay">
      <div className="win-rays" />
      <div className="win-card">
        <div className="win-crown">{winner ? '👑' : '🎉'}</div>
        {winner && (
          <div className="win-avatar">
            <Avatar player={winner} size="min(15vw, 22vh)" />
          </div>
        )}
        <div className="win-title">{winner ? 'HASŁO ODGADNIĘTE!' : 'WSZYSTKIE LITERY ODSŁONIĘTE!'}</div>
        {winner && <div className="win-name">{winner.name}</div>}
        {winner && <div className="win-pts">+100 pkt</div>}
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

// ❌ ktoś wpisał złe hasło
function WrongSolveOverlay({ lastAction, players }) {
  const fresh = useFreshAction(lastAction?.type === 'wrongSolve' ? lastAction : null, 3200)
  if (!fresh) return null
  const who = players[fresh.playerId]
  return (
    <div className="tv-wrong" key={fresh.ts}>
      <div className="tv-wrong-who">
        <Avatar player={who} size="min(5vw, 7vh)" /> {who?.name || '…'} próbuje:
      </div>
      <div className="tv-wrong-guess">„{fresh.guess}”</div>
      <div className="tv-wrong-x">❌ PUDŁO!</div>
    </div>
  )
}

// Stan dźwięku TV ('on' | 'locked'); pierwszy klik/klawisz na stronie odblokowuje
function useAudioUnlock() {
  const [st, setSt] = useState(() => {
    initAudio()
    return audioState()
  })
  useEffect(() => {
    const off = onAudioStateChange(setSt)
    const unlock = () => unlockAudio()
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    MEMES.filter((m) => !m.optional).forEach((m) => preloadSound(m.src))
    setSt(audioState())
    return () => {
      off()
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])
  return st
}

// TV zapisuje w bazie, czy jej dźwięk działa — gracze widzą to na telefonach.
// Ponawiamy zapis tylko, gdy zmienia się nasz stan albo serwer oznaczył TV
// jako „off” (np. po przeładowaniu karty) — bez przepychanki dwóch TV.
function useReportTvAudio(ready, desired, dbState, actions) {
  const last = useRef(null)
  useEffect(() => {
    if (!ready) return
    return sync.tvPresence?.()
  }, [ready])
  useEffect(() => {
    if (!ready) return
    if (last.current !== desired || !dbState || dbState === 'off') {
      last.current = desired
      actions.setTvAudio(desired)
    }
  }, [ready, desired, dbState, actions])
}

// Dźwięk z soundboardu (tylko TV); memy z YouTube otwierają okienko z filmem
function useMemeSound(meme, soundOn, showYouTube) {
  const lastTs = useRef(0)
  useEffect(() => {
    if (!meme || meme.ts === lastTs.current) return
    lastTs.current = meme.ts
    if (serverNow() - meme.ts > 8000) return // stare zdarzenia pomijamy
    const def = memeById(meme.id)
    if (!def || !soundOn) return
    if (def.youtube) showYouTube({ def, by: meme.by, ts: meme.ts })
    else sounds.meme(def)
  }, [meme, soundOn, showYouTube])
}

// Napis-pieczątka przy memie z soundboardu
function MemeFlash({ meme, players }) {
  const fresh = useFreshAction(meme, 2800)
  const def = fresh ? memeById(fresh.id) : null
  if (!def || def.youtube) return null // film ma własny podpis
  const who = fresh.by ? players?.[fresh.by] : null
  return (
    <div className="meme-flash" key={fresh.ts}>
      <span>{def.caption}</span>
      {who && (
        <span className="meme-flash-who">
          <Avatar player={who} size="min(3.5vw, 5vh)" /> 🔊 {who.name}
        </span>
      )}
    </div>
  )
}

// Dźwięki sterowane akcjami gry (tylko TV)
function useTvSounds(lastAction, soundOn, special = false) {
  const lastTs = useRef(0)
  useEffect(() => {
    const a = lastAction
    if (!a || a.ts === lastTs.current) return
    lastTs.current = a.ts
    if (serverNow() - a.ts > 4000) return // stare zdarzenia (np. po odświeżeniu) pomijamy
    if (!soundOn) return
    if (special && CELEBRATE.includes(a.type)) sounds.please()
    else if (a.type === 'hit') sounds.hit(a.count)
    else if (a.type === 'miss' || a.type === 'wrongSolve') sounds.miss()
    else if (CELEBRATE.includes(a.type) || a.type === 'gameover') sounds.win()
  }, [lastAction, soundOn, special])
}

// ——— Podium na koniec gry ———
function TVOver({ s, players, headerRight, actions }) {
  const top = players.slice(0, 3)
  const rest = players.slice(3)
  // kolejność wizualna: 2. | 1. | 3.
  const order = [top[1], top[0], top[2]].filter(Boolean)
  return (
    <div className="tv">
      <header className="tv-header">
        <Logo small />
        {headerRight}
      </header>
      <div className="tv-over">
        <h1 className="tv-over-title">🏁 KONIEC GRY!</h1>
        <div className="podium">
          {order.map((p) => {
            const place = players.indexOf(p) + 1
            return (
              <div key={p.id} className={`podium-col podium-col--${place}`}>
                <Avatar player={p} size={place === 1 ? 'min(10vw, 15vh)' : 'min(7.5vw, 11vh)'} />
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
        <p className="tv-over-hint">
          Brawa dla wszystkich! 👏 Gracie dalej? Kliknijcie <b>🔄 Zagraj jeszcze raz</b> na
          telefonie albo tutaj:
        </p>
        <ConfirmButton
          className="btn btn--green"
          label="🔄 Nowa gra"
          confirmLabel="Tak, wracamy do poczekalni ▶"
          onConfirm={() => actions.newGame()}
        />
      </div>
    </div>
  )
}

function tickerText(a, players) {
  if (!a) return 'Miłej zabawy! 🎡'
  const name = a.playerId ? players[a.playerId]?.name : null
  switch (a.type) {
    case 'start':
      return '🎬 Plansza gotowa — zgadujcie!'
    case 'turn':
      return `🎤 Literę wybiera: ${name ?? '…'}`
    case 'hit':
      return `✔ ${name ?? '…'} trafia: ${a.letter} ×${a.count} · +${a.count * 10} pkt`
    case 'miss':
      return `✗ Nie ma litery ${a.letter}${name ? ` (${name})` : ''}`
    case 'wrongSolve':
      return `❌ ${name ?? '…'} nie zgaduje hasła`
    default:
      return '🎤 Masz turę i znasz hasło? Kliknij „Znam hasło!” na telefonie'
  }
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

function UsedStrip({ used, visible }) {
  if (!visible) return null
  return (
    <div className="tv-used">
      {ALPHABET.map((L) => {
        const r = usedInfo(used[L])?.r
        return (
          <span
            key={L}
            className={`tv-used-l ${r === 'hit' ? 'tv-used-l--hit' : r === 'miss' ? 'tv-used-l--miss' : ''}`}
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
