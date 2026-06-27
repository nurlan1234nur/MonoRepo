import { Maximize2, Minimize2, Music2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
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
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const scrubStartRef = useRef<{ y: number; time: number } | null>(null);
  const {
    currentSong,
    queue,
    hasNext,
    hasPrevious,
    isPaused,
    playNext,
    playPrevious,
    setSeekSeconds,
    stopSong,
    togglePause,
  } = useSongPlayer();
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragged, setDragged] = useState(false);

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
  const origin = encodeURIComponent(window.location.origin);

  function postYouTube(command: string, args: unknown[] = []) {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: command, args }), '*');
  }

  function seekBy(delta: number) {
    const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
    const next = Math.max(0, Math.min(max, currentTime + delta));
    setCurrentTime(next);
    setSeekSeconds(next);
    postYouTube('seekTo', [next, true]);
  }

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setCollapsed(false);
    setDragOffset({ x: 0, y: 0 });
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
    if (!currentSong || !videoId || isPaused) return;
    const timer = window.setInterval(() => {
      setCurrentTime((time) => {
        const next = duration > 0 ? Math.min(duration, time + 1) : time + 1;
        return next;
      });
      postYouTube('getCurrentTime');
      postYouTube('getDuration');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentSong, duration, isPaused, videoId]);

  useEffect(() => {
    if (!currentSong || !videoId) return;
    postYouTube(isPaused ? 'pauseVideo' : 'playVideo');
  }, [currentSong, isPaused, videoId]);

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

  function onCollapsedPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragged(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onCollapsedPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    const x = e.clientX - start.x;
    const y = e.clientY - start.y;
    if (Math.hypot(x, y) > 6) setDragged(true);
    setDragOffset({ x, y });
  }

  function onCollapsedPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 100) {
      stopSong();
      return;
    }
    setDragOffset({ x: 0, y: 0 });
    if (!dragged) setCollapsed(false);
  }

  function onScrubPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    scrubStartRef.current = { y: e.clientY, time: currentTime };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onScrubPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const start = scrubStartRef.current;
    if (!start) return;
    const delta = Math.round((start.y - e.clientY) / 8);
    const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
    const next = Math.max(0, Math.min(max, start.time + delta));
    setCurrentTime(next);
  }

  function onScrubPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (scrubStartRef.current) {
      setSeekSeconds(currentTime);
      postYouTube('seekTo', [currentTime, true]);
    }
    scrubStartRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  const thumbnail = (
    <div className="relative h-[54px] w-24 flex-shrink-0 overflow-hidden rounded-xl bg-deep">
      {currentSong.thumbnailUrl ? (
        <img src={currentSong.thumbnailUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-blush">
          <Music2 size={22} aria-hidden="true" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );

  const persistentPlayer = videoId ? (
    <iframe
      ref={iframeRef}
      key={currentSong._id}
      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${origin}&rel=0&playsinline=1${playlist ? `&playlist=${playlist}` : ''}`}
      title={`${currentSong.title} - ${currentSong.artist}`}
      className="pointer-events-none fixed bottom-0 right-0 h-px w-px border-0 opacity-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  ) : null;

  return (
    <>
      {persistentPlayer}
      {collapsed ? (
        <button
          type="button"
          onPointerDown={onCollapsedPointerDown}
          onPointerMove={onCollapsedPointerMove}
          onPointerUp={onCollapsedPointerUp}
          onPointerCancel={() => {
            dragStartRef.current = null;
            setDragOffset({ x: 0, y: 0 });
          }}
          aria-label="Show song player"
          title="Show song player"
          style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
          className="fixed bottom-[90px] right-[max(12px,calc((100vw-480px)/2+12px))] z-40 flex h-12 w-12 touch-none items-center justify-center rounded-full bg-deep text-blush shadow-[0_8px_24px_rgba(45,31,46,0.24)]"
        >
          <Music2 size={21} aria-hidden="true" />
        </button>
      ) : (
        <div className="pointer-events-none fixed inset-x-0 bottom-[82px] z-40 mx-auto w-full max-w-[480px] px-3">
          <div className="pointer-events-auto overflow-hidden rounded-2xl border border-blush/70 bg-card shadow-[0_8px_28px_rgba(45,31,46,0.18)]">
            <div className="flex items-center gap-3 p-2.5">
              {thumbnail}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-deep">{currentSong.title}</div>
                <div className="truncate text-[11px] text-muted">{currentSong.artist}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-8 text-[10px] tabular-nums text-muted">{formatTime(currentTime)}</span>
                  <button
                    type="button"
                    onWheel={(e) => {
                      e.preventDefault();
                      seekBy(e.deltaY > 0 ? -5 : 5);
                    }}
                    onPointerDown={onScrubPointerDown}
                    onPointerMove={onScrubPointerMove}
                    onPointerUp={onScrubPointerUp}
                    onPointerCancel={() => {
                      scrubStartRef.current = null;
                    }}
                    aria-label="Seek song"
                    title="Seek song"
                    className="relative h-8 min-w-0 flex-1 touch-none rounded-full bg-warm"
                  >
                    <span className="absolute left-1/2 top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose/70" />
                    <span className="absolute left-[calc(50%-9px)] top-1/2 h-1.5 w-1.5 -translate-y-[11px] rounded-full bg-muted/50" />
                    <span className="absolute left-[calc(50%-9px)] top-1/2 h-1.5 w-1.5 translate-y-[6px] rounded-full bg-muted/50" />
                  </button>
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
                  aria-label="Minimize player"
                  title="Minimize player"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-warm text-muted"
                >
                  <Minimize2 size={15} aria-hidden="true" />
                </button>
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
      )}
    </>
  );
}
