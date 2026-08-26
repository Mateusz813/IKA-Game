import { useEffect, useState } from 'react'

// Zwraca lastAction tylko przez `ms` od jego powstania — do sterowania animacjami.
export function useFreshAction(action, ms = 3500) {
  const [, tick] = useState(0)
  const fresh = !!action && Date.now() - action.ts < ms
  useEffect(() => {
    if (!fresh) return
    const t = setTimeout(() => tick((x) => x + 1), ms - (Date.now() - action.ts) + 50)
    return () => clearTimeout(t)
  }, [action?.ts, fresh, ms])
  return fresh ? action : null
}

const ID_KEY = 'ika-player-id'
const NAME_KEY = 'ika-player-name'

export function getPlayerId() {
  let id = localStorage.getItem(ID_KEY)
  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(ID_KEY, id)
  }
  return id
}

export const getSavedName = () => localStorage.getItem(NAME_KEY) || ''
export const saveName = (name) => localStorage.setItem(NAME_KEY, name)
export const clearSavedName = () => localStorage.removeItem(NAME_KEY)
