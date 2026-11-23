import type { ReactNode } from 'react';
import { Moon } from './Ornaments';
import type { MoonPhase } from './types';
import { cx } from './types';

const PHASES: MoonPhase[] = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full'];

export function EmptyState({ title, children, actions, className }: { title: string; children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cx('tt-empty', className)}>
      <div className="tt-empty-moons" aria-hidden="true">
        {PHASES.map((p) => <Moon key={p} phase={p} size={18} />)}
      </div>
      <h3 className="tt-empty-title">{title}</h3>
      {children && <p className="tt-empty-text">{children}</p>}
      {actions && <div className="tt-empty-actions">{actions}</div>}
    </section>
  );
}
