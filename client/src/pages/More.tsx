import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';
import { useToast } from '../components/Toast';
import Sheet from '../components/Sheet';
import TimeCapsuleSheet from '../components/TimeCapsuleSheet';
import { api } from '../lib/api';

interface Feat {
  icon: string;
  color: string;
  name: string;
  desc: string;
  badge?: string;
  toast: string;
  action?: 'capsule';
}

const SECTIONS: { title: string; items: Feat[] }[] = [
  {
    title: '🌟 Тусгай зүйлс',
    items: [
      { icon: '🫙', color: 'bg-gradient-to-br from-[#f7d4da] to-blush', name: 'Dream Jar', desc: 'Хамтдаа биелүүлэх хүслийн сан', badge: 'Удахгүй', toast: '🫙 Dream Jar — удахгүй!' },
      { icon: '🎵', color: 'bg-gradient-to-br from-[#e8d4f7] to-[#d4c4f0]', name: 'Song of Us', desc: 'Долоо хоног бүрийн хамтын дуу', toast: '🎵 Song of Us — удахгүй!' },
      { icon: '🕯️', color: 'bg-gradient-to-br from-[#f7eed4] to-[#f0e0b8]', name: 'Цаг Капсул', desc: 'Ирээдүйд нээгдэх нууц захидал', toast: '', action: 'capsule' },
    ],
  },
  {
    title: '🗺️ Хамтын газрууд',
    items: [
      { icon: '🗺️', color: 'bg-gradient-to-br from-[#d4f7f0] to-[#c4f0e8]', name: 'Memory Map', desc: 'Дурсамжтай газруудаа тэмдэглэх', toast: '🗺️ Memory Map — удахгүй!' },
    ],
  },
  {
    title: '🎮 Хоёулаа',
    items: [
      { icon: '🎮', color: 'bg-gradient-to-br from-[#d4e8f7] to-[#c4d8f0]', name: 'Хосуудын тоглоом', desc: 'Quiz, санах ой, нэр таах тоглоомууд', badge: 'Шинэ', toast: '🎮 Тоглоомууд — удахгүй!' },
      { icon: '📝', color: 'bg-gradient-to-br from-[#f7d4da] to-blush', name: 'Love Notes', desc: 'Нуугдсан тэмдэглэл үлдээх', toast: '📝 Love Notes — удахгүй!' },
      { icon: '🔔', color: 'bg-gradient-to-br from-[#d4f7d4] to-[#c4f0c4]', name: 'Ойн сануулга', desc: 'Чухал өдрүүдийн автомат сануулга', toast: '🔔 Сануулга — удахгүй!' },
    ],
  },
];

export default function More() {
  const { user, logout, refresh } = useAuth();
  const { couple } = useCouple();
  const toast = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [capsuleCount, setCapsuleCount] = useState<number | null>(null);

  function openFeature(feature: Feat) {
    if (feature.action === 'capsule') {
      setCapsuleOpen(true);
      return;
    }
    toast(feature.toast);
  }

  function openSheet() {
    setStep(1);
    setNewEmail('');
    setCode('');
    setSheetOpen(true);
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { devCode } = await api<{ devCode?: string }>('/auth/recovery-email/request-otp', {
        method: 'POST',
        body: JSON.stringify({ newEmail }),
      });
      setStep(2);
      toast('Код илгээлээ 📩');
      if (devCode) {
        setCode(devCode);
        toast(`Туршилтын код: ${devCode}`);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/auth/recovery-email/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      await refresh();
      toast('Сэргээх Gmail шинэчлэгдлээ ✓');
      setSheetOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex-shrink-0 px-6 pt-3">
        <div className="text-2xl font-bold text-deep">Илүү…</div>
        <div className="mt-0.5 text-[13px] text-muted">Тусгай feature-ууд</div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-[90px] pt-3.5">
        {SECTIONS.map((s) => (
          <div key={s.title} className="mb-5">
            <div className="mb-2.5 pl-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              {s.title}
            </div>
            {s.items.map((f) => (
              <button
                key={f.name}
                onClick={() => openFeature(f)}
                className="mb-2.5 flex w-full items-center gap-3.5 rounded-2xl bg-card px-3.5 py-3.5 text-left shadow-[0_2px_14px_rgba(45,31,46,0.07)] transition-transform active:scale-[0.97]"
              >
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${f.color}`}>
                  {f.icon}
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold text-deep">{f.name}</div>
                  <div className="mt-0.5 text-xs leading-snug text-muted">{f.desc}</div>
                </div>
                {f.action === 'capsule' && capsuleCount !== null ? (
                  <span className="rounded-lg bg-rose/10 px-2 py-0.5 text-[10px] font-bold text-rose">
                    {capsuleCount}
                  </span>
                ) : f.badge ? (
                  <span className="rounded-lg bg-purple px-2 py-0.5 text-[10px] font-bold text-white">
                    {f.badge}
                  </span>
                ) : (
                  <span className="text-xl text-muted">›</span>
                )}
              </button>
            ))}
          </div>
        ))}

        {/* Бүртгэл / Аюулгүй байдал */}
        <div className="mb-5">
          <div className="mb-2.5 pl-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            🔐 Бүртгэл
          </div>
          <div className="rounded-2xl bg-card px-3.5 py-3.5 shadow-[0_2px_14px_rgba(45,31,46,0.07)]">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4e8f7] to-[#c4d8f0] text-2xl">
                📧
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-semibold text-deep">Сэргээх Gmail</div>
                <div className="mt-0.5 text-xs leading-snug text-muted">
                  {user?.recoveryEmail ? user.recoveryEmail : 'Холбоогүй — нууц үг сэргээхэд хэрэгтэй'}
                </div>
              </div>
              <button
                onClick={openSheet}
                className="rounded-lg bg-rose/10 px-3 py-1.5 text-xs font-bold text-rose transition-transform active:scale-95"
              >
                {user?.recoveryEmail ? 'Солих' : 'Холбох'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 rounded-2xl bg-card px-4 py-3 text-center text-xs text-muted shadow-sm">
          Урилгын код: <span className="font-mono font-bold text-rose">{couple?.inviteCode}</span>
        </div>

        <button
          onClick={logout}
          className="mt-3 w-full rounded-2xl border border-rose/40 py-3 text-sm font-medium text-rose"
        >
          Гарах
        </button>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Сэргээх Gmail солих">
        {step === 1 ? (
          <form onSubmit={requestCode} className="space-y-3">
            <p className="text-center text-sm text-muted">
              Шинэ Gmail хаягаа оруулна уу — баталгаажуулах код илгээнэ.
            </p>
            <input
              type="email"
              autoCapitalize="none"
              placeholder="шинэ@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-deep outline-none focus:border-rose"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-rose py-3 font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {busy ? 'Илгээж байна…' : 'Код илгээх'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-3">
            <p className="text-center text-sm text-muted">
              <span className="font-medium text-deep">{newEmail}</span> руу илгээсэн кодыг оруулна уу.
            </p>
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] text-deep outline-none focus:border-rose"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-rose py-3 font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {busy ? 'Шалгаж байна…' : 'Баталгаажуулах'}
            </button>
            <button type="button" className="w-full text-center text-sm text-muted" onClick={() => setStep(1)}>
              ← Имэйл солих
            </button>
          </form>
        )}
      </Sheet>
      <TimeCapsuleSheet
        open={capsuleOpen}
        onClose={() => setCapsuleOpen(false)}
        onCountChange={setCapsuleCount}
      />
    </>
  );
}
