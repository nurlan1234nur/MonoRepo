import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Eye,
  EyeOff,
  Flame,
  GripVertical,
  Images,
  Plus,
} from 'lucide-react';
import { api } from '../lib/api';
import DailyArchive from './DailyArchive';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';
import { useToast } from '../components/Toast';
import { daysSince } from '../lib/date';
import MomentCard from '../components/MomentCard';
import MoodPickerSheet from '../components/MoodPickerSheet';
import AddMomentSheet from '../components/AddMomentSheet';
import ProfileSheet from '../components/ProfileSheet';
import Avatar from '../components/Avatar';
import Sheet from '../components/Sheet';
import type { Moment, Mood, DailyQuestion } from '../types';

type HomeBoxId = 'stats' | 'daily' | 'mood' | 'moment';

interface HomeBoxConfig {
  id: HomeBoxId;
  visible: boolean;
}

const HOME_LAYOUT_KEY = 'nous-home-box-layout';
const DEFAULT_HOME_LAYOUT: HomeBoxConfig[] = [
  { id: 'stats', visible: true },
  { id: 'daily', visible: true },
  { id: 'mood', visible: true },
  { id: 'moment', visible: true },
];

const BOX_LABELS: Record<HomeBoxId, string> = {
  stats: 'Өдрийн тоонууд',
  daily: 'Өдрийн асуулт',
  mood: 'Өнөөдрийн мэдрэмж',
  moment: 'Сүүлийн зураг',
};

function readHomeLayout(): HomeBoxConfig[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HOME_LAYOUT_KEY) ?? '[]') as HomeBoxConfig[];
    const byId = new Map(saved.map((item) => [item.id, item]));
    const merged = DEFAULT_HOME_LAYOUT.map((item) => byId.get(item.id) ?? item);
    return merged;
  } catch {
    return DEFAULT_HOME_LAYOUT;
  }
}

export default function Home() {
  const { user } = useAuth();
  const { couple, me, partner } = useCouple();
  const toast = useToast();
  const longPressTimer = useRef<number | null>(null);
  const tapsRef = useRef<number[]>([]);

  const [moments, setMoments] = useState<Moment[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [daily, setDaily] = useState<DailyQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [moodOpen, setMoodOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [layout, setLayout] = useState<HomeBoxConfig[]>(readHomeLayout);

  useEffect(() => {
    void api<{ moments: Moment[] }>('/moments').then((r) => setMoments(r.moments));
    void api<{ moods: Mood[] }>('/moods').then((r) => setMoods(r.moods));
    void api<DailyQuestion>('/daily').then(setDaily);

    const socket = getSocket();
    socket.on('moment:new', (m: Moment) =>
      setMoments((prev) => (prev.some((x) => x._id === m._id) ? prev : [m, ...prev])),
    );
    socket.on('moment:react', (m: Moment) =>
      setMoments((prev) => prev.map((x) => (x._id === m._id ? m : x))),
    );
    socket.on('moment:deleted', ({ id }: { id: string }) =>
      setMoments((prev) => prev.filter((x) => x._id !== id)),
    );
    socket.on('mood:new', (m: Mood) => setMoods((prev) => [m, ...prev]));
    socket.on('daily:answer', () => void api<DailyQuestion>('/daily').then(setDaily));
    return () => {
      socket.off('moment:new');
      socket.off('moment:react');
      socket.off('moment:deleted');
      socket.off('mood:new');
      socket.off('daily:answer');
    };
  }, []);

  function persistLayout(next: HomeBoxConfig[]) {
    setLayout(next);
    localStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(next));
  }

  function moveBox(id: HomeBoxId, direction: -1 | 1) {
    const index = layout.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= layout.length) return;
    const next = [...layout];
    [next[index], next[target]] = [next[target], next[index]];
    persistLayout(next);
  }

  function toggleBox(id: HomeBoxId) {
    const item = layout.find((entry) => entry.id === id);
    if (item?.visible && layout.filter((entry) => entry.visible).length <= 1) {
      toast('Дор хаяж нэг box харагдаж байх ёстой');
      return;
    }
    const next = layout.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item));
    persistLayout(next);
  }

  function startLayoutLongPress() {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => setLayoutOpen(true), 550);
  }

  function clearLayoutLongPress() {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  function secretTap() {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < 800), now];
    if (tapsRef.current.length >= 3) {
      tapsRef.current = [];
      setArchiveOpen(true);
    }
  }

  function latestMood(memberId?: string): Mood | undefined {
    return moods.find((m) => m.user._id === memberId);
  }

  async function setMood(emoji: string, text: string) {
    setMoodOpen(false);
    const { mood } = await api<{ mood: Mood }>('/moods', {
      method: 'POST',
      body: JSON.stringify({ emoji, text }),
    });
    setMoods((prev) => [mood, ...prev]);
    toast(`${emoji} Мэдрэмж хадгалагдлаа`);
  }

  async function submitAnswer() {
    const text = answer.trim();
    if (!text) return;
    await api('/daily', { method: 'POST', body: JSON.stringify({ text }) });
    setAnswer('');
    void api<DailyQuestion>('/daily').then(setDaily);
    toast('Хариулт хадгалагдлаа');
  }

  const myMood = latestMood(me?._id);
  const partnerMood = latestMood(partner?._id);
  const myAnswer = daily?.answers.find((a) => a.user._id === me?._id);
  const partnerAnswer = daily?.answers.find((a) => a.user._id === partner?._id);
  const days = daysSince(couple?.anniversary ?? null);
  const today = new Date();

  function cardEvents() {
    return {
      onPointerDown: startLayoutLongPress,
      onPointerUp: clearLayoutLongPress,
      onPointerCancel: clearLayoutLongPress,
      onPointerLeave: clearLayoutLongPress,
    };
  }

  function renderBox(id: HomeBoxId) {
    if (id === 'stats') {
      return (
        <div key={id} {...cardEvents()} className="mb-3.5 flex gap-2.5">
          <StatCard icon={CalendarDays} value={today.getDate()} label={`${today.getMonth() + 1}-р сар`} />
          <StatCard icon={Images} value={moments.length} label="Дурсамж" />
          <StatCard icon={Flame} value={user?.streak ?? 0} label="Streak" />
        </div>
      );
    }

    if (id === 'daily') {
      if (!daily) return null;
      return (
        <div key={id} {...cardEvents()} className="mb-3.5 rounded-3xl bg-gradient-to-br from-deep to-[#4a2d4e] p-5 shadow-lg">
          <div onClick={secretTap} className="mb-2.5 select-none text-[10px] font-bold uppercase tracking-wider text-blush">
            Өдрийн асуулт
          </div>
          <div onClick={secretTap} className="mb-4 select-none text-[17px] font-medium leading-snug text-white">
            "{daily.question}"
          </div>
          <div className="flex gap-2.5">
            <Answer who={me?.name} text={myAnswer?.text} />
            <Answer who={partner?.name} text={partnerAnswer?.text} />
          </div>
          {!myAnswer && (
            <div className="mt-3 flex gap-2">
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void submitAnswer()}
                placeholder="Хариултаа бичих..."
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
              />
              <button onClick={() => void submitAnswer()} className="rounded-xl bg-rose px-3 py-2 text-sm font-medium text-white">
                →
              </button>
            </div>
          )}
        </div>
      );
    }

    if (id === 'mood') {
      return (
        <div key={id} {...cardEvents()} className="mb-3.5 rounded-3xl bg-card p-4 shadow-[0_2px_16px_rgba(45,31,46,0.07)]">
          <div className="mb-3.5 text-xs font-semibold text-muted">Өнөөдрийн мэдрэмж</div>
          <div className="flex items-center justify-around">
            <MoodPerson name={me?.name} mood={myMood} />
            <div className="h-12 w-px bg-blush" />
            <MoodPerson name={partner?.name} mood={partnerMood} />
          </div>
          <button
            onClick={() => setMoodOpen(true)}
            className="mt-3 w-full rounded-xl bg-warm py-2.5 text-[13px] font-medium text-rose transition-colors active:bg-blush"
          >
            + Өнөөдрийн мэдрэмжээ тохируулах
          </button>
        </div>
      );
    }

    if (moments.length === 0) {
      return (
        <div key={id} {...cardEvents()} className="mb-3.5 rounded-3xl bg-card px-4 py-8 text-center text-sm text-muted shadow-[0_2px_16px_rgba(45,31,46,0.07)]">
          Одоохондоо дурсамж алга. + товчоор анхны зургаа нэмээрэй
        </div>
      );
    }

    return (
      <div key={id} {...cardEvents()} className="mb-3.5">
        <MomentCard
          moment={moments[0]}
          myId={user?.id}
          onUpdated={(u) => setMoments((prev) => prev.map((x) => (x._id === u._id ? u : x)))}
        />
      </div>
    );
  }

  return (
    <>
      <header className="flex flex-shrink-0 items-start justify-between px-6 pb-4 pt-3">
        <div>
          <div className="flex items-center gap-2.5 text-2xl font-bold text-deep">
            {me?.name ?? '...'}
            <span className="animate-pulse-heart text-lg text-rose">♥</span>
            {partner?.name ?? '...'}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-rose to-[#b83456] px-4 py-1.5 text-[13px] font-medium text-white shadow-lg">
            {days} хоног хамтдаа
          </div>
        </div>
        <button onClick={() => setProfileOpen(true)} aria-label="Профайл" className="flex-shrink-0 transition-transform active:scale-90">
          <Avatar value={user?.avatar} className="h-11 w-11 shadow-md ring-2 ring-white" emojiClassName="text-xl" />
        </button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-[90px]">
        {layout.filter((item) => item.visible).map((item) => renderBox(item.id))}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="absolute bottom-[84px] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose to-[#b83456] text-white shadow-xl transition-transform active:scale-90"
        aria-label="Дурсамж нэмэх"
      >
        <Plus size={27} aria-hidden="true" />
      </button>

      <Sheet open={layoutOpen} onClose={() => setLayoutOpen(false)} title="Нүүр хуудас">
        <div className="space-y-2">
          {layout.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-sm">
              <GripVertical size={18} className="text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm font-semibold text-deep">{BOX_LABELS[item.id]}</div>
              <button
                type="button"
                onClick={() => toggleBox(item.id)}
                aria-label={item.visible ? 'Нуух' : 'Харуулах'}
                title={item.visible ? 'Нуух' : 'Харуулах'}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-warm text-rose"
              >
                {item.visible ? <Eye size={17} aria-hidden="true" /> : <EyeOff size={17} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => moveBox(item.id, -1)}
                disabled={index === 0}
                aria-label="Дээш"
                title="Дээш"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-warm text-rose disabled:opacity-35"
              >
                <ArrowUp size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveBox(item.id, 1)}
                disabled={index === layout.length - 1}
                aria-label="Доош"
                title="Доош"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-warm text-rose disabled:opacity-35"
              >
                <ArrowDown size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </Sheet>

      <MoodPickerSheet open={moodOpen} onClose={() => setMoodOpen(false)} onSelect={setMood} />
      <AddMomentSheet open={addOpen} onClose={() => setAddOpen(false)} onAdded={(m) => setMoments((prev) => [m, ...prev])} />
      <DailyArchive open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: typeof CalendarDays; value: number; label: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-card px-2 py-3.5 text-center shadow-[0_2px_16px_rgba(45,31,46,0.07)]">
      <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-warm text-rose">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="text-lg font-bold text-deep">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium text-muted">{label}</div>
    </div>
  );
}

function Answer({ who, text }: { who?: string; text?: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
      <div className="mb-1 text-[10px] font-semibold text-blush">{who ?? '...'}</div>
      <div className={`text-[13px] leading-snug ${text ? 'text-white' : 'italic text-white/40'}`}>
        {text ?? 'Хариулт хүлээж байна...'}
      </div>
    </div>
  );
}

function MoodPerson({ name, mood }: { name?: string; mood?: Mood }) {
  return (
    <div className="text-center">
      <div className="mb-1.5 text-[11px] font-semibold text-muted">{name ?? '...'}</div>
      <span className={`block text-4xl ${mood ? '' : 'opacity-25 grayscale'}`}>{mood?.emoji ?? '💭'}</span>
      <div className={`mt-1 text-xs font-medium ${mood ? 'text-deep' : 'italic text-muted/70'}`}>
        {mood?.text ?? 'тохируулаагүй'}
      </div>
    </div>
  );
}
