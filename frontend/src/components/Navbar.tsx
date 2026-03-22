import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/search', label: 'Search' },
    { to: '/#how-it-works', label: 'How It Works' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-gray-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
            <MapPin size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-white">Street</span>
            <span className="text-primary">Trade</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/search"
            className="ml-3 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-gray-950 transition-all hover:bg-primary-light hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-white/5 bg-gray-950/95 backdrop-blur-xl transition-all duration-300 ease-in-out md:hidden ${
          mobileOpen ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-1 px-4 py-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/search"
            onClick={() => setMobileOpen(false)}
            className="mt-2 block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-gray-950 transition-all hover:bg-primary-light"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
