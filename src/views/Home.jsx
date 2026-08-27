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
          <span className="home-card-desc">
            Zgaduj litery, zbieraj punkty — i prowadź hasło, gdy Twoja kolej 🎩
          </span>
        </Link>
        <Link to="/play?host=1" className="home-card">
          <span className="home-card-emoji">🎩</span>
          <span className="home-card-title">Admin</span>
          <span className="home-card-desc">
            Też grasz normalnie — ale to Ty podajesz pierwsze hasło
          </span>
        </Link>
      </div>
      <ModeBadge />
      <Link to="/admin" className="home-emergency">🎛️ panel awaryjny</Link>
    </div>
  )
}
