import { Link, Route, Routes } from "react-router-dom";
import SearchPage from "./pages/SearchPage";
import ResultsPage from "./pages/ResultsPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import DemoPage from "./pages/DemoPage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold text-streettrade-ink">
            StreetTrade
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link className="hover:text-streettrade-accent" to="/">
              Search
            </Link>
            <Link className="hover:text-streettrade-accent" to="/results">
              Results
            </Link>
            <Link className="hover:text-streettrade-accent" to="/how-it-works">
              How it works
            </Link>
            <Link className="hover:text-streettrade-accent" to="/demo">
              Demo
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/demo" element={<DemoPage />} />
        </Routes>
      </main>
    </div>
  );
}
