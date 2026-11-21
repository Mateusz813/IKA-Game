import { Link } from 'react-router-dom'
import { Logo, ModeBadge } from '../components/common.jsx'

export default function Home() {
  return (
    <div className="home">
      <Logo />
      <p className="home-sub">Domowe Koło Fortuny 🎡</p>
      <div className="home-cards">
        <Link to="/tv" className="home-card">
          <span className="home-card-emoji">📺</span>
          <span className="home-card-title">Telewizor</span>
          <span className="home-card-desc">Plansza i kod QR — odpal na dużym ekranie</span>
        </Link>
        <Link to="/play?admin=1" className="home-card home-card--main">
          <span className="home-card-emoji">👑</span>
          <span className="home-card-title">Admin</span>
          <span className="home-card-desc">
            Wybierasz tryb gry, startujesz i wpisujesz pierwsze hasło (punkty też zbierasz!)
          </span>
        </Link>
        <Link to="/play" className="home-card">
          <span className="home-card-emoji">🎮</span>
          <span className="home-card-title">Gracz</span>
          <span className="home-card-desc">Dołącz, zgaduj litery i hasła — albo zeskanuj QR z TV</span>
        </Link>
      </div>
      <ModeBadge />
    </div>
  )
}
