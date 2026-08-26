import { useMemo, useState } from 'react'
import { useGame, sortedPlayers } from '../lib/store.jsx'
import { cleanPhrase } from '../lib/alphabet.js'
import { layoutBoard } from '../lib/layout.js'
import { useFreshAction } from '../lib/hooks.js'
import Board from './Board.jsx'
import Keyboard from './Keyboard.jsx'
import { Avatar, ConfirmButton } from './common.jsx'

// Panel prowadzącego — używany przez gospodarza (/admin, hostId=null)
// oraz przez gracza, któremu przekazano pilota (hostId = jego id).
export default function HostConsole({ hostId = null, isOwner = false }) {
  const { state: s, actions } = useGame()
  return (
    <>
      {s.status === 'playing' ? (
        <GamePanel s={s} actions={actions} hostId={hostId} />
      ) : s.status === 'over' ? (
        <OverPanel s={s} actions={actions} />
      ) : (
        <SetupPanel s={s} actions={actions} hostId={hostId} />
      )}
      <PlayersPanel s={s} actions={actions} hostId={hostId} isOwner={isOwner} />
    </>
  )
}

function SetupPanel({ s, actions, hostId }) {
  if (s.status === 'finished')
    return (
      <section className="panel">
        <FinishedBanner s={s} />
        <HandoverCard s={s} actions={actions} hostId={hostId} />
      </section>
    )
  return <PhraseForm s={s} actions={actions} />
}

function PhraseForm({ s, actions }) {
  const [phrase, setPhrase] = useState('')
  const [category, setCategory] = useState('')
  const clean = cleanPhrase(phrase)
  const { fits } = useMemo(() => layoutBoard(clean), [clean])
  const tooLong = clean.split(' ').some((w) => w.length > 14)
  const canStart = !!clean && fits

  return (
    <section className="panel">
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

// Po zakończonym haśle: prowadzisz dalej czy przekazujesz pilota?
function HandoverCard({ s, actions, hostId }) {
  const fresh = useFreshAction(s.lastAction, 6000)
  const declinedBy =
    fresh?.type === 'hostDecline' ? s.players[fresh.playerId]?.name : null
  // rotacja: pierwszy w kolejce jest ten, kto najdawniej (lub nigdy) nie prowadził
  const candidates = sortedPlayers(s.players)
    .filter((p) => p.id !== hostId)
    .sort((a, b) => (a.hostedAt || 0) - (b.hostedAt || 0) || a.joinedAt - b.joinedAt)

  if (s.handover) {
    const name = s.players[s.handover.toId]?.name || '…'
    return (
      <div className="handover">
        <h3>⏳ Czekamy, aż <b>{name}</b> przyjmie prowadzenie…</h3>
        <button className="btn" onClick={() => actions.cancelOffer()}>
          Anuluj
        </button>
      </div>
    )
  }

  return (
    <div className="handover">
      <h3>Kto prowadzi następne hasło?</h3>
      {declinedBy && (
        <p className="hint">😅 {declinedBy} nie przyjmuje prowadzenia — wybierz kogoś innego albo prowadź dalej.</p>
      )}
      <button className="btn btn--primary btn--big" onClick={() => actions.newRound()}>
        🎬 Ja — wpisuję nowe hasło
      </button>
      {candidates.length > 0 && (
        <>
          <p className="hint">…albo przekaż pilota (▶ = kolej według rotacji):</p>
          <div className="handover-chips">
            {candidates.map((p, i) => (
              <button
                key={p.id}
                className={`btn ${i === 0 ? 'btn--primary' : ''}`}
                onClick={() => actions.offerHost(p.id)}
              >
                {i === 0 ? '▶ ' : ''}
                <Avatar player={p} size={22} /> {p.name}
              </button>
            ))}
          </div>
        </>
      )}
      {hostId && (
        <button className="btn btn--ghost" onClick={() => actions.reclaimHost()}>
          🏠 Oddaj pilota gospodarzowi
        </button>
      )}
    </div>
  )
}

function GamePanel({ s, actions, hostId }) {
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
      <Keyboard used={s.used} viewerId={hostId} onPick={(L) => actions.guessLetter(L)} />

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

// Koniec gry — podsumowanie po stronie prowadzącego
function OverPanel({ s, actions }) {
  const players = sortedPlayers(s.players)
  return (
    <section className="panel">
      <h2>🏁 Koniec gry!</h2>
      <p className="hint">Podium świeci się na telewizorze. Co dalej?</p>
      <ol className="over-list">
        {players.map((p, i) => (
          <li key={p.id}>
            <span className="lb-rank">{['🥇', '🥈', '🥉'][i] || `${i + 1}.`}</span>
            <Avatar player={p} size={30} />
            <span className="lb-name">{p.name}</span>
            <span className="lb-score">{p.score || 0}</span>
          </li>
        ))}
      </ol>
      <div className="admin-actions">
        <button className="btn btn--primary" onClick={() => actions.newRound()}>
          ▶ Gramy dalej (punkty zostają)
        </button>
        <ConfirmButton
          className="btn"
          label="🔄 Nowa gra od zera"
          confirmLabel="Wyzerować punkty?"
          onConfirm={() => actions.newGame()}
        />
        <ConfirmButton
          className="btn btn--danger"
          label="⏮ Od samego początku"
          confirmLabel="Usunąć też graczy?"
          onConfirm={() => actions.resetAll()}
        />
      </div>
    </section>
  )
}

function PlayersPanel({ s, actions, hostId, isOwner }) {
  const players = sortedPlayers(s.players)
  const playing = s.status === 'playing'
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
          const isMe = hostId && p.id === hostId
          return (
            <li key={p.id} className={`admin-player ${active ? 'admin-player--active' : ''}`}>
              <Avatar player={p} size={34} />
              <span className={`dot ${p.online === false ? 'dot--off' : ''}`} />
              <span className="admin-player-name">
                {p.id === s.hostId ? '🎩 ' : ''}{p.name}
              </span>
              <span className="admin-player-score">{p.score || 0} pkt</span>
              {isMe ? (
                <span className="host-tag">to Ty</span>
              ) : (
                <>
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
                </>
              )}
            </li>
          )
        })}
      </ul>
      <div className="admin-actions">
        {isOwner && s.status !== 'over' && players.length > 0 && (
          <ConfirmButton
            className="btn btn--gold"
            label="🏁 Zakończ grę"
            confirmLabel="Pokazać podium?"
            onConfirm={() => actions.endGame()}
          />
        )}
        {players.length > 0 && s.status !== 'over' && (
          <ConfirmButton
            className="btn btn--ghost"
            label="Wyzeruj punkty"
            confirmLabel="Wyzerować wszystkim?"
            onConfirm={() => actions.resetScores()}
          />
        )}
        {isOwner && s.status !== 'over' && (
          <ConfirmButton
            className="btn btn--ghost"
            label="⏮ Od początku"
            confirmLabel="Reset + usunięcie graczy?"
            onConfirm={() => actions.resetAll()}
          />
        )}
      </div>
    </section>
  )
}
