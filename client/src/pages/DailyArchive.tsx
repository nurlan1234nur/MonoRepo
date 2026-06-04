import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import Avatar from '../components/Avatar';
import type { DailyHistoryDay } from '../types';

// Даваагаар эхэлсэн долоо хоног.
const WEEKDAYS = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];
const WEEKDAY_FULL = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function DailyArchive({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [days, setDays] = useState<DailyHistoryDay[]>([]);
  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void api<{ days: DailyHistoryDay[] }>('/daily/history').then((r) => setDays(r.days));
    setSelected(null);
    setViewY(now.getFullYear());
    setViewM(now.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const map = useMemo(() => {
    const m = new Map<string, DailyHistoryDay>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  if (!open) return null;

  const firstWeekday = (new Date(viewY, viewM, 1).getDay() + 6) % 7; // Даваа = 0
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const todayKey = ymd(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDay = selected ? map.get(selected) : null;

  function shift(delta: number) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewM(m);
    setViewY(y);
  }

  function selectedLabel(): string {
    if (!selected) return '';
    const [y, m, d] = selected.split('-').map(Number);
    const wd = new Date(y, m - 1, d).getDay();
    return `${m}-р сарын ${d} · ${WEEKDAY_FULL[wd]}`;
  }

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-gradient-to-b from-warm to-cream">
      {/* Толгой */}
      <header className="flex flex-shrink-0 items-center gap-3 px-5 pb-3 pt-4">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-xl text-deep shadow-sm transition-transform active:scale-90"
          aria-label="Буцах"
        >
          ‹
        </button>
        <div>
          <div className="text-xl font-bold text-deep">Бидний өдрүүд 💌</div>
          <div className="text-[12px] text-muted">Өдрийн асуултын түүх</div>
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-8">
        {/* Сар сэлгэх */}
        <div className="mb-2 flex items-center justify-between px-1">
          <button onClick={() => shift(-1)} className="h-8 w-8 rounded-full text-lg text-rose transition-transform active:scale-90">‹</button>
          <div className="text-[15px] font-bold text-deep">{viewY} оны {viewM + 1}-р сар</div>
          <button onClick={() => shift(1)} className="h-8 w-8 rounded-full text-lg text-rose transition-transform active:scale-90">›</button>
        </div>

        {/* Calendar */}
        <div className="rounded-3xl bg-card p-3 shadow-[0_2px_16px_rgba(45,31,46,0.07)]">
          <div className="mb-1 grid grid-cols-7 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-[11px] font-semibold text-muted">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const key = ymd(viewY, viewM, d);
              const has = map.has(key);
              const isToday = key === todayKey;
              const isSel = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-[13px] transition-all active:scale-90 ${
                    has ? 'bg-gradient-to-br from-rose to-[#b83456] font-bold text-white shadow' : 'text-deep'
                  } ${isSel ? 'ring-2 ring-rose ring-offset-1' : ''} ${isToday && !has ? 'ring-1 ring-rose/50' : ''}`}
                >
                  {d}
                  {has && <span className="absolute bottom-0.5 text-[7px]">♥</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Сонгосон өдрийн дэлгэрэнгүй */}
        {selected && (
          <div className="mt-4">
            <div className="mb-2 pl-1 text-[12px] font-semibold text-muted">{selectedLabel()}</div>
            {selectedDay ? (
              <div className="rounded-3xl bg-gradient-to-br from-deep to-[#4a2d4e] p-5 shadow-lg">
                <div className="mb-3 text-[16px] font-medium leading-snug text-white">"{selectedDay.question}"</div>
                <div className="space-y-2">
                  {selectedDay.answers.map((a) => (
                    <div key={a._id} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-blush">
                        <Avatar value={a.user.avatar} className="h-5 w-5" emojiClassName="text-[11px]" />
                        {a.user.name}
                      </div>
                      <div className="text-[13px] leading-snug text-white">{a.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-card px-4 py-6 text-center text-sm text-muted shadow-sm">
                Энэ өдөр асуултад хариулаагүй байна 🤍
              </div>
            )}
          </div>
        )}

        {!selected && (
          <p className="mt-6 px-6 text-center text-[13px] leading-relaxed text-muted">
            ♥ тэмдэгтэй өдрүүд дээр дарж тухайн өдрийн асуулт, хоёрын хариултыг хараарай.
          </p>
        )}
      </div>
    </div>
  );
}
