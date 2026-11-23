import { NavLink } from 'react-router-dom';
import { Icon, Moon, Sigil } from './ui';
import type { IconName, MoonPhase } from './ui';

const SECTIONS: Array<{ to: string; label: string; icon: IconName; group: 'archive' | 'backstage' }> = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', group: 'archive' },
  { to: '/series', label: 'TV Series', icon: 'tv', group: 'archive' },
  { to: '/movies', label: 'Movies', icon: 'film', group: 'archive' },
  { to: '/wishlist', label: 'Wishlist', icon: 'star', group: 'archive' },
  { to: '/settings', label: 'Settings', icon: 'settings', group: 'backstage' },
];

const PHASES: MoonPhase[] = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full'];

export function SideNav({ counts = {} }: { counts?: Record<string, number> }) {
  const group = (g: 'archive' | 'backstage') => (
    <ul className="tt-nav-list">
      {SECTIONS.filter((s) => s.group === g).map((s) => (
        <li key={s.to}>
          <NavLink to={s.to} end={s.to === '/'} className="tt-navlink">
            <Icon name={s.icon} size={18} />
            <span className="tt-navlink-label">{s.label}</span>
            {counts[s.to] != null && <span className="tt-navlink-count">{counts[s.to]}</span>}
          </NavLink>
        </li>
      ))}
    </ul>
  );
  return (
    <nav className="tt-nav" aria-label="Main">
      <NavLink className="tt-nav-brand" to="/">
        <Sigil size={30} />
        <span>
          <div className="tt-nav-name">Tulu&apos;s Theater</div>
          <div className="tt-nav-sub">Archive after dark</div>
        </span>
      </NavLink>
      <div className="tt-nav-group tt-overline" aria-hidden="true">The archive</div>
      {group('archive')}
      <div className="tt-nav-group tt-overline" aria-hidden="true">Backstage</div>
      {group('backstage')}
      <div className="tt-nav-foot">
        <div className="tt-nav-moons" aria-hidden="true">{PHASES.map((p) => <Moon key={p} phase={p} size={12} />)}</div>
        <div className="tt-nav-foot-text">Alecha &amp; Lalli</div>
      </div>
    </nav>
  );
}
