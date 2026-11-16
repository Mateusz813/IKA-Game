import { useMemo, useState } from 'react'
import { sortedPlayers, roundLabel } from '../lib/store.jsx'
import { cleanPhrase } from '../lib/alphabet.js'
import { layoutBoard } from '../lib/layout.js'
import Board from './Board.jsx'
import Keyboard from './Keyboard.jsx'
import { Avatar, ConfirmButton } from './common.jsx'

// Formularz hasła — widzi go wyłącznie osoba, na którą wypadła kolej
export function PhraseForm({ s, myId, actions }) {
  const [phrase, setPhrase] = useState('')
  const [category, setCategory] = useState('')
  const clean = cleanPhrase(phrase)
  const { fits } = useMemo(() => layoutBoard(clean), [clean])
  const tooLong = clean.split(' ').some((w) => w.length > 14)
  const canStart = !!clean && fits
  const others = Object.keys(s.players).filter((id) => id !== myId).length

  return (
    <section className="panel">
      <h2>✍️ Wpisz hasło do zgadywania</h2>
      <p className="hint">Nikt poza Tobą go nie widzi — ani na telefonach, ani na TV.</p>
      <label className="field">
        <span>Hasło (może być kilka słów)</span>
        <textarea
          rows={2}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="np. LEPSZY WRÓBEL W GARŚCI"
          className="input input--phrase"
          autoComplete="off"
        />
      </label>
      <label className="field">
        <span>Podpowiedź / kategoria (opcjonalnie, widzą ją wszyscy)</span>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="np. PRZYSŁOWIE"
          className="input"
        />
      </label>

      {clean && (
        <div className="preview">
          <span className="preview-label">Tak będzie wyglądać plansza:</span>
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
        className="btn btn--green btn--big btn--block"
        disabled={!canStart}
        onClick={() => actions.submitPhrase(myId, clean, category)}
      >
        🎬 Start — pokaż planszę!
      </button>
      {others > 0 && (
        <ConfirmButton
          className="btn btn--ghost btn--block skip-btn"
          label="⏭ Nie mam pomysłu — pomiń mnie"
          confirmLabel="Na pewno? Hasło wymyśli następna osoba"
          onConfirm={() => actions.passHost()}
        />
      )}
    </section>
  )
}

// Runda z perspektywy prowadzącego: widzi hasło, wyznacza 🎤, przyznaje 🏆
export function HostPlaying({ s, myId, actions }) {
  const [picker, setPicker] = useState(false)
  const players = sortedPlayers(s.players).filter((p) => p.id !== myId)
  const activeName = s.activePlayerId ? s.players[s.activePlayerId]?.name : null

  return (
    <>
      <div className="status-strip status-strip--turn">
        🎩 Prowadzisz! Hasło widzisz tylko Ty.
      </div>

      <section className="panel">
        <div className="admin-category">
          {s.category ? <span className="chip">{s.category}</span> : <span />}
          <span className="chip chip--muted">{roundLabel(s)}</span>
        </div>
        <Board phrase={s.phrase} revealed={s.revealed} lastAction={s.lastAction} ghost size="mini" />
        <div className={`turn-info ${activeName ? 'turn-info--active' : ''}`}>
          {activeName ? (
            <>🎤 Literę wybiera teraz: <b>{activeName}</b></>
          ) : (
            <>👇 Wybierz, kto zgaduje literę</>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>1️⃣ Kto zgaduje literę?</h2>
        <p className="hint">
          Wskazana osoba klika literę na swoim telefonie. Potem wybierasz kolejną.
        </p>
        {!players.length && <p className="hint">Nikt jeszcze nie dołączył 🙂</p>}
        <ul className="admin-players">
          {players.map((p) => {
            const active = s.activePlayerId === p.id
            return (
              <li key={p.id} className={`admin-player ${active ? 'admin-player--active' : ''}`}>
                <Avatar player={p} size={34} />
                <span className={`dot ${p.online === false ? 'dot--off' : ''}`} />
                <span className="admin-player-name">{p.name}</span>
                <span className="admin-player-score">{p.score || 0} pkt</span>
                <div className="admin-player-actions">
                  <button
                    className={`btn ${active ? 'btn--warn' : 'btn--primary'}`}
                    onClick={() => (active ? actions.revokeTurn() : actions.grantTurn(p.id))}
                  >
                    {active ? '🔒 Cofnij wybór' : '🎤 Niech zgaduje literę'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>2️⃣ Ktoś powiedział całe hasło na głos?</h2>
        <p className="hint">
          Gracze mogą też wpisać hasło sami (przycisk 🎯 na ich telefonach) — wtedy
          punkty liczą się automatycznie.
        </p>
        <button
          className="btn btn--gold btn--big btn--block"
          disabled={!players.length}
          onClick={() => setPicker(true)}
        >
          🏆 Tak — przyznaj +100 pkt
        </button>
      </section>

      <section className="panel">
        <h2>Litery w tej rundzie</h2>
        <p className="hint">Podgląd — litery klikają gracze.</p>
        <Keyboard used={s.used} viewerId={myId} readOnly />
      </section>

      {picker && (
        <PlayerPicker
          title="Kto odgadnął hasło?"
          subtitle="Ta osoba dostanie +100 pkt, a hasło się odsłoni 🎉"
          players={players}
          onPick={(id) => {
            actions.awardPhrase(id)
            setPicker(false)
          }}
          onClose={() => setPicker(false)}
        />
      )}
    </>
  )
}

// Popup wyboru gracza
export function PlayerPicker({ title, subtitle, players, onPick, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        <div className="picker-list">
          {players.map((p) => (
            <button key={p.id} className="btn picker-row" onClick={() => onPick(p.id)}>
              <Avatar player={p} size={30} />
              <span className="picker-name">{p.name}</span>
              <span className="picker-score">{p.score || 0} pkt</span>
            </button>
          ))}
        </div>
        <button className="btn btn--ghost" onClick={onClose}>
          Anuluj
        </button>
      </div>
    </div>
  )
}

// Co dzieje się z dźwiękiem na TV — żeby było wiadomo, czemu cisza
export function TvAudioHint({ state }) {
  if (state === 'on') return null
  const text =
    state === 'locked'
      ? '🔇 Telewizor ma zablokowany dźwięk — kliknij raz w ekran TV'
      : state === 'muted'
        ? '🔇 Dźwięk na TV jest wyłączony — włącz 🔊 w rogu telewizora'
        : '📺 Telewizor nie jest włączony — otwórz grę na TV („Telewizor”)'
  return <p className="tv-audio-hint">{text}</p>
}
