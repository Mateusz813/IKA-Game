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

  return {
    mode: 'firebase',
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
  }
}
