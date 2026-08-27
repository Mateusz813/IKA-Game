import { Link } from 'react-router-dom'
import { useGame, sortedPlayers } from '../lib/store.jsx'
import Board from '../components/Board.jsx'
import { Logo, Avatar, ConfirmButton, ModeBadge, Spinner } from '../components/common.jsx'

// Panel awaryjny gospodarza imprezy. Celowo NIE pokazuje hasła (żadnego
// podglądu liter) i nie pozwala przejąć prowadzenia w trakcie rundy —
// hasło zna wyłącznie osoba, która je wpisała.
export default function Admin() {
  const { state, ready, actions } = useGame()
  if (!ready) return <Spinner />
  const s = state
  const host = s.hostId ? s.players[s.hostId] : null
  const players = sortedPlayers(s.players)

  return (
    <div className="page admin">
      <header className="page-header">
        <Link to="/" className="back-link">‹</Link>
        <Logo small />
        <span className="page-role">🎛️ Panel awaryjny</span>
        <ModeBadge />
      </header>

      <section className="panel">
        <h2>Stan gry</h2>
        <p className="hint">
          {s.status === 'playing' ? (
            <>Trwa runda{host && <> — prowadzi <b>{host.name}</b></>}. Hasło widzi tylko prowadzący.</>
          ) : s.status === 'finished' ? (
            <>Runda zakończona{host && <> — pilot ma <b>{host.name}</b></>}.</>
          ) : s.status === 'over' ? (
            'Koniec gry — podium świeci się na TV.'
          ) : host ? (
            <>Pilot ma <b>{host.name}</b> — wpisuje hasło.</>
          ) : (
            'Nikt nie prowadzi — każdy gracz może przejąć pilota w swojej apce.'
          )}
        </p>
        <Board
          phrase={s.status === 'idle' ? '' : s.phrase}
          revealed={s.revealed}
          lastAction={s.lastAction}
          size="mini"
        />
      </section>

      <section className="panel">
        <h2>Gracze ({players.length})</h2>
        <ul className="admin-players">
          {players.map((p) => (
            <li
              key={p.id}
              className={`admin-player ${s.activePlayerId === p.id ? 'admin-player--active' : ''}`}
            >
              <Avatar player={p} size={34} />
              <span className={`dot ${p.online === false ? 'dot--off' : ''}`} />
              <span className="admin-player-name">
                {p.id === s.hostId ? '🎩 ' : ''}{p.name}
              </span>
              <span className="admin-player-score">{p.score || 0} pkt</span>
              <ConfirmButton
                className="btn btn--small btn--ghost"
                label="✕"
                confirmLabel="Usunąć?"
                onConfirm={() => actions.removePlayer(p.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Akcje awaryjne</h2>
        <p className="hint">
          Używaj tylko, gdy coś się zatnie (np. prowadzącemu padł telefon).
        </p>
        <div className="admin-actions">
          {s.status === 'playing' && (
            <ConfirmButton
              className="btn btn--danger"
              label="✖ Przerwij rundę"
              confirmLabel="Na pewno przerwać?"
              onConfirm={() => actions.newRound()}
            />
          )}
          {s.hostId && s.status !== 'playing' && (
            <ConfirmButton
              className="btn btn--warn"
              label="🔓 Zwolnij pilota"
              confirmLabel={`Odebrać pilota${host ? ` (${host.name})` : ''}?`}
              onConfirm={() => actions.reclaimHost()}
            />
          )}
          {s.status !== 'over' && players.length > 0 && (
            <ConfirmButton
              className="btn btn--gold"
              label="🏁 Zakończ grę"
              confirmLabel="Pokazać podium?"
              onConfirm={() => actions.endGame()}
            />
          )}
          {s.status === 'over' && (
            <>
              <button className="btn btn--primary" onClick={() => actions.newRound()}>
                ▶ Gramy dalej (punkty zostają)
              </button>
              <ConfirmButton
                className="btn"
                label="🔄 Nowa gra od zera"
                confirmLabel="Wyzerować punkty?"
                onConfirm={() => actions.newGame()}
              />
            </>
          )}
          {players.length > 0 && (
            <ConfirmButton
              className="btn btn--ghost"
              label="Wyzeruj punkty"
              confirmLabel="Wyzerować wszystkim?"
              onConfirm={() => actions.resetScores()}
            />
          )}
          <ConfirmButton
            className="btn btn--danger"
            label="⏮ Od samego początku"
            confirmLabel="Usunąć też graczy?"
            onConfirm={() => actions.resetAll()}
          />
        </div>
      </section>
    </div>
  )
}
