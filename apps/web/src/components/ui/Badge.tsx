import type { ReactNode } from 'react';

type Tone = 'violet' | 'emerald' | 'muted';
const tones: Record<Tone, string> = {
  violet: 'bg-violet-deep text-violet-glow',
  emerald: 'bg-emerald-deep text-emerald-glow',
  muted: 'bg-charcoal-raised text-parchment-muted',
};

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
