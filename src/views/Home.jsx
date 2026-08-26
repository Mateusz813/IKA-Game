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
          <span className="home-card-desc">Plansza dla wszystkich — odpal na TV</span>
        </Link>
        <Link to="/play" className="home-card">
          <span className="home-card-emoji">🎮</span>
          <span className="home-card-title">Gracz</span>
          <span className="home-card-desc">Dołącz, zgaduj litery i zbieraj punkty</span>
        </Link>
        <Link to="/admin" className="home-card">
          <span className="home-card-emoji">🎩</span>
          <span className="home-card-title">Prowadzący</span>
          <span className="home-card-desc">Wpisz hasło i steruj grą z telefonu</span>
        </Link>
      </div>
      <ModeBadge />
    </div>
  )
}
