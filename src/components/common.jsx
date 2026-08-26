import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { useGame } from '../lib/store.jsx'

export function Logo({ small = false }) {
  return (
    <div className={`logo ${small ? 'logo--small' : ''}`}>
      <span className="logo-ika">IKA</span>
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

export function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <div>Łączenie…</div>
    </div>
  )
}
