import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ListMusic, Pencil, Play, Shuffle, Trash2 } from 'lucide-react';
import { libraryApi } from '../api';
import type { Playlist, Song } from '../types';
import { SongRow } from '../components/SongRow';
import { EmptyState, Spinner } from '../components/ui';
import { usePlayer } from '../store';

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pl, setPl] = useState<Playlist | null>(null);
  const [err, setErr] = useState('');
  const player = usePlayer();

  const load = () => {
    if (!id) return;
    libraryApi.playlist(id).then((r) => setPl(r.playlist)).catch((e: any) => setErr(e.message));
  };
  useEffect(load, [id]);

  if (err) return <EmptyState title={err} />;
  if (!pl) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-accent" /></div>;

  const songs = pl.tracks.map((t) => t.song);
  const playAll = () => { player.play(songs, 0); player.setOverlayOpen(true); };
  const shuffleAll = () => {
    if (!songs.length) return;
    const order = songs.map((_, i) => i).sort(() => Math.random() - 0.5);
    player.play(order.map((i) => songs[i]), 0);
    player.setOverlayOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-surface2">
          <ListMusic className="h-14 w-14 text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Playlist</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{pl.name}</h1>
          <p className="mt-2 text-sm text-muted">{songs.length} songs</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={playAll} className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-bg hover:scale-105">
              <Play className="h-4 w-4" /> Play
            </button>
            <button onClick={shuffleAll} className="flex items-center gap-2 rounded-full border border-edge px-5 py-3 text-sm text-muted hover:text-txt">
              <Shuffle className="h-4 w-4" /> Shuffle
            </button>
            <button
              onClick={async () => {
                if (confirm(`Delete playlist “${pl.name}”?`)) {
                  await libraryApi.deletePlaylist(pl.id);
                  navigate('/library');
                }
              }}
              className="flex items-center gap-2 rounded-full border border-red-900/60 px-5 py-3 text-sm text-red-400 hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {pl.tracks.map((t) => (
          <div key={t.id} className="relative">
            <SongRow song={t.song} />
            <button
              onClick={async () => {
                await libraryApi.removeTrack(pl.id, t.id);
                load();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted/50 opacity-0 transition-opacity hover:bg-edge hover:text-txt group-hover:opacity-100"
              aria-label="Remove"
              title="Remove from playlist"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {songs.length === 0 && <EmptyState title="This playlist is empty" hint="Add songs from any track’s “+” menu." />}
      </div>
    </div>
  );
}