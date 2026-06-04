import Sheet from './Sheet';

const MOODS: { emoji: string; text: string }[] = [
  { emoji: '🥰', text: 'Хайртай' },
  { emoji: '😊', text: 'Сайхан' },
  { emoji: '😌', text: 'Тайван' },
  { emoji: '🤗', text: 'Дулаан' },
  { emoji: '😴', text: 'Ядарсан' },
  { emoji: '😔', text: 'Гуниг' },
  { emoji: '🤩', text: 'Баяртай' },
  { emoji: '😤', text: 'Уурлаж' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string, text: string) => void;
}

export default function MoodPickerSheet({ open, onClose, onSelect }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Өнөөдрийн мэдрэмж">
      <div className="grid grid-cols-4 gap-2.5">
        {MOODS.map((m) => (
          <button
            key={m.emoji}
            onClick={() => onSelect(m.emoji, m.text)}
            className="rounded-2xl bg-card px-2 py-3.5 text-center transition-transform active:scale-90"
          >
            <span className="mb-1 block text-3xl">{m.emoji}</span>
            <span className="text-[11px] font-medium text-muted">{m.text}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
