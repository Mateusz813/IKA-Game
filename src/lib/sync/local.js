// Tryb lokalny: synchronizacja między kartami jednej przeglądarki
// (localStorage + BroadcastChannel). Używany, gdy brak konfiguracji Firebase.
const KEY = 'ika-game-state'

function applyPaths(obj, paths) {
  for (const [path, val] of Object.entries(paths)) {
    const keys = path.split('/')
    let t = obj
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof t[keys[i]] !== 'object' || t[keys[i]] === null) t[keys[i]] = {}
      t = t[keys[i]]
    }
    const last = keys[keys.length - 1]
    if (val === null || val === undefined) delete t[last]
    else t[last] = val
  }
}

export function createLocalSync() {
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('ika-game') : null
  const listeners = new Set()

  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null')
    } catch {
      return null
    }
  }
  const emit = () => {
    const v = read()
    listeners.forEach((f) => f(v))
  }

  chan?.addEventListener('message', emit)
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) emit()
  })

  return {
    mode: 'local',
    subscribe(f) {
      listeners.add(f)
      f(read())
      return () => listeners.delete(f)
    },
    update(paths) {
      const v = read() || {}
      applyPaths(v, paths)
      localStorage.setItem(KEY, JSON.stringify(v))
      emit()
      chan?.postMessage(1)
    },
    presence() {},
  }
}
