import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchUnknowns, UNKNOWNS_KEY } from '../pages/Unknowns';
import { SideNav } from './SideNav';

const LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/series', label: 'TV Series' },
  { to: '/movies', label: 'Movies' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  // Settings gets a count while any title still needs an owner.
  const unknowns = useQuery({ queryKey: UNKNOWNS_KEY, queryFn: fetchUnknowns, retry: false });
  const n = unknowns.data?.length ?? 0;
  const counts: Record<string, number> = n > 0 ? { '/settings': n } : {};
  return (
    <div className="tt-stage flex min-h-screen">
      <a href="#main" className="tt-sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface-overlay focus:p-2">
        Skip to content
      </a>
      <div className="sticky top-0 h-screen shrink-0 max-md:hidden">
        <SideNav counts={counts} />
      </div>
      <div className="min-w-0 flex-1">
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto border-b border-border-subtle bg-surface-raised px-2 py-2 md:hidden">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className="tt-navlink shrink-0">{l.label}</NavLink>
          ))}
        </nav>
        <main id="main" className="px-8 pb-12 pt-8 max-md:px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
