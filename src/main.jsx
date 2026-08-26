import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './styles/global.css'

// Auto-aktualizacja PWA: sprawdzamy nową wersję co minutę oraz przy każdym
// powrocie do aplikacji — nowa wersja instaluje się i przeładowuje sama,
// bez kasowania i ponownego dodawania apki.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, reg) {
    if (!reg) return
    const check = () => reg.update().catch(() => {})
    setInterval(check, 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
