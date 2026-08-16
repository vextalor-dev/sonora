import { useEffect, useRef, useState } from 'react';
import { Heart, List, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '../store';
import { useLikedIds } from './SongRow';
import { LazyArtwork } from './ui';
import { fmtDuration } from '../utils';

export function PlayerBar() {
  const { current, status, time, duration, volume, muted, shuffle, repeat, toggle, next, prev, toggleShuffle, cycleRepeat, setVolume, toggleMute, setOverlayOpen, setQueueOpen, queue } = usePlayer();
  const { liked, toggle: toggleLike } = useLikedIds();
  const [dragTime, setDragTime] = useState<number | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [likedState, setLikedState] = useState(false);

  useEffect(() => {
    setLikedState(liked.has(current?.id ?? ''));
  }, [liked, current?.id]);

  const seekTo = (v: number) => {
    const el = (window as any).__sonoraSeek;
    if (el) el(v);
    setDragTime(null);
  };

  const pct = duration ? ((dragTime ?? time) / duration) * 100 : 0;

  if (!current) {
    return (
      <footer className="hidden h-20 items-center justify-center border-t border-edge bg-surface text-xs text-muted md:flex">
        No song loaded yet — hit Play on any track to start listening.
      </footer>
    );
  }

  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <footer className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-edge bg-surface px-4">
      {/* Left: track info */}
      <div
        className="flex min-w-0 cursor-pointer items-center gap-3"
        onClick={() => setOverlayOpen(true)}
        title="Open Now Playing"
      >
        <LazyArtwork song={current} className="h-12 w-12" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{current.title}</p>
          <p className="truncate text-xs text-muted">{current.artist?.name || 'Unknown'}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); void toggleLike(current.id); }}
          className="ml-1 hidden text-muted transition-colors hover:text-txt sm:block"
          aria-label="Like"
        >
          <Heart className={`h-4 w-4 ${likedState ? 'fill-accent text-accent' : ''}`} />
        </button>
      </div>

      {/* Center: controls */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShuffle}
            className={`rounded-full p-1.5 transition-colors ${shuffle ? 'text-accent' : 'text-muted hover:text-txt'}`}
            aria-label="Shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button onClick={() => prev()} className="text-muted transition-colors hover:text-txt" aria-label="Previous">
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={() => toggle()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-[#0b0b10] shadow-[0_0_20px_rgba(139,92,246,0.45)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.7)]"
            aria-label={status === 'playing' ? 'Pause' : 'Play'}
          >
            {status === 'playing' ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <button onClick={() => next()} className="text-muted transition-colors hover:text-txt" aria-label="Next">
            <SkipForward className="h-5 w-5" />
          </button>
          <button
            onClick={cycleRepeat}
            className={`rounded-full p-1.5 transition-colors ${repeat !== 'off' ? 'text-accent' : 'text-muted hover:text-txt'}`}
            aria-label="Repeat"
          >
            {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex w-72 items-center gap-2 text-[10px] text-muted">
          <span className="w-8 text-right">{fmtDuration(dragTime ?? time)}</span>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={dragTime ?? time}
            onChange={(e) => setDragTime(Number(e.target.value))}
            onMouseUp={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
            className="w-full"
            aria-label="Seek"
          />
          <span className="w-8">{fmtDuration(duration)}</span>
        </div>
      </div>

      {/* Right: queue + volume */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setQueueOpen(true)}
          className={`rounded-full p-1.5 transition-colors ${queue.length > 1 ? 'text-muted hover:text-txt' : 'text-muted/40'}`}
          aria-label="Queue"
        >
          <List className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-2 lg:flex">
          <button onClick={toggleMute} className="text-muted hover:text-txt" aria-label="Mute">
            <VolIcon className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24"
            aria-label="Volume"
          />
        </div>
      </div>
    </footer>
  );
}