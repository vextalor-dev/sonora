import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getToken, getUser } from './api';
import { Layout } from './components/Layout';
import { PlayerBar } from './components/PlayerBar';
import { NowPlayingOverlay } from './components/NowPlaying';
import { QueuePanel } from './components/QueuePanel';
import { useAudioEngine } from './hooks/useAudioEngine';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { AlbumPage } from './pages/AlbumPage';
import { ArtistPage } from './pages/ArtistPage';
import { AlbumsPage } from './pages/AlbumsPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { AdminPage } from './pages/AdminPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAuth({ children, admin }: { children: React.ReactElement | null; admin?: boolean }) {
  const user = getUser();
  if (!getToken() || !user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="library" element={<LibraryPage initialTab="playlists" />} />
        <Route path="liked" element={<LibraryPage initialTab="liked" />} />
        <Route path="recent" element={<LibraryPage initialTab="recent" />} />
        <Route path="playlists/:id" element={<PlaylistPage />} />
        <Route path="albums" element={<AlbumsPage />} />
        <Route path="albums/:id" element={<AlbumPage />} />
        <Route path="artists" element={<ArtistsPage />} />
        <Route path="artists/:id" element={<ArtistPage />} />
        <Route path="admin" element={<RequireAuth admin><AdminPage /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function UnauthorizedGate() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    const onUnauthorized = () => {
      if (pathname === '/login') return;
      navigate('/login', { replace: true });
    };
    window.addEventListener('sonora:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sonora:unauthorized', onUnauthorized);
  }, [pathname, navigate]);
  return null;
}

export default function App() {
  useAudioEngine();

  return (
    <BrowserRouter>
      <UnauthorizedGate />
      <ScrollToTop />
      <AppRoutes />
      <PlayerBar />
      <NowPlayingOverlay />
      <QueuePanel />
    </BrowserRouter>
  );
}