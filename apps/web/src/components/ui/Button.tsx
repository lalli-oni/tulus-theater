import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import type { IconName } from './types';
import { cx } from './types';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconName;
  iconRight?: IconName;
}

export function Button({ variant = 'primary', size = 'md', icon, iconRight, className, children, ...rest }: ButtonProps) {
  const iconSize = size === 'sm' ? 16 : 18;
  return (
    <button type="button" {...rest} className={cx('tt-btn', `tt-btn-${variant}`, size === 'sm' && 'tt-btn-sm', className)}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  label: string;
  variant?: Variant;
  size?: 'md' | 'sm';
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx('tt-btn', 'tt-btn-icon', `tt-btn-${variant}`, size === 'sm' && 'tt-btn-sm', className)}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
    </button>
  );
}
