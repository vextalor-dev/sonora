import { lazy, Suspense, useEffect, useState } from 'react';
import type { Song } from '../types';
import { artUrl } from '../utils';

export function LazyArtwork({ song, className = '', rounded = true }: { song: Pick<Song, 'artworkPath' | 'album' | 'artist'>; className?: string; rounded?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = artUrl(song.artworkPath ?? song.album?.artworkPath ?? null);
  return (
    <div className={`shrink-0 overflow-hidden ${rounded ? 'rounded-lg' : ''} bg-surface2 ${className}`}>
      {url && !failed ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface2 to-bg">
          <span className="text-[10px] font-bold tracking-widest text-muted/40">SONORA</span>
        </div>
      )}
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin-slow ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="opacity-20" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="40 60" />
    </svg>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-edge py-16 text-center">
      <p className="text-sm font-medium text-muted">{title}</p>
      {hint && <p className="max-w-sm text-xs text-muted/60">{hint}</p>}
    </div>
  );
}