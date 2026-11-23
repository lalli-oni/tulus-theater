import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex items-end justify-between gap-6">
      <div>
        {eyebrow && <div className="tt-overline">{eyebrow}</div>}
        <h1 className="mt-1 font-display text-display-lg">{title}</h1>
      </div>
      {actions}
    </header>
  );
}
