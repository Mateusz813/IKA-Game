import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { Logo, ConfirmButton, ModeBadge, Spinner } from '../components/common.jsx'

export default function Player() {
  const { state, ready, actions } = useGame()
  const myId = getPlayerId()
  const autoJoined = useRef(false)

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
  return me ? (
    <GameScreen s={state} actions={actions} myId={myId} me={me} />
  ) : (
    <JoinScreen
      onJoin={(name) => {
        saveName(name)
        actions.joinPlayer(myId, name)
      }}
    />
  )
}

function JoinScreen({ onJoin }) {
  const [name, setName] = useState(getSavedName())
  const ok = name.trim().length >= 2
  return (
    <div className="home">
      <Logo />
      <p className="home-sub">Dołącz do gry 🎮</p>
      <form
        className="join-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onJoin(name.trim().slice(0, 16))
        }}
      >
        <input
          className="input input--join"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          placeholder="Twoje imię…"
          autoFocus
        />
        <button className="btn btn--primary btn--big" disabled={!ok}>
          Dołącz do gry
        </button>
      </form>
      <ModeBadge />
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
          {me.name} · <b key={me.score} className="score-bump">{me.score || 0} pkt</b>
        </span>
        <ModeBadge />
      </header>

      <StatusStrip s={s} myTurn={myTurn} myId={myId} activeName={activeName} />

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
          onPick={(L) => actions.guessLetter(L, myId)}
        />
      </div>

      <Leaderboard s={s} myId={myId} />

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
          <span className="lb-name">{p.name}</span>
          <span className="lb-score">{p.score || 0}</span>
        </div>
      ))}
    </div>
  )
}
