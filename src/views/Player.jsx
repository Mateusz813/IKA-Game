import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGame, sortedPlayers } from '../lib/store.jsx'
import {
  useFreshAction,
  getPlayerId,
  getSavedName,
  saveName,
  clearSavedName,
} from '../lib/hooks.js'
import Board from '../components/Board.jsx'
import Keyboard from '../components/Keyboard.jsx'
import HostConsole from '../components/HostConsole.jsx'
import {
  Logo,
  Avatar,
  ConfirmButton,
  ModeBadge,
  Spinner,
  fileToAvatar,
} from '../components/common.jsx'

export default function Player() {
  const { state, ready, actions } = useGame()
  const myId = getPlayerId()
  const autoJoined = useRef(false)
  const [params, setParams] = useSearchParams()
  const wantHost = params.get('host') === '1'

  // wejście z kafelka „Admin”: po dołączeniu od razu przejmij pilota
  // (jeśli wolny — claimHost sam pilnuje, żeby nikomu go nie zabrać)
  useEffect(() => {
    if (!ready || !wantHost || !state.players[myId]) return
    actions.claimHost(myId)
    setParams({}, { replace: true })
  }, [ready, wantHost, !!state.players[myId]]) // eslint-disable-line react-hooks/exhaustive-deps

  // Automatyczny powrót do gry po odświeżeniu (raz na wejście)
  useEffect(() => {
    if (!ready || autoJoined.current) return
    const saved = getSavedName()
    if (saved && !state.players[myId]) {
      autoJoined.current = true
      actions.joinPlayer(myId, saved)
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // Utrzymuj status online (Firebase presence)
  useEffect(() => {
    if (ready && state.players[myId]) actions.joinPlayer(myId, state.players[myId].name)
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <Spinner />
  const me = state.players[myId]

  if (!me)
    return (
      <JoinScreen
        asHost={wantHost}
        onJoin={(name, photo) => {
          saveName(name)
          actions.joinPlayer(myId, name, photo)
        }}
      />
    )

  const offered = state.handover?.toId === myId
  return (
    <>
      {offered && (
        <HandoverModal actions={actions} myId={myId} playing={state.status === 'playing'} />
      )}
      {state.hostId === myId ? (
        <HostMode s={state} me={me} myId={myId} actions={actions} />
      ) : (
        <GameScreen s={state} actions={actions} myId={myId} me={me} />
      )}
    </>
  )
}

function JoinScreen({ onJoin, asHost = false }) {
  const [name, setName] = useState(getSavedName())
  const [photo, setPhoto] = useState(null)
  const fileRef = useRef(null)
  const ok = name.trim().length >= 2
  return (
    <div className="home">
      <Logo />
      <p className="home-sub">
        {asHost ? 'Dołącz i podawaj pierwsze hasło 🎩' : 'Dołącz do gry 🎮'}
      </p>
      <form
        className="join-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onJoin(name.trim().slice(0, 16), photo)
        }}
      >
        <button
          type="button"
          className="avatar-pick"
          onClick={() => fileRef.current?.click()}
        >
          {photo ? (
            <img src={photo} alt="" className="avatar" style={{ width: 96, height: 96 }} />
          ) : (
            <span className="avatar-pick-empty">📷</span>
          )}
          <span className="avatar-pick-label">
            {photo ? 'zmień zdjęcie' : 'zrób sobie zdjęcie (opcjonalnie)'}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) setPhoto(await fileToAvatar(f))
            e.target.value = ''
          }}
        />
        <input
          className="input input--join"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          placeholder="Twoje imię…"
        />
        <button className="btn btn--primary btn--big" disabled={!ok}>
          Dołącz do gry
        </button>
      </form>
      <InstallHint />
      <ModeBadge />
    </div>
  )
}

// Podpowiedź instalacji PWA — znika, gdy apka już działa z ekranu głównego
function InstallHint() {
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone
  if (standalone) return null
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  return (
    <p className="install-hint">
      {ios ? (
        <>
          📲 Zainstaluj jak apkę: <b>Udostępnij</b> 📤 → przewiń w dół →{' '}
          <b>„Dodaj do ekranu głównego”</b>
        </>
      ) : (
        <>
          📲 Zainstaluj jak apkę: menu przeglądarki <b>⋮</b> →{' '}
          <b>„Dodaj do ekranu głównego”</b>
        </>
      )}
    </p>
  )
}

// Propozycja przejęcia prowadzenia — pełnoekranowy modal
function HandoverModal({ actions, myId, playing = false }) {
  useEffect(() => {
    try {
      navigator.vibrate?.([150, 80, 150])
    } catch { /* ignore */ }
  }, [])
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-emoji">🎩</div>
        <h2>Przejmiesz prowadzenie?</h2>
        <p>
          {playing
            ? 'Dokończysz prowadzenie tego hasła — zobaczysz je i będziesz wyznaczać, kto odpowiada. Od teraz nie zgadujesz. Punkty wszystkich zostają.'
            : 'Wpiszesz następne hasło i będziesz wybierać, kto odpowiada. W swojej rundzie nie zgadujesz (znasz hasło 😉). Punkty wszystkich zostają.'}
        </p>
        <button className="btn btn--primary btn--big" onClick={() => actions.acceptHost(myId)}>
          ✅ Jasne, prowadzę!
        </button>
        <button className="btn btn--ghost" onClick={() => actions.declineHost(myId)}>
          Nie, dzięki
        </button>
      </div>
    </div>
  )
}

// Gracz z pilotem — pełny panel prowadzącego
function HostMode({ s, me, myId, actions }) {
  return (
    <div className="page admin">
      <header className="page-header">
        <Link to="/" className="back-link">‹</Link>
        <Logo small />
        <span className="player-me">
          <Avatar player={me} size={28} /> 🎩 {me.name} ·{' '}
          <b key={me.score} className="score-bump">{me.score || 0} pkt</b>
        </span>
        <ModeBadge />
      </header>
      {s.status === 'idle' && (
        <div className="status-strip status-strip--turn">
          🎩 Prowadzisz! Wpisz hasło i wybieraj, kto odpowiada.
        </div>
      )}
      <HostConsole hostId={myId} />
      {s.status !== 'playing' && (
        <div className="claim-host">
          <ConfirmButton
            className="btn btn--ghost btn--small"
            label="🏠 Oddaję pilota"
            confirmLabel="Oddać prowadzenie?"
            onConfirm={() => actions.reclaimHost()}
          />
        </div>
      )}
    </div>
  )
}

function GameScreen({ s, actions, myId, me }) {
  const myTurn = s.status === 'playing' && s.activePlayerId === myId
  const activeName = s.activePlayerId ? s.players[s.activePlayerId]?.name : null
  const feedback = useFreshAction(s.lastAction, 2600)
  const myFeedback =
    feedback && feedback.playerId === myId && ['hit', 'miss'].includes(feedback.type)
      ? feedback
      : null
  const fileRef = useRef(null)

  // Wibracja, gdy dostajesz turę
  useEffect(() => {
    if (myTurn) {
      try {
        navigator.vibrate?.([120, 60, 120])
      } catch { /* ignore */ }
    }
  }, [myTurn])

  return (
    <div className="page player">
      <header className="page-header">
        <Link to="/" className="back-link">‹</Link>
        <Logo small />
        <span className="player-me">
          <button type="button" className="avatar-btn" onClick={() => fileRef.current?.click()} title="Zmień zdjęcie">
            <Avatar player={me} size={30} />
          </button>{' '}
          {me.name} · <b key={me.score} className="score-bump">{me.score || 0} pkt</b>
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) actions.setPhoto(myId, await fileToAvatar(f))
            e.target.value = ''
          }}
        />
        <ModeBadge />
      </header>

      {s.status === 'over' ? (
        <PlayerOver s={s} myId={myId} actions={actions} />
      ) : (
        <>
          <StatusStrip s={s} myTurn={myTurn} myId={myId} activeName={activeName} />

          {!s.hostId && s.status !== 'playing' && (
            <div className="claim-host">
              <ConfirmButton
                className="btn btn--primary"
                label="🎩 Poprowadzę — wpiszę hasło"
                confirmLabel="Przejąć pilota?"
                onConfirm={() => actions.claimHost(myId)}
              />
            </div>
          )}

          {s.category && s.status !== 'idle' && (
            <div className="player-category">
              <span className="chip">{s.category}</span>
            </div>
          )}

          <Board
            phrase={s.status === 'idle' ? '' : s.phrase}
            revealed={s.revealed}
            lastAction={s.lastAction}
            size="mini"
          />

          <div className="player-kbd">
            {myFeedback && (
              <div
                className={`guess-feedback ${
                  myFeedback.type === 'hit' ? 'guess-feedback--hit' : 'guess-feedback--miss'
                }`}
              >
                {myFeedback.type === 'hit'
                  ? `🎉 ${myFeedback.letter} ×${myFeedback.count} · +${myFeedback.count * 10} pkt!`
                  : `✗ Nie ma litery ${myFeedback.letter}`}
              </div>
            )}
            <Keyboard
              used={s.used}
              disabled={!myTurn}
              viewerId={myId}
              onPick={(L) => actions.guessLetter(L, myId)}
            />
            <p className="kbd-legend">
              <span className="leg leg--mine" /> Twoje trafienia
              <span className="leg leg--other" /> trafienia innych
              <span className="leg leg--miss" /> pudła
            </p>
          </div>

          <Leaderboard s={s} myId={myId} />
        </>
      )}

      <footer className="player-footer">
        <ConfirmButton
          className="btn btn--ghost btn--small"
          label="Opuść grę"
          confirmLabel="Na pewno wyjść?"
          onConfirm={() => {
            clearSavedName()
            actions.removePlayer(myId)
          }}
        />
      </footer>
    </div>
  )
}

function PlayerOver({ s, myId, actions }) {
  const players = sortedPlayers(s.players)
  const myRank = players.findIndex((p) => p.id === myId) + 1
  return (
    <>
      <div className="status-strip status-strip--win">
        🏁 Koniec gry! {myRank === 1 ? 'Wygrywasz! 🏆' : `Twoje miejsce: ${myRank}.`}
      </div>
      <Leaderboard s={s} myId={myId} />
      <p className="hint" style={{ textAlign: 'center' }}>
        Podium jest na telewizorze.
      </p>
      {!s.hostId && (
        <div className="claim-host">
          <ConfirmButton
            className="btn btn--primary"
            label="🎩 Poprowadzę nowe hasło"
            confirmLabel="Gramy dalej? (punkty zostają)"
            onConfirm={() => actions.claimHost(myId)}
          />
        </div>
      )}
    </>
  )
}

function StatusStrip({ s, myTurn, myId, activeName }) {
  if (s.status === 'idle')
    return <div className="status-strip">⏳ Czekamy, aż prowadzący wpisze hasło…</div>
  if (s.status === 'finished') {
    const winner = s.winnerId ? s.players[s.winnerId] : null
    if (s.winnerId === myId)
      return <div className="status-strip status-strip--win">🏆 WYGRYWASZ! +100 pkt</div>
    return (
      <div className="status-strip">
        {winner ? <>🏆 Hasło zgadł(a): <b>{winner.name}</b></> : '🎉 Koniec rundy!'}
      </div>
    )
  }
  if (myTurn)
    return (
      <div className="status-strip status-strip--turn">
        🎤 TWOJA KOLEJ — wybierz literę!
      </div>
    )
  return (
    <div className="status-strip">
      {activeName ? (
        <>🎧 Odpowiada: <b>{activeName}</b></>
      ) : (
        '🔒 Czekaj, aż prowadzący da Ci turę'
      )}
    </div>
  )
}

function Leaderboard({ s, myId }) {
  const players = sortedPlayers(s.players)
  if (!players.length) return null
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="leaderboard">
      {players.map((p, i) => (
        <div
          key={p.id}
          className={`lb-row ${p.id === myId ? 'lb-row--me' : ''} ${
            s.activePlayerId === p.id ? 'lb-row--active' : ''
          }`}
        >
          <span className="lb-rank">{medals[i] || `${i + 1}.`}</span>
          <Avatar player={p} size={26} />
          <span className="lb-name">
            {p.id === s.hostId ? '🎩 ' : ''}{p.name}
          </span>
          <span className="lb-score">{p.score || 0}</span>
        </div>
      ))}
    </div>
  )
}
