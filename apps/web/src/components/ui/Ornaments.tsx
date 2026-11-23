import type { MoonPhase } from './types';
import { cx } from './types';

const PHASE_FRACTION: Record<MoonPhase, number> = {
  new: 0, 'waxing-crescent': 0.25, 'first-quarter': 0.5, 'waxing-gibbous': 0.75, full: 1,
  'waning-gibbous': 0.75, 'last-quarter': 0.5, 'waning-crescent': 0.25,
};

export interface MoonProps { phase?: MoonPhase; size?: number; label?: string; className?: string }

/** A moon phase. Encodes progress in status badges; decorative unless `label` is given. */
export function Moon({ phase = 'full', size = 16, label, className }: MoonProps) {
  const f = PHASE_FRACTION[phase];
  const waning = phase.startsWith('waning') || phase === 'last-quarter';
  const r = 7;
  const c = 8;
  let lit: React.ReactNode = null;
  if (f >= 1) lit = <circle cx={c} cy={c} r={r} fill="currentColor" />;
  else if (f > 0) {
    const rx = Math.abs(1 - 2 * f) * r;
    const sweep = f < 0.5 ? 0 : 1;
    const d = `M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} A${rx.toFixed(2)} ${r} 0 0 ${sweep} ${c} ${c - r}Z`;
    lit = <path d={d} fill="currentColor" transform={waning ? 'translate(16 0) scale(-1 1)' : undefined} />;
  }
  return (
    <svg
      className={cx('tt-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={1} opacity={f >= 1 ? 1 : 0.7} />
      {lit}
    </svg>
  );
}

export interface SigilProps { size?: number; strokeWidth?: number; className?: string }

/** The house sigil: a heptagram {7/3} in a ring. */
export function Sigil({ size = 24, strokeWidth = 1, className }: SigilProps) {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const a = ((-90 + (i * 360) / 7) * Math.PI) / 180;
    return [12 + 8.5 * Math.cos(a), 12 + 8.5 * Math.sin(a)] as const;
  });
  let d = '';
  for (let j = 0; j <= 7; j++) {
    const p = pts[(j * 3) % 7]!;
    d += `${j === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  }
  return (
    <svg className={cx('tt-icon', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="11" />
      <path d={`${d}Z`} />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

const RULE_PHASES: MoonPhase[] = ['waxing-crescent', 'first-quarter', 'full', 'last-quarter', 'waning-crescent'];

export function OrnamentRule({ variant = 'sigil', className }: { variant?: 'sigil' | 'phases'; className?: string }) {
  return (
    <div className={cx('tt-rule', className)} role="separator">
      <span className="tt-rule-mark">
        {variant === 'phases' ? RULE_PHASES.map((p) => <Moon key={p} phase={p} size={12} />) : <Sigil size={16} />}
      </span>
    </div>
  );
}
