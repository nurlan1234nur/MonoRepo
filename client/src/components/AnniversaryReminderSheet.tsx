import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarHeart, Plus, Trash2 } from 'lucide-react';
import Sheet from './Sheet';
import { useCouple } from '../context/CoupleContext';
import { useToast } from './Toast';
import { api } from '../lib/api';
import { daysToNextAnniversary, formatDate } from '../lib/date';
import { generateMilestones, type MilestoneItem } from '../lib/milestones';
import type { Milestone } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ICONS = ['🎉', '🎂', '🎁', '💕', '💍', '🌹', '✈️', '🍽️', '🎵', '⭐', '📍'];

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function customToItem(milestone: Milestone): MilestoneItem {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(milestone.date);
  const upcoming = date.getTime() > today.getTime();
  const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return {
    key: milestone._id,
    id: milestone._id,
    title: milestone.title,
    date,
    icon: milestone.icon,
    upcoming,
    badge: upcoming ? `${daysLeft} хоног үлдлээ` : '✓',
  };
}

export default function AnniversaryReminderSheet({ open, onClose }: Props) {
  const { couple, refresh } = useCouple();
  const toast = useToast();
  const [anniversary, setAnniversary] = useState('');
  const [custom, setCustom] = useState<Milestone[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [icon, setIcon] = useState('🎉');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ milestones: Milestone[] }>('/milestones');
      setCustom(result.milestones);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Сануулгууд уншихад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setAnniversary(toDateInput(couple?.anniversary));
      void loadMilestones();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [couple?.anniversary, loadMilestones, open]);

  const items = useMemo(() => {
    const generated = generateMilestones(couple?.anniversary ?? null, couple?.members ?? []);
    return [...generated, ...custom.map(customToItem)].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [couple, custom]);

  const upcoming = items.filter((item) => item.upcoming).slice(0, 8);
  const nextAnniversary = daysToNextAnniversary(couple?.anniversary ?? null);

  async function saveAnniversary() {
    if (!anniversary) {
      toast('Ойн өдрөө сонгоно уу');
      return;
    }
    setBusy(true);
    try {
      await api('/couples', { method: 'PATCH', body: JSON.stringify({ anniversary }) });
      await refresh();
      toast('Ойн өдөр хадгалагдлаа');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Ойн өдөр хадгалахад алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setBusy(true);
    try {
      const result = await api<{ milestone: Milestone }>('/milestones', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), date, icon }),
      });
      setCustom((current) => [...current, result.milestone]);
      setTitle('');
      setDate('');
      setIcon('🎉');
      setAdding(false);
      toast('Сануулга нэмэгдлээ');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Сануулга нэмэхэд алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function deleteReminder(id: string) {
    try {
      await api(`/milestones/${id}`, { method: 'DELETE' });
      setCustom((current) => current.filter((item) => item._id !== id));
      toast('Сануулга устгагдлаа');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Сануулга устгахад алдаа гарлаа');
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Ойн сануулга">
      <div className="max-h-[74vh] overflow-y-auto pb-1">
        <div className="rounded-2xl bg-warm p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-rose">
              <CalendarHeart size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-deep">Анхны өдөр</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">
                Ойн өдөр, төрсөн өдөр болон өөрийн нэмсэн чухал өдрүүд энд сануулагдана.
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="date"
              value={anniversary}
              onChange={(event) => setAnniversary(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-blush/70 bg-white px-3 py-2.5 text-sm text-deep outline-none focus:border-rose"
            />
            <button
              type="button"
              onClick={() => void saveAnniversary()}
              disabled={busy}
              className="rounded-xl bg-rose px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Хадгалах
            </button>
          </div>
          {nextAnniversary && (
            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose">
              🎂 {nextAnniversary.years} жилийн ой — {nextAnniversary.days} хоног үлдлээ
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-deep">Ойрын сануулгууд</div>
            <div className="text-xs text-muted">Автомат + гараар нэмсэн өдрүүд</div>
          </div>
          <button
            type="button"
            onClick={() => setAdding((current) => !current)}
            className="flex items-center gap-1.5 rounded-xl bg-rose px-3 py-2 text-xs font-semibold text-white"
          >
            <Plus size={15} /> Нэмэх
          </button>
        </div>

        {adding && (
          <form onSubmit={addReminder} className="mt-3 rounded-2xl border border-blush/70 bg-white p-3.5">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Сануулгын нэр"
              required
              className="mb-2 w-full rounded-xl border border-blush bg-warm/40 px-3 py-2.5 text-sm text-deep outline-none focus:border-rose"
            />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              className="mb-3 w-full rounded-xl border border-blush bg-warm/40 px-3 py-2.5 text-sm text-deep outline-none focus:border-rose"
            />
            <div className="mb-3 flex flex-wrap gap-2">
              {ICONS.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setIcon(item)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${icon === item ? 'bg-rose/15 ring-2 ring-rose' : 'bg-warm'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-rose py-3 text-sm font-semibold text-white disabled:opacity-60">
              Сануулга хадгалах
            </button>
          </form>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-muted">Уншиж байна…</p>
        ) : upcoming.length === 0 ? (
          <p className="rounded-2xl bg-warm px-4 py-8 text-center text-sm text-muted">
            Ойн өдрөө тохируулаад сануулгууд автоматаар гарна.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {upcoming.map((item) => (
              <div key={item.key} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warm text-lg">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-deep">{item.title}</div>
                  <div className="mt-0.5 text-xs text-muted">{formatDate(item.date.toISOString())}</div>
                </div>
                <span className="rounded-lg bg-rose/10 px-2 py-1 text-[10px] font-bold text-rose">{item.badge}</span>
                {item.id && (
                  <button type="button" onClick={() => void deleteReminder(item.id!)} className="rounded-lg bg-warm p-2 text-rose" aria-label="Сануулга устгах">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
