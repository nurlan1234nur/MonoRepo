import { useEffect, useRef, useState } from 'react';
import Sheet from './Sheet';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';
import { useToast } from './Toast';
import { api, apiUpload } from '../lib/api';
import { compressImage } from '../lib/image';
import { applyTheme, THEMES } from '../lib/theme';
import type { Theme, User } from '../types';

const EMOJI_AVATARS = ['🥰', '😍', '😎', '🦊', '🐰', '🐱', '🐶', '🌸', '🌟', '🍓', '🦄', '👑', '🧸', '🦋'];

export default function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refresh } = useAuth();
  const { refresh: refreshCouple } = useCouple();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [status, setStatus] = useState('');
  const [theme, setTheme] = useState<Theme>('rose');
  const [busy, setBusy] = useState(false);

  // Нээгдэх бүрд одоогийн утгуудаар дүүргэнэ.
  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setAvatar(user.avatar);
      setStatus(user.status);
      setTheme(user.theme);
    }
  }, [open, user]);

  // Theme-ийг шууд урьдчилан харуулна (хадгалахгүй хаавал буцаана).
  function pickTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  function handleClose() {
    applyTheme(user?.theme); // хадгалаагүй бол өмнөх theme-рүү буцаана
    onClose();
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append('image', compressed);
      const { user: u } = await apiUpload<{ user: User }>('/auth/me/avatar', form);
      setAvatar(u.avatar);
      await refresh();
      await refreshCouple();
      toast('Зураг шинэчлэгдлээ 📷');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Зураг оруулахад алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      toast('Нэрээ оруулна уу');
      return;
    }
    setBusy(true);
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), avatar, status: status.trim(), theme }),
      });
      await refresh();
      await refreshCouple();
      toast('Профайл хадгалагдлаа ✓');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Миний профайл">
      <div className="space-y-4">
        {/* Avatar + зураг */}
        <div className="flex flex-col items-center gap-2.5">
          <Avatar value={avatar} className="h-20 w-20 shadow-md" emojiClassName="text-4xl" />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPhoto(f);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-full bg-warm px-4 py-1.5 text-[13px] font-medium text-rose transition-transform active:scale-95 disabled:opacity-60"
          >
            📷 Зураг солих
          </button>
        </div>

        {/* Emoji сонголт */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-muted">Эсвэл emoji сонгох</div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {EMOJI_AVATARS.map((e) => (
              <button
                key={e}
                onClick={() => setAvatar(e)}
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl transition-transform active:scale-90 ${
                  avatar === e ? 'bg-rose/15 ring-2 ring-rose' : 'bg-card'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Нэр */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-muted">Нэр</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="w-full rounded-xl border border-blush/60 bg-white px-4 py-2.5 text-deep outline-none focus:border-rose"
          />
        </div>

        {/* Статус */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-muted">Статус</div>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            maxLength={120}
            placeholder="жнь: чамдаа хайртай ❤️"
            className="w-full rounded-xl border border-blush/60 bg-white px-4 py-2.5 text-deep outline-none focus:border-rose"
          />
        </div>

        {/* Theme */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold text-muted">Аппын өнгө</div>
          <div className="flex gap-2.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => pickTheme(t.id)}
                aria-label={t.name}
                className={`h-9 w-9 flex-shrink-0 rounded-full transition-transform active:scale-90 ${
                  theme === t.id ? 'ring-2 ring-deep ring-offset-2 ring-offset-cream' : ''
                }`}
                style={{ background: t.palette.rose }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => void save()}
          disabled={busy}
          className="w-full rounded-xl bg-rose py-3 font-medium text-white transition-all active:scale-[0.97] disabled:opacity-60"
        >
          {busy ? 'Хадгалж байна…' : 'Хадгалах'}
        </button>

      </div>
    </Sheet>
  );
}
