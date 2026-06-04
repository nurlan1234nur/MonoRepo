import Sheet from './Sheet';

const ITEMS = [
  { id: 'profile', icon: '💑', label: 'Хайрын профайл' },
  { id: 'media', icon: '🖼️', label: 'Илгээсэн зургууд' },
  { id: 'search', icon: '🔍', label: 'Зурвас хайх' },
  { id: 'wallpaper', icon: '🎨', label: 'Дэвсгэр солих' },
  // Одоогоор нуусан — кодыг (clearChat, DELETE /messages) дараа дахин нээхэд бэлэн үлдээв.
  { id: 'clear', icon: '🗑️', label: 'Чат цэвэрлэх', danger: true, hidden: true },
] as const;

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
        {ITEMS.filter((it) => !('hidden' in it && it.hidden)).map((it) => (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={`flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left transition-colors active:bg-warm ${
              'danger' in it && it.danger ? 'text-rose' : 'text-deep'
            }`}
          >
            <span className="text-xl">{it.icon}</span>
            <span className="text-[15px] font-medium">{it.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
