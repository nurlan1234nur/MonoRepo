import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

// Доороос гарах modal bottom-sheet (mood picker, зураг нэмэх зэрэгт).
export default function Sheet({ open, onClose, title, children }: SheetProps) {
  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 z-50 flex items-end bg-deep/45 transition-opacity duration-200 ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full rounded-t-[28px] bg-cream px-5 pb-10 pt-5 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-4 text-xl text-muted"
          aria-label="Хаах"
        >
          ✕
        </button>
        {title && <div className="mb-4 text-center text-xl font-semibold text-deep">{title}</div>}
        {children}
      </div>
    </div>
  );
}
