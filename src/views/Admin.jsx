import { Link } from 'react-router-dom'
import { useGame, sortedPlayers } from '../lib/store.jsx'
import Board from '../components/Board.jsx'
import HostConsole from '../components/HostConsole.jsx'
import { Logo, Avatar, ConfirmButton, ModeBadge, Spinner } from '../components/common.jsx'

export default function Admin() {
  const { state, ready } = useGame()
  if (!ready) return <Spinner />
  const s = state

  return (
    <div className="page admin">
      <header className="page-header">
        <Link to="/" className="back-link">‹</Link>
        <Logo small />
        <span className="page-role">🎩 Gospodarz</span>
        <ModeBadge />
      </header>

      {s.hostId && s.status !== 'over' ? (
        <SpectatorPanel s={s} />
      ) : (
        <HostConsole hostId={null} isOwner />
      )}
    </div>
  )
}

// Gdy pilot jest u gracza — gospodarz tylko patrzy (bez podglądu hasła!)
// i w razie czego może odebrać prowadzenie albo zakończyć grę.
function SpectatorPanel({ s }) {
  const { actions } = useGame()
  const host = s.players[s.hostId]
  const players = sortedPlayers(s.players)
  return (
    <>
      <section className="panel">
        <div className="host-away">
          <Avatar player={host} size={44} />
          <div>
            <h2>🎩 Prowadzi: {host?.name || '…'}</h2>
            <p className="hint">
              Pilot jest u {host?.name || 'gracza'}. Hasło zna tylko on — możesz
              spokojnie zgadywać z telefonu jako gracz.
            </p>
          </div>
        </div>
        <div className="admin-actions">
          <ConfirmButton
            className="btn btn--warn"
            label="🏠 Odbierz prowadzenie"
            confirmLabel="Na pewno odebrać?"
            onConfirm={() => actions.reclaimHost()}
          />
          {players.length > 0 && (
            <ConfirmButton
              className="btn btn--gold"
              label="🏁 Zakończ grę"
              confirmLabel="Pokazać podium?"
              onConfirm={() => actions.endGame()}
            />
          )}
        </div>
      </section>

      <section className="panel">
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
            <li key={p.id} className={`admin-player ${s.activePlayerId === p.id ? 'admin-player--active' : ''}`}>
              <Avatar player={p} size={34} />
              <span className={`dot ${p.online === false ? 'dot--off' : ''}`} />
              <span className="admin-player-name">
                {p.id === s.hostId ? '🎩 ' : ''}{p.name}
              </span>
              <span className="admin-player-score">{p.score || 0} pkt</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
