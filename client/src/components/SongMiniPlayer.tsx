import { ExternalLink, Music2, SkipBack, SkipForward, X } from 'lucide-react';
import { useSongPlayer } from '../context/SongPlayerContext';

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

export default function SongMiniPlayer() {
  const { currentSong, queue, hasNext, hasPrevious, playNext, playPrevious, stopSong } = useSongPlayer();
  if (!currentSong) return null;

  const videoId = youtubeVideoId(currentSong.url);
  const currentIndex = queue.findIndex((song) => song._id === currentSong._id);
  const playlist = currentIndex >= 0
    ? queue.slice(currentIndex).map((song) => youtubeVideoId(song.url)).filter(Boolean).join(',')
    : videoId;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[82px] z-40 mx-auto w-full max-w-[480px] px-3">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-blush/70 bg-card shadow-[0_8px_28px_rgba(45,31,46,0.18)]">
        <div className="flex items-center gap-3 p-2.5">
          <div className="h-[54px] w-24 flex-shrink-0 overflow-hidden rounded-xl bg-deep">
            {videoId ? (
              <iframe
                key={currentSong._id}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1${playlist ? `&playlist=${playlist}` : ''}`}
                title={`${currentSong.title} - ${currentSong.artist}`}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : currentSong.thumbnailUrl ? (
              <img src={currentSong.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-blush">
                <Music2 size={22} aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-deep">{currentSong.title}</div>
            <div className="truncate text-[11px] text-muted">{currentSong.artist}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose">Now playing</div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={playPrevious}
              disabled={!hasPrevious}
              aria-label="Previous song"
              title="Previous song"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-warm text-deep disabled:opacity-35"
            >
              <SkipBack size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={playNext}
              disabled={!hasNext}
              aria-label="Next song"
              title="Next song"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-warm text-deep disabled:opacity-35"
            >
              <SkipForward size={16} aria-hidden="true" />
            </button>
            <a
              href={currentSong.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open song"
              title="Open song"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-rose/10 text-rose"
            >
              <ExternalLink size={15} aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={stopSong}
              aria-label="Close player"
              title="Close player"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-warm text-muted"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
