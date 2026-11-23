import { useRef, useState } from 'react';
import { cx } from './types';

export interface TabsProps {
  tabs: Array<{ id: string; label: string; count?: number }>;
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  label?: string;
  panelId?: string;
  className?: string;
}

export function Tabs({ tabs, value: valueProp, defaultValue, onChange, label, panelId, className }: TabsProps) {
  const [inner, setInner] = useState(defaultValue ?? tabs[0]?.id);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : inner;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (id: string) => {
    if (!controlled) setInner(id);
    onChange?.(id);
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = tabs.length;
    let j: number | null = null;
    if (e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    if (j === null) return;
    e.preventDefault();
    const next = tabs[j];
    if (!next) return;
    select(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div className={cx('tt-tabs', className)} role="tablist" aria-label={label}>
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            type="button"
            role="tab"
            className="tt-tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
            {t.count != null && <span className="tt-tab-count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
