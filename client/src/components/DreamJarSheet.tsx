import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import Sheet from './Sheet';
import Avatar from './Avatar';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { Wish } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

function sortWishes(wishes: Wish[]): Wish[] {
  return [...wishes].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export default function DreamJarSheet({ open, onClose, onCountChange }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateWishes = useCallback(
    (next: Wish[]) => {
      const sorted = sortWishes(next);
      setWishes(sorted);
      onCountChange?.(sorted.filter((wish) => !wish.completed).length);
    },
    [onCountChange],
  );

  const loadWishes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ wishes: Wish[] }>('/wishes');
      updateWishes(result.wishes);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Хүслийн санг уншихад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [toast, updateWishes]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void loadWishes(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWishes, open]);

  useEffect(() => {
    const socket = getSocket();
    const addWish = (wish: Wish) => {
      setWishes((current) => {
        const next = current.some((item) => item._id === wish._id) ? current : [...current, wish];
        onCountChange?.(next.filter((item) => !item.completed).length);
        return sortWishes(next);
      });
    };
    const updateWish = (wish: Wish) => {
      setWishes((current) => {
        const next = current.map((item) => (item._id === wish._id ? wish : item));
        onCountChange?.(next.filter((item) => !item.completed).length);
        return sortWishes(next);
      });
    };
    const deleteWish = ({ id }: { id: string }) => {
      setWishes((current) => {
        const next = current.filter((item) => item._id !== id);
        onCountChange?.(next.filter((item) => !item.completed).length);
        return next;
      });
    };

    socket.on('wish:new', addWish);
    socket.on('wish:update', updateWish);
    socket.on('wish:deleted', deleteWish);
    return () => {
      socket.off('wish:new', addWish);
      socket.off('wish:update', updateWish);
      socket.off('wish:deleted', deleteWish);
    };
  }, [onCountChange]);

  async function addWish(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;

    setSaving(true);
    try {
      const result = await api<{ wish: Wish }>('/wishes', {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      });
      setWishes((current) => {
        const next = current.some((wish) => wish._id === result.wish._id)
          ? current
          : [...current, result.wish];
        onCountChange?.(next.filter((wish) => !wish.completed).length);
        return sortWishes(next);
      });
      setText('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Хүсэл нэмэхэд алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function toggleWish(id: string) {
    try {
      const result = await api<{ wish: Wish }>(`/wishes/${id}/toggle`, { method: 'PATCH' });
      setWishes((current) => {
        const next = current.map((wish) => (wish._id === id ? result.wish : wish));
        onCountChange?.(next.filter((wish) => !wish.completed).length);
        return sortWishes(next);
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Хүсэл шинэчлэхэд алдаа гарлаа');
    }
  }

  async function removeWish(id: string) {
    try {
      await api(`/wishes/${id}`, { method: 'DELETE' });
      setWishes((current) => {
        const next = current.filter((wish) => wish._id !== id);
        onCountChange?.(next.filter((wish) => !wish.completed).length);
        return next;
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Хүсэл устгахад алдаа гарлаа');
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Dream Jar">
      <div className="max-h-[70vh] overflow-y-auto pb-1">
        <form onSubmit={addWish} className="mb-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Хамтдаа биелүүлэх хүсэл…"
            required
            className="min-w-0 flex-1 rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
          />
          <button
            type="submit"
            disabled={saving || !text.trim()}
            aria-label="Хүсэл нэмэх"
            title="Хүсэл нэмэх"
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rose text-white disabled:opacity-50"
          >
            <Plus size={21} aria-hidden="true" />
          </button>
        </form>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted">Уншиж байна…</p>
        ) : wishes.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mb-3 text-4xl">🫙</div>
            <p className="text-sm text-muted">Анхны хамтын хүслээ нэмээрэй</p>
          </div>
        ) : (
          <div className="divide-y divide-blush/60">
            {wishes.map((wish) => (
              <article key={wish._id} className="flex items-start gap-3 py-3.5 first:pt-0">
                <button
                  type="button"
                  onClick={() => void toggleWish(wish._id)}
                  aria-label={wish.completed ? 'Биелээгүй болгох' : 'Биелсэн болгох'}
                  title={wish.completed ? 'Биелээгүй болгох' : 'Биелсэн болгох'}
                  className={`mt-0.5 flex-shrink-0 ${wish.completed ? 'text-rose' : 'text-muted'}`}
                >
                  {wish.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`break-words text-sm leading-relaxed ${wish.completed ? 'text-muted line-through' : 'text-deep'}`}>
                    {wish.text}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
                    <Avatar value={wish.author.avatar} className="h-5 w-5" emojiClassName="text-xs" />
                    <span>{wish.author.name}</span>
                    {wish.completed && wish.completedBy && <span>· {wish.completedBy.name} биелүүлсэн</span>}
                  </div>
                </div>
                {wish.author._id === user?.id && (
                  <button
                    type="button"
                    onClick={() => void removeWish(wish._id)}
                    aria-label="Хүсэл устгах"
                    title="Хүсэл устгах"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-muted transition-colors hover:text-rose"
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
