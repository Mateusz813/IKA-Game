import { useEffect, useRef, useState } from 'react'
import { MEMES, memeAvailable } from '../lib/memes.js'
import { clearSavedName } from '../lib/hooks.js'
import { TvAudioHint } from './HostConsole.jsx'
import { Logo, Avatar, ConfirmButton, ModeBadge, fileToAvatar } from './common.jsx'

// Górny pasek telefonu: logo, ja (avatar = zmiana zdjęcia), 🔊 dźwięki, ⚙️ menu
export default function PhoneHeader({ s, me, myId, actions }) {
  const fileRef = useRef(null)
  const isHost = s.hostId === myId && s.status !== 'lobby' && s.status !== 'over'
  return (
    <header className="page-header phone-header">
      <Logo small />
      <div className="hdr-right">
        <button
          type="button"
          className="hdr-me"
          onClick={() => fileRef.current?.click()}
          title="Dotknij, żeby zmienić zdjęcie"
        >
          <Avatar player={me} size={30} />
          <span className="hdr-me-text">
            <span className="hdr-me-name">
              {isHost ? '🎩 ' : ''}
              {me.name}
            </span>
            <b key={me.score} className="score-bump">{me.score || 0} pkt</b>
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
            if (f) actions.setPhoto(myId, await fileToAvatar(f))
            e.target.value = ''
          }}
        />
        <Soundboard s={s} myId={myId} actions={actions} />
        <GameMenu s={s} myId={myId} actions={actions} />
      </div>
      <ModeBadge />
    </header>
  )
}

// 🔊 rozwijana lista memicznych dźwięków — grają na telewizorze
function Soundboard({ s, myId, actions }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState(() => MEMES.filter((m) => !m.optional))
  const [sent, setSent] = useState(null)
  const lastAt = useRef(0)

  useEffect(() => {
    if (!open) return
    let alive = true
    Promise.all(MEMES.map(memeAvailable)).then((ok) => {
      if (alive) setList(MEMES.filter((_, i) => ok[i]))
    })
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (!sent) return
    const t = setTimeout(() => setSent(null), 1300)
    return () => clearTimeout(t)
  }, [sent])

  return (
    <div className="dd">
      <button
        type="button"
        className={`hdr-btn ${open ? 'hdr-btn--on' : ''}`}
        aria-label="Memiczne dźwięki"
        onClick={() => setOpen((v) => !v)}
      >
        🔊
      </button>
      {open && (
        <>
          <div className="dd-scrim" onClick={() => setOpen(false)} />
          <div className="dd-panel">
            <div className="dd-title">🔊 Puść dźwięk na TV</div>
            <TvAudioHint state={s.tvAudio?.state} />
            {list.map((m) => (
              <button
                key={m.id}
                className={`dd-item ${sent === m.id ? 'dd-item--sent' : ''}`}
                onClick={() => {
                  if (Date.now() - lastAt.current < 1200) return // bez spamowania
                  lastAt.current = Date.now()
                  actions.playMeme(m.id, myId)
                  setSent(m.id)
                }}
              >
                <span className="dd-emoji">{m.emoji}</span>
                <span className="dd-label">{m.label}</span>
                {sent === m.id && <span className="dd-ok">gra na TV ✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ⚙️ menu: zasady + awaryjne akcje (dostępne dla każdego, z potwierdzeniem)
function GameMenu({ s, myId, actions }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const inGame = ['entering', 'finished', 'playing'].includes(s.status)
  const hostName = s.hostId ? s.players[s.hostId]?.name : null
  const iAmHost = s.hostId === myId
  return (
    <>
      <button type="button" className="hdr-btn" aria-label="Menu" onClick={() => setOpen(true)}>
        ⚙️
      </button>
      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal menu-modal" onClick={(e) => e.stopPropagation()}>
            <h2>⚙️ Menu</h2>
            <HowToPlay compact />
            {inGame && hostName && (
              <ConfirmButton
                className="btn btn--block"
                label={
                  s.status === 'playing'
                    ? iAmHost
                      ? '⏭ Przerwij moją rundę (hasło przejdzie dalej)'
                      : `⏭ ${hostName} się zawiesił(a)? Przerwij rundę`
                    : iAmHost
                      ? '⏭ Pomiń mnie — niech wymyśli ktoś następny'
                      : `⏭ ${hostName} nie wpisuje hasła? Pomiń`
                }
                confirmLabel="Na pewno? Hasło wymyśli następna osoba"
                onConfirm={() => {
                  actions.passHost()
                  close()
                }}
              />
            )}
            {inGame && (
              <ConfirmButton
                className="btn btn--gold btn--block"
                label="🏁 Zakończ grę teraz (podium)"
                confirmLabel="Na pewno kończymy?"
                onConfirm={() => {
                  actions.endNow()
                  close()
                }}
              />
            )}
            {s.status !== 'lobby' && (
              <ConfirmButton
                className="btn btn--block"
                label="🔄 Nowa gra od zera (punkty = 0)"
                confirmLabel="Na pewno? Wszyscy wracają do poczekalni"
                onConfirm={() => {
                  actions.newGame()
                  close()
                }}
              />
            )}
            <ConfirmButton
              className="btn btn--danger btn--block"
              label="🚪 Opuść grę"
              confirmLabel="Na pewno wychodzisz?"
              onConfirm={() => {
                clearSavedName()
                actions.leave(myId)
              }}
            />
            <button className="btn btn--ghost" onClick={close}>
              Zamknij
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function HowToPlay({ compact = false }) {
  return (
    <div className={`rules ${compact ? 'rules--compact' : ''}`}>
      {!compact && <h2>📖 Jak gramy?</h2>}
      <ol>
        <li>🎩 Prowadzący wymyśla hasło i wskazuje 🎤, kto zgaduje literę.</li>
        <li>🔤 Trafiona litera = <b>10 pkt</b> za każde jej wystąpienie.</li>
        <li>
          🎯 Znasz całe hasło? Kliknij <b>„Znam hasło!”</b> i wpisz je — <b>+100 pkt</b>.
          Możesz też powiedzieć na głos — prowadzący przyzna punkty.
        </li>
        <li>🔁 Po każdym haśle prowadzi następna osoba — każdy po kolei.</li>
      </ol>
    </div>
  )
}
