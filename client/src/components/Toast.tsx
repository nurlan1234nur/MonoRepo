import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastFn = (msg: string) => void;
const ToastContext = createContext<ToastFn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className={`pointer-events-none fixed left-1/2 top-6 z-[100] -translate-x-1/2 rounded-3xl bg-deep px-5 py-2.5 text-sm font-medium text-white shadow-xl transition-all duration-300 ${
          show ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'
        }`}
      >
        {msg}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
