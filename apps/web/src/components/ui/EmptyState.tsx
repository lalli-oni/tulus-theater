import type { ReactNode } from 'react';
import { Moon } from './Moon';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-charcoal-line px-6 py-16 text-center">
      <Moon className="h-10 w-10 text-violet-glow" />
      <h2 className="text-xl text-parchment">{title}</h2>
      {children && <p className="max-w-md text-parchment-muted">{children}</p>}
    </div>
  );
}
