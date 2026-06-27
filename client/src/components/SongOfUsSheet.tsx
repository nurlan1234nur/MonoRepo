import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Music2, Pause, Pencil, Play, Save, Search, Trash2 } from 'lucide-react';
import Sheet from './Sheet';
import Avatar from './Avatar';
import { useToast } from './Toast';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useSongPlayer } from '../context/SongPlayerContext';
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
  return `${start.getMonth() + 1}-р сарын ${start.getDate()} - ${end.getMonth() + 1}-р сарын ${end.getDate()}`;
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
    if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') return valid(parts[1]);
  } catch {
    return null;
  }
  return null;
}

export default function SongOfUsSheet({ open, onClose, onCurrentChange }: Props) {
  const toast = useToast();
  const { currentSong, isPaused, playSong, removeSong, requestPlay, setQueue } = useSongPlayer();
  const [current, setCurrent] = useState<WeeklySong | null>(null);
  const [displaySong, setDisplaySong] = useState<WeeklySong | null>(null);
  const [songs, setSongs] = useState<WeeklySong[]>([]);
  const [editing, setEditing] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
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
      setDisplaySong(result.current);
      setSongs(result.songs);
      setQueue(result.songs);
      setEditing(!result.current);
      setEditingSongId(null);
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
  }, [onCurrentChange, setQueue, toast]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void loadSongs(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSongs, open]);

  useEffect(() => {
    const socket = getSocket();
    const updateSong = (song: WeeklySong) => {
      setCurrent(song);
      setDisplaySong(song);
      setSongs((existing) => {
        const next = [song, ...existing.filter((item) => item._id !== song._id)];
        setQueue(next);
        return next;
      });
      onCurrentChange?.(true);
    };
    const deleteSong = ({ id }: { id: string }) => {
      setSongs((existing) => {
        const next = existing.filter((item) => item._id !== id);
        setCurrent((existingCurrent) => {
          const nextCurrent = existingCurrent?._id === id ? next[0] ?? null : existingCurrent;
          setDisplaySong((displayed) => (displayed?._id === id ? nextCurrent : displayed));
          onCurrentChange?.(Boolean(nextCurrent));
          return nextCurrent;
        });
        setQueue(next);
        return next;
      });
      removeSong(id);
    };
    socket.on('song:update', updateSong);
    socket.on('song:delete', deleteSong);
    return () => {
      socket.off('song:update', updateSong);
      socket.off('song:delete', deleteSong);
    };
  }, [onCurrentChange, removeSong, setQueue]);

  function startEditing() {
    const song = displaySong ?? current;
    setTitle(song?.title ?? '');
    setArtist(song?.artist ?? '');
    setUrl(song?.url ?? '');
    setThumbnailUrl(song?.thumbnailUrl ?? '');
    setEditingSongId(song?._id ?? null);
    setEditing(true);
  }

  function startAdding() {
    setTitle('');
    setArtist('');
    setUrl('');
    setThumbnailUrl('');
    setSearchQuery('');
    setEditingSongId(null);
    setEditing(true);
  }

  function playFromList(song: WeeklySong) {
    setDisplaySong(song);
    if (currentSong?._id === song._id) {
      requestPlay();
      return;
    }
    playSong(song, songs);
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
      const result = await api<{ song: WeeklySong }>(editingSongId ? `/songs/${editingSongId}` : '/songs', {
        method: editingSongId ? 'PUT' : 'POST',
        body: JSON.stringify({ title, artist, url, thumbnailUrl }),
      });
      setCurrent(result.song);
      setDisplaySong(result.song);
      setSongs((existing) => {
        const next = [result.song, ...existing.filter((item) => item._id !== result.song._id)];
        setQueue(next);
        return next;
      });
      setEditing(false);
      setEditingSongId(null);
      onCurrentChange?.(true);
      toast(editingSongId ? 'Дуу шинэчлэгдлээ' : 'Шинэ дуу list-д нэмэгдлээ');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Дуу хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function removeSavedSong(song: WeeklySong) {
    const confirmed = window.confirm(`"${song.title}" дууг жагсаалтаас устгах уу?`);
    if (!confirmed) return;
    try {
      await api<{ ok: true }>(`/songs/${song._id}`, { method: 'DELETE' });
      const next = songs.filter((item) => item._id !== song._id);
      const nextCurrent = current?._id === song._id ? next[0] ?? null : current;
      setSongs(next);
      setCurrent(nextCurrent);
      setDisplaySong((displayed) => (displayed?._id === song._id ? nextCurrent : displayed));
      setQueue(next);
      removeSong(song._id);
      if (!nextCurrent) setEditing(true);
      onCurrentChange?.(Boolean(nextCurrent));
      toast('Дуу устгагдлаа');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Дуу устгахад алдаа гарлаа');
    }
  }

  const heroSong = displaySong ?? current;
  const heroVideoId = heroSong ? youtubeVideoId(heroSong.url) : null;

  function SongRow({ song }: { song: WeeklySong }) {
    const playing = currentSong?._id === song._id && !isPaused;
    return (
      <div className="flex items-center gap-3 py-3.5">
        <button
          type="button"
          onClick={() => playFromList(song)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {song.thumbnailUrl ? (
            <img src={song.thumbnailUrl} alt="" className="h-10 w-14 flex-shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-warm text-rose">
              <Music2 size={18} aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className={`truncate text-sm font-medium ${displaySong?._id === song._id ? 'text-rose' : 'text-deep'}`}>
              {song.title}
            </div>
            <div className="truncate text-xs text-muted">
              {song.artist} · {weekLabel(song.weekStart)}
            </div>
          </div>
          {playing ? (
            <Pause size={15} className="flex-shrink-0 text-rose" aria-hidden="true" />
          ) : (
            <Play size={15} className="flex-shrink-0 text-rose" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => void removeSavedSong(song)}
          aria-label="Дуу устгах"
          title="Дуу устгах"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-warm text-muted"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Song of Us">
      <div className="max-h-[70vh] overflow-y-auto pb-1">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted">Уншиж байна...</p>
        ) : editing ? (
          <form onSubmit={saveSong} className="space-y-3">
            <p className="text-center text-xs text-muted">{editingSongId ? 'Дуу засах' : 'Шинэ дуу нэмэх'}</p>
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
            {previewing && <p className="text-center text-xs text-muted">YouTube мэдээлэл уншиж байна...</p>}
            {thumbnailUrl && <img src={thumbnailUrl} alt="" className="aspect-video w-full rounded-xl object-cover" />}
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
                  onClick={() => {
                    setEditing(false);
                    setEditingSongId(null);
                  }}
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
                {saving ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>
            </div>
            {songs.length > 0 && (
              <section className="pt-2">
                <div className="mb-2 text-xs font-semibold text-muted">Тавьсан дуунууд</div>
                <div className="divide-y divide-blush/60">
                  {songs.map((song) => (
                    <SongRow key={song._id} song={song} />
                  ))}
                </div>
              </section>
            )}
          </form>
        ) : heroSong ? (
          <div>
            <section className="mb-5 overflow-hidden rounded-2xl bg-deep text-white shadow-lg">
              <div className="relative aspect-video w-full bg-black">
                {heroVideoId ? (
                  <iframe
                    key={heroSong._id}
                    src={`https://www.youtube-nocookie.com/embed/${heroVideoId}?autoplay=${currentSong?._id === heroSong._id && !isPaused ? '1' : '0'}&rel=0&playsinline=1`}
                    title={`${heroSong.title} - ${heroSong.artist}`}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : heroSong.thumbnailUrl ? (
                  <img src={heroSong.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-85" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10 text-blush">
                    <Music2 size={38} aria-hidden="true" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => playFromList(heroSong)}
                  aria-label={currentSong?._id === heroSong._id && !isPaused ? 'Дуу түр зогсоох' : 'Дуу тоглуулах'}
                  title={currentSong?._id === heroSong._id && !isPaused ? 'Дуу түр зогсоох' : 'Дуу тоглуулах'}
                  className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose text-white shadow-lg transition-transform active:scale-95"
                >
                  {currentSong?._id === heroSong._id && !isPaused ? (
                    <Pause size={24} aria-hidden="true" />
                  ) : (
                    <Play size={24} fill="currentColor" aria-hidden="true" />
                  )}
                </button>
              </div>
              <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-blush">
                    <Music2 size={23} aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startAdding}
                      aria-label="Шинэ дуу нэмэх"
                      title="Шинэ дуу нэмэх"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-rose text-white"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={startEditing}
                      aria-label="Дуу засах"
                      title="Дуу засах"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                    >
                      <Pencil size={17} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSavedSong(heroSong)}
                      aria-label="Дуу устгах"
                      title="Дуу устгах"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="text-lg font-semibold leading-snug">{heroSong.title}</div>
                <div className="mt-1 text-sm text-blush">{heroSong.artist}</div>
                <div className="mt-4 flex items-center gap-2 text-xs text-white/65">
                  <Avatar value={heroSong.selectedBy.avatar} className="h-6 w-6" emojiClassName="text-xs" />
                  <span>{heroSong.selectedBy.name} сонгосон</span>
                </div>
                <a
                  href={heroSong.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose py-2.5 text-sm font-medium text-white"
                >
                  {providerLabel(heroSong.url)}
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              </div>
            </section>

            {songs.length > 0 && (
              <section>
                <div className="mb-2 text-xs font-semibold text-muted">Тавьсан дуунууд</div>
                <div className="divide-y divide-blush/60">
                  {songs.map((song) => (
                    <SongRow key={song._id} song={song} />
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
