import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useCouple } from '../context/CoupleContext';
import { useToast } from '../components/Toast';
import Sheet from '../components/Sheet';
import { daysSince, daysToNextAnniversary, formatDate } from '../lib/date';
import { generateMilestones, type MilestoneItem } from '../lib/milestones';
import type { Milestone } from '../types';

// Messenger шиг — зүүн тийш гулсуулж "Устгах" товчийг нээнэ.
const SPRING = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
const OPEN = -80;

function SwipeToDelete({ onDelete, children }: { onDelete: () => void; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const start = useRef<{ x: number; base: number } | null>(null);
  const [opened, setOpened] = useState(false);

  // Re-render-гүй шууд DOM-оор хөдөлгөнө — буттер смүүт.
  function setX(x: number, animate: boolean) {
    const el = frontRef.current;
    if (!el) return;
    el.style.transition = animate ? SPRING : 'none';
    el.style.transform = `translateX(${x}px)`;
    offsetRef.current = x;
  }

  function down(e: React.PointerEvent) {
    start.current = { x: e.clientX, base: offsetRef.current };
    setX(offsetRef.current, false);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!start.current) return;
    let next = start.current.base + (e.clientX - start.current.x);
    // Rubber-band: хязгаараас хэтрэхэд уяагаар сулхан сунана.
    if (next > 0) next /= 2.2;
    else if (next < OPEN) next = OPEN + (next - OPEN) / 2.2;
    setX(next, false);
  }
  function up() {
    if (!start.current) return;
    start.current = null;
    const target = offsetRef.current <= OPEN / 2 ? OPEN : 0;
    setX(target, true);
    setOpened(target !== 0);
  }

  // Нээлттэй үед гадуур хаа нэгтээ дармагц автоматаар хаана.
  useEffect(() => {
    if (!opened) return;
    function onDocDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setX(0, true);
        setOpened(false);
      }
    }
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [opened]);

  return (
    <div ref={rootRef} className="relative flex-1 overflow-hidden rounded-2xl">
      <button
        onClick={() => {
          setX(0, false);
          setOpened(false);
          onDelete();
        }}
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose to-[#b83456] text-[13px] font-semibold text-white"
      >
        Устгах
      </button>
      <div
        ref={frontRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ touchAction: 'pan-y' }}
        className="relative bg-cream"
      >
        {children}
      </div>
    </div>
  );
}

export default function Timeline() {
  const { couple, me, partner, refresh: refreshCouple } = useCouple();
  const toast = useToast();

  const [custom, setCustom] = useState<Milestone[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [annInput, setAnnInput] = useState('');
  const [myBday, setMyBday] = useState('');
  const [partnerBday, setPartnerBday] = useState('');
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newIcon, setNewIcon] = useState('🎉');

  useEffect(() => {
    void api<{ milestones: Milestone[] }>('/milestones').then((r) => setCustom(r.milestones));
  }, []);

  const items = useMemo<MilestoneItem[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const generated = generateMilestones(couple?.anniversary ?? null, couple?.members ?? []);
    const customItems: MilestoneItem[] = custom.map((m) => {
      const date = new Date(m.date);
      const upcoming = date.getTime() > now.getTime();
      const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        key: m._id,
        id: m._id,
        title: m.title,
        date,
        icon: m.icon,
        upcoming,
        badge: upcoming ? `${daysLeft} хоног үлдлээ` : '✓',
      };
    });
    return [...generated, ...customItems].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [couple, custom]);

  const days = daysSince(couple?.anniversary ?? null);
  const next = daysToNextAnniversary(couple?.anniversary ?? null);

  function openSettings() {
    setAnnInput(couple?.anniversary ? couple.anniversary.slice(0, 10) : '');
    setMyBday(me?.birthday ?? '');
    setPartnerBday(partner?.birthday ?? '');
    setSettingsOpen(true);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (annInput && annInput !== (couple?.anniversary?.slice(0, 10) ?? '')) {
        await api('/couples', { method: 'PATCH', body: JSON.stringify({ anniversary: annInput }) });
      }
      if (me && myBday !== (me.birthday ?? '')) {
        await api('/couples/birthday', { method: 'PATCH', body: JSON.stringify({ memberId: me._id, birthday: myBday }) });
      }
      if (partner && partnerBday !== (partner.birthday ?? '')) {
        await api('/couples/birthday', {
          method: 'PATCH',
          body: JSON.stringify({ memberId: partner._id, birthday: partnerBday }),
        });
      }
      await refreshCouple();
      toast('Хадгалагдлаа ✓');
      setSettingsOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;
    setBusy(true);
    try {
      const { milestone } = await api<{ milestone: Milestone }>('/milestones', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), date: newDate, icon: newIcon }),
      });
      setCustom((prev) => [...prev, milestone]);
      setNewTitle('');
      setNewDate('');
      setNewIcon('🎉');
      setAddOpen(false);
      toast('Баяр нэмэгдлээ 🎉');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function deleteMilestone(id: string) {
    try {
      await api(`/milestones/${id}`, { method: 'DELETE' });
      setCustom((prev) => prev.filter((m) => m._id !== id));
      toast('Баяр устгагдлаа');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Алдаа гарлаа');
    }
  }

  const ICONS = ['🎉', '🎂', '🎁', '💕', '💍', '🌹', '🏔️', '✈️', '🍽️', '🎵', '⭐', '📍'];

  return (
    <>
      <header className="flex flex-shrink-0 items-start justify-between px-6 pt-3">
        <div>
          <div className="text-2xl font-bold text-deep">Бидний түүх</div>
          <div className="mt-0.5 text-[13px] text-muted">
            {couple?.anniversary ? `${formatDate(couple.anniversary)}-аас эхлэн` : 'Анхны өдрөө тохируулна уу'}
          </div>
        </div>
        <button
          onClick={openSettings}
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-card text-base shadow-sm transition-transform active:scale-90"
          aria-label="Тохиргоо"
        >
          ⚙️
        </button>
      </header>

      <div className="relative mx-4 mt-4 flex-shrink-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-rose via-[#b83456] to-[#8b2444] px-6 py-7 text-center text-white shadow-xl">
        <span className="absolute -top-4 right-0 text-[110px] leading-none opacity-10">♥</span>
        <div className="font-serif text-[76px] font-semibold leading-none">{days}</div>
        <div className="mt-1 text-sm opacity-80">хоног хамтдаа ♥</div>
        {next && (
          <div className="mt-3.5 inline-block rounded-2xl border border-white/20 bg-white/20 px-4 py-2 text-[13px] font-medium">
            🎂 {next.years} жилийн ой — {next.days} хоног үлдлээ
          </div>
        )}
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-[90px] pt-5">
        {items.map((it, i) => (
          <div key={it.key} className="mb-4 flex items-start gap-3.5">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg ${
                  it.upcoming
                    ? 'border-2 border-dashed border-blush bg-warm'
                    : 'bg-gradient-to-br from-rose to-[#b83456] shadow-md'
                }`}
              >
                {it.icon}
              </div>
              {i < items.length - 1 && <div className="my-1 min-h-4 w-0.5 flex-1 bg-blush" />}
            </div>
            {/* Custom баяр (it.id) — Messenger шиг гулсуулж устгана. Default-ийг үгүй. */}
            {it.id ? (
              <SwipeToDelete onDelete={() => deleteMilestone(it.id!)}>
                <div className="py-1 pr-3">
                  <div className="text-[15px] font-semibold text-deep">{it.title}</div>
                  <div className="mt-0.5 text-xs text-muted">{formatDate(it.date.toISOString())}</div>
                  <span className="mt-1.5 inline-block rounded-lg bg-blush px-2.5 py-0.5 text-[11px] font-bold text-rose">
                    {it.badge}
                  </span>
                </div>
              </SwipeToDelete>
            ) : (
              <div className="flex-1 pt-1">
                <div className="text-[15px] font-semibold text-deep">{it.title}</div>
                <div className="mt-0.5 text-xs text-muted">{formatDate(it.date.toISOString())}</div>
                <span
                  className={`mt-1.5 inline-block rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                    it.upcoming ? 'bg-warm text-rose' : 'bg-blush text-rose'
                  }`}
                >
                  {it.badge}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Баяр нэмэх */}
        {couple?.anniversary && (
          <button
            onClick={() => setAddOpen(true)}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blush bg-card py-3.5 text-sm font-medium text-rose transition-colors active:bg-blush"
          >
            <span className="text-lg">+</span> Баяр нэмэх
          </button>
        )}

        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            Анхны өдрөө тохируулаагүй байна. Баруун дээд ⚙️ дээр дарж тохируулна уу.
          </p>
        )}
      </div>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Тохиргоо">
        <form onSubmit={saveSettings} className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-deep">💑 Анх танилцсан өдөр</label>
            <input
              type="date"
              value={annInput}
              onChange={(e) => setAnnInput(e.target.value)}
              className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-deep outline-none focus:border-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-deep">
              🎁 {me?.name ?? 'Миний'}-ийн төрсөн өдөр
            </label>
            <input
              type="date"
              value={myBday}
              onChange={(e) => setMyBday(e.target.value)}
              className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-deep outline-none focus:border-rose"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-deep">
              🎁 {partner?.name ?? 'Хайрын'}-ийн төрсөн өдөр
            </label>
            <input
              type="date"
              value={partnerBday}
              onChange={(e) => setPartnerBday(e.target.value)}
              className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-deep outline-none focus:border-rose"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-rose py-3 font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? 'Хадгалж байна…' : 'Хадгалах'}
          </button>
        </form>
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Баяр нэмэх">
        <form onSubmit={addMilestone} className="space-y-3">
          <input
            placeholder="Баярын нэр (ж: Анхны үнсэлт)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-deep outline-none focus:border-rose"
          />
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-deep outline-none focus:border-rose"
          />
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-deep">Тэмдэг сонгох</div>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setNewIcon(ic)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                    newIcon === ic ? 'bg-rose/15 ring-2 ring-rose' : 'bg-white'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-rose py-3 font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? 'Нэмж байна…' : 'Нэмэх'}
          </button>
        </form>
      </Sheet>
    </>
  );
}
