import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Toast } from './ui';
import type { Action } from './ui';

export interface ToastInput { title: string; body?: string; tone?: 'success' | 'info' | 'error' | 'warning'; action?: Action; ms?: number }
interface Item extends ToastInput { id: number }

const Ctx = createContext<(t: ToastInput) => void>(() => undefined);
export const useToast = () => useContext(Ctx);

/** Bottom-right toasts. Ones with an action (Undo) stay longer. */
export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const next = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const push = useCallback((t: ToastInput) => {
    const id = next.current++;
    setItems((xs) => [...xs.slice(-2), { ...t, id }]);
    timers.current.set(id, setTimeout(() => dismiss(id), t.ms ?? (t.action ? 10_000 : 5_000)));
  }, [dismiss]);

  useEffect(() => {
    const m = timers.current;
    return () => m.forEach(clearTimeout);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="tt-toast-region">
        {items.map((t) => (
          <Toast
            key={t.id}
            tone={t.tone ?? 'success'}
            title={t.title}
            action={t.action && { ...t.action, onClick: () => { t.action?.onClick?.(); dismiss(t.id); } }}
            onDismiss={() => dismiss(t.id)}
          >
            {t.body}
          </Toast>
        ))}
      </div>
    </Ctx.Provider>
  );
}
