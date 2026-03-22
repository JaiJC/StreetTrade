import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import SearchPage from './pages/SearchPage'
import DemoPage from './pages/DemoPage'
import BusinessDetailPage from './pages/BusinessDetailPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/business/:id" element={<BusinessDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
