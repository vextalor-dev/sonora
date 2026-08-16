import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Shuffle } from 'lucide-react';
import { libraryApi } from '../api';
import type { Album as AlbumType } from '../types';
import { SongRow } from '../components/SongRow';
import { EmptyState, LazyArtwork, Spinner } from '../components/ui';
import { usePlayer } from '../store';

export function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<(AlbumType & { artist: { name: string }; songs: AlbumType['songs'] }) | null>(null);
  const [err, setErr] = useState('');
  const player = usePlayer();

  useEffect(() => {
    if (!id) return;
    libraryApi.album(id).then((r) => setAlbum(r.album)).catch((e: any) => setErr(e.message));
  }, [id]);

  if (err) return <EmptyState title={err} />;
  if (!album) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-accent" /></div>;

  const songs = album.songs ?? [];
  const playAll = () => { player.play(songs, 0); player.setOverlayOpen(true); };
  const shuffleAll = () => {
    if (!songs.length) return;
    const order = songs.map((_, i) => i).sort(() => Math.random() - 0.5);
    player.play(songs.map((_, i) => songs[order[i]]), 0);
    player.setOverlayOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <LazyArtwork song={{ artworkPath: album.artworkPath, album: null, artist: null } as any} className="h-48 w-48 sm:h-56 sm:w-56" rounded={false} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Album</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{album.title}</h1>
          <p className="mt-2 text-sm text-muted">{album.artist?.name} · {songs.length} songs</p>
          <div className="mt-5 flex gap-3">
            <button onClick={playAll} className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-bg transition-transform hover:scale-105">
              <Play className="h-4 w-4" /> Play
            </button>
            <button onClick={shuffleAll} className="flex items-center gap-2 rounded-full border border-edge px-5 py-3 text-sm text-muted hover:text-txt">
              <Shuffle className="h-4 w-4" /> Shuffle
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {songs.map((s) => <SongRow key={s.id} song={s} />)}
        {songs.length === 0 && <EmptyState title="No songs in this album yet" />}
      </div>
    </div>
  );
}