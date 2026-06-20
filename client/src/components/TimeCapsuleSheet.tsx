import { useCallback, useEffect, useState } from 'react';
import Sheet from './Sheet';
import Avatar from './Avatar';
import { useToast } from './Toast';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/date';
import type { Capsule } from '../types';

function localDateTimeValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function defaultUnlockTime(): string {
  return localDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export default function TimeCapsuleSheet({ open, onClose, onCountChange }: Props) {
  const toast = useToast();
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [creating, setCreating] = useState(false);
  const [text, setText] = useState('');
  const [unlockAt, setUnlockAt] = useState(defaultUnlockTime);
  const [minimumUnlockAt] = useState(() => localDateTimeValue(new Date(Date.now() + 60 * 1000)));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCapsules = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ capsules: Capsule[] }>('/capsules');
      setCapsules(result.capsules);
      onCountChange?.(result.capsules.length);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Капсулуудыг уншихад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [onCountChange, toast]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void loadCapsules(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCapsules, open]);

  async function createCapsule(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    const date = new Date(unlockAt);
    if (!message || Number.isNaN(date.getTime())) return;
    if (date.getTime() <= Date.now()) {
      toast('Нээх хугацаа ирээдүйд байх ёстой');
      return;
    }

    setSaving(true);
    try {
      await api('/capsules', {
        method: 'POST',
        body: JSON.stringify({ text: message, unlockAt: date.toISOString() }),
      });
      setText('');
      setUnlockAt(defaultUnlockTime());
      setCreating(false);
      await loadCapsules();
      toast('Цаг капсул хадгалагдлаа');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Капсул хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setCreating(false);
    setText('');
    onClose();
  }

  return (
    <Sheet open={open} onClose={close} title="Цаг Капсул">
      <div className="max-h-[70vh] overflow-y-auto pb-1">
        {creating ? (
          <form onSubmit={createCapsule} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted" htmlFor="capsule-message">
                Нууц захидал
              </label>
              <textarea
                id="capsule-message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={8000}
                rows={6}
                placeholder="Ирээдүйн та хоёрт үлдээх захидал…"
                required
                className="w-full resize-none rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
              />
              <div className="mt-1 text-right text-[10px] text-muted">{text.length}/8000</div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted" htmlFor="capsule-unlock-at">
                Нээх хугацаа
              </label>
              <input
                id="capsule-unlock-at"
                type="datetime-local"
                value={unlockAt}
                min={minimumUnlockAt}
                onChange={(e) => setUnlockAt(e.target.value)}
                required
                className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 rounded-xl border border-blush py-3 text-sm font-medium text-muted"
              >
                Буцах
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-rose py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? 'Хадгалж байна…' : 'Түгжиж хадгалах'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mb-4 w-full rounded-xl bg-rose py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
            >
              + Шинэ капсул үүсгэх
            </button>

            {loading ? (
              <p className="py-10 text-center text-sm text-muted">Уншиж байна…</p>
            ) : capsules.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mb-3 text-4xl">🕯️</div>
                <p className="text-sm text-muted">Одоогоор цаг капсул алга</p>
              </div>
            ) : (
              <div className="divide-y divide-blush/60">
                {capsules.map((capsule) => (
                  <article key={capsule.id} className="py-4 first:pt-0">
                    <div className="flex items-center gap-2.5">
                      <Avatar value={capsule.author.avatar} className="h-9 w-9" emojiClassName="text-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-deep">{capsule.author.name}</div>
                        <div className="text-[11px] text-muted">
                          {capsule.unlocked ? 'Нээгдсэн' : 'Нээгдэнэ'}: {formatDateTime(capsule.unlockAt)}
                        </div>
                      </div>
                      <span className="text-xl" aria-label={capsule.unlocked ? 'Нээлттэй' : 'Түгжээтэй'}>
                        {capsule.unlocked ? '🔓' : '🔒'}
                      </span>
                    </div>
                    {capsule.unlocked && capsule.text ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-deep">{capsule.text}</p>
                    ) : (
                      <p className="mt-3 text-xs italic text-muted">Нээх хугацаа болоход захидал харагдана.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
