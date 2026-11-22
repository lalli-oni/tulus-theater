import { NavLink, Outlet } from 'react-router-dom';
import { Moon } from './ui/Moon';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/series', label: 'TV Series' },
  { to: '/movies', label: 'Movies' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-charcoal focus:p-2">
        Skip to content
      </a>
      <header className="border-b border-charcoal-line bg-charcoal/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2 text-violet-glow">
            <Moon />
            <span className="font-display text-xl font-bold tracking-widest text-parchment">Tulu&apos;s Theater</span>
          </div>
          <nav aria-label="Main" className="flex flex-wrap gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 text-sm transition-colors ${
                    isActive ? 'bg-violet-deep text-violet-glow' : 'text-parchment-muted hover:text-parchment'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
