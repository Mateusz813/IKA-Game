import { isLetter } from './alphabet.js'

// Plansza jak w telewizyjnym Kole Fortuny: 4 rzędy, skrajne krótsze.
export const ROW_CAPS = [12, 14, 14, 12]

// Okna rzędów w kolejności preferencji (najpierw mniej linii, bliżej środka).
const WINDOWS = [[1], [2], [1, 2], [0, 1, 2], [1, 2, 3], [0, 1, 2, 3]]

function tryWrap(words, caps) {
  const lines = []
  let i = 0
  for (const cap of caps) {
    const line = []
    let len = 0
    while (i < words.length) {
      const w = words[i]
      const need = len ? len + 1 + w.length : w.length
      if (need <= cap) {
        line.push(w)
        len = need
        i++
      } else break
    }
    if (!line.length) return null
    lines.push(line)
    if (i >= words.length) return lines
  }
  return null
}

// Zwraca { rows: [{cap, cells}], fits } — cells to null (pusty kafel)
// albo { ch, letter } dla znaku hasła.
export function layoutBoard(phrase) {
  const rows = ROW_CAPS.map((cap) => ({
    cap,
    cells: Array.from({ length: cap }, () => null),
  }))
  const words = phrase ? phrase.split(' ').filter(Boolean) : []
  if (!words.length) return { rows, fits: true }

  let placed = null
  let win = null
  for (const w of WINDOWS) {
    const lines = tryWrap(words, w.map((r) => ROW_CAPS[r]))
    if (lines) {
      placed = lines
      win = w
      break
    }
  }
  if (!placed) return { rows, fits: false }

  placed.forEach((lineWords, li) => {
    const r = win[li]
    const text = lineWords.join(' ')
    const start = Math.floor((ROW_CAPS[r] - text.length) / 2)
    ;[...text].forEach((ch, idx) => {
      if (ch === ' ') return
      rows[r].cells[start + idx] = { ch, letter: isLetter(ch) }
    })
  })
  return { rows, fits: true }
}
