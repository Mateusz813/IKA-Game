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

// Role:
//   adminId — gospodarz gry (wybrał „Admin” na starcie): ustawia tryb,
//             startuje, w każdej chwili może zmienić prowadzącego
//   hostId  — prowadzący: wpisuje hasło, wyznacza 🎤, po rundzie przekazuje
//             prowadzenie (domyślnie zwycięzcy)
// Przebieg:
//   lobby    — poczekalnia; admin wybiera tryb i klika Start
//   entering — hostId wpisuje kategorię i hasło
//   playing  — runda
//   finished — hasło odgadnięte; hostId decyduje, komu przekazać prowadzenie
//   over     — podium
export const MODES = {
  r5: { mode: 'rounds', rounds: 5 },
  r10: { mode: 'rounds', rounds: 10 },
  p300: { mode: 'points', target: 300 },
  p500: { mode: 'points', target: 500 },
}
export const DEFAULT_SETTINGS = MODES.r5

const STATUSES = ['lobby', 'entering', 'playing', 'finished', 'over']

const EMPTY = {
  status: 'lobby',
  settings: DEFAULT_SETTINGS,
  phrase: '',
  category: '',
  revealed: {}, // litera -> true
  used: {}, // litera -> { r: 'hit'|'miss', by }
  players: {}, // id -> { name, score, joinedAt, online, photo, solveBlock }
  adminId: null,
  hostId: null,
  activePlayerId: null,
  winnerId: null,
  lastAction: null, // { type, letter, count, playerId, guess, ts }
  round: 0,
  meme: null, // { id, by, ts } — soundboard, dźwięk gra na TV
  tvAudio: null, // { state: on|locked|muted|off }
  specialVideo: null, // { nonce } — filmik „świadkowa” otwarty na TV
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
  if (s.settings.mode === 'rounds' && !(s.settings.rounds >= 3)) s.settings = DEFAULT_SETTINGS
  if (s.adminId && !s.players[s.adminId]) s.adminId = null
  return s
}

const Ctx = createContext(null)

export function GameProvider({ children }) {
  const [raw, setRaw] = useState()
  const loaded = raw !== undefined
  const state = useMemo(() => normalize(loaded ? raw : null), [raw, loaded])
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    let first = true
    return sync.subscribe((v) => {
      // Gra sprzed wielu godzin (poprzednia impreza) — zaczynamy od zera,
      // zanim ktokolwiek zobaczy stary stan albo do niego dołączy.
      if (first) {
        first = false
        if (isStale(v)) {
          sync.update(fullReset())
          return
        }
      }
      setRaw((prev) =>
        JSON.stringify(prev ?? null) === JSON.stringify(v ?? null) ? prev ?? null : v ?? null
      )
    })
  }, [])

  const actions = useMemo(() => makeActions(() => stateRef.current), [])
  const value = useMemo(
    () => ({ state, ready: loaded, actions, mode: sync.mode }),
    [state, loaded, actions]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useGame = () => useContext(Ctx)

const now = () => sync.now()

// ——— automatyczny reset starej gry ———
const HOUR = 60 * 60 * 1000
const STALE_IF_EMPTY = 2 * HOUR // nikt nie jest podłączony
const STALE_ALWAYS = 12 * HOUR // na wypadek „zawieszonych” statusów online

function lastActivity(v) {
  const players = Object.values(v?.players || {})
  return Math.max(v?.lastAction?.ts || 0, v?.meme?.ts || 0, ...players.map((p) => p.joinedAt || 0))
}

export function isStale(v) {
  if (!v) return false
  const players = Object.values(v.players || {})
  if (!players.length && (v.status === 'lobby' || !v.status)) return false // już czysto
  const last = lastActivity(v)
  if (!last) return false
  const age = now() - last
  const somebodyHere =
    players.some((p) => p.online === true) || (v.tvAudio?.state && v.tvAudio.state !== 'off')
  return age > STALE_ALWAYS || (age > STALE_IF_EMPTY && !somebodyHere)
}

// pola czyszczone przy każdej nowej rundzie/powrocie do lobby
const ROUND_RESET = {
  phrase: '',
  category: '',
  revealed: null,
  used: null,
  activePlayerId: null,
  winnerId: null,
  specialVideo: null,
}

// pusta poczekalnia bez graczy — ustawienia trybu zostają
const fullReset = () => ({
  ...ROUND_RESET,
  status: 'lobby',
  players: null,
  adminId: null,
  hostId: null,
  round: 0,
  meme: null,
  handover: null,
  lastAction: { type: 'fresh', ts: now() },
})

// ——— pomocnicze ———

export const isOnline = (p) => p?.online !== false

export const modeKey = (st) => (st.mode === 'points' ? `p${st.target}` : `r${st.rounds}`)

// krótka nazwa trybu i warunek zwycięstwa — pokazywane na TV i telefonach
export const modeName = (st) =>
  st.mode === 'points' ? `Do ${st.target} pkt` : `${st.rounds} haseł`
export const winCondition = (st) =>
  st.mode === 'points'
    ? `Wygrywa pierwsza osoba, która zdobędzie ${st.target} pkt`
    : `Po ${st.rounds} hasłach wygrywa osoba z największą liczbą punktów`

// „Hasło 3 z 5” albo „Gramy do 300 pkt”
export function roundLabel(s) {
  if (s.settings.mode === 'points') return `Gramy do ${s.settings.target} pkt`
  const current = s.status === 'playing' || s.status === 'finished' ? s.round : s.round + 1
  return `Hasło ${Math.min(Math.max(current, 1), s.settings.rounds)} z ${s.settings.rounds}`
}

// porównanie hasła bez polskich znaków, spacji i interpunkcji
export const normPhrase = (t) =>
  (t || '')
    .toLocaleUpperCase('pl-PL')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '')

// 💍 Niespodzianka: tylko gdy prowadzi Iwona i wpisała to hasło
const SPECIAL_PHRASE = normPhrase('Czy zostaniesz moją świadkową')
const isIwona = (name) => normPhrase((name || '').trim().split(/\s+/)[0]) === 'IWONA'
export const isSpecialRound = (s) =>
  !!s.phrase && normPhrase(s.phrase) === SPECIAL_PHRASE && isIwona(s.players[s.hostId]?.name)

const clonePlayers = (players) =>
  Object.fromEntries(Object.entries(players).map(([id, p]) => [id, { ...p }]))

// kto przejmuje prowadzenie, gdy prowadzący zniknie
const fallbackHost = (s, players) =>
  (s.adminId && players[s.adminId] && s.adminId) ||
  Object.entries(players).find(([, p]) => isOnline(p))?.[0] ||
  Object.keys(players)[0] ||
  null

function gameIsOver(s, players) {
  if (s.settings.mode === 'points')
    return Object.values(players).some((p) => (p.score || 0) >= s.settings.target)
  return (s.round || 0) >= s.settings.rounds
}

// Koniec rundy. Prowadzenie zostaje u prowadzącego — to on je przekazuje.
function finishRound(s, players, winnerId, type, u = {}) {
  u.activePlayerId = null
  u.winnerId = winnerId || null
  phraseLetters(s.phrase).forEach((L) => (u['revealed/' + L] = true))
  if (winnerId && players[winnerId]) {
    players[winnerId].score = (players[winnerId].score || 0) + 100
    u['players/' + winnerId + '/score'] = players[winnerId].score
  }
  Object.keys(players).forEach((id) => (u['players/' + id + '/solveBlock'] = null))
  u.status = gameIsOver(s, players) ? 'over' : 'finished'
  u.lastAction = { type, playerId: winnerId || null, ts: now() }
  return u
}

function makeActions(get) {
  return {
    // ——— admin ———
    // pierwszy chętny zostaje adminem; przejąć można tylko nieobecnego admina
    claimAdmin(playerId) {
      const s = get()
      if (!s.players[playerId]) return false
      const admin = s.players[s.adminId]
      if (admin && isOnline(admin) && s.adminId !== playerId) return false
      if (s.adminId !== playerId) sync.update({ adminId: playerId })
      return true
    },

    setSettings(byId, key) {
      const s = get()
      if (s.status !== 'lobby' || byId !== s.adminId || !MODES[key]) return
      sync.update({ settings: MODES[key] })
    },

    // admin klika Start i wymyśla pierwsze hasło
    startGame(byId) {
      const s = get()
      if (s.status !== 'lobby' || byId !== s.adminId) return
      const u = {
        ...ROUND_RESET,
        status: 'entering',
        hostId: byId,
        round: 0,
        lastAction: { type: 'gamestart', playerId: byId, ts: now() },
      }
      Object.keys(s.players).forEach((id) => {
        u['players/' + id + '/score'] = 0
        u['players/' + id + '/solveBlock'] = null
      })
      sync.update(u)
    },

    // ——— prowadzenie ———
    submitPhrase(byId, rawPhrase, rawCategory) {
      const s = get()
      if (s.hostId !== byId || !['entering', 'finished'].includes(s.status)) return
      const phrase = cleanPhrase(rawPhrase)
      if (!phrase) return
      sync.update({
        ...ROUND_RESET,
        phrase,
        category: (rawCategory || '').trim(),
        status: 'playing',
        round: (s.round || 0) + 1,
        lastAction: { type: 'start', playerId: byId, ts: now() },
      })
    },

    // Przekazanie prowadzenia (prowadzący albo admin).
    // W trakcie rundy: prowadzący oddaje swoją rundę dalej (nowa osoba widzi
    // hasło), a admin, który nie prowadzi, przerywa rundę bez odsłaniania hasła.
    passHost(byId, toId) {
      const s = get()
      if (!s.players[toId] || toId === s.hostId) return
      if (byId !== s.hostId && byId !== s.adminId) return
      if (!['entering', 'playing', 'finished'].includes(s.status)) return
      const u = {
        hostId: toId,
        lastAction: { type: 'host', playerId: toId, by: byId, ts: now() },
      }
      if (s.status === 'playing') {
        if (byId === s.hostId) {
          if (s.activePlayerId === toId) u.activePlayerId = null
        } else {
          Object.assign(u, ROUND_RESET, { status: 'entering', round: Math.max(0, (s.round || 0) - 1) })
          u.lastAction.type = 'aborted'
        }
      } else {
        Object.assign(u, ROUND_RESET, { status: 'entering' })
      }
      sync.update(u)
    },

    // po rundzie: prowadzący zostaje i wymyśla kolejne hasło
    keepHosting(byId) {
      const s = get()
      if (s.status !== 'finished' || byId !== s.hostId) return
      sync.update({
        ...ROUND_RESET,
        status: 'entering',
        lastAction: { type: 'host', playerId: byId, by: byId, ts: now() },
      })
    },

    // ——— runda ———
    grantTurn(byId, id) {
      const s = get()
      if (s.status !== 'playing' || byId !== s.hostId || id === s.hostId || !s.players[id]) return
      sync.update({
        activePlayerId: id,
        lastAction: { type: 'turn', playerId: id, ts: now() },
      })
    },

    revokeTurn(byId) {
      if (byId !== get().hostId) return
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
        // runda-niespodzianka kończy się wyłącznie decyzją Iwony
        if (allShown && !isSpecialRound(s)) {
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
      if (isSpecialRound(s)) return 'blocked'
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
        lastAction: { type: 'wrongSolve', playerId, guess: cleanPhrase(guess).slice(0, 60), ts: now() },
      })
      return 'wrong'
    },

    // prowadzący: ktoś powiedział całe hasło na głos
    awardPhrase(byId, id) {
      const s = get()
      if (!s.players[id] || s.status !== 'playing' || byId !== s.hostId || id === s.hostId) return
      const u = finishRound(s, clonePlayers(s.players), id, 'win')
      if (isSpecialRound(s)) {
        u.specialVideo = { nonce: now() }
        u.lastAction.special = true
      }
      sync.update(u)
    },

    // 💍 filmik na TV: odtwórz ponownie / zamknij
    replaySpecial() {
      if (!get().specialVideo) return
      sync.update({ specialVideo: { nonce: now() } })
    },

    closeSpecial() {
      sync.update({ specialVideo: null })
    },

    // ——— koniec gry ———
    endNow(byId) {
      const s = get()
      if (byId !== s.adminId || s.status === 'lobby' || s.status === 'over') return
      sync.update({
        ...ROUND_RESET,
        status: 'over',
        hostId: null,
        lastAction: { type: 'gameover', ts: now() },
      })
    },

    // admin: ci sami gracze, punkty od zera, wracamy do poczekalni
    newGame(byId) {
      const s = get()
      if (byId !== s.adminId) return
      const u = {
        ...ROUND_RESET,
        status: 'lobby',
        hostId: null,
        round: 0,
        lastAction: { type: 'lobby', ts: now() },
      }
      Object.keys(s.players).forEach((id) => {
        u['players/' + id + '/score'] = 0
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
        ...(keptPhoto ? { ['players/' + id + '/photo']: keptPhoto } : {}),
      }
      // Nowa osoba, a w grze nikogo — to stan po poprzedniej imprezie,
      // zaczynamy od poczekalni (odświeżenie strony gracza tego nie robi)
      const others = Object.keys(s.players).filter((pid) => pid !== id)
      if (!existing && !others.length && s.status !== 'lobby')
        Object.assign(u, ROUND_RESET, {
          status: 'lobby',
          adminId: null,
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
      // ostatnia osoba wychodzi — pusta poczekalnia
      if (!Object.keys(players).length) return sync.update(fullReset())
      const u = { ['players/' + id]: null }
      const adminAfter = s.adminId === id ? null : s.adminId
      if (s.adminId === id) u.adminId = null
      if (s.activePlayerId === id) u.activePlayerId = null
      if (s.hostId === id && s.status !== 'lobby' && s.status !== 'over') {
        if (s.status === 'playing') Object.assign(u, ROUND_RESET, { status: 'entering' })
        u.hostId = fallbackHost({ adminId: adminAfter }, players)
        u.lastAction = { type: 'host', playerId: u.hostId, ts: now() }
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
export const usedInfo = (u) => (!u ? null : typeof u === 'string' ? { r: u, by: null } : u)

export function sortedPlayers(players) {
  return Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.joinedAt || 0) - (b.joinedAt || 0))
}
