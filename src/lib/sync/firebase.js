import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getDatabase,
  ref,
  onValue,
  update,
  set,
  onDisconnect,
} from 'firebase/database'

export function createFirebaseSync(config) {
  const app = getApps().length ? getApp() : initializeApp(config)
  const db = getDatabase(app)
  const gameRef = ref(db, 'game')

  // Różnica między zegarem urządzenia a zegarem serwera Firebase — dzięki niej
  // telefon i TV porównują znaczniki czasu na jednym, wspólnym zegarze.
  let offset = 0
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    offset = snap.val() || 0
  })

  return {
    mode: 'firebase',
    now: () => Date.now() + offset,
    subscribe(f) {
      return onValue(
        gameRef,
        (snap) => f(snap.val()),
        (err) => console.error('[IKA] Błąd Firebase:', err)
      )
    },
    update(paths) {
      return update(gameRef, paths).catch((err) =>
        console.error('[IKA] Błąd zapisu Firebase:', err)
      )
    },
    presence(playerId) {
      const onlineRef = ref(db, `game/players/${playerId}/online`)
      const connRef = ref(db, '.info/connected')
      return onValue(connRef, (snap) => {
        if (snap.val()) {
          onDisconnect(onlineRef).set(false)
          set(onlineRef, true)
        }
      })
    },
    // TV zgłasza stan dźwięku; po zamknięciu karty serwer sam ustawi „off”
    tvPresence() {
      const tvRef = ref(db, 'game/tvAudio')
      return onValue(ref(db, '.info/connected'), (snap) => {
        if (snap.val()) onDisconnect(tvRef).set({ state: 'off' })
      })
    },
  }
}
