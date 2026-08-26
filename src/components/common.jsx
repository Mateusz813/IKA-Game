import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { useGame } from '../lib/store.jsx'

export function Logo({ small = false }) {
  return (
    <div className={`logo ${small ? 'logo--small' : ''}`}>
      <span className="logo-ika">WIMP</span>
      <span className="logo-game">GAME</span>
    </div>
  )
}

// Przycisk z potwierdzeniem drugim tapnięciem (bez brzydkiego window.confirm)
export function ConfirmButton({
  label,
  confirmLabel = 'Na pewno?',
  onConfirm,
  className = '',
  disabled = false,
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 2600)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      disabled={disabled}
      className={`${className} ${armed ? 'btn--armed' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}

export function ModeBadge() {
  const { mode } = useGame()
  if (mode !== 'local') return null
  return (
    <div className="mode-badge" title="Skonfiguruj Firebase, aby grać na wielu urządzeniach (README)">
      ⚠️ tryb lokalny
    </div>
  )
}

export function QRJoin({ size = 128 }) {
  const url = `${window.location.origin}/play`
  return (
    <div className="qr-box">
      <QRCode value={url} size={size} bgColor="#ffffff" fgColor="#150b2e" />
    </div>
  )
}

// Zdjęcie gracza albo kolorowe kółko z inicjałami
export function Avatar({ player, size = 40 }) {
  const dim = typeof size === 'number' ? `${size}px` : size
  if (player?.photo)
    return (
      <img
        src={player.photo}
        alt=""
        className="avatar"
        style={{ width: dim, height: dim }}
        draggable={false}
      />
    )
  const name = player?.name || '?'
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360
  return (
    <div
      className="avatar avatar--init"
      style={{
        width: dim,
        height: dim,
        fontSize: `calc(${dim} * 0.42)`,
        background: `hsl(${hue} 60% 42%)`,
      }}
    >
      {name.trim().slice(0, 2).toUpperCase()}
    </div>
  )
}

// Zmniejsza zdjęcie do małego kwadratu (data URL), żeby lekko szło przez bazę
export async function fileToAvatar(file, size = 128) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const s = Math.min(img.width, img.height)
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.65)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <div>Łączenie…</div>
    </div>
  )
}
