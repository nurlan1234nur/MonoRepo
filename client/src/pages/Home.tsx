import { useEffect, useRef, useState } from 'react';
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
import type { Moment, Mood, DailyQuestion } from '../types';

export default function Home() {
  const { user } = useAuth();
  const { couple, me, partner } = useCouple();
  const toast = useToast();

  const [moments, setMoments] = useState<Moment[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [daily, setDaily] = useState<DailyQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [moodOpen, setMoodOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Нууц: асуултын box-ийг 3 удаа хурдан дарвал өдрийн архив нээгдэнэ.
  const tapsRef = useRef<number[]>([]);
  function secretTap() {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < 800), now];
    if (tapsRef.current.length >= 3) {
      tapsRef.current = [];
      setArchiveOpen(true);
    }
  }

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
    toast(`${emoji} Мэдрэмж хадгалагдлаа!`);
  }

  async function submitAnswer() {
    const text = answer.trim();
    if (!text) return;
    await api('/daily', { method: 'POST', body: JSON.stringify({ text }) });
    setAnswer('');
    void api<DailyQuestion>('/daily').then(setDaily);
    toast('✏️ Хариулт хадгалагдлаа!');
  }

  const myMood = latestMood(me?._id);
  const partnerMood = latestMood(partner?._id);
  const myAnswer = daily?.answers.find((a) => a.user._id === me?._id);
  const partnerAnswer = daily?.answers.find((a) => a.user._id === partner?._id);
  const days = daysSince(couple?.anniversary ?? null);
  const today = new Date();

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
            🌙 {days} хоног хамтдаа
          </div>
        </div>
        <button
          onClick={() => setProfileOpen(true)}
          aria-label="Профайл"
          className="flex-shrink-0 transition-transform active:scale-90"
        >
          <Avatar value={user?.avatar} className="h-11 w-11 shadow-md ring-2 ring-white" emojiClassName="text-xl" />
        </button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-[90px]">
        {/* Stat cards */}
        <div className="mb-3.5 flex gap-2.5">
          <StatCard icon="📅" value={today.getDate()} label={`${today.getMonth() + 1}-р сар`} />
          <StatCard icon="📸" value={moments.length} label="Дурсамж" />
          <StatCard icon="🔥" value={user?.streak ?? 0} label="Streak" />
        </div>

        {/* Daily question */}
        {daily && (
          <div className="mb-3.5 rounded-3xl bg-gradient-to-br from-deep to-[#4a2d4e] p-5 shadow-lg">
            <div
              onClick={secretTap}
              className="mb-2.5 select-none text-[10px] font-bold uppercase tracking-wider text-blush"
            >
              ☀️ Өдрийн асуулт
            </div>
            <div
              onClick={secretTap}
              className="mb-4 select-none text-[17px] font-medium leading-snug text-white"
            >
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
                  placeholder="Хариултаа бичих…"
                  className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
                />
                <button
                  onClick={() => void submitAnswer()}
                  className="rounded-xl bg-rose px-3 py-2 text-sm font-medium text-white"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mood card */}
        <div className="mb-3.5 rounded-3xl bg-card p-4 shadow-[0_2px_16px_rgba(45,31,46,0.07)]">
          <div className="mb-3.5 text-xs font-semibold text-muted">🌡️ Өнөөдрийн мэдрэмж</div>
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

        {/* Сүүлийн дурсамж — зөвхөн 1 (бүгдийг 📸 хэсгээс) */}
        {moments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Одоохондоо дурсамж алга. + товчоор анхны зургаа нэмээрэй 📸
          </p>
        ) : (
          <MomentCard
            moment={moments[0]}
            myId={user?.id}
            onUpdated={(u) => setMoments((prev) => prev.map((x) => (x._id === u._id ? u : x)))}
          />
        )}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="absolute bottom-[84px] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose to-[#b83456] text-2xl text-white shadow-xl transition-transform active:scale-90"
      >
        +
      </button>

      <MoodPickerSheet open={moodOpen} onClose={() => setMoodOpen(false)} onSelect={setMood} />
      <AddMomentSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(m) => setMoments((prev) => [m, ...prev])}
      />

      <DailyArchive open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-card px-2 py-3.5 text-center shadow-[0_2px_16px_rgba(45,31,46,0.07)]">
      <div className="mb-1 text-2xl">{icon}</div>
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
      {/* Default (mood тохируулаагүй) нь бүдэг placeholder — сонгосон mood-оос тод ялгаатай */}
      <span className={`block text-4xl ${mood ? '' : 'opacity-25 grayscale'}`}>
        {mood?.emoji ?? '💭'}
      </span>
      <div className={`mt-1 text-xs font-medium ${mood ? 'text-deep' : 'italic text-muted/70'}`}>
        {mood?.text ?? 'тохируулаагүй'}
      </div>
    </div>
  );
}
