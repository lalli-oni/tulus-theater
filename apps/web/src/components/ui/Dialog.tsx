import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Sigil } from './Ornaments';
import { cx } from './types';

export interface DialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  tone?: 'default' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/** Modal with focus trap, Escape to cancel, and focus restore. Danger dialogs focus Cancel first. */
export function Dialog({ open, title, children, tone = 'default', confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }: DialogProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const root = ref.current;
    root?.querySelector<HTMLElement>(tone === 'danger' ? '[data-cancel]' : '[data-confirm]')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
      if (e.key === 'Tab' && root) {
        const f = root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const first = f[0];
        const last = f[f.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return (
    <div className="tt-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div ref={ref} className={cx('tt-dialog', `tt-dialog-${tone}`)} role={tone === 'danger' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={titleId}>
        <div className="tt-dialog-head">
          <Sigil size={22} className="tt-dialog-sigil" />
          <h2 className="tt-dialog-title" id={titleId}>{title}</h2>
        </div>
        <div className="tt-dialog-body">{children}</div>
        <div className="tt-dialog-actions">
          <Button variant="ghost" onClick={onCancel} data-cancel>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} data-confirm>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
