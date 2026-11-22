import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';

const styles: Record<Variant, string> = {
  primary: 'bg-violet text-parchment hover:bg-violet-glow hover:text-ink shadow-neonViolet',
  ghost: 'border border-charcoal-line text-parchment hover:border-emerald hover:text-emerald-glow',
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}
