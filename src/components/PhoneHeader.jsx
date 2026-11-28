import { useEffect, useRef, useState } from 'react'
import { MEMES, memeAvailable, sortedMemes, memeAllowedFor } from '../lib/memes.js'
import { clearSavedName, nextFreeSlot, playerSlot } from '../lib/hooks.js'
import { TvAudioHint, PassHostButton } from './HostConsole.jsx'
import { isOnline } from '../lib/store.jsx'
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
              {playerSlot() && <span className="hdr-slot">#{playerSlot()}</span>}
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
  const iAmAdmin = s.adminId === myId
  const admin = s.players[s.adminId]
  const adminMissing = !admin || !isOnline(admin)
  const myName = s.players[myId]?.name
  const mine = MEMES.filter((m) => memeAllowedFor(m, myName))
  const [list, setList] = useState(() => sortedMemes(mine.filter((m) => !m.optional)))
  const [sent, setSent] = useState(null)
  const lastAt = useRef(0)

  useEffect(() => {
    let alive = true
    Promise.all(mine.map(memeAvailable)).then((ok) => {
      if (alive) setList(sortedMemes(mine.filter((_, i) => ok[i])))
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
        <div className="dd-grid">
          {list.map((m) => (
            <button
              key={m.id}
              role="menuitem"
              className={`dd-sound ${sent === m.id ? 'dd-sound--sent' : ''}`}
              onClick={() => {
                if (Date.now() - lastAt.current < 1200) return // bez spamowania
                lastAt.current = Date.now()
                actions.playMeme(m.id, myId)
                setSent(m.id)
              }}
            >
              <span className="dd-emoji">{sent === m.id ? '✓' : m.emoji}</span>
              <span className="dd-label">{m.label}</span>
            </button>
          ))}
        </div>
        {list.some((m) => m.story) && (
          <button
            role="menuitem"
            className="dd-item dd-item--plain"
            onClick={() => actions.playMeme('story-stop', myId)}
          >
            <span className="dd-emoji">⏹</span>
            <span className="dd-label">Zatrzymaj film na TV</span>
          </button>
        )}
        <div className="dd-sep" />
        <button role="menuitem" className="dd-item dd-item--plain" onClick={onPhoto}>
          <span className="dd-emoji">📷</span>
          <span className="dd-label">Zmień zdjęcie</span>
        </button>
        <button role="menuitem" className="dd-item dd-item--plain" onClick={onRules}>
          <span className="dd-emoji">📖</span>
          <span className="dd-label">Jak gramy? (zasady)</span>
        </button>
        <button
          role="menuitem"
          className="dd-item dd-item--plain"
          onClick={() => {
            window.open(`/play?as=${nextFreeSlot()}`, '_blank')
            onClose()
          }}
        >
          <span className="dd-emoji">👥</span>
          <span className="dd-label">Kolejny gracz na tym telefonie (nowa karta)</span>
        </button>

        <div className="dd-sep" />
        <div className="dd-title">⚙️ Opcje gry</div>
        {iAmAdmin && inGame && hostName && (
          <PassHostButton
            s={s}
            myId={myId}
            actions={actions}
            className="dd-item dd-item--plain"
            label={`👑 Zmień prowadzącego (teraz: ${hostName})`}
          />
        )}
        {iAmAdmin && inGame && (
          <ConfirmButton
            className="dd-item dd-item--plain"
            label="🏁 Zakończ grę teraz (podium)"
            confirmLabel="Na pewno kończymy?"
            onConfirm={() => {
              actions.endNow(myId)
              onClose()
            }}
          />
        )}
        {iAmAdmin && s.status !== 'lobby' && (
          <ConfirmButton
            className="dd-item dd-item--plain"
            label="🔄 Jeszcze raz (ci sami gracze, punkty 0)"
            confirmLabel="Na pewno? Wszyscy wracają do poczekalni"
            onConfirm={() => {
              actions.newGame(myId)
              onClose()
            }}
          />
        )}
        {iAmAdmin && (
          <ConfirmButton
            className="dd-item dd-item--plain dd-item--danger"
            label="🧹 Resetuj wszystko — wszyscy od początku"
            confirmLabel="Na pewno? Usunie graczy i punkty, wszystkich wyrzuci"
            onConfirm={() => {
              actions.resetAll(myId)
              onClose()
            }}
          />
        )}
        {!iAmAdmin && adminMissing && (
          <ConfirmButton
            className="dd-item dd-item--plain"
            label="👑 Admina nie ma — przejmij admina"
            confirmLabel="Tak, będę adminem 👑"
            onConfirm={() => {
              actions.claimAdmin(myId)
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
        <li>👑 Admin wybiera tryb gry, startuje i wpisuje pierwsze hasło.</li>
        <li>🎩 Prowadzący wpisuje kategorię i hasło, a potem wskazuje 🎤, kto zgaduje literę.</li>
        <li>🔤 Trafiona litera = <b>10 pkt</b> za każde jej wystąpienie.</li>
        <li>
          🎯 Masz 🎤 i znasz hasło? Zamiast litery kliknij <b>„Zgadnij hasło”</b> — <b>+100 pkt</b>.
          Pomyłka kończy turę. Hasło powiedziane na głos prowadzący zalicza sam.
        </li>
        <li>👉 Po każdym haśle prowadzący przekazuje prowadzenie — zwykle osobie, która zgadła.</li>
        <li>🔊 Dotknij swojego avatara u góry, żeby puścić śmieszny dźwięk na TV.</li>
      </ol>
    </div>
  )
}
