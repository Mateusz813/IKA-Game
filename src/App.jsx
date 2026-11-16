import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './lib/store.jsx'
import Home from './views/Home.jsx'
import Player from './views/Player.jsx'
import TV from './views/TV.jsx'

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Player />} />
          <Route path="/tv" element={<TV />} />
          {/* dawny panel admina — wszyscy grają teraz przez /play */}
          <Route path="/admin" element={<Navigate to="/play" replace />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  )
}
