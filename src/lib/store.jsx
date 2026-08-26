import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { sync } from './sync/index.js'
import { cleanPhrase, countLetter, phraseLetters } from './alphabet.js'

const EMPTY = {
  status: 'idle', // idle | playing | finished
  phrase: '',
  category: '',
  revealed: {}, // litera -> true
  used: {}, // litera -> 'hit' | 'miss'
  players: {}, // id -> { name, score, joinedAt, online }
  activePlayerId: null,
  winnerId: null,
  lastAction: null, // { type, letter, count, playerId, ts }
  round: 0,
}

// RTDB usuwa puste obiekty i nulle — uzupełniamy brakujące pola.
const normalize = (v) => ({
  ...EMPTY,
  ...(v || {}),
  revealed: { ...(v?.revealed || {}) },
  used: { ...(v?.used || {}) },
  players: { ...(v?.players || {}) },
})

const Ctx = createContext(null)

export function GameProvider({ children }) {
  const [raw, setRaw] = useState()
  const loaded = raw !== undefined
  const state = useMemo(() => normalize(loaded ? raw : null), [raw, loaded])
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(
    () =>
      sync.subscribe((v) =>
        setRaw((prev) =>
          JSON.stringify(prev ?? null) === JSON.stringify(v ?? null)
            ? prev ?? null
            : v ?? null
        )
      ),
    []
  )

  const actions = useMemo(() => makeActions(() => stateRef.current), [])
  const value = useMemo(
    () => ({ state, ready: loaded, actions, mode: sync.mode }),
    [state, loaded, actions]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useGame = () => useContext(Ctx)

const now = () => Date.now()

function makeActions(get) {
  return {
    startGame(rawPhrase, rawCategory) {
      const phrase = cleanPhrase(rawPhrase)
      if (!phrase) return
      sync.update({
        phrase,
        category: (rawCategory || '').trim(),
        status: 'playing',
        revealed: null,
        used: null,
        activePlayerId: null,
        winnerId: null,
        lastAction: { type: 'start', ts: now() },
        round: (get().round || 0) + 1,
      })
    },

    // playerId=null oznacza ruch admina (punkty idą do aktywnego gracza, jeśli jest)
    guessLetter(letter, playerId = null) {
      const s = get()
      if (s.status !== 'playing' || s.used[letter]) return
      if (playerId && s.activePlayerId !== playerId) return
      const credit = playerId || s.activePlayerId
      const count = countLetter(s.phrase, letter)
      const hit = count > 0
      const u = {
        ['used/' + letter]: hit ? 'hit' : 'miss',
        activePlayerId: null,
        lastAction: {
          type: hit ? 'hit' : 'miss',
          letter,
          count,
          playerId: credit || null,
          ts: now(),
        },
      }
      if (hit) u['revealed/' + letter] = true
      if (hit && credit && s.players[credit])
        u['players/' + credit + '/score'] =
          (s.players[credit].score || 0) + count * 10
      sync.update(u)
    },

    grantTurn(id) {
      if (get().status !== 'playing') return
      sync.update({
        activePlayerId: id,
        lastAction: { type: 'turn', playerId: id, ts: now() },
      })
    },

    revokeTurn() {
      sync.update({ activePlayerId: null })
    },

    awardPhrase(id) {
      const s = get()
      if (!s.players[id]) return
      const u = {
        status: 'finished',
        winnerId: id,
        activePlayerId: null,
        ['players/' + id + '/score']: (s.players[id].score || 0) + 100,
        lastAction: { type: 'win', playerId: id, ts: now() },
      }
      phraseLetters(s.phrase).forEach((L) => (u['revealed/' + L] = true))
      sync.update(u)
    },

    revealAll() {
      const s = get()
      const u = {
        status: 'finished',
        activePlayerId: null,
        lastAction: { type: 'end', ts: now() },
      }
      phraseLetters(s.phrase).forEach((L) => (u['revealed/' + L] = true))
      sync.update(u)
    },

    newRound() {
      sync.update({
        status: 'idle',
        phrase: '',
        category: '',
        revealed: null,
        used: null,
        activePlayerId: null,
        winnerId: null,
        lastAction: { type: 'reset', ts: now() },
      })
    },

    resetScores() {
      const u = {}
      Object.keys(get().players).forEach(
        (id) => (u['players/' + id + '/score'] = 0)
      )
      sync.update(u)
    },

    joinPlayer(id, name) {
      const existing = get().players[id]
      sync.update({
        ['players/' + id]: {
          name,
          score: existing?.score || 0,
          joinedAt: existing?.joinedAt || now(),
          online: true,
        },
      })
      sync.presence?.(id)
    },

    removePlayer(id) {
      const u = { ['players/' + id]: null }
      if (get().activePlayerId === id) u.activePlayerId = null
      sync.update(u)
    },
  }
}

export function sortedPlayers(players) {
  return Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (b.score || 0) - (a.score || 0) || a.joinedAt - b.joinedAt)
}
