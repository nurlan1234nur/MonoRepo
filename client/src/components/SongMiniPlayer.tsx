import { Clock3, Maximize2, Music2, Pause, Play, SkipBack, SkipForward, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSongPlayer } from '../context/SongPlayerContext';
import Sheet from './Sheet';

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
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; left: number; top: number } | null>(null);
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
  const [bubblePos, setBubblePos] = useState<{ side: 'left' | 'right'; top: number }>({ side: 'right', top: 0 });
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
  const [dragged, setDragged] = useState(false);
  const [seekOpen, setSeekOpen] = useState(false);

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

  function seekTo(value: number) {
    const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
    const next = Math.max(0, Math.min(max, value));
    setCurrentTime(next);
    setSeekSeconds(next);
    postYouTube('seekTo', [next, true]);
  }

  function seekBy(delta: number) {
    seekTo(currentTime + delta);
  }

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setCollapsed(false);
    setBubblePos({ side: 'right', top: Math.max(88, window.innerHeight - 150) });
    setDragPos(null);
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
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = { pointerX: e.clientX, pointerY: e.clientY, left: rect.left, top: rect.top };
    setDragged(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onCollapsedPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    const left = start.left + e.clientX - start.pointerX;
    const top = start.top + e.clientY - start.pointerY;
    if (Math.hypot(e.clientX - start.pointerX, e.clientY - start.pointerY) > 6) setDragged(true);
    setDragPos({ left, top });
  }

  function onCollapsedPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const trashTop = window.innerHeight - 118;
    if (dragPos && dragPos.top > trashTop) {
      stopSong();
      return;
    }
    if (dragPos) {
      const frameWidth = Math.min(window.innerWidth, 480);
      const frameLeft = (window.innerWidth - frameWidth) / 2;
      const centerX = dragPos.left + 24;
      const side = centerX < frameLeft + frameWidth / 2 ? 'left' : 'right';
      const maxTop = window.innerHeight - 150;
      setBubblePos({ side, top: Math.min(Math.max(80, dragPos.top), maxTop) });
    }
    setDragPos(null);
    if (start && !dragged) setCollapsed(false);
  }

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
  const frameWidth = Math.min(window.innerWidth, 480);
  const frameLeft = (window.innerWidth - frameWidth) / 2;
  const bubbleLeft = bubblePos.side === 'left' ? frameLeft + 12 : frameLeft + frameWidth - 60;
  const activeBubbleLeft = dragPos?.left ?? bubbleLeft;
  const activeBubbleTop = dragPos?.top ?? bubblePos.top;
  const showTrash = Boolean(dragPos && dragPos.top > window.innerHeight - 220);
  const seekMax = Math.max(1, Math.ceil(duration || Math.max(currentTime + 60, 180)));

  return (
    <>
      {persistentPlayer}
      {collapsed ? (
        <>
          <button
            type="button"
            onPointerDown={onCollapsedPointerDown}
            onPointerMove={onCollapsedPointerMove}
            onPointerUp={onCollapsedPointerUp}
            onPointerCancel={() => {
              dragStartRef.current = null;
              setDragPos(null);
            }}
            aria-label="Show song player"
            title="Show song player"
            style={{ left: activeBubbleLeft, top: activeBubbleTop }}
            className={`fixed z-40 flex h-12 w-12 touch-none items-center justify-center rounded-full bg-deep text-blush shadow-[0_8px_24px_rgba(45,31,46,0.24)] ${
              dragPos ? '' : 'transition-[left,top] duration-200 ease-out'
            }`}
          >
            <Music2 size={21} aria-hidden="true" />
          </button>
          {showTrash && (
            <div className="pointer-events-none fixed bottom-8 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-rose text-white shadow-[0_10px_28px_rgba(232,96,122,0.35)]">
              <Trash2 size={25} aria-hidden="true" />
            </div>
          )}
        </>
      ) : (
        <div className="pointer-events-none fixed inset-x-0 bottom-[82px] z-40 mx-auto w-full max-w-[480px] px-3">
          <div className="pointer-events-auto overflow-hidden rounded-2xl border border-blush/70 bg-card shadow-[0_8px_28px_rgba(45,31,46,0.18)]">
            <div className="space-y-2 p-2.5">
              <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSeekOpen(true)}
                aria-label="Seek song"
                title="Seek song"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-warm text-rose"
              >
                <Clock3 size={17} aria-hidden="true" />
              </button>
              <div className="relative h-11 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-deep">
                {currentSong.thumbnailUrl ? (
                  <img src={currentSong.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-blush">
                    <Music2 size={20} aria-hidden="true" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="truncate text-[13px] font-semibold text-deep">{currentSong.title}</div>
                <div className="truncate text-[11px] text-muted">{currentSong.artist}</div>
                <div className="mt-1 text-[10px] tabular-nums text-muted">
                  {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
                </div>
              </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={playPrevious}
                  disabled={!hasPrevious}
                  aria-label="Previous song"
                  title="Previous song"
                  className="flex h-9 items-center justify-center rounded-xl bg-warm text-deep disabled:opacity-35"
                >
                  <SkipBack size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={isPaused ? 'Continue song' : 'Pause song'}
                  title={isPaused ? 'Continue song' : 'Pause song'}
                  className="flex h-9 items-center justify-center rounded-xl bg-rose text-white"
                >
                  {isPaused ? <Play size={17} fill="currentColor" aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={playNext}
                  disabled={!hasNext}
                  aria-label="Next song"
                  title="Next song"
                  className="flex h-9 items-center justify-center rounded-xl bg-warm text-deep disabled:opacity-35"
                >
                  <SkipForward size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={openSongOfUs}
                  aria-label="Open Song of Us"
                  title="Open Song of Us"
                  className="flex h-9 items-center justify-center rounded-xl bg-rose/10 text-rose"
                >
                  <Maximize2 size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label="Minimize player"
                  title="Minimize player"
                  className="flex h-9 items-center justify-center rounded-xl bg-warm text-muted"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Sheet open={seekOpen} onClose={() => setSeekOpen(false)} title="Дууны секунд">
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums text-deep">{formatTime(currentTime)}</div>
            <div className="mt-1 text-xs tabular-nums text-muted">{duration > 0 ? formatTime(duration) : '--:--'}</div>
          </div>
          <input
            type="range"
            min={0}
            max={seekMax}
            value={Math.min(Math.floor(currentTime), seekMax)}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-full accent-rose"
            aria-label="Дууны секунд"
          />
          <div className="grid grid-cols-4 gap-2">
            {[-30, -10, 10, 30].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => seekBy(value)}
                className="rounded-xl bg-warm py-3 text-sm font-semibold text-rose"
              >
                {value > 0 ? `+${value}` : value}s
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={seekMax}
              value={Math.floor(currentTime)}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="min-w-0 flex-1 rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
            />
            <button
              type="button"
              onClick={() => setSeekOpen(false)}
              className="rounded-xl bg-rose px-5 py-3 text-sm font-semibold text-white"
            >
              Болсон
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
