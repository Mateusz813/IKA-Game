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
  hostId: null, // null = prowadzi gospodarz (urządzenie /admin), inaczej id gracza
  handover: null, // { toId, ts } — oczekująca propozycja przejęcia prowadzenia
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

    // playerId=null oznacza ruch prowadzącego (punkty idą do aktywnego gracza, jeśli jest)
    guessLetter(letter, playerId = null) {
      const s = get()
      if (s.status !== 'playing' || s.used[letter]) return
      if (playerId && (s.activePlayerId !== playerId || s.hostId === playerId)) return
      const credit = playerId || s.activePlayerId
      const count = countLetter(s.phrase, letter)
      const hit = count > 0
      const u = {
        // zapisujemy też KTO kliknął — klawiatura koloruje moje/cudze inaczej
        ['used/' + letter]: { r: hit ? 'hit' : 'miss', by: credit || null },
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
      const s = get()
      if (s.status !== 'playing' || id === s.hostId) return
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
      if (!s.players[id] || s.status !== 'playing' || id === s.hostId) return
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
        handover: null,
        lastAction: { type: 'reset', ts: now() },
      })
    },

    // ——— przekazywanie prowadzenia ———
    offerHost(toId) {
      if (!get().players[toId]) return
      sync.update({ handover: { toId, ts: now() } })
    },

    cancelOffer() {
      sync.update({ handover: null })
    },

    acceptHost(playerId) {
      const s = get()
      if (s.handover?.toId !== playerId) return
      sync.update({
        hostId: playerId,
        handover: null,
        status: 'idle',
        phrase: '',
        category: '',
        revealed: null,
        used: null,
        activePlayerId: null,
        winnerId: null,
        ['players/' + playerId + '/hostedAt']: now(),
        lastAction: { type: 'host', playerId, ts: now() },
      })
    },

    // gracz sam przejmuje pilota, gdy nikt nie prowadzi (start gry / po rundzie)
    claimHost(playerId) {
      const s = get()
      if (!s.players[playerId] || s.hostId || s.status === 'playing') return
      sync.update({
        hostId: playerId,
        handover: null,
        status: 'idle',
        phrase: '',
        category: '',
        revealed: null,
        used: null,
        activePlayerId: null,
        winnerId: null,
        ['players/' + playerId + '/hostedAt']: now(),
        lastAction: { type: 'host', playerId, ts: now() },
      })
    },

    declineHost(playerId) {
      const s = get()
      if (s.handover?.toId !== playerId) return
      sync.update({
        handover: null,
        lastAction: { type: 'hostDecline', playerId, ts: now() },
      })
    },

    // gospodarz (urządzenie /admin) odbiera pilota — gra toczy się dalej
    reclaimHost() {
      sync.update({
        hostId: null,
        handover: null,
        lastAction: { type: 'host', playerId: null, ts: now() },
      })
    },

    // ——— koniec gry: podium na TV ———
    endGame() {
      const s = get()
      const u = {
        status: 'over',
        activePlayerId: null,
        handover: null,
        hostId: null,
        lastAction: { type: 'gameover', ts: now() },
      }
      if (s.phrase) phraseLetters(s.phrase).forEach((L) => (u['revealed/' + L] = true))
      sync.update(u)
    },

    // pełny reset do samego początku — czyści też graczy
    resetAll() {
      sync.update({
        status: 'idle',
        phrase: '',
        category: '',
        revealed: null,
        used: null,
        players: null,
        activePlayerId: null,
        winnerId: null,
        hostId: null,
        handover: null,
        round: 0,
        lastAction: { type: 'reset', ts: now() },
      })
    },

    // nowa gra od zera (punkty wyzerowane, gracze zostają)
    newGame() {
      const u = {
        status: 'idle',
        phrase: '',
        category: '',
        revealed: null,
        used: null,
        activePlayerId: null,
        winnerId: null,
        handover: null,
        round: 0,
        lastAction: { type: 'reset', ts: now() },
      }
      Object.keys(get().players).forEach((id) => (u['players/' + id + '/score'] = 0))
      sync.update(u)
    },

    resetScores() {
      const u = {}
      Object.keys(get().players).forEach(
        (id) => (u['players/' + id + '/score'] = 0)
      )
      sync.update(u)
    },

    joinPlayer(id, name, photo = null) {
      const existing = get().players[id]
      const keptPhoto = photo || existing?.photo
      sync.update({
        ['players/' + id]: {
          name,
          score: existing?.score || 0,
          joinedAt: existing?.joinedAt || now(),
          online: true,
          ...(keptPhoto ? { photo: keptPhoto } : {}),
        },
      })
      sync.presence?.(id)
    },

    setPhoto(id, photo) {
      sync.update({ ['players/' + id + '/photo']: photo || null })
    },

    removePlayer(id) {
      const s = get()
      const u = { ['players/' + id]: null }
      if (s.activePlayerId === id) u.activePlayerId = null
      if (s.hostId === id) u.hostId = null
      if (s.handover?.toId === id) u.handover = null
      sync.update(u)
    },
  }
}

// used[L] bywa starym stringiem ('hit'/'miss') albo obiektem { r, by }
export const usedInfo = (u) =>
  !u ? null : typeof u === 'string' ? { r: u, by: null } : u

export function sortedPlayers(players) {
  return Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (b.score || 0) - (a.score || 0) || a.joinedAt - b.joinedAt)
}
