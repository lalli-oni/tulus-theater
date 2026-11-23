import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

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

/** Confirm/cancel modal. Danger dialogs focus Cancel first. */
export function Dialog({ open, title, children, tone = 'default', confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }: DialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      tone={tone}
      onClose={onCancel}
      initialFocus={tone === 'danger' ? '[data-cancel]' : '[data-confirm]'}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} data-cancel>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} data-confirm>{confirmLabel}</Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
