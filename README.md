# 🎡 WIMP Game — domowe Koło Fortuny

Gra imprezowa w stylu Koła Fortuny: **plansza na telewizorze**, **wszyscy grają na swoich telefonach**, a **hasła wymyśla każdy po kolei** — w czasie rzeczywistym.

## Jak się gra

1. **📺 TV** — otwierasz `https://ika-game.vercel.app/tv` (pełny ekran: ⛶). Widać poczekalnię z dużym kodem QR. Kliknij raz w ekran, żeby przeglądarka pozwoliła grać dźwiękom.
2. **📱 Poczekalnia** — każdy (Ty też) skanuje QR, wpisuje imię i może zrobić sobie zdjęcie-avatar. W poczekalni ustawiacie **„Ile gramy?”**: każdy wymyśla 1 hasło / 2 hasła / do 300 pkt / do 500 pkt.
3. **▶ Zaczynamy** — kto kliknie, ten wymyśla pierwsze hasło. Hasło widzi **wyłącznie** osoba, która je wpisuje.
4. **Runda** — prowadzący wskazuje 🎤, kto zgaduje literę; ta osoba klika literę na swoim telefonie.
   - Trafiona litera → odsłania się na TV, **10 pkt za każde wystąpienie** (3×A = 30 pkt).
   - Pudło → czerwony ✗ na TV. Po każdej literze prowadzący wybiera kolejną osobę.
5. **🎯 Znam hasło!** — każdy gracz w dowolnej chwili może wpisać całe hasło (polskie znaki i wielkość liter bez znaczenia). Dobrze → **+100 pkt**. Źle → wpadka na TV i blokada do odsłonięcia kolejnej litery. Gdy ktoś powie hasło na głos, prowadzący przyznaje punkty przyciskiem 🏆.
6. **🔁 Kolejka** — po każdym haśle prowadzenie przechodzi automatycznie na następną osobę (kto prowadził najmniej razy, potem kolejność dołączenia). Nie masz pomysłu? „Pomiń mnie”.
7. **🏁 Koniec** — gdy każdy wymyślił swoje hasła albo ktoś dobił do limitu punktów, TV pokazuje podium. „🔄 Zagraj jeszcze raz” wraca do poczekalni.

**🔊 Menu pod avatarem** — dotknięcie swojego avatara u góry telefonu otwiera menu: memiczne dźwięki grane na TV, zmiana zdjęcia, zasady i opcje gry (pominięcie zawieszonego prowadzącego bez zdradzania hasła, koniec gry, nowa gra, wyjście). Nikt nie może usunąć innego gracza.

Nowy dźwięk = jedna linijka w `src/lib/memes.js`:
- plik: `{ src: '/sounds/x.mp3', start, dur }` (fragment w sekundach; `optional: true` — przycisk pojawi się dopiero, gdy plik istnieje, np. przygotowane `wiktoria.mp3`),
- fragment z YouTube: `{ youtube: { id, start, end } }` — na TV wyskakuje oficjalny odtwarzacz YouTube z tym fragmentem i sam się zamyka (zasady YouTube wymagają, żeby odtwarzacz był widoczny).

**Test na jednym komputerze** — w trybie `npm run dev` otwórz kilka kart `/play?as=a`, `/play?as=b`… — każda karta to osobny gracz.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Bez konfiguracji Firebase aplikacja działa w **trybie lokalnym** — stan synchronizuje się tylko między kartami jednej przeglądarki (dobre do testów, widać żółty znaczek „tryb lokalny").

## Konfiguracja Firebase (wymagana do gry na wielu urządzeniach) — ~5 minut

Synchronizacja w czasie rzeczywistym działa przez **Firebase Realtime Database** (darmowy plan Spark w zupełności wystarcza).

1. Wejdź na [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (np. `ika-game`), Google Analytics możesz wyłączyć.
2. W projekcie: **Build → Realtime Database → Create Database** → wybierz lokalizację `europe-west1` → tryb **locked mode** (zaraz zmienimy reguły).
3. W zakładce **Rules** wklej i opublikuj:
   ```json
   {
     "rules": {
       "game": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
   > Baza jest otwarta dla znających URL — dla domowej gry to OK, nie trzymaj tam niczego prywatnego.
4. **Project settings (⚙️) → Your apps → ikona `</>` (Web)** → zarejestruj aplikację (bez hostingu) → skopiuj wartości z obiektu `firebaseConfig`.
5. Utwórz plik `.env.local` (wzór w `.env.example`) i uzupełnij:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=https://...firebasedatabase.app
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   `VITE_FIREBASE_DATABASE_URL` skopiuj z widoku Realtime Database (adres nad drzewkiem danych).

## Deploy na Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → zaimportuj repo `Mateusz813/IKA-Game` (framework: Vite, wykryje się sam).
2. W **Settings → Environment Variables** dodaj te same zmienne `VITE_FIREBASE_*` co w `.env.local` i zrób **Redeploy**.
3. Gotowe — każdy push na `main` deployuje się automatycznie.

Można też z terminala: `vercel --prod`.

## PWA

Aplikacja jest pełnym PWA — na telefonie (Chrome/Safari) wybierz **„Dodaj do ekranu głównego"**, a odpali się jak natywna apka, pełnoekranowo. Na TV wystarczy przeglądarka.

## Stack / architektura

- **React 19 + Vite 7**, czysty CSS (animacje kafelków, konfetti przy wygranej)
- **Firebase Realtime Database** jako warstwa real-time — cały stan gry to jeden obiekt `game/`, każdy klient subskrybuje zmiany (`onValue`), więc reakcja jest natychmiastowa (~50–150 ms). Vercel nie utrzymuje długożyjących połączeń WebSocket w funkcjach serverless, dlatego zamiast własnego serwera WS użyty jest hostowany kanał real-time — efekt dla graczy jest identyczny, a nie trzeba utrzymywać backendu.
- **Tryb lokalny** (fallback bez Firebase): `localStorage` + `BroadcastChannel` — synchronizacja między kartami jednej przeglądarki.
- **PWA**: `vite-plugin-pwa` (manifest + service worker, auto-update).
- Routing: `/` wybór roli · `/tv` telewizor · `/admin` prowadzący · `/play` gracz.

### Struktura

```
src/
  lib/
    alphabet.js     # polski alfabet, normalizacja hasła
    layout.js       # układanie hasła na planszy 12-14-14-12 (jak w TV)
    store.jsx       # stan gry + akcje (start, litera, tura, punkty…)
    hooks.js        # animacje, tożsamość gracza
    sync/           # adaptery real-time: firebase / local
  components/       # Board (plansza), Keyboard, wspólne drobiazgi
  views/            # Home, Player (wszyscy na telefonach), TV
```

## Punktacja

| Zdarzenie | Punkty |
|---|---|
| Trafiona litera | 10 × liczba wystąpień |
| Odgadnięte hasło (przyznaje prowadzący) | 100 |
