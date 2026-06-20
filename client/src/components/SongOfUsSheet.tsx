import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Music2, Pencil, Save } from 'lucide-react';
import Sheet from './Sheet';
import Avatar from './Avatar';
import { useToast } from './Toast';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { WeeklySong } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCurrentChange?: (hasCurrent: boolean) => void;
}

function weekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.getMonth() + 1}-р сарын ${start.getDate()} – ${end.getMonth() + 1}-р сарын ${end.getDate()}`;
}

function providerLabel(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('spotify')) return 'Spotify дээр нээх';
    if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube дээр нээх';
  } catch {
    // URL is validated by the server; fallback keeps older data usable.
  }
  return 'Дууг нээх';
}

export default function SongOfUsSheet({ open, onClose, onCurrentChange }: Props) {
  const toast = useToast();
  const [current, setCurrent] = useState<WeeklySong | null>(null);
  const [songs, setSongs] = useState<WeeklySong[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ current: WeeklySong | null; songs: WeeklySong[] }>('/songs');
      setCurrent(result.current);
      setSongs(result.songs);
      setEditing(!result.current);
      if (!result.current) {
        setTitle('');
        setArtist('');
        setUrl('');
      }
      onCurrentChange?.(Boolean(result.current));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Хамтын дууг уншихад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [onCurrentChange, toast]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void loadSongs(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSongs, open]);

  useEffect(() => {
    const socket = getSocket();
    const updateSong = (song: WeeklySong) => {
      setCurrent(song);
      setSongs((existing) => [song, ...existing.filter((item) => item._id !== song._id)]);
      onCurrentChange?.(true);
    };
    socket.on('song:update', updateSong);
    return () => {
      socket.off('song:update', updateSong);
    };
  }, [onCurrentChange]);

  function startEditing() {
    setTitle(current?.title ?? '');
    setArtist(current?.artist ?? '');
    setUrl(current?.url ?? '');
    setEditing(true);
  }

  async function saveSong(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api<{ song: WeeklySong }>('/songs/current', {
        method: 'PUT',
        body: JSON.stringify({ title, artist, url }),
      });
      setCurrent(result.song);
      setSongs((existing) => [result.song, ...existing.filter((item) => item._id !== result.song._id)]);
      setEditing(false);
      onCurrentChange?.(true);
      toast('Энэ долоо хоногийн дуу хадгалагдлаа');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Дуу хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  const history = current ? songs.filter((song) => song._id !== current._id) : songs;

  return (
    <Sheet open={open} onClose={onClose} title="Song of Us">
      <div className="max-h-[70vh] overflow-y-auto pb-1">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted">Уншиж байна…</p>
        ) : editing ? (
          <form onSubmit={saveSong} className="space-y-3">
            <p className="text-center text-xs text-muted">Энэ долоо хоногийн хамтын дуу</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              placeholder="Дууны нэр"
              required
              className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
            />
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              maxLength={120}
              placeholder="Уран бүтээлч"
              required
              className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
            />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={1000}
              placeholder="Spotify эсвэл YouTube холбоос"
              required
              className="w-full rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
            />
            <div className="flex gap-2.5">
              {current && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-xl border border-blush py-3 text-sm font-medium text-muted"
                >
                  Болих
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                <Save size={17} aria-hidden="true" />
                {saving ? 'Хадгалж байна…' : 'Хадгалах'}
              </button>
            </div>
          </form>
        ) : current ? (
          <div>
            <section className="mb-5 rounded-2xl bg-deep px-5 py-5 text-white shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-blush">
                  <Music2 size={23} aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={startEditing}
                  aria-label="Хамтын дуу засах"
                  title="Хамтын дуу засах"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <Pencil size={17} aria-hidden="true" />
                </button>
              </div>
              <div className="text-lg font-semibold leading-snug">{current.title}</div>
              <div className="mt-1 text-sm text-blush">{current.artist}</div>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/65">
                <Avatar value={current.selectedBy.avatar} className="h-6 w-6" emojiClassName="text-xs" />
                <span>{current.selectedBy.name} сонгосон</span>
              </div>
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose py-2.5 text-sm font-medium text-white"
              >
                {providerLabel(current.url)}
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            </section>

            {history.length > 0 && (
              <section>
                <div className="mb-2 text-xs font-semibold text-muted">Өмнөх дуунууд</div>
                <div className="divide-y divide-blush/60">
                  {history.map((song) => (
                    <a
                      key={song._id}
                      href={song.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 py-3.5"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-warm text-rose">
                        <Music2 size={18} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-deep">{song.title}</div>
                        <div className="truncate text-xs text-muted">{song.artist} · {weekLabel(song.weekStart)}</div>
                      </div>
                      <ExternalLink size={15} className="flex-shrink-0 text-muted" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
