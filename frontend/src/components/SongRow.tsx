import { useEffect, useState } from 'react';
import { Heart, ListPlus, Plus, Pause, Play } from 'lucide-react';
import type { Song } from '../types';
import { usePlayer } from '../store';
import { libraryApi } from '../api';
import { artUrl, fmtDuration } from '../utils';
import { LazyArtwork } from './ui';
import { usePlaylists } from '../hooks/usePlaylists';

export function useLikedIds() {
  const [liked, setLiked] = useState<Set<string>>(new Set());
  useEffect(() => {
    libraryApi.likes().then((r) => setLiked(new Set(r.likes.map((l) => l.songId)))).catch(() => {});
  }, []);
  const toggle = async (songId: string) => {
    const has = liked.has(songId);
    setLiked((prev) => {
      const next = new Set(prev);
      has ? next.delete(songId) : next.add(songId);
      return next;
    });
    try {
      if (has) await libraryApi.unlike(songId);
      else await libraryApi.like(songId);
    } catch {
      setLiked((prev) => {
        const next = new Set(prev);
        has ? next.add(songId) : next.delete(songId);
        return next;
      });
    }
  };
  return { liked, toggle };
}

export function SongRow({ song, dense = false }: { song: Song; dense?: boolean }) {
  const player = usePlayer();
  const isCurrent = player.current?.id === song.id;
  const isPlaying = isCurrent && player.status === 'playing' && !player.overlayOpen;
  const { liked, toggle } = useLikedIds();
  const { playlists, addTrack } = usePlaylists();
  const [menuOpen, setMenuOpen] = useState(false);

  const playNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent && (player.status === 'playing' || player.status === 'loading')) {
      player.toggle();
    } else {
      player.play([song], 0);
      player.setOverlayOpen(true);
    }
  };

  return (
    <div
      className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3 transition-colors hover:bg-surface2 ${dense ? 'py-1.5' : 'py-2.5'}`}
      onClick={() => {
        player.play([song], 0);
        player.setOverlayOpen(true);
      }}
    >
      <div className="relative w-10 shrink-0">
        <LazyArtwork song={song} className="h-10 w-10" />
        <button
          onClick={playNow}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-bg/70 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Play"
        >
          {isPlaying ? <Pause className="h-4 w-4 text-txt" /> : <Play className="h-4 w-4 text-txt" />}
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${isCurrent ? 'text-accent' : 'text-txt'}`}>{song.title}</p>
        <p className="truncate text-xs text-muted">{song.artist?.name || 'Unknown Artist'}</p>
      </div>
      {!dense && <p className="hidden w-40 truncate text-xs text-muted md:block">{song.album?.title || '—'}</p>}
      <p className="hidden text-xs text-muted sm:block">{fmtDuration(song.duration)}</p>
      <div className="relative flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); void toggle(song.id); }}
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-edge hover:text-txt"
          aria-label="Like"
        >
          <Heart className={`h-4 w-4 ${liked.has(song.id) ? 'fill-accent text-accent' : ''}`} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-edge hover:text-txt"
          aria-label="More"
        >
          <ListPlus className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-30 w-56 rounded-xl border border-edge bg-surface p-1.5 shadow-2xl">
            {playlists.length === 0 && <p className="px-3 py-2 text-xs text-muted">No playlists yet.</p>}
            {playlists.map((p) => (
              <button
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  void addTrack(p.id, song.id);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-edge"
              >
                <Plus className="h-3.5 w-3.5" /> Add to “{p.name}”
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}