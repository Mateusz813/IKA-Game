import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameProvider } from './lib/store.jsx'
import Home from './views/Home.jsx'
import Admin from './views/Admin.jsx'
import Player from './views/Player.jsx'
import TV from './views/TV.jsx'

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/play" element={<Player />} />
          <Route path="/tv" element={<TV />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  )
}
