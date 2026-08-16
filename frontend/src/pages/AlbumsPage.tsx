import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { libraryApi } from '../api';
import type { Album } from '../types';
import { EmptyState, LazyArtwork, Spinner } from '../components/ui';

export function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[] | null>(null);
  useEffect(() => {
    libraryApi.albums().then((r) => setAlbums(r.albums)).catch(() => setAlbums([]));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-black tracking-tight">Albums</h1>
      {!albums ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-accent" /></div>
      ) : albums.length === 0 ? (
        <EmptyState title="No albums yet" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {albums.map((a) => (
            <Link key={a.id} to={`/albums/${a.id}`} className="group animate-card">
              <LazyArtwork song={{ artworkPath: a.artworkPath, album: null, artist: null } as any} className="h-36 w-full sm:h-44" />
              <p className="mt-2 truncate text-sm font-medium group-hover:text-accent">{a.title}</p>
              <p className="truncate text-xs text-muted">{a.artist?.name} · {a.songs?.length ?? 0} songs</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}