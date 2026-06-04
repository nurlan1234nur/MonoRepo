import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { monthLabel } from '../lib/date';
import AddMomentSheet from '../components/AddMomentSheet';
import type { Moment } from '../types';

export default function Memories() {
  const { user } = useAuth();
  const toast = useToast();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    void api<{ moments: Moment[] }>('/moments').then((r) => setMoments(r.moments));
    const socket = getSocket();
    socket.on('moment:new', (m: Moment) =>
      setMoments((prev) => (prev.some((x) => x._id === m._id) ? prev : [m, ...prev])),
    );
    socket.on('moment:deleted', ({ id }: { id: string }) =>
      setMoments((prev) => prev.filter((m) => m._id !== id)),
    );
    return () => {
      socket.off('moment:new');
      socket.off('moment:deleted');
    };
  }, []);

  async function deleteMoment(id: string) {
    setMoments((prev) => prev.filter((m) => m._id !== id));
    try {
      await api(`/moments/${id}`, { method: 'DELETE' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Устгахад алдаа гарлаа');
    }
  }

  // Сараар бүлэглэх (шинэ → хуучин).
  const groups = useMemo(() => {
    const map = new Map<string, Moment[]>();
    for (const m of moments) {
      const key = monthLabel(m.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()];
  }, [moments]);

  return (
    <>
      <header className="flex-shrink-0 px-6 pt-3">
        <div className="text-2xl font-bold text-deep">Дурсамж сан</div>
        <div className="mt-0.5 text-[13px] text-muted">{moments.length} зураг</div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-[90px] pt-3.5">
        {groups.map(([label, items]) => (
          <div key={label} className="mb-2">
            <div className="mb-2.5 mt-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              {label}
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2.5">
              {items.map((m) => (
                <div
                  key={m._id}
                  className="relative aspect-square overflow-hidden rounded-2xl shadow-md"
                >
                  <img src={m.imageUrl} alt={m.caption} className="h-full w-full object-cover" />
                  {m.author._id === user?.id && (
                    <button
                      onClick={() => void deleteMoment(m._id)}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-deep/55 text-xs text-white backdrop-blur transition-transform active:scale-90"
                      aria-label="Устгах"
                    >
                      ✕
                    </button>
                  )}
                  {m.caption && (
                    <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-white/85 px-2 py-0.5 text-center text-[11px] font-semibold text-deep backdrop-blur">
                      {m.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {moments.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">Одоохондоо зураг алга.</p>
        )}

        <button
          onClick={() => setAddOpen(true)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blush bg-card py-4 text-sm font-medium text-rose transition-colors active:bg-blush"
        >
          <span className="text-xl">+</span> Дурсамж нэмэх
        </button>
      </div>

      <AddMomentSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(m) => setMoments((prev) => [m, ...prev])}
      />
    </>
  );
}
