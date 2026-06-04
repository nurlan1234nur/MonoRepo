import { useRef, useState } from 'react';
import Sheet from './Sheet';
import { apiUpload } from '../lib/api';
import { compressImage } from '../lib/image';
import { useToast } from './Toast';
import type { Moment } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded: (moment: Moment) => void;
}

export default function AddMomentSheet({ open, onClose, onAdded }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setPreview('');
    setCaption('');
  }

  function pick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : '');
  }

  async function submit() {
    if (!file) {
      toast('⚠️ Зураг сонгоно уу');
      return;
    }
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append('image', compressed);
      form.append('caption', caption);
      const { moment } = await apiUpload<{ moment: Moment }>('/moments', form);
      onAdded(moment);
      toast('📸 Дурсамж нэмэгдлээ!');
      reset();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="📸 Шинэ дурсамж">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={() => fileRef.current?.click()}
        className="mb-3 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-blush bg-warm text-muted"
      >
        {preview ? (
          <img src={preview} alt="preview" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm">+ Зураг сонгох</span>
        )}
      </button>

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Тайлбар бичих…"
        className="mb-3 h-20 w-full resize-none rounded-2xl border border-blush bg-warm px-4 py-3 text-sm text-deep outline-none focus:border-rose"
      />

      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-2xl bg-gradient-to-br from-rose to-[#b83456] py-3.5 font-semibold text-white shadow-lg transition-transform active:scale-[0.97] disabled:opacity-60"
      >
        {busy ? 'Нэмж байна…' : 'Хадгалах 💕'}
      </button>
    </Sheet>
  );
}
