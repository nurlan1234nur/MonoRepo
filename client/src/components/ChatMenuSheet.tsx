import { HeartHandshake, Images, Palette, Search, Trash2, type LucideIcon } from 'lucide-react';
import Sheet from './Sheet';

const ITEMS: Array<{
  id: 'profile' | 'media' | 'search' | 'wallpaper' | 'clear';
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  hidden?: boolean;
}> = [
  { id: 'profile', icon: HeartHandshake, label: 'Хайрын профайл' },
  { id: 'media', icon: Images, label: 'Илгээсэн зургууд' },
  { id: 'search', icon: Search, label: 'Зурвас хайх' },
  { id: 'wallpaper', icon: Palette, label: 'Дэвсгэр солих' },
  // Одоогоор нуусан: clearChat / DELETE /messages кодыг дараа дахин нээхэд бэлэн.
  { id: 'clear', icon: Trash2, label: 'Чат цэвэрлэх', danger: true, hidden: true },
];

export type ChatMenuAction = (typeof ITEMS)[number]['id'];

export default function ChatMenuSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (action: ChatMenuAction) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Чатын тохиргоо">
      <div className="space-y-1">
        {ITEMS.filter((it) => !it.hidden).map((it) => (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={`flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors active:bg-warm ${
              it.danger ? 'text-rose' : 'text-deep'
            }`}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-warm text-rose">
              <it.icon size={20} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-medium">{it.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
