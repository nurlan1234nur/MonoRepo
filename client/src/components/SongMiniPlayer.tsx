import { Maximize2, Music2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export default function SongMiniPlayer() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const {
    currentSong,
    queue,
    hasNext,
    hasPrevious,
    isPaused,
    seekSeconds,
    playNext,
    playPrevious,
    setSeekSeconds,
    togglePause,
  } = useSongPlayer();
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoId = currentSong ? youtubeVideoId(currentSong.url) : null;
  const currentIndex = currentSong ? queue.findIndex((song) => song._id === currentSong._id) : -1;
  const playlist =
    currentIndex >= 0
      ? queue
          .slice(currentIndex)
          .map((song) => youtubeVideoId(song.url))
          .filter(Boolean)
          .join(',')
      : videoId;

  function postYouTube(command: string, args: unknown[] = []) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command, args }),
      'https://www.youtube-nocookie.com',
    );
  }

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [currentSong?._id]);

  useEffect(() => {
    if (!currentSong || !videoId) return;
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const data = JSON.parse(event.data) as {
          event?: string;
          info?: { currentTime?: number; duration?: number };
        };
        if (data.event !== 'infoDelivery' || !data.info) return;
        if (typeof data.info.currentTime === 'number') setCurrentTime(data.info.currentTime);
        if (typeof data.info.duration === 'number') setDuration(data.info.duration);
      } catch {
        // Ignore unrelated postMessage traffic.
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentSong, videoId]);

  useEffect(() => {
    if (!currentSong || !videoId) return;
    const timer = window.setInterval(() => {
      postYouTube('getCurrentTime');
      postYouTube('getDuration');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentSong, videoId]);

  useEffect(() => {
    if (!currentSong || !videoId) return;
    postYouTube(isPaused ? 'pauseVideo' : 'playVideo');
  }, [currentSong, isPaused, videoId]);

  useEffect(() => {
    if (!currentSong || !videoId) return;
    postYouTube('seekTo', [seekSeconds, true]);
    setCurrentTime(seekSeconds);
  }, [currentSong, seekSeconds, videoId]);

  if (!currentSong) return null;

  function openSongOfUs() {
    sessionStorage.setItem('open-song-of-us', '1');
    navigate('/more');
    window.setTimeout(() => window.dispatchEvent(new Event('open-song-of-us')), 80);
  }

  function togglePlayback() {
    postYouTube(isPaused ? 'playVideo' : 'pauseVideo');
    togglePause();
  }

  function seek(value: number) {
    setSeekSeconds(value);
    postYouTube('seekTo', [value, true]);
    setCurrentTime(value);
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Show song player"
        title="Show song player"
        className="fixed bottom-[90px] right-[max(12px,calc((100vw-480px)/2+12px))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-deep text-blush shadow-[0_8px_24px_rgba(45,31,46,0.24)]"
      >
        <Music2 size={21} aria-hidden="true" />
      </button>
    );
  }

  const sliderMax = duration > 0 ? Math.ceil(duration) : Math.max(180, Math.ceil(currentTime + 60));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[82px] z-40 mx-auto w-full max-w-[480px] px-3">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-blush/70 bg-card shadow-[0_8px_28px_rgba(45,31,46,0.18)]">
        <div className="flex items-center gap-3 p-2.5">
          <div className="h-[54px] w-24 flex-shrink-0 overflow-hidden rounded-xl bg-deep">
            {videoId ? (
              <iframe
                ref={iframeRef}
                key={currentSong._id}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1${playlist ? `&playlist=${playlist}` : ''}`}
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
            <div className="mt-1 flex items-center gap-2">
              <span className="w-8 text-[10px] tabular-nums text-muted">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={sliderMax}
                value={Math.min(Math.floor(currentTime), sliderMax)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Seek song"
                className="h-1 min-w-0 flex-1 accent-rose"
              />
              <span className="w-8 text-right text-[10px] tabular-nums text-muted">
                {duration > 0 ? formatTime(duration) : '--:--'}
              </span>
            </div>
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
              onClick={togglePlayback}
              aria-label={isPaused ? 'Continue song' : 'Pause song'}
              title={isPaused ? 'Continue song' : 'Pause song'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-rose text-white"
            >
              {isPaused ? <Play size={17} fill="currentColor" aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
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
            <button
              type="button"
              onClick={openSongOfUs}
              aria-label="Open Song of Us"
              title="Open Song of Us"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-rose/10 text-rose"
            >
              <Maximize2 size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Hide player"
              title="Hide player"
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
