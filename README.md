# 🎡 WIMP Game — domowe Koło Fortuny

Gra imprezowa w stylu Koła Fortuny: **plansza na telewizorze**, **wszyscy grają na swoich telefonach**, a prowadzenie przechodzi z rąk do rąk — w czasie rzeczywistym.

## Jak się gra

Na stronie głównej są 3 opcje: **📺 Telewizor**, **👑 Admin**, **🎮 Gracz**.

1. **📺 TV** — otwierasz `https://ika-game.vercel.app/tv` (pełny ekran: ⛶). Poczekalnia z dużym kodem QR. Kliknij raz w ekran, żeby przeglądarka pozwoliła grać dźwiękom.
2. **👑 Admin** — gospodarz wybiera „Admin” (bez skanowania QR), wpisuje imię, wybiera **tryb gry**: 5 haseł / 10 haseł (wygrywa najwięcej punktów) albo do 300 / 500 pkt (wygrywa pierwszy, kto dobije) — i klika **▶ Start**. Admin też zbiera punkty.
3. **🎮 Gracze** — skanują QR z TV i od razu dodają zdjęcie i imię; czekają w poczekalni na start.
4. **Start** — TV pokazuje tryb gry, warunek zwycięstwa i punktację. Admin wpisuje pierwsze hasło (z kategorią). Hasło widzi **wyłącznie** prowadzący.
5. **Runda** — prowadzący wskazuje 🎤, kto zgaduje. Ta osoba klika literę (10 pkt za każde wystąpienie) **albo „Zgadnij hasło”** (+100 pkt, pomyłka kończy turę). Hasło powiedziane na głos prowadzący zalicza przyciskiem 🏆. Gdy wszystkie litery są odsłonięte, runda kończy się sama.
6. **👉 Po rundzie** prowadzący przekazuje prowadzenie — jednym przyciskiem osobie, która zgadła, albo komuś innemu (lub zostaje). Prowadzący może przekazać prowadzenie w każdej chwili, a admin zawsze może zmienić prowadzącego (w trakcie rundy przerywa ją bez zdradzania hasła).
7. **🏁 Koniec** — TV pokazuje podium; admin klika „🔄 Zagraj jeszcze raz”.

**💍 Niespodzianka** — gdy prowadzi **Iwona** i wpisze hasło „Czy zostaniesz moją świadkową?”, po przyznaniu przez nią punktów na TV leci filmik (`public/video/swiadkowa.mp4`) z przyciskami „Jeszcze raz” / „Zamknij” (na TV i na telefonie Iwony). W tej rundzie nie ma przycisku „Zgadnij hasło” — rundę kończy wyłącznie Iwona. U innych prowadzących to zwykłe hasło.

**🔊 Menu pod avatarem** — dotknięcie swojego avatara u góry telefonu otwiera menu: memiczne dźwięki grane na TV, zmiana zdjęcia, zasady, kolejny gracz na tym telefonie; admin ma tam też zmianę prowadzącego, koniec gry i „jeszcze raz”. Nikt nie może usunąć innego gracza. Stara gra (>2 h bez nikogo podłączonego) czyści się sama przy następnym otwarciu.

Nowy dźwięk = jedna linijka w `src/lib/memes.js`:
- plik: `{ src: '/sounds/x.mp3', start, dur }` (fragment w sekundach; `optional: true` — przycisk pojawi się dopiero, gdy plik istnieje),
- fragment z YouTube: `{ youtube: { id, start, end } }` — na TV wyskakuje oficjalny odtwarzacz YouTube z tym fragmentem i sam się zamyka (zasady YouTube wymagają, żeby odtwarzacz był widoczny).

**Kilku graczy na jednym urządzeniu** — menu pod avatarem → „👥 Kolejny gracz na tym telefonie” otwiera nową kartę (`/play?as=2`, `?as=3`…); każda karta to osobny gracz (numer widać w nagłówku).

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
