import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './types';
import { cx } from './types';

export interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  count?: number;
  icon?: IconName;
  /** Makes the chip a static, removable filter tag. */
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}

export function Chip({ children, selected, onClick, count, icon, onRemove, removeLabel, className }: ChipProps) {
  if (onRemove) {
    return (
      <span className={cx('tt-chip', 'tt-chip-static', className)}>
        {children}
        <button type="button" className="tt-chip-remove" aria-label={`Remove filter: ${removeLabel ?? (typeof children === 'string' ? children : '')}`} onClick={onRemove}>
          <Icon name="x" size={14} />
        </button>
      </span>
    );
  }
  return (
    <button type="button" className={cx('tt-chip', className)} aria-pressed={!!selected} onClick={onClick}>
      {icon && <Icon name={icon} size={14} />}
      {children}
      {count != null && <span className="tt-chip-count">{count}</span>}
    </button>
  );
}
