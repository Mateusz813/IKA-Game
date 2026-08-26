# 🎡 IKA Game — domowe Koło Fortuny

Gra imprezowa w stylu Koła Fortuny: **plansza na telewizorze**, **prowadzący steruje grą z telefonu**, a **gracze zgadują litery ze swoich telefonów** w czasie rzeczywistym.

## Jak się gra

1. **TV** — na telewizorze otwierasz `https://twoja-domena.vercel.app/tv` (pełny ekran: przycisk ⛶). Widać planszę, punkty, kod QR do dołączenia.
2. **Prowadzący** — na swoim telefonie wchodzisz w `/admin`, wpisujesz hasło (kilka słów) i opcjonalnie kategorię, klikasz **Start**.
3. **Gracze** — znajomi skanują QR z telewizora (albo wchodzą na `/play`), wpisują imię i już są w grze.
4. Prowadzący **daje turę** wybranemu graczowi (🎤). Tylko on może wtedy kliknąć literę.
   - Trafiona litera → odsłania się na TV z animacją, gracz dostaje **10 pkt za każde wystąpienie** litery (np. 3×A = 30 pkt), po czym tura wraca do prowadzącego.
   - Pudło → czerwony ✗ na TV, tura wraca do prowadzącego.
   - Prowadzący może też **sam klikać litery** (np. gdy ktoś bez telefonu podaje literę na głos) — punkty dostaje gracz, który aktualnie ma turę (jeśli jest).
5. Gdy ktoś odgadnie całe hasło na głos, prowadzący klika przy nim **🏆** → gracz dostaje **100 pkt**, hasło się odsłania, konfetti 🎉.
6. **Nowa runda** zachowuje graczy i punkty — gracie do woli, wygrywa ten, kto uzbiera najwięcej.

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
  views/            # Home, Admin, Player, TV
```

## Punktacja

| Zdarzenie | Punkty |
|---|---|
| Trafiona litera | 10 × liczba wystąpień |
| Odgadnięte hasło (przyznaje prowadzący) | 100 |
