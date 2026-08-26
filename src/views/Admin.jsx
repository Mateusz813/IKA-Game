import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame, sortedPlayers } from '../lib/store.jsx'
import { cleanPhrase } from '../lib/alphabet.js'
import { layoutBoard } from '../lib/layout.js'
import Board from '../components/Board.jsx'
import Keyboard from '../components/Keyboard.jsx'
import { Logo, ConfirmButton, ModeBadge, Spinner } from '../components/common.jsx'

export default function Admin() {
  const { state, ready, actions } = useGame()
  if (!ready) return <Spinner />
  const s = state

  return (
    <div className="page admin">
      <header className="page-header">
        <Link to="/" className="back-link">‹</Link>
        <Logo small />
        <span className="page-role">🎩 Prowadzący</span>
        <ModeBadge />
      </header>

      {s.status === 'playing' ? (
        <GamePanel s={s} actions={actions} />
      ) : (
        <SetupPanel s={s} actions={actions} />
      )}

      <PlayersPanel s={s} actions={actions} />
    </div>
  )
}

function SetupPanel({ s, actions }) {
  const [phrase, setPhrase] = useState('')
  const [category, setCategory] = useState(s.category || '')
  const clean = cleanPhrase(phrase)
  const { fits } = useMemo(() => layoutBoard(clean), [clean])
  const tooLong = clean.split(' ').some((w) => w.length > 14)
  const canStart = !!clean && fits

  return (
    <section className="panel">
      {s.status === 'finished' && <FinishedBanner s={s} />}
      <h2>Nowe hasło</h2>
      <label className="field">
        <span>Hasło do odgadnięcia</span>
        <textarea
          rows={2}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="np. LEPSZY WRÓBEL W GARŚCI"
          className="input input--phrase"
        />
      </label>
      <label className="field">
        <span>Kategoria (opcjonalnie)</span>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="np. PRZYSŁOWIE"
          className="input"
        />
      </label>

      {clean && (
        <div className="preview">
          <span className="preview-label">Podgląd planszy:</span>
          <Board phrase={fits ? clean : ''} revealed={{}} ghost size="mini" />
          {!fits && (
            <div className="form-error">
              {tooLong
                ? 'Któreś słowo ma ponad 14 liter — nie zmieści się w rzędzie.'
                : 'Hasło jest za długie — nie mieści się na planszy (4 rzędy).'}
            </div>
          )}
        </div>
      )}

      <button
        className="btn btn--primary btn--big"
        disabled={!canStart}
        onClick={() => actions.startGame(clean, category)}
      >
        🎬 Start gry!
      </button>
    </section>
  )
}

function FinishedBanner({ s }) {
  const winner = s.winnerId ? s.players[s.winnerId] : null
  return (
    <div className="finished-banner">
      {winner ? (
        <>🏆 Hasło „{s.phrase}” odgadł(a) <b>{winner.name}</b>!</>
      ) : (
        <>🎉 Runda zakończona. Hasło: „{s.phrase}”</>
      )}
    </div>
  )
}

function GamePanel({ s, actions }) {
  const activeName = s.activePlayerId ? s.players[s.activePlayerId]?.name : null
  return (
    <section className="panel">
      <div className="admin-category">
        {s.category ? <span className="chip">{s.category}</span> : <span />}
        <span className="chip chip--muted">runda {s.round}</span>
      </div>

      <Board
        phrase={s.phrase}
        revealed={s.revealed}
        lastAction={s.lastAction}
        ghost
        size="mini"
      />

      <div className={`turn-info ${activeName ? 'turn-info--active' : ''}`}>
        {activeName ? (
          <>🎤 Odpowiada: <b>{activeName}</b></>
        ) : (
          <>🔒 Nikt nie ma tury — wybierz gracza niżej albo sam kliknij literę</>
        )}
      </div>

      <p className="hint">
        Kliknięta litera odsłania się u wszystkich. Punkty dostaje gracz z turą.
      </p>
      <Keyboard used={s.used} onPick={(L) => actions.guessLetter(L)} />

      <div className="admin-actions">
        <ConfirmButton
          className="btn"
          label="👁 Odsłoń hasło"
          confirmLabel="Odsłonić wszystko?"
          onConfirm={() => actions.revealAll()}
        />
        <ConfirmButton
          className="btn btn--danger"
          label="✖ Przerwij rundę"
          confirmLabel="Na pewno przerwać?"
          onConfirm={() => actions.newRound()}
        />
      </div>
    </section>
  )
}

function PlayersPanel({ s, actions }) {
  const players = sortedPlayers(s.players)
  const playing = s.status === 'playing'
  const finished = s.status === 'finished'
  return (
    <section className="panel">
      <h2>Gracze ({players.length})</h2>
      {!players.length && (
        <p className="hint">
          Nikt jeszcze nie dołączył. Gracze wchodzą na stronę i wybierają „Gracz” —
          na ekranie TV jest kod QR.
        </p>
      )}
      <ul className="admin-players">
        {players.map((p) => {
          const active = s.activePlayerId === p.id
          return (
            <li key={p.id} className={`admin-player ${active ? 'admin-player--active' : ''}`}>
              <span className={`dot ${p.online === false ? 'dot--off' : ''}`} />
              <span className="admin-player-name">{p.name}</span>
              <span className="admin-player-score">{p.score || 0} pkt</span>
              {playing && (
                <button
                  className={`btn btn--small ${active ? 'btn--warn' : 'btn--primary'}`}
                  onClick={() =>
                    active ? actions.revokeTurn() : actions.grantTurn(p.id)
                  }
                >
                  {active ? '🔒 Zablokuj' : '🎤 Daj turę'}
                </button>
              )}
              {playing && (
                <ConfirmButton
                  className="btn btn--small btn--gold"
                  label="🏆"
                  confirmLabel="Zgadł(a)? +100"
                  onConfirm={() => actions.awardPhrase(p.id)}
                />
              )}
              <ConfirmButton
                className="btn btn--small btn--ghost"
                label="✕"
                confirmLabel="Usunąć?"
                onConfirm={() => actions.removePlayer(p.id)}
              />
            </li>
          )
        })}
      </ul>
      <div className="admin-actions">
        {finished && (
          <button className="btn btn--primary" onClick={() => actions.newRound()}>
            🔄 Nowa runda
          </button>
        )}
        {players.length > 0 && (
          <ConfirmButton
            className="btn btn--ghost"
            label="Wyzeruj punkty"
            confirmLabel="Wyzerować wszystkim?"
            onConfirm={() => actions.resetScores()}
          />
        )}
      </div>
    </section>
  )
}
