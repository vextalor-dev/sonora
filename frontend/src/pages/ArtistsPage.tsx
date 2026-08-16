import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { libraryApi } from '../api';
import type { Artist } from '../types';
import { artUrl } from '../utils';
import { EmptyState, Spinner } from '../components/ui';

export function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[] | null>(null);
  useEffect(() => {
    libraryApi.artists().then((r) => setArtists(r.artists)).catch(() => setArtists([]));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-black tracking-tight">Artists</h1>
      {!artists ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8 text-accent" /></div>
      ) : artists.length === 0 ? (
        <EmptyState title="No artists yet" />
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {artists.map((a) => {
            const initial = a.name[0]?.toUpperCase();
            return (
              <Link key={a.id} to={`/artists/${a.id}`} className="group flex flex-col items-center gap-3 text-center">
                <div className="h-28 w-28 overflow-hidden rounded-full bg-surface2 transition-transform group-hover:scale-105">
                  {a.artworkPath ? (
                    <img src={`${artUrl(a.artworkPath) || ''}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-black text-muted/20">{initial}</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold group-hover:text-accent">{a.name}</p>
                  <p className="text-xs text-muted">{a._count?.songs ?? 0} songs</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}