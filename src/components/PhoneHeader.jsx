import { useEffect, useRef, useState } from 'react'
import { MEMES, memeAvailable } from '../lib/memes.js'
import { clearSavedName } from '../lib/hooks.js'
import { TvAudioHint } from './HostConsole.jsx'
import { Logo, Avatar, ConfirmButton, ModeBadge, fileToAvatar } from './common.jsx'

// Górny pasek telefonu: logo + „ja” (avatar, imię, punkty). Dotknięcie „ja”
// otwiera jedno menu: dźwięki na TV, zdjęcie, zasady i opcje gry.
export default function PhoneHeader({ s, me, myId, actions }) {
  const [open, setOpen] = useState(false)
  const [rules, setRules] = useState(false)
  const fileRef = useRef(null)
  const isHost = s.hostId === myId && s.status !== 'lobby' && s.status !== 'over'
  return (
    <header className="page-header phone-header">
      <Logo small />
      <div className="hdr-right dd">
        <button
          type="button"
          className={`hdr-me ${open ? 'hdr-me--open' : ''}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="hdr-avatar">
            <Avatar player={me} size={34} />
            <span className="hdr-avatar-badge">🔊</span>
          </span>
          <span className="hdr-me-text">
            <span className="hdr-me-name">
              {isHost ? '🎩 ' : ''}
              {me.name}
            </span>
            <b key={me.score} className="score-bump">{me.score || 0} pkt</b>
          </span>
          <span className="hdr-caret">▾</span>
        </button>
        {open && (
          <MeMenu
            s={s}
            myId={myId}
            actions={actions}
            onClose={() => setOpen(false)}
            onPhoto={() => {
              setOpen(false)
              fileRef.current?.click()
            }}
            onRules={() => {
              setOpen(false)
              setRules(true)
            }}
          />
        )}
      </div>
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
      {rules && (
        <div className="modal-backdrop" onClick={() => setRules(false)}>
          <div className="modal menu-modal" onClick={(e) => e.stopPropagation()}>
            <HowToPlay />
            <button className="btn btn--primary" onClick={() => setRules(false)}>
              Jasne, gramy!
            </button>
          </div>
        </div>
      )}
      <ModeBadge />
    </header>
  )
}

// Rozwijane menu spod avatara: 🔊 dźwięki na TV, zdjęcie, zasady, opcje gry
function MeMenu({ s, myId, actions, onClose, onPhoto, onRules }) {
  const inGame = ['entering', 'finished', 'playing'].includes(s.status)
  const hostName = s.hostId ? s.players[s.hostId]?.name : null
  const iAmHost = s.hostId === myId
  const [list, setList] = useState(() => MEMES.filter((m) => !m.optional))
  const [sent, setSent] = useState(null)
  const lastAt = useRef(0)

  useEffect(() => {
    let alive = true
    Promise.all(MEMES.map(memeAvailable)).then((ok) => {
      if (alive) setList(MEMES.filter((_, i) => ok[i]))
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!sent) return
    const t = setTimeout(() => setSent(null), 1300)
    return () => clearTimeout(t)
  }, [sent])

  return (
    <>
      <div className="dd-scrim" onClick={onClose} />
      <div className="dd-panel" role="menu">
        <div className="dd-title">🔊 Puść dźwięk na TV</div>
        <TvAudioHint state={s.tvAudio?.state} />
        {list.map((m) => (
          <button
            key={m.id}
            role="menuitem"
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
        <div className="dd-sep" />
        <button role="menuitem" className="dd-item dd-item--plain" onClick={onPhoto}>
          <span className="dd-emoji">📷</span>
          <span className="dd-label">Zmień zdjęcie</span>
        </button>
        <button role="menuitem" className="dd-item dd-item--plain" onClick={onRules}>
          <span className="dd-emoji">📖</span>
          <span className="dd-label">Jak gramy? (zasady)</span>
        </button>

        <div className="dd-sep" />
        <div className="dd-title">⚙️ Opcje gry</div>
        {inGame && hostName && (
          <ConfirmButton
            className="dd-item dd-item--plain"
            label={
              s.status === 'playing'
                ? iAmHost
                  ? '⏭ Przerwij moją rundę'
                  : `⏭ ${hostName} się zawiesił(a)? Przerwij rundę`
                : iAmHost
                  ? '⏭ Pomiń mnie — niech wymyśli ktoś inny'
                  : `⏭ ${hostName} nie wpisuje hasła? Pomiń`
            }
            confirmLabel="Na pewno? Hasło wymyśli następna osoba"
            onConfirm={() => {
              actions.passHost()
              onClose()
            }}
          />
        )}
        {inGame && (
          <ConfirmButton
            className="dd-item dd-item--plain"
            label="🏁 Zakończ grę teraz (podium)"
            confirmLabel="Na pewno kończymy?"
            onConfirm={() => {
              actions.endNow()
              onClose()
            }}
          />
        )}
        {s.status !== 'lobby' && (
          <ConfirmButton
            className="dd-item dd-item--plain"
            label="🔄 Nowa gra od zera (punkty = 0)"
            confirmLabel="Na pewno? Wszyscy wracają do poczekalni"
            onConfirm={() => {
              actions.newGame()
              onClose()
            }}
          />
        )}
        <ConfirmButton
          className="dd-item dd-item--plain dd-item--danger"
          label="🚪 Opuść grę"
          confirmLabel="Na pewno wychodzisz?"
          onConfirm={() => {
            clearSavedName()
            actions.leave(myId)
          }}
        />
      </div>
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
          🎯 Masz turę 🎤 i znasz całe hasło? Zamiast litery kliknij <b>„Znam hasło!”</b> i
          wpisz je — <b>+100 pkt</b>. Pomyłka kończy turę. Hasło powiedziane na głos
          prowadzący może zaliczyć sam.
        </li>
        <li>🔁 Po każdym haśle prowadzi następna osoba — każdy po kolei.</li>
        <li>🔊 Dotknij swojego avatara u góry, żeby puścić śmieszny dźwięk na TV.</li>
      </ol>
    </div>
  )
}
