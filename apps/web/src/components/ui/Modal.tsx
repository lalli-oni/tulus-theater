import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Sigil } from './Ornaments';
import { cx } from './types';

export interface ModalProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'danger';
  /** CSS selector inside the modal to focus on open. Defaults to the first focusable element. */
  initialFocus?: string;
  wide?: boolean;
  onClose?: () => void;
}

/** Accessible modal shell: focus trap, Escape to close, focus restore. */
export function Modal({ open, title, children, footer, tone = 'default', initialFocus, wide, onClose }: ModalProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = () =>
      Array.from(root?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((el) => !el.hasAttribute('disabled'));
    (initialFocus ? root?.querySelector<HTMLElement>(initialFocus) : focusables()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
      }
      if (e.key === 'Tab') {
        const f = focusables();
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
  }, [open, initialFocus]);

  if (!open) return null;
  return (
    <div className="tt-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={ref}
        className={cx('tt-dialog', `tt-dialog-${tone}`)}
        style={wide ? { width: 720, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' } : undefined}
        role={tone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="tt-dialog-head">
          <Sigil size={22} className="tt-dialog-sigil" />
          <h2 className="tt-dialog-title" id={titleId}>{title}</h2>
        </div>
        <div className="tt-dialog-body">{children}</div>
        {footer && <div className="tt-dialog-actions">{footer}</div>}
      </div>
    </div>
  );
}
