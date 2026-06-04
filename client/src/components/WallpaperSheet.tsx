import Sheet from './Sheet';
import { WALLPAPERS } from '../lib/wallpaper';

export default function WallpaperSheet({
  open,
  onClose,
  current,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  current: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Чатын дэвсгэр">
      <div className="grid grid-cols-3 gap-3">
        {WALLPAPERS.map((w) => (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
          >
            <div
              className={`h-20 w-full rounded-2xl border-2 ${
                current === w.id ? 'border-rose' : 'border-blush/40'
              }`}
              style={{ background: w.css || '#fdf6f0' }}
            />
            <span className={`text-[11px] ${current === w.id ? 'font-bold text-rose' : 'text-muted'}`}>
              {w.name}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
