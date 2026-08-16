import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { libraryApi } from '../api';
import type { Album, Song } from '../types';
import { SongRow } from '../components/SongRow';
import { artUrl } from '../utils';
import { EmptyState, LazyArtwork, Spinner } from '../components/ui';
import { usePlayer } from '../store';

export function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<{ name: string; artworkPath: string | null; albums: Album[]; songs: Song[] } | null>(null);
  const [err, setErr] = useState('');
  const player = usePlayer();

  useEffect(() => {
    if (!id) return;
    libraryApi.artist(id).then((r) => setArtist(r.artist)).catch((e: any) => setErr(e.message));
  }, [id]);

  if (err) return <EmptyState title={err} />;
  if (!artist) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-accent" /></div>;

  const top = artist.songs.slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="h-40 w-40 overflow-hidden rounded-full bg-surface2 sm:h-48 sm:w-48">
          {artist.artworkPath ? (
            <img src={`${artUrl(artist.artworkPath) || ''}`} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl font-black text-muted/20">{artist.name[0]?.toUpperCase()}</div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Artist</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{artist.name}</h1>
          <p className="mt-2 text-sm text-muted">{artist.albums.length} albums · {artist.songs.length} songs</p>
        </div>
      </div>

      {top.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Popular</h2>
          <div className="flex flex-col gap-1">{top.map((s) => <SongRow key={s.id} song={s} />)}</div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Albums</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {artist.albums.map((alb) => (
            <Link key={alb.id} to={`/albums/${alb.id}`} className="group">
              <LazyArtwork song={{ artworkPath: alb.artworkPath, album: null, artist: null } as any} className="h-36 w-full sm:h-40" />
              <p className="mt-2 truncate text-sm font-medium group-hover:text-accent">{alb.title}</p>
              <p className="text-xs text-muted">{alb.songs?.length ?? 0} songs</p>
            </Link>
          ))}
          {artist.albums.length === 0 && (
            <div className="col-span-full"><EmptyState title="No albums published yet" /></div>
          )}
        </div>
      </section>

      {top.length === 0 && (
        <EmptyState title={`No songs for ${artist.name} yet`} hint="Add some from the Admin panel." />
      )}
    </div>
  );
}