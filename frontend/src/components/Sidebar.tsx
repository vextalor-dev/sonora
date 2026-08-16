import { useState } from 'react';
import { AudioLines, ChevronRight, Home, ListMusic, LogOut, Radio, Search, Settings, Album, Heart, Clock, User as UserIcon } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, clearSession } from '../api';

export function Sidebar() {
  const user = getUser();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  const link = (to: string, label: string, icon: React.ReactNode) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-surface2 text-txt' : 'text-muted hover:bg-surface2/60 hover:text-txt'
        }`
      }
    >
      {icon}
      {!collapsed && <span className="flex-1">{label}</span>}
    </NavLink>
  );

  const logout = () => {
    clearSession();
    navigate('/login');
  };

  const body = (
    <div className={`flex h-full flex-col gap-6 p-4 ${collapsed ? 'w-16' : 'w-60'} transition-all`}>
      <button onClick={() => setCollapsed((v) => !v)} className="flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-bg">
          <AudioLines className="h-5 w-5" />
        </span>
        {!collapsed && <span className="text-lg font-bold tracking-tight">SONORA</span>}
      </button>

      <nav className="flex flex-1 flex-col gap-1">
        {link('/', 'Home', <Home className="h-5 w-5" />)}
        {link('/search', 'Search', <Search className="h-5 w-5" />)}
        {link('/library', 'Your Library', <ListMusic className="h-5 w-5" />)}
        {link('/albums', 'Albums', <Album className="h-5 w-5" />)}
        {link('/artists', 'Artists', <Radio className="h-5 w-5" />)}
        {link('/liked', 'Liked Songs', <Heart className="h-5 w-5" />)}
        {link('/recent', 'Recently Played', <Clock className="h-5 w-5" />)}
        {isAdmin && link('/admin', 'Admin Panel', <Settings className="h-5 w-5" />)}
      </nav>

      <div className="flex flex-col gap-2 border-t border-edge pt-3">
        {!collapsed && (
          <div className="px-2 text-xs text-muted">
            {user?.name || user?.email}
            <div className="mt-0.5 flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {isAdmin ? 'Admin' : 'Listener'}
            </div>
          </div>
        )}
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-4 py-2 text-sm text-muted hover:bg-surface2 hover:text-txt">
          <LogOut className="h-5 w-5" />
          {!collapsed && 'Log out'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden border-r border-edge bg-surface/40 md:block">{body}</aside>
      {/* Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-y-0 left-0 bg-surface" onClick={(e) => e.stopPropagation()}>
            {body}
          </div>
        </div>
      )}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-bg shadow-xl md:hidden"
        aria-label="Menu"
      >
        <ListMusic className="h-5 w-5" />
      </button>
      <div className="fixed right-4 top-4 z-40 flex items-center gap-2 text-xs text-muted md:hidden">
        <span className="rounded-full bg-surface/80 px-3 py-1.5 backdrop-blur">SONORA</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </>
  );
}