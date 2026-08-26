import { ALPHABET } from '../lib/alphabet.js'

export default function Keyboard({ used = {}, disabled = false, onPick }) {
  return (
    <div className={`kbd ${disabled ? 'kbd--off' : ''}`}>
      {ALPHABET.map((L) => {
        const st = used[L]
        return (
          <button
            key={L}
            className={`kbd-key ${st === 'hit' ? 'kbd-key--hit' : ''} ${
              st === 'miss' ? 'kbd-key--miss' : ''
            }`}
            disabled={disabled || !!st}
            onClick={() => onPick(L)}
          >
            {L}
          </button>
        )
      })}
    </div>
  )
}
