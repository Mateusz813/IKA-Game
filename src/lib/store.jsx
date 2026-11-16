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

// Przebieg gry:
//   lobby    — poczekalnia: dołączanie, ustawienia „ile gramy”, ▶ Zaczynamy
//   entering — hostId wymyśla hasło (tylko on widzi formularz)
//   playing  — runda: hostId wyznacza 🎤, gracze klikają litery / 🎯 zgadują
//   finished — hasło odgadnięte; hostId to JUŻ NASTĘPNA osoba z kolejki,
//              która wpisuje kolejne hasło, a TV świętuje zwycięzcę
//   over     — podium; „Zagraj jeszcze raz” wraca do lobby
export const DEFAULT_SETTINGS = { mode: 'rounds', rounds: 1, target: 300 }

const STATUSES = ['lobby', 'entering', 'playing', 'finished', 'over']

const EMPTY = {
  status: 'lobby',
  settings: DEFAULT_SETTINGS,
  phrase: '',
  category: '',
  revealed: {}, // litera -> true
  used: {}, // litera -> { r: 'hit'|'miss', by }
  players: {}, // id -> { name, score, joinedAt, online, photo, hosted, solveBlock }
  hostId: null,
  activePlayerId: null,
  winnerId: null,
  lastAction: null, // { type, letter, count, playerId, guess, ts }
  round: 0,
  meme: null, // { id, by, ts } — soundboard, dźwięk gra na TV
  tvAudio: null, // { state: on|locked|muted|off }
}

// RTDB usuwa puste obiekty i nulle — uzupełniamy brakujące pola.
function normalize(v) {
  const s = {
    ...EMPTY,
    ...(v || {}),
    settings: { ...DEFAULT_SETTINGS, ...(v?.settings || {}) },
    revealed: { ...(v?.revealed || {}) },
    used: { ...(v?.used || {}) },
    players: { ...(v?.players || {}) },
  }
  // stany z poprzednich wersji gry
  if (s.status === 'idle') s.status = s.hostId ? 'entering' : 'lobby'
  if (!STATUSES.includes(s.status)) s.status = 'lobby'
  return s
}

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

const now = () => sync.now()

// ——— pomocnicze ———

export const isOnline = (p) => p?.online !== false

// Kolejka prowadzących: najpierw ci, którzy prowadzili najmniej razy,
// przy remisie — kolejność dołączenia. Osoby offline pomijamy.
export function hostQueue(players, excludeId = null) {
  const list = Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => p.id !== excludeId)
  const online = list.filter(isOnline)
  return (online.length ? online : list).sort(
    (a, b) => (a.hosted || 0) - (b.hosted || 0) || (a.joinedAt || 0) - (b.joinedAt || 0)
  )
}

const nextHost = (players, excludeId) => hostQueue(players, excludeId)[0]?.id || excludeId

// Czy po tej rundzie kończymy grę
function gameIsOver(settings, players) {
  const ps = Object.values(players)
  if (!ps.length) return false
  if (settings.mode === 'points')
    return ps.some((p) => (p.score || 0) >= settings.target)
  const online = ps.filter(isOnline)
  return (online.length ? online : ps).every((p) => (p.hosted || 0) >= settings.rounds)
}

// „Hasło 3 z 8” albo „Gramy do 300 pkt”
export function roundLabel(s) {
  const n = Math.max(1, Object.values(s.players).filter(isOnline).length)
  const current = s.status === 'playing' ? s.round : s.round + 1
  if (s.settings.mode === 'points') return `Gramy do ${s.settings.target} pkt`
  return `Hasło ${Math.min(current, s.settings.rounds * n)} z ${s.settings.rounds * n}`
}

export const settingsLabel = (st) =>
  st.mode === 'points'
    ? `do ${st.target} pkt`
    : st.rounds === 1
      ? 'każdy wymyśla 1 hasło'
      : `każdy wymyśla ${st.rounds} hasła`

// porównanie hasła bez polskich znaków, spacji i interpunkcji
export const normPhrase = (t) =>
  (t || '')
    .toLocaleUpperCase('pl-PL')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '')

const clonePlayers = (players) =>
  Object.fromEntries(Object.entries(players).map(([id, p]) => [id, { ...p }]))

// pola czyszczone przy każdej nowej rundzie/powrocie do lobby
const ROUND_RESET = {
  phrase: '',
  category: '',
  revealed: null,
  used: null,
  activePlayerId: null,
  winnerId: null,
}

// Koniec rundy (zgadnięte hasło / wszystkie litery). players — już z
// doliczonymi punktami za ostatnią literę.
function finishRound(s, players, winnerId, type, u = {}) {
  u.activePlayerId = null
  u.winnerId = winnerId || null
  phraseLetters(s.phrase).forEach((L) => (u['revealed/' + L] = true))
  if (winnerId && players[winnerId]) {
    players[winnerId].score = (players[winnerId].score || 0) + 100
    u['players/' + winnerId + '/score'] = players[winnerId].score
  }
  Object.keys(players).forEach((id) => (u['players/' + id + '/solveBlock'] = null))
  if (gameIsOver(s.settings, players)) {
    u.status = 'over'
    u.hostId = null
  } else {
    u.status = 'finished'
    u.hostId = nextHost(players, s.hostId)
  }
  u.lastAction = { type, playerId: winnerId || null, ts: now() }
  return u
}

function makeActions(get) {
  return {
    // ——— lobby ———
    setSettings(settings) {
      if (get().status !== 'lobby') return
      sync.update({ settings: { ...DEFAULT_SETTINGS, ...settings } })
    },

    // kto kliknie ▶ Zaczynamy, ten wymyśla pierwsze hasło
    startGame(playerId) {
      const s = get()
      if (s.status !== 'lobby' || !s.players[playerId]) return
      const u = {
        ...ROUND_RESET,
        status: 'entering',
        hostId: playerId,
        round: 0,
        lastAction: { type: 'host', playerId, ts: now() },
      }
      Object.keys(s.players).forEach((id) => {
        u['players/' + id + '/score'] = 0
        u['players/' + id + '/hosted'] = 0
        u['players/' + id + '/solveBlock'] = null
      })
      sync.update(u)
    },

    // ——— prowadzący wpisuje hasło ———
    submitPhrase(playerId, rawPhrase, rawCategory) {
      const s = get()
      if (s.hostId !== playerId || !['entering', 'finished'].includes(s.status)) return
      const phrase = cleanPhrase(rawPhrase)
      if (!phrase) return
      sync.update({
        ...ROUND_RESET,
        phrase,
        category: (rawCategory || '').trim(),
        status: 'playing',
        round: (s.round || 0) + 1,
        ['players/' + playerId + '/hosted']: (s.players[playerId]?.hosted || 0) + 1,
        lastAction: { type: 'start', playerId, ts: now() },
      })
    },

    // Pałeczka do następnej osoby z kolejki. Wpisujący: „pomiń mnie”.
    // Ktokolwiek z ⚙️: prowadzący się zawiesił. W trakcie rundy przerywa ją
    // BEZ odsłaniania hasła (czyścimy je, żeby nigdzie nie wyciekło).
    passHost() {
      const s = get()
      if (!['entering', 'finished', 'playing'].includes(s.status) || !s.hostId) return
      const players = clonePlayers(s.players)
      const u = { activePlayerId: null }
      if (s.status === 'playing') Object.assign(u, ROUND_RESET)
      else if (players[s.hostId]) {
        // pominięcie liczy się jak wykorzystana kolejka
        players[s.hostId].hosted = (players[s.hostId].hosted || 0) + 1
        u['players/' + s.hostId + '/hosted'] = players[s.hostId].hosted
      }
      if (gameIsOver(s.settings, players)) {
        Object.assign(u, ROUND_RESET, {
          status: 'over',
          hostId: null,
          lastAction: { type: 'gameover', ts: now() },
        })
      } else {
        const next = nextHost(players, s.hostId)
        Object.assign(u, {
          status: 'entering',
          hostId: next,
          lastAction: { type: 'host', playerId: next, ts: now() },
        })
      }
      sync.update(u)
    },

    // ——— runda ———
    grantTurn(id) {
      const s = get()
      if (s.status !== 'playing' || id === s.hostId || !s.players[id]) return
      sync.update({
        activePlayerId: id,
        lastAction: { type: 'turn', playerId: id, ts: now() },
      })
    },

    revokeTurn() {
      sync.update({ activePlayerId: null })
    },

    // literę klika wyłącznie gracz z 🎤
    guessLetter(letter, playerId) {
      const s = get()
      if (s.status !== 'playing' || s.used[letter]) return
      if (!playerId || s.activePlayerId !== playerId || s.hostId === playerId) return
      const count = countLetter(s.phrase, letter)
      const hit = count > 0
      const players = clonePlayers(s.players)
      let u = {
        ['used/' + letter]: { r: hit ? 'hit' : 'miss', by: playerId },
        activePlayerId: null,
        lastAction: { type: hit ? 'hit' : 'miss', letter, count, playerId, ts: now() },
      }
      if (hit) {
        u['revealed/' + letter] = true
        players[playerId].score = (players[playerId].score || 0) + count * 10
        u['players/' + playerId + '/score'] = players[playerId].score
        const allShown = phraseLetters(s.phrase).every((L) => L === letter || s.revealed[L])
        if (allShown) {
          // ostatnia litera — zapamiętaj ją, potem zamknij rundę
          const letterAction = u.lastAction
          u = finishRound(s, players, null, 'allRevealed', u)
          u.lastAction = { ...u.lastAction, letter: letterAction.letter, count, by: playerId }
        }
      }
      sync.update(u)
    },

    // 🎯 gracz z turą 🎤 wpisuje całe hasło (zamiast litery).
    // Zwraca 'ok' | 'wrong' | 'blocked' | 'noturn'.
    solve(playerId, guess) {
      const s = get()
      const me = s.players[playerId]
      if (s.status !== 'playing' || !me || playerId === s.hostId) return 'blocked'
      if (s.activePlayerId !== playerId) return 'noturn'
      const revealedCount = Object.keys(s.revealed).length
      if (me.solveBlock != null && me.solveBlock === revealedCount) return 'blocked'
      if (normPhrase(guess) && normPhrase(guess) === normPhrase(s.phrase)) {
        sync.update(finishRound(s, clonePlayers(s.players), playerId, 'win'))
        return 'ok'
      }
      // pudło kończy turę, jak źle wybrana litera
      sync.update({
        ['players/' + playerId + '/solveBlock']: revealedCount,
        activePlayerId: null,
        lastAction: {
          type: 'wrongSolve',
          playerId,
          guess: cleanPhrase(guess).slice(0, 60),
          ts: now(),
        },
      })
      return 'wrong'
    },

    // prowadzący: ktoś powiedział całe hasło na głos
    awardPhrase(id) {
      const s = get()
      if (!s.players[id] || s.status !== 'playing' || id === s.hostId) return
      sync.update(finishRound(s, clonePlayers(s.players), id, 'win'))
    },

    // ——— koniec gry ———
    endNow() {
      const s = get()
      if (s.status === 'lobby' || s.status === 'over') return
      sync.update({
        ...ROUND_RESET,
        status: 'over',
        hostId: null,
        lastAction: { type: 'gameover', ts: now() },
      })
    },

    // wszyscy zostają, punkty od zera, wracamy do poczekalni
    newGame() {
      const u = {
        ...ROUND_RESET,
        status: 'lobby',
        hostId: null,
        round: 0,
        lastAction: { type: 'lobby', ts: now() },
      }
      Object.keys(get().players).forEach((id) => {
        u['players/' + id + '/score'] = 0
        u['players/' + id + '/hosted'] = 0
        u['players/' + id + '/solveBlock'] = null
      })
      sync.update(u)
    },

    // ——— gracze ———
    joinPlayer(id, name, photo = null) {
      const s = get()
      const existing = s.players[id]
      const keptPhoto = photo || existing?.photo
      const u = {
        ['players/' + id + '/name']: name,
        ['players/' + id + '/online']: true,
        ['players/' + id + '/joinedAt']: existing?.joinedAt || now(),
        ['players/' + id + '/score']: existing?.score || 0,
        ['players/' + id + '/hosted']: existing?.hosted || 0,
        ...(keptPhoto ? { ['players/' + id + '/photo']: keptPhoto } : {}),
      }
      // Nowa osoba, a w grze nikogo — to stan po poprzedniej imprezie,
      // zaczynamy od poczekalni (odświeżenie strony gracza tego nie robi)
      const others = Object.keys(s.players).filter((pid) => pid !== id)
      if (!existing && !others.length && s.status !== 'lobby')
        Object.assign(u, ROUND_RESET, {
          status: 'lobby',
          hostId: null,
          round: 0,
          lastAction: { type: 'lobby', ts: now() },
        })
      sync.update(u)
      sync.presence?.(id)
    },

    setPhoto(id, photo) {
      sync.update({ ['players/' + id + '/photo']: photo || null })
    },

    // gracz sam opuszcza grę (nikt nie usuwa innych)
    leave(id) {
      const s = get()
      const players = clonePlayers(s.players)
      delete players[id]
      const u = { ['players/' + id]: null }
      if (!Object.keys(players).length) {
        Object.assign(u, ROUND_RESET, {
          status: 'lobby',
          hostId: null,
          round: 0,
          lastAction: { type: 'lobby', ts: now() },
        })
      } else {
        if (s.activePlayerId === id) u.activePlayerId = null
        if (s.hostId === id && s.status !== 'lobby' && s.status !== 'over') {
          if (s.status === 'playing') Object.assign(u, ROUND_RESET, { status: 'entering' })
          u.hostId = nextHost(players, null)
          u.lastAction = { type: 'host', playerId: u.hostId, ts: now() }
        }
      }
      sync.update(u)
    },

    // ——— dźwięki ———
    playMeme(id, by = null) {
      sync.update({ meme: { id, by, ts: now() } })
    },

    // TV raportuje stan dźwięku: on | locked | muted (off ustawia serwer)
    setTvAudio(state) {
      if (get().tvAudio?.state === state) return
      sync.update({ tvAudio: { state, ts: now() } })
    },
  }
}

// used[L] bywa starym stringiem ('hit'/'miss') albo obiektem { r, by }
export const usedInfo = (u) =>
  !u ? null : typeof u === 'string' ? { r: u, by: null } : u

export function sortedPlayers(players) {
  return Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.joinedAt || 0) - (b.joinedAt || 0))
}
