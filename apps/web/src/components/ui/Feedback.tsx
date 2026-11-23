import type { ReactNode } from 'react';
import { Button, IconButton } from './Button';
import { Icon } from './Icon';
import type { Action, IconName } from './types';
import { cx } from './types';

type Tone = 'success' | 'info' | 'error' | 'warning';
const TONE_ICON: Record<Tone, IconName> = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };

export interface ToastProps { tone?: Tone; title: string; children?: ReactNode; action?: Action; onDismiss?: () => void; className?: string }

export function Toast({ tone = 'info', title, children, action, onDismiss, className }: ToastProps) {
  return (
    <div className={cx('tt-toast', className)} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      <Icon name={TONE_ICON[tone]} size={18} className={`tt-toast-icon tt-tone-icon-${tone}`} />
      <div className="tt-toast-main">
        <div className="tt-toast-title">{title}</div>
        {children && <div className="tt-toast-body">{children}</div>}
      </div>
      <div className="tt-toast-actions">
        {action && <Button variant="ghost" size="sm" onClick={action.onClick} icon={action.icon}>{action.label}</Button>}
        {onDismiss && <IconButton icon="x" label="Dismiss" size="sm" onClick={onDismiss} />}
      </div>
    </div>
  );
}

export interface BannerProps { tone?: Tone; title?: string; children?: ReactNode; action?: Action; onDismiss?: () => void; className?: string }

/** Non-blocking message, e.g. "TMDB is unreachable. Showing cached details." */
export function Banner({ tone = 'error', title, children, action, onDismiss, className }: BannerProps) {
  return (
    <div className={cx('tt-banner', `tt-banner-${tone}`, className)} role="status" aria-live="polite">
      <Icon name={TONE_ICON[tone]} size={18} className={`tt-tone-icon-${tone}`} />
      <div className="tt-banner-main">{title && <strong>{title} </strong>}{children}</div>
      {action && <Button variant="ghost" size="sm" onClick={action.onClick} icon={action.icon}>{action.label}</Button>}
      {onDismiss && <IconButton icon="x" label="Dismiss" size="sm" onClick={onDismiss} />}
    </div>
  );
}
