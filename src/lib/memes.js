// Soundboard — memiczne dźwięki grane na TV.
// Plik:    { src: '/sounds/x.mp3', start, dur } (sekundy; fragment nagrania).
// Filmik:  { video: '/video/x.mp4' } — własny filmik w okienku na TV.
//          optional: true — przycisk pojawi się dopiero, gdy plik istnieje.
// YouTube: { youtube: { id, start, end } } — fragment filmu; bez `end` gra do
//          końca. Na TV wyskakuje oficjalny odtwarzacz (zasady YouTube
//          wymagają, by był widoczny).
// caption — napis na TV; domyślnie emoji + nazwa wielkimi literami.
const yt = (id, start, end) => ({ id, start, end })

export const MEMES = [
  // klasyki (pliki)
  { id: 'plakal', emoji: '😭', label: 'Płakał 1', src: '/sounds/plakal.mp3' },
  { id: 'otoz-nie', emoji: '🙅', label: 'Otóż nie', src: '/sounds/otoz-nie.mp3' },
  { id: 'familiada-ok', emoji: '✅', label: 'Familiada — dobrze', caption: 'DOBRZE! ✅', src: '/sounds/familiada-ok.mp3' },
  { id: 'familiada-zle', emoji: '❌', label: 'Familiada — źle', caption: '❌ ŹLE! ❌', src: '/sounds/familiada-zle.mp3' },
  { id: 'ale-urwal', emoji: '🤯', label: 'Ale urwał', src: '/sounds/ale-urwal.mp3' },
  { id: 'gratulacje', emoji: '🥳', label: 'Gratulacje użytkowniku', caption: 'GRATULACJE! 🥳', src: '/sounds/gratulacje.mp3', dur: 7 },

  // fragmenty z YouTube — Imię + numer w kolejności dodawania
  { id: 'plakal-2', emoji: '😭', label: 'Płakał 2', youtube: yt('ordBtZe8Fqs', 0, 7) },
  { id: 'plakal-3', emoji: '😭', label: 'Płakał 3', youtube: yt('wSH3Pcw36WM', 0, 6) },
  { id: 'iwona', emoji: '💕', label: 'Iwona 1', youtube: yt('csQNoWec5TE', 47, 60) },
  { id: 'iwona-2', emoji: '💍', label: 'Iwona 2', caption: '💍 MOJA ŻONA IWONA 💍', youtube: yt('lP_Va5_gldU', 0, 6) },
  { id: 'iwona-3', emoji: '💃', label: 'Iwona 3', caption: '💃 SZALONA IWONA 💃', youtube: yt('DY85Dt1ggRM', 42, 55) },
  { id: 'iwona-4', emoji: '💐', label: 'Iwona 4', youtube: yt('yjqdlmryqQU', 58, 74) },
  { id: 'mateusz', emoji: '🕺', label: 'Mateusz 1', caption: '🕺 MATEUSZ, WAJCHĘ PRZEŁÓŻ! 🕺', youtube: yt('NSD_TfnWttI', 27, 36) },
  { id: 'mateusz-2', emoji: '🎤', label: 'Mateusz 2', youtube: yt('l7ZpbW_O5To', 0, 7) },
  { id: 'mateusz-4', emoji: '🎶', label: 'Mateusz 4', youtube: yt('BawFJw1FMPg', 24, 36) },
  { id: 'mateusz-5', emoji: '🤥', label: 'Mateusz 5', caption: '🤥 MATEUSZKU KŁAMCZUSZKU 🤥', youtube: yt('CBaGUW3B3Dw', 17, 42) },
  { id: 'pawelek', emoji: '🙋‍♂️', label: 'Paweł 1', youtube: yt('XU14gfH0LEs', 12, 23) },
  { id: 'pawelek-reklama', emoji: '🍫', label: 'Paweł 2', caption: 'PAWEŁEK! 🍫', youtube: yt('ByWlPEkB-mk', 6, 13) },
  { id: 'pawel-3', emoji: '💃', label: 'Paweł 3', youtube: yt('3-yZRNyZiQA', 52, 59) },
  { id: 'pawel-4', emoji: '🥒', label: 'Paweł 4', youtube: yt('wp5lzsZ58kY', 44, 54) },
  { id: 'wiktoria', emoji: '🎸', label: 'Wiktoria 1', caption: '🎸 O VICTORIO, MOJA VICTORIOOO… 🎸', youtube: yt('2xuq71bLtj8', 235, 243) },
  { id: 'wiktoria-2', emoji: '🍾', label: 'Wiktoria 2', youtube: yt('Oo7SDQ-SfRI', 0, 10) },
  { id: 'wiktoria-4', emoji: '🖤', label: 'Wiktoria 4', youtube: yt('qypy3XUGj8g', 23, 27) },
  { id: 'wiktoria-5', emoji: '💃', label: 'Wiktoria 5', youtube: yt('OUmuYzrP_rw', 91, 101) },
  { id: 'gej-1', emoji: '🌈', label: 'Gej 1', youtube: yt('dcYcoqCqBq0', 36, 50) },
  { id: 'gej-2', emoji: '🌈', label: 'Gej 2', youtube: yt('OGrszdAoCzw', 42, 53) },
  { id: 'gej-3', emoji: '🌈', label: 'Gej 3', youtube: yt('OGrszdAoCzw', 15, 27) },
  { id: 'gej-5', emoji: '🌈', label: 'Gej 5', youtube: yt('X5P2uJELu5A', 5, 17) },
  { id: 'pizza', emoji: '🍕', label: 'Pizza', youtube: yt('cBCfiq9N7xY', 96, 114) },
  { id: 'okrzyk', emoji: '📣', label: 'Okrzyk', youtube: yt('XDriwtfdRaw', 13, 25) },
  { id: 'zlom', emoji: '🔧', label: 'Złom', youtube: yt('kV8_RfdyXnY', 288, 294) },
  { id: 'teleturniej', emoji: '🎰', label: 'Teleturniej', youtube: yt('6JnveTyYLyw', 95, 102) },
  { id: 'nerwy', emoji: '😤', label: 'Nerwy', youtube: yt('5pHDY7S-zmQ', 0, 20) },
  { id: 'kielbasa', emoji: '🌭', label: 'Kiełbasa', youtube: yt('KkqgPSSRUNc', 0) },
  { id: 'zapach', emoji: '👃', label: 'Zapach', youtube: yt('0ogx4_WJ2Qk', 58, 73) },
  { id: 'wedding', emoji: '💒', label: 'Wedding', youtube: yt('Vg6t50VpqbM', 35, 43) },
  { id: 'edukacja', emoji: '🎓', label: 'Edukacja', youtube: yt('Ru1JwyPGtCE', 93, 110) },
  { id: 'penis', emoji: '🍆', label: 'Penis', youtube: yt('Wv76_PmGTZA', 0, 26) },
  { id: 'pusc-mnie', emoji: '🙏', label: 'Puść mnie', youtube: yt('_UeRSsJAyrs', 2, 8) },

  // własne filmiki (public/video) — na TV w okienku w prawym górnym rogu
  { id: 'pawel-mati-1', emoji: '🎤', label: 'Paweł i Mati 1', video: '/video/pawel-mati-1.mp4' },
  { id: 'pawel-mati-2', emoji: '💃', label: 'Paweł i Mati 2', video: '/video/pawel-mati-2.mp4' },
  { id: 'pawel-mati-3', emoji: '🔫', label: 'Paweł i Mati 3', video: '/video/pawel-mati-3.mp4' },

  // 🎬 Story — tylko dla Mateusza: 12 scenek po kolei na cały ekran TV,
  // z przenikaniem i cichą muzyką w tle (YouTube, od 0:27)
  {
    id: 'story',
    emoji: '🎬',
    label: 'Story',
    onlyFor: 'MATEUSZ',
    story: Array.from({ length: 12 }, (_, i) => `/video/story/${String(i + 1).padStart(2, '0')}.mp4`),
    music: { id: 'XwVZ4MzQ7mA', start: 27, volume: 12 },
  },
]

export const memeById = (id) => MEMES.find((m) => m.id === id)

// pierwsze imię bez polskich znaków i wielkości liter („Mateusz K.” → MATEUSZ)
const firstName = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)[0]
    .toLocaleUpperCase('pl-PL')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

// dźwięki „tylko dla” konkretnej osoby (onlyFor) widzi i puszcza tylko ona
export const memeAllowedFor = (m, playerName) => !m.onlyFor || firstName(playerName) === m.onlyFor

// napis na TV
export const memeCaption = (m) =>
  m.caption || `${m.emoji} ${m.label.toLocaleUpperCase('pl-PL')} ${m.emoji}`

// kolejność w menu: alfabetycznie, z numerami po kolei (Gej 1, Gej 2…)
export const sortedMemes = (list) =>
  [...list].sort((a, b) =>
    a.label.localeCompare(b.label, 'pl', { numeric: true, sensitivity: 'base' })
  )

// Czy plik istnieje (Vercel i Vite zwracają index.html dla brakujących
// ścieżek, więc liczy się tylko odpowiedź z typem audio/*)
const availability = new Map()
export function memeAvailable(m) {
  if (!m.optional || m.youtube || m.video || m.story) return Promise.resolve(true)
  if (!availability.has(m.src))
    availability.set(
      m.src,
      fetch(m.src, { method: 'HEAD' })
        .then((r) => r.ok && (r.headers.get('content-type') || '').startsWith('audio/'))
        .catch(() => false)
    )
  return availability.get(m.src)
}
