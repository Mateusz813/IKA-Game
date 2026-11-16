// Soundboard — memiczne dźwięki grane na TV (pliki w /public/sounds).
// start/dur (sekundy) pozwalają zagrać tylko fragment dłuższego nagrania.
// optional: plik może jeszcze nie istnieć — przycisk pojawi się sam, gdy
// wrzucisz nagranie pod podaną ścieżkę.
export const MEMES = [
  { id: 'plakal', emoji: '😭', label: 'Płakał', caption: 'PŁAKAŁ! 😭', src: '/sounds/plakal.mp3' },
  { id: 'otoz-nie', emoji: '🙅', label: 'Otóż nie', caption: 'OTÓŻ NIE! 🙅', src: '/sounds/otoz-nie.mp3' },
  { id: 'familiada-ok', emoji: '✅', label: 'Familiada — dobrze', caption: 'DOBRZE! ✅', src: '/sounds/familiada-ok.mp3' },
  { id: 'familiada-zle', emoji: '❌', label: 'Familiada — źle', caption: '❌ ŹLE! ❌', src: '/sounds/familiada-zle.mp3' },
  { id: 'ale-urwal', emoji: '🤯', label: 'Ale urwał', caption: 'ALE URWAŁ! 🤯', src: '/sounds/ale-urwal.mp3' },
  { id: 'gratulacje', emoji: '🥳', label: 'Gratulacje użytkowniku', caption: 'GRATULACJE! 🥳', src: '/sounds/gratulacje.mp3', dur: 7 },
  { id: 'wiktoria', emoji: '🎸', label: 'O Victorio… (Dżem)', caption: '🎸 VICTORIOOO… 🎸', src: '/sounds/wiktoria.mp3', start: 0, dur: 7, optional: true },
  { id: 'pawelek', emoji: '🍫', label: 'Pawełek!', caption: 'PAWEŁEK! 🍫', src: '/sounds/pawelek.mp3', optional: true },
]

export const memeById = (id) => MEMES.find((m) => m.id === id)

// Czy plik istnieje (Vercel i Vite zwracają index.html dla brakujących
// ścieżek, więc liczy się tylko odpowiedź z typem audio/*)
const availability = new Map()
export function memeAvailable(m) {
  if (!m.optional) return Promise.resolve(true)
  if (!availability.has(m.src))
    availability.set(
      m.src,
      fetch(m.src, { method: 'HEAD' })
        .then((r) => r.ok && (r.headers.get('content-type') || '').startsWith('audio/'))
        .catch(() => false)
    )
  return availability.get(m.src)
}
