import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  useGame,
  sortedPlayers,
  roundLabel,
  modeName,
  modeKey,
  winCondition,
  isSpecialRound,
  isOnline,
} from '../lib/store.jsx'
import {
  useFreshAction,
  getPlayerId,
  getSavedName,
  saveName,
  clearSavedName,
  getSavedGameId,
  saveGameId,
  serverNow,
} from '../lib/hooks.js'
import Board from '../components/Board.jsx'
import Keyboard from '../components/Keyboard.jsx'
import PhoneHeader, { HowToPlay } from '../components/PhoneHeader.jsx'
import { PhraseForm, HostPlaying, TvAudioHint, PlayerPicker } from '../components/HostConsole.jsx'
import { Logo, Avatar, ConfirmButton, ModeBadge, Spinner, fileToAvatar } from '../components/common.jsx'

export default function Player() {
  const { state, ready, actions } = useGame()
  const myId = getPlayerId()
  const autoJoined = useRef(false)
  const [params, setParams] = useSearchParams()
  const wantAdmin = params.get('admin') === '1'

  const navigate = useNavigate()
  const openedAt = useRef(serverNow())

  // Automatyczny powrót do gry po odświeżeniu (raz na wejście) — tylko do tej
  // samej gry: po resecie admina (nowe gameId) trzeba dołączyć od nowa
  useEffect(() => {
    if (!ready || autoJoined.current) return
    autoJoined.current = true
    const saved = getSavedName()
    const sameGame = !state.gameId || getSavedGameId() === state.gameId || !!state.players[myId]
    if (saved && sameGame) {
      actions.joinPlayer(myId, state.players[myId]?.name || saved)
      saveGameId(state.gameId)
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // 🧹 admin zresetował grę — wszyscy wracają na start
  const la = state.lastAction
  useEffect(() => {
    if (!ready || la?.type !== 'hardreset' || la.ts < openedAt.current) return
    if (state.players[myId]) return
    clearSavedName()
    navigate('/', { replace: true })
  }, [ready, la?.type, la?.ts]) // eslint-disable-line react-hooks/exhaustive-deps

  // wejście z kafelka „Admin”: po dołączeniu zostań adminem (jeśli wolne)
  const joined = !!state.players[myId]
  useEffect(() => {
    if (!ready || !wantAdmin || !joined) return
    actions.claimAdmin(myId)
    const next = new URLSearchParams(params)
    next.delete('admin')
    setParams(next, { replace: true })
  }, [ready, wantAdmin, joined]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <Spinner />
  const me = state.players[myId]
  if (!me)
    return (
      <JoinScreen
        s={state}
        asAdmin={wantAdmin}
        onJoin={(name, photo) => {
          saveName(name)
          saveGameId(state.gameId)
          actions.joinPlayer(myId, name, photo)
        }}
      />
    )
  return <PhoneShell s={state} me={me} myId={myId} actions={actions} />
}

function PhoneShell({ s, me, myId, actions }) {
  const isHost = s.hostId === myId
  let body
  if (s.status === 'lobby') body = <Lobby s={s} myId={myId} actions={actions} />
  else if (s.status === 'over') body = <OverScreen s={s} myId={myId} actions={actions} />
  else if (s.status === 'playing')
    body = isHost ? (
      <HostPlaying s={s} myId={myId} actions={actions} />
    ) : (
      <PlayerPlaying s={s} me={me} myId={myId} actions={actions} />
    )
  else if (s.status === 'finished')
    body = isHost ? (
      <HandoverPanel s={s} myId={myId} actions={actions} />
    ) : (
      <>
        <RoundResult s={s} myId={myId} />
        <div className="status-strip">
          ⏳ {s.players[s.hostId]?.name || 'Prowadzący'} wybiera, kto prowadzi następne hasło…
        </div>
        <Leaderboard s={s} myId={myId} />
      </>
    )
  else
    body = isHost ? (
      <>
        <div className="status-strip status-strip--turn">
          🎩 Twoja kolej — wpisz kategorię i hasło!
        </div>
        <PhraseForm s={s} myId={myId} actions={actions} />
      </>
    ) : (
      <WaitingForPhrase s={s} myId={myId} />
    )

  return (
    <div className="page player">
      <PhoneHeader s={s} me={me} myId={myId} actions={actions} />
      {s.specialVideo && isHost && <SpecialControls actions={actions} />}
      {body}
    </div>
  )
}

// ——— dołączanie ———
function JoinScreen({ s, onJoin, asAdmin }) {
  const [name, setName] = useState(getSavedName())
  const [photo, setPhoto] = useState(null)
  const fileRef = useRef(null)
  const ok = name.trim().length >= 2
  const count = Object.keys(s.players).length
  return (
    <div className="home">
      <Logo />
      <p className="home-sub">
        {asAdmin
          ? 'Dołączasz jako admin 👑 — wybierzesz tryb gry i wpiszesz pierwsze hasło'
          : count
            ? `Dołącz do gry — w środku już ${count} ${count === 1 ? 'osoba' : count < 5 ? 'osoby' : 'osób'} 🎮`
            : 'Dołącz do gry 🎮'}
      </p>
      <form
        className="join-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onJoin(name.trim().slice(0, 16), photo)
        }}
      >
        <button type="button" className="avatar-pick" onClick={() => fileRef.current?.click()}>
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
          {asAdmin ? '👑 Dołącz jako admin' : 'Dołącz do gry'}
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
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
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
          📲 Zainstaluj jak apkę: menu przeglądarki <b>⋮</b> → <b>„Dodaj do ekranu głównego”</b>
        </>
      )}
    </p>
  )
}

// ——— poczekalnia ———
const OPTIONS = [
  { key: 'r5', label: '5 haseł', hint: 'krótka gra' },
  { key: 'r10', label: '10 haseł', hint: 'dłuższa gra' },
  { key: 'p300', label: 'Do 300 pkt', hint: 'kto pierwszy' },
  { key: 'p500', label: 'Do 500 pkt', hint: 'długa gra' },
]

function ModeCard({ s }) {
  return (
    <div className="mode-card">
      <div className="mode-card-name">🏁 Tryb: {modeName(s.settings)}</div>
      <div className="mode-card-win">{winCondition(s.settings)}</div>
    </div>
  )
}

function Lobby({ s, myId, actions }) {
  const players = sortedPlayers(s.players).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
  const iAmAdmin = s.adminId === myId
  const admin = s.players[s.adminId]
  const current = modeKey(s.settings)
  return (
    <>
      <div className="status-strip status-strip--turn">
        {iAmAdmin
          ? '👑 Jesteś adminem — wybierz tryb i wystartuj, gdy wszyscy dołączą'
          : admin
            ? `👋 Jesteś w grze! Czekamy, aż ${admin.name} wystartuje.`
            : '👋 Jesteś w grze! Czekamy na admina.'}
      </div>

      <section className="panel">
        <h2>👥 W grze ({players.length})</h2>
        <div className="lobby-players">
          {players.map((p) => (
            <span key={p.id} className={`lobby-player ${p.id === myId ? 'lobby-player--me' : ''}`}>
              <Avatar player={p} size={26} /> {p.name}
              {p.id === s.adminId ? ' 👑' : ''}
            </span>
          ))}
        </div>
        <p className="hint">Reszta skanuje kod QR z telewizora.</p>
      </section>

      {iAmAdmin ? (
        <>
          <section className="panel">
            <h2>⏱ Tryb gry</h2>
            <div className="opt-grid">
              {OPTIONS.map((o) => (
                <button
                  key={o.key}
                  className={`opt ${current === o.key ? 'opt--on' : ''}`}
                  onClick={() => actions.setSettings(myId, o.key)}
                >
                  <span className="opt-label">{o.label}</span>
                  <span className="opt-hint">{o.hint}</span>
                </button>
              ))}
            </div>
            <p className="hint">{winCondition(s.settings)}.</p>
          </section>
          <section className="panel">
            <TvAudioHint state={s.tvAudio?.state} />
            <ConfirmButton
              className="btn btn--green btn--big btn--block"
              label="▶ Start — wymyślam pierwsze hasło"
              confirmLabel={`Start! Tryb: ${modeName(s.settings)} ▶`}
              onConfirm={() => actions.startGame(myId)}
            />
          </section>
        </>
      ) : (
        <>
          <ModeCard s={s} />
          {(!admin || !isOnline(admin)) && (
            <ConfirmButton
              className="btn btn--block"
              label="👑 Nikt nie jest adminem — zostań nim"
              confirmLabel="Tak, będę adminem 👑"
              onConfirm={() => actions.claimAdmin(myId)}
            />
          )}
        </>
      )}

      <HowToPlay />
    </>
  )
}

// ——— czekanie na hasło ———
function WaitingForPhrase({ s, myId }) {
  const host = s.players[s.hostId]
  const fresh = useFreshAction(s.lastAction?.type === 'gamestart' ? s.lastAction : null, 15000)
  return (
    <>
      {fresh && (
        <div className="round-result">
          🎬 Zaczynamy! <ModeCard s={s} />
        </div>
      )}
      <section className="panel waiting">
        <Avatar player={host} size={64} />
        <h2>🎩 {host?.name || '…'} wymyśla hasło…</h2>
        <p className="hint">Za chwilę na telewizorze pojawi się plansza. Przygotuj się!</p>
        <span className="chip chip--muted">{roundLabel(s)}</span>
      </section>
      <Leaderboard s={s} myId={myId} />
    </>
  )
}

// Wynik zakończonej rundy
function RoundResult({ s, myId }) {
  const winner = s.winnerId ? s.players[s.winnerId] : null
  const won = s.winnerId === myId
  return (
    <div className={`round-result ${won ? 'round-result--me' : ''}`}>
      {winner ? (
        won ? (
          <>🏆 Zgadłeś(-aś) hasło! <b>+100 pkt</b></>
        ) : (
          <>🏆 Hasło zgadł(a) <b>{winner.name}</b></>
        )
      ) : (
        <>🎉 Wszystkie litery odsłonięte!</>
      )}
      <div className="round-result-phrase">„{s.phrase}”</div>
    </div>
  )
}

// ——— po rundzie: prowadzący przekazuje prowadzenie ———
function HandoverPanel({ s, myId, actions }) {
  const [picking, setPicking] = useState(false)
  const winner =
    s.winnerId && s.winnerId !== myId && s.players[s.winnerId]
      ? { id: s.winnerId, ...s.players[s.winnerId] }
      : null
  const others = sortedPlayers(s.players).filter((p) => p.id !== myId)
  return (
    <>
      <RoundResult s={s} myId={myId} />
      <section className="panel handover">
        <h2>👉 Kto wymyśla następne hasło?</h2>
        {winner && (
          <button
            className="btn btn--green btn--big btn--block"
            onClick={() => actions.passHost(myId, winner.id)}
          >
            <Avatar player={winner} size={26} /> Przekaż: {winner.name} 🏆
          </button>
        )}
        {others.length > 0 && (
          <button className="btn btn--block" onClick={() => setPicking(true)}>
            👥 {winner ? 'Wybierz kogoś innego' : 'Wybierz osobę'}
          </button>
        )}
        <button className="btn btn--ghost btn--block" onClick={() => actions.keepHosting(myId)}>
          ✍️ Wymyślę kolejne hasło sam(a)
        </button>
      </section>
      <Leaderboard s={s} myId={myId} />
      {picking && (
        <PlayerPicker
          title="Kto wymyśla następne hasło?"
          subtitle="Ta osoba od razu dostanie formularz hasła"
          players={others}
          onPick={(id) => {
            actions.passHost(myId, id)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}

// 💍 sterowanie filmikiem na TV (telefon Iwony)
function SpecialControls({ actions }) {
  return (
    <section className="panel special-controls">
      <h2>💍 Filmik leci na telewizorze</h2>
      <div className="handover-choice">
        <button className="btn btn--primary btn--big" onClick={() => actions.replaySpecial()}>
          🔁 Jeszcze raz
        </button>
        <button className="btn btn--big" onClick={() => actions.closeSpecial()}>
          ✖ Zamknij
        </button>
      </div>
    </section>
  )
}

// ——— runda (zwykły gracz) ———
function PlayerPlaying({ s, me, myId, actions }) {
  const [solving, setSolving] = useState(false)
  const myTurn = s.activePlayerId === myId
  const activeName = s.activePlayerId ? s.players[s.activePlayerId]?.name : null
  const host = s.players[s.hostId]
  const special = isSpecialRound(s)
  const feedback = useFreshAction(s.lastAction, 2600)
  const myFeedback =
    feedback && feedback.playerId === myId && ['hit', 'miss'].includes(feedback.type)
      ? feedback
      : null
  const revealedCount = Object.keys(s.revealed).length
  const blocked = me.solveBlock != null && me.solveBlock === revealedCount

  // Wibracja, gdy dostajesz turę
  useEffect(() => {
    if (myTurn) {
      try {
        navigator.vibrate?.([120, 60, 120])
      } catch { /* ignore */ }
    }
  }, [myTurn])

  return (
    <>
      {myTurn ? (
        <div className="status-strip status-strip--turn">
          {special
            ? '🎤 TWOJA KOLEJ — kliknij literę! Znasz hasło? Powiedz je na głos 😉'
            : '🎤 TWOJA KOLEJ — kliknij literę albo 🎯 zgadnij całe hasło!'}
        </div>
      ) : (
        <div className="status-strip">
          {activeName ? (
            <>🎧 Literę wybiera: <b>{activeName}</b></>
          ) : (
            <>🎩 {host?.name || 'Prowadzący'} wybiera, kto zgaduje literę…</>
          )}
        </div>
      )}

      <div className="player-category">
        {s.category && <span className="chip">{s.category}</span>}
        <span className="chip chip--muted">{roundLabel(s)}</span>
      </div>

      <Board phrase={s.phrase} revealed={s.revealed} lastAction={s.lastAction} size="mini" />

      {!special && (
        <button
          className="btn btn--gold btn--big btn--block solve-btn"
          disabled={blocked || !myTurn}
          onClick={() => setSolving(true)}
        >
          {blocked
            ? '🔒 Pomyłka — spróbujesz po odsłonięciu litery'
            : myTurn
              ? '🎯 Zgadnij hasło (zamiast litery)'
              : '🎯 Zgadnij hasło — gdy dostaniesz 🎤'}
        </button>
      )}

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
          <span className="leg leg--mine" /> Twoje
          <span className="leg leg--other" /> innych
          <span className="leg leg--miss" /> pudła
        </p>
      </div>

      <Leaderboard s={s} myId={myId} />

      {solving && (
        <SolveModal onClose={() => setSolving(false)} onSolve={(text) => actions.solve(myId, text)} />
      )}
    </>
  )
}

function SolveModal({ onSolve, onClose }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (!result) return
    const t = setTimeout(onClose, result === 'ok' ? 900 : 1800)
    return () => clearTimeout(t)
  }, [result, onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim() && !result) setResult(onSolve(text))
        }}
      >
        <div className="modal-emoji">🎯</div>
        <h2>Wpisz całe hasło</h2>
        <p>Polskie znaki i wielkość liter nie mają znaczenia. Uwaga: pomyłka kończy Twoją turę!</p>
        <input
          className="input input--phrase"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Twoja odpowiedź…"
          autoFocus
          autoComplete="off"
          disabled={!!result}
        />
        {result === 'ok' && <div className="solve-result solve-result--ok">🏆 BRAWO! +100 pkt</div>}
        {result === 'wrong' && <div className="solve-result solve-result--bad">❌ Niestety, to nie to!</div>}
        {result === 'blocked' && <div className="solve-result solve-result--bad">🔒 Poczekaj na kolejną literę</div>}
        {result === 'noturn' && <div className="solve-result solve-result--bad">🎤 Tura przeszła na kogoś innego</div>}
        {!result && (
          <>
            <button className="btn btn--gold btn--big" disabled={!text.trim()}>
              Sprawdź!
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Anuluj
            </button>
          </>
        )}
      </form>
    </div>
  )
}

// ——— koniec gry ———
function OverScreen({ s, myId, actions }) {
  const players = sortedPlayers(s.players)
  const myRank = players.findIndex((p) => p.id === myId) + 1
  const champ = players[0]?.score > 0 ? players[0] : null
  const me = s.players[myId]
  const iAmAdmin = s.adminId === myId
  // dołączył(a) już po zakończeniu poprzedniej gry
  const latecomer = s.lastAction?.ts && (me?.joinedAt || 0) > s.lastAction.ts
  return (
    <>
      {latecomer ? (
        <div className="status-strip status-strip--turn">
          👋 Poprzednia gra właśnie się skończyła — za chwilę nowa!
        </div>
      ) : (
        <div className="status-strip status-strip--win">
          🏁 Koniec gry!{' '}
          {champ
            ? champ.id === myId
              ? 'WYGRYWASZ! 🏆'
              : `Wygrywa ${champ.name} 🏆 · Ty: ${myRank}. miejsce`
            : ''}
        </div>
      )}
      {!latecomer && <p className="hint" style={{ textAlign: 'center' }}>Podium świeci się na telewizorze 📺</p>}
      <Leaderboard s={s} myId={myId} />
      {iAmAdmin ? (
        <section className="panel">
          <h2>Gramy jeszcze raz?</h2>
          <p className="hint">Wszyscy wracają do poczekalni, punkty od zera.</p>
          <ConfirmButton
            className="btn btn--green btn--big btn--block"
            label="🔄 Zagraj jeszcze raz"
            confirmLabel="Tak, nowa gra! ▶"
            onConfirm={() => actions.newGame(myId)}
          />
        </section>
      ) : (
        <p className="hint" style={{ textAlign: 'center' }}>
          ⏳ Admin {s.players[s.adminId]?.name || ''} może zacząć nową grę.
        </p>
      )}
    </>
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
          } ${p.online === false ? 'lb-row--off' : ''}`}
        >
          <span className="lb-rank">{medals[i] || `${i + 1}.`}</span>
          <Avatar player={p} size={26} />
          <span className="lb-name">
            {p.id === s.hostId && s.status !== 'lobby' && s.status !== 'over' ? '🎩 ' : ''}
            {p.name}
            {p.id === s.adminId ? ' 👑' : ''}
            {p.id === myId ? ' (Ty)' : ''}
          </span>
          <span className="lb-score">{p.score || 0}</span>
        </div>
      ))}
    </div>
  )
}
