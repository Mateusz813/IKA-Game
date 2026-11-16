// Soundboard — memiczne dźwięki grane na TV (pliki w /public/sounds).
// start/dur (sekundy) pozwalają zagrać tylko fragment dłuższego nagrania.
// optional: plik może jeszcze nie istnieć — przycisk pojawi się sam, gdy
// wrzucisz nagranie pod podaną ścieżkę.
// youtube: { id, start, end } — fragment filmu z YouTube; na TV wyskakuje
// oficjalny odtwarzacz (zasady YouTube wymagają, by był widoczny).
export const MEMES = [
  { id: 'plakal', emoji: '😭', label: 'Płakał', caption: 'PŁAKAŁ! 😭', src: '/sounds/plakal.mp3' },
  { id: 'otoz-nie', emoji: '🙅', label: 'Otóż nie', caption: 'OTÓŻ NIE! 🙅', src: '/sounds/otoz-nie.mp3' },
  { id: 'familiada-ok', emoji: '✅', label: 'Familiada — dobrze', caption: 'DOBRZE! ✅', src: '/sounds/familiada-ok.mp3' },
  { id: 'familiada-zle', emoji: '❌', label: 'Familiada — źle', caption: '❌ ŹLE! ❌', src: '/sounds/familiada-zle.mp3' },
  { id: 'ale-urwal', emoji: '🤯', label: 'Ale urwał', caption: 'ALE URWAŁ! 🤯', src: '/sounds/ale-urwal.mp3' },
  { id: 'gratulacje', emoji: '🥳', label: 'Gratulacje użytkowniku', caption: 'GRATULACJE! 🥳', src: '/sounds/gratulacje.mp3', dur: 7 },
  // Imię + numer w kolejności dodawania (Iwona 1, Iwona 2, Paweł 1…)
  { id: 'iwona', emoji: '💕', label: 'Iwona 1', caption: '💕 IWONA 💕', youtube: { id: 'csQNoWec5TE', start: 47, end: 60 } },
  { id: 'iwona-2', emoji: '💍', label: 'Iwona 2', caption: '💍 MOJA ŻONA IWONA 💍', youtube: { id: 'lP_Va5_gldU', start: 0, end: 6 } },
  { id: 'mateusz', emoji: '🕺', label: 'Mateusz 1', caption: '🕺 MATEUSZ, WAJCHĘ PRZEŁÓŻ! 🕺', youtube: { id: 'NSD_TfnWttI', start: 27, end: 36 } },
  { id: 'mateusz-2', emoji: '🎤', label: 'Mateusz 2', caption: '🎤 MATEUSZ! 🎤', youtube: { id: 'l7ZpbW_O5To', start: 0, end: 7 } },
  { id: 'pawelek', emoji: '🙋‍♂️', label: 'Paweł 1', caption: 'PAWEŁ! 🙋‍♂️', youtube: { id: 'XU14gfH0LEs', start: 12, end: 23 } },
  { id: 'pawelek-reklama', emoji: '🍫', label: 'Paweł 2', caption: 'PAWEŁEK! 🍫', youtube: { id: 'ByWlPEkB-mk', start: 6, end: 13 } },
  { id: 'wiktoria', emoji: '🎸', label: 'Wiktoria 1', caption: '🎸 O VICTORIO, MOJA VICTORIOOO… 🎸', youtube: { id: '2xuq71bLtj8', start: 235, end: 243 } },
]

export const memeById = (id) => MEMES.find((m) => m.id === id)

// Czy plik istnieje (Vercel i Vite zwracają index.html dla brakujących
// ścieżek, więc liczy się tylko odpowiedź z typem audio/*)
const availability = new Map()
export function memeAvailable(m) {
  if (!m.optional || m.youtube) return Promise.resolve(true)
  if (!availability.has(m.src))
    availability.set(
      m.src,
      fetch(m.src, { method: 'HEAD' })
        .then((r) => r.ok && (r.headers.get('content-type') || '').startsWith('audio/'))
        .catch(() => false)
    )
  return availability.get(m.src)
}
