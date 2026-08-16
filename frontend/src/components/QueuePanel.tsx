import { GripVertical, Pause, Play, X } from 'lucide-react';
import { usePlayer } from '../store';
import { LazyArtwork } from './ui';
import { fmtDuration } from '../utils';

export function QueuePanel() {
  const { queue, queuePos, current, status, queueOpen, setQueueOpen, play, removeAt, move, setOverlayOpen } = usePlayer();

  if (!queueOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm" onClick={() => setQueueOpen(false)} />
      <div className="relative flex h-full w-full max-w-sm flex-col border-l border-edge bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <h2 className="text-lg font-bold">Queue</h2>
          <button onClick={() => setQueueOpen(false)} className="rounded-full p-1.5 text-muted hover:bg-edge" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {queue.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">Queue is empty.</p>}
          {queue.map((song, i) => {
            const isCurrent = i === queuePos;
            return (
              <div
                key={song.id + i}
                className={`group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface2 ${isCurrent ? 'bg-surface2' : ''}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  if (isCurrent) {
                    setOverlayOpen(true);
                    setQueueOpen(false);
                  } else {
                    play(queue, i);
                  }
                }}
              >
                <button className="cursor-grab text-muted/40" aria-label="Drag">
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="relative w-9 shrink-0">
                  <LazyArtwork song={song} className="h-9 w-9" />
                  {isCurrent && (status === 'playing' || status === 'loading') && (
                    <span className="absolute inset-0 flex items-center justify-center bg-bg/60 text-accent">
                      <Pause className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${isCurrent ? 'text-accent' : ''}`}>{song.title}</p>
                  <p className="truncate text-xs text-muted">{song.artist?.name}</p>
                </div>
                <span className="text-xs text-muted">{fmtDuration(song.duration)}</span>
                {isCurrent && (
                  <button
                    onClick={() => setOverlayOpen(true)}
                    className="rounded-full p-1 text-accent hover:bg-edge"
                    aria-label="Open now playing"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => removeAt(i)}
                  className="rounded-full p-1 text-muted opacity-0 transition-opacity hover:text-txt group-hover:opacity-100"
                  aria-label="Remove from queue"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        {queue.length > 1 && (
          <div className="border-t border-edge p-3">
            <button
              onClick={() => {
                const q = [...queue];
                q.reverse();
                const newPos = q.length - 1 - queuePos;
                play(q, newPos);
              }}
              className="w-full rounded-xl bg-edge py-2 text-sm text-muted hover:bg-edge"
            >
              Reverse queue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}