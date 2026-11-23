import { useEffect, useId, useRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { cx } from './types';

interface FieldShellProps { id: string; label?: string; hint?: string; error?: string; className?: string; children: ReactNode }

function FieldShell({ id, label, hint, error, className, children }: FieldShellProps) {
  return (
    <div className={cx('tt-field', className)}>
      {label && <label className="tt-field-label" htmlFor={id}>{label}</label>}
      {children}
      {error ? (
        <div className="tt-field-error" id={`${id}-err`}><Icon name="alert" size={14} />{error}</div>
      ) : hint ? (
        <div className="tt-field-hint" id={`${id}-hint`}>{hint}</div>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string }

export function Input({ label, hint, error, className, id: idProp, ...rest }: InputProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input {...rest} id={id} className="tt-field-control" aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: Array<string | { value: string; label: string }>;
}

export function Select({ label, hint, error, className, id: idProp, options, ...rest }: SelectProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="tt-select">
        <select {...rest} id={id} className="tt-field-control" aria-invalid={error ? true : undefined}>
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <Icon name="chevronDown" size={16} />
      </div>
    </FieldShell>
  );
}

export interface SearchBarProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  /** Focus the field when "/" is pressed outside an input. */
  shortcut?: boolean;
  className?: string;
}

export function SearchBar({ value: valueProp, defaultValue = '', onChange, placeholder = 'Search the archive…', label = 'Search titles', shortcut, className }: SearchBarProps) {
  const [inner, setInner] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : inner;
  const ref = useRef<HTMLInputElement>(null);

  const set = (v: string) => {
    if (!controlled) setInner(v);
    onChange?.(v);
  };

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && t !== 'INPUT' && t !== 'TEXTAREA' && t !== 'SELECT') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut]);

  return (
    <div className={cx('tt-search', className)} role="search">
      <Icon name="search" size={18} />
      <input
        ref={ref}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            set('');
          }
        }}
      />
      <div className="tt-search-end">
        {value ? (
          <button type="button" className="tt-search-clear" aria-label="Clear search" onClick={() => { set(''); ref.current?.focus(); }}>
            <Icon name="x" size={16} />
          </button>
        ) : shortcut ? (
          <kbd className="tt-kbd" aria-hidden="true">/</kbd>
        ) : null}
      </div>
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; hint?: string; error?: string }

export function Textarea({ label, hint, error, className, id: idProp, ...rest }: TextareaProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        rows={3}
        {...rest}
        id={id}
        className="tt-field-control"
        style={{ height: 'auto', padding: 'var(--space-2) var(--space-3)', resize: 'vertical' }}
        aria-invalid={error ? true : undefined}
      />
    </FieldShell>
  );
}
