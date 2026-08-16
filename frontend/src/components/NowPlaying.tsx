import { Heart, List, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { usePlayer } from '../store';
import { useLikedIds } from './SongRow';
import { LazyArtwork } from './ui';
import { fmtDuration } from '../utils';

export function NowPlayingOverlay() {
  const { current, status, time, duration, volume, muted, shuffle, repeat, toggle, next, prev, toggleShuffle, cycleRepeat, setVolume, toggleMute, overlayOpen, setOverlayOpen, setQueueOpen } = usePlayer();
  const { liked, toggle: toggleLike } = useLikedIds();
  const [drag, setDrag] = useState<number | null>(null);

  if (!overlayOpen || !current) return null;

  const seek = (v: number) => {
    const s = (window as any).__sonoraSeek;
    if (s) s(v);
    setDrag(null);
  };
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const pct = duration ? ((drag ?? time) / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex bg-bg">
      <button
        onClick={() => setOverlayOpen(false)}
        className="absolute left-4 top-4 z-10 rounded-full bg-surface/80 px-4 py-2 text-sm text-muted backdrop-blur hover:text-txt"
      >
        ← Back
      </button>
      <button
        onClick={() => setQueueOpen(true)}
        className="absolute right-4 top-4 z-10 rounded-full bg-surface/80 p-2 text-muted backdrop-blur hover:text-txt"
        aria-label="Queue"
      >
        <List className="h-5 w-5" />
      </button>

      <div className="flex w-full flex-col items-center justify-center gap-6 px-6 py-16">
        <div className="animate-card">
          <LazyArtwork song={current} className="h-56 w-56 shadow-2xl sm:h-72 sm:w-72" />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold">{current.title}</h1>
          <p className="mt-1 text-sm text-muted">{current.artist?.name || 'Unknown'} · {current.album?.title || '—'}</p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={drag ?? time}
            onChange={(e) => setDrag(Number(e.target.value))}
            onMouseUp={(e) => seek(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => seek(Number((e.target as HTMLInputElement).value))}
            className="w-full"
            aria-label="Seek"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>{fmtDuration(drag ?? time)}</span>
            <span>{fmtDuration(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <button onClick={toggleShuffle} className={`p-2 ${shuffle ? 'text-accent' : 'text-muted'}`} aria-label="Shuffle">
            <Shuffle className="h-5 w-5" />
          </button>
          <button onClick={() => prev()} className="p-2 text-muted hover:text-txt" aria-label="Previous">
            <SkipBack className="h-8 w-8" />
          </button>
          <button
            onClick={() => toggle()}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-txt text-bg transition-transform hover:scale-105"
            aria-label="Play / pause"
          >
            {status === 'playing' ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
          </button>
          <button onClick={() => next()} className="p-2 text-muted hover:text-txt" aria-label="Next">
            <SkipForward className="h-8 w-8" />
          </button>
          <button onClick={cycleRepeat} className={`p-2 ${repeat !== 'off' ? 'text-accent' : 'text-muted'}`} aria-label="Repeat">
            {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => void toggleLike(current.id)} aria-label="Like">
            <Heart className={`h-6 w-6 ${liked.has(current.id) ? 'fill-accent text-accent' : 'text-muted'}`} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-muted" aria-label="Mute">
              <VolIcon className="h-5 w-5" />
            </button>
            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-28" aria-label="Volume" />
          </div>
        </div>

        {current.lyric && (
          <div className="max-h-32 w-full max-w-md overflow-y-auto rounded-xl border border-edge bg-surface p-4 text-center text-xs italic leading-relaxed text-muted">
            {current.lyric}
          </div>
        )}
      </div>
    </div>
  );
}