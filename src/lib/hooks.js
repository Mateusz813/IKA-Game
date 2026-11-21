import { useEffect, useState } from 'react'
import { sync } from './sync/index.js'

// Czas zsynchronizowany z serwerem — znaczniki ts pisze jedno urządzenie,
// a porównuje inne, więc lokalny zegar mógłby się rozjechać.
export const serverNow = () => sync.now()

// Zwraca lastAction tylko przez `ms` od jego powstania — do sterowania animacjami.
export function useFreshAction(action, ms = 3500) {
  const [, tick] = useState(0)
  const age = action ? serverNow() - action.ts : Infinity
  const fresh = !!action && age < ms
  useEffect(() => {
    if (!fresh) return
    const t = setTimeout(
      () => tick((x) => x + 1),
      Math.min(ms, ms - (serverNow() - action.ts)) + 50
    )
    return () => clearTimeout(t)
  }, [action?.ts, fresh, ms])
  return fresh ? action : null
}

// Sloty graczy: /play?as=2, /play?as=3… — kilku graczy na jednym urządzeniu,
// każdy w osobnej karcie (normalnie karty dzieliłyby jedno ID z localStorage)
export const playerSlot = () => {
  const v = new URLSearchParams(window.location.search).get('as')
  return v && /^[a-z0-9]{1,8}$/i.test(v) ? v : null
}
const slotKey = (k) => (playerSlot() ? `${k}-${playerSlot()}` : k)

// pierwszy wolny numer slotu na tym urządzeniu (2, 3, …)
export function nextFreeSlot() {
  for (let n = 2; n < 20; n++) {
    if (String(n) !== playerSlot() && !localStorage.getItem(`${NAME_KEY}-${n}`)) return String(n)
  }
  return String(Date.now() % 1000)
}

const ID_KEY = 'ika-player-id'
const NAME_KEY = 'ika-player-name'

export function getPlayerId() {
  let id = localStorage.getItem(slotKey(ID_KEY))
  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(slotKey(ID_KEY), id)
  }
  return id
}

export const getSavedName = () => localStorage.getItem(slotKey(NAME_KEY)) || ''
export const saveName = (name) => localStorage.setItem(slotKey(NAME_KEY), name)
export const clearSavedName = () => localStorage.removeItem(slotKey(NAME_KEY))
