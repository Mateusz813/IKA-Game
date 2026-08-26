import { ALPHABET } from '../lib/alphabet.js'
import { usedInfo } from '../lib/store.jsx'

// viewerId — id patrzącego gracza: jego trafienia są zielone,
// trafienia innych niebieskie, pudła czerwone. Wszystko użyte = zablokowane.
export default function Keyboard({ used = {}, disabled = false, onPick, viewerId = null }) {
  return (
    <div className={`kbd ${disabled ? 'kbd--off' : ''}`}>
      {ALPHABET.map((L) => {
        const st = usedInfo(used[L])
        let cls = ''
        if (st?.r === 'miss') cls = 'kbd-key--miss'
        else if (st?.r === 'hit')
          cls = viewerId && st.by === viewerId ? 'kbd-key--mine' : 'kbd-key--other'
        return (
          <button
            key={L}
            className={`kbd-key ${cls}`}
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
