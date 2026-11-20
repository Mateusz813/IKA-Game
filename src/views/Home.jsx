import { Link } from 'react-router-dom'
import { Logo, ModeBadge } from '../components/common.jsx'

export default function Home() {
  return (
    <div className="home">
      <Logo />
      <p className="home-sub">Domowe Koło Fortuny 🎡</p>
      <ol className="home-steps">
        <li>📺 Otwórz <b>Telewizor</b> na dużym ekranie</li>
        <li>📱 Każdy (Ty też!) skanuje kod QR i wpisuje imię</li>
        <li>▶ Ktoś klika <b>Zaczynamy</b> — i gramy!</li>
      </ol>
      <div className="home-cards">
        <Link to="/tv" className="home-card">
          <span className="home-card-emoji">📺</span>
          <span className="home-card-title">Telewizor</span>
          <span className="home-card-desc">Plansza i kod QR dla wszystkich</span>
        </Link>
        <Link to="/play" className="home-card home-card--main">
          <span className="home-card-emoji">🎮</span>
          <span className="home-card-title">Graj na telefonie</span>
          <span className="home-card-desc">Zgadujesz litery, a gdy przyjdzie Twoja kolej — wymyślasz hasło 🎩</span>
        </Link>
      </div>
      <ModeBadge />
    </div>
  )
}
