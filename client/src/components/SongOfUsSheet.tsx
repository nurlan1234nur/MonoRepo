import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Music2, Pencil, Play, Save, Search } from 'lucide-react';
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

function youtubeVideoId(url: string): string | null {
  function valid(candidate: string | null | undefined): string | null {
    return candidate && /^[A-Za-z0-9_-]{6,20}$/.test(candidate) ? candidate : null;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'youtu.be') return valid(parsed.pathname.split('/').filter(Boolean)[0]);
    if (!host.endsWith('youtube.com')) return null;
    if (parsed.pathname === '/watch') return valid(parsed.searchParams.get('v'));
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
      return valid(parts[1]);
    }
  } catch {
    return null;
  }
  return null;
}

export default function SongOfUsSheet({ open, onClose, onCurrentChange }: Props) {
  const toast = useToast();
  const [current, setCurrent] = useState<WeeklySong | null>(null);
  const [songs, setSongs] = useState<WeeklySong[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewing, setPreviewing] = useState(false);
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
        setThumbnailUrl('');
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
    setThumbnailUrl(current?.thumbnailUrl ?? '');
    setEditing(true);
  }

  function searchYouTube() {
    const query = searchQuery.trim();
    if (!query) return;
    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function previewYouTube(videoUrl: string) {
    const value = videoUrl.trim();
    if (!value || (!value.includes('youtube.com') && !value.includes('youtu.be'))) return;
    setPreviewing(true);
    try {
      const metadata = await api<{ title: string; artist: string; thumbnailUrl: string }>(
        '/songs/youtube-preview',
        { method: 'POST', body: JSON.stringify({ url: value }) },
      );
      setTitle(metadata.title);
      setArtist(metadata.artist);
      setThumbnailUrl(metadata.thumbnailUrl);
      toast('YouTube мэдээлэл автоматаар орлоо');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'YouTube холбоос уншихад алдаа гарлаа');
    } finally {
      setPreviewing(false);
    }
  }

  async function saveSong(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api<{ song: WeeklySong }>('/songs/current', {
        method: 'PUT',
        body: JSON.stringify({ title, artist, url, thumbnailUrl }),
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
  const currentYouTubeId = current ? youtubeVideoId(current.url) : null;

  return (
    <Sheet open={open} onClose={onClose} title="Song of Us">
      <div className="max-h-[70vh] overflow-y-auto pb-1">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted">Уншиж байна…</p>
        ) : editing ? (
          <form onSubmit={saveSong} className="space-y-3">
            <p className="text-center text-xs text-muted">Энэ долоо хоногийн хамтын дуу</p>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    searchYouTube();
                  }
                }}
                placeholder="YouTube-ээс дуу хайх"
                className="min-w-0 flex-1 rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
              />
              <button
                type="button"
                onClick={searchYouTube}
                disabled={!searchQuery.trim()}
                aria-label="YouTube хайх"
                title="YouTube хайх"
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#ff0033] text-white disabled:opacity-45"
              >
                <Search size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="relative">
              <Play
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#ff0033]"
                aria-hidden="true"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={(e) => void previewYouTube(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  window.setTimeout(() => void previewYouTube(pasted), 0);
                }}
                maxLength={1000}
                placeholder="YouTube Share link paste хийх"
                required
                className="w-full rounded-xl border border-blush/60 bg-white py-3 pl-11 pr-4 text-sm text-deep outline-none focus:border-rose"
              />
            </div>
            {previewing && <p className="text-center text-xs text-muted">YouTube мэдээлэл уншиж байна…</p>}
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt=""
                className="aspect-video w-full rounded-xl object-cover"
              />
            )}
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
            <section className="mb-5 overflow-hidden rounded-2xl bg-deep text-white shadow-lg">
              {currentYouTubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${currentYouTubeId}?rel=0`}
                  title={`${current.title} — ${current.artist}`}
                  className="aspect-video w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : current.thumbnailUrl ? (
                <img src={current.thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
              ) : null}
              <div className="p-5">
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
              </div>
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
                      {song.thumbnailUrl ? (
                        <img src={song.thumbnailUrl} alt="" className="h-10 w-14 flex-shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-warm text-rose">
                          <Music2 size={18} aria-hidden="true" />
                        </div>
                      )}
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
