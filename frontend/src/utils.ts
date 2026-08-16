export function artUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const parts = path.split('/');
  const base = `/api/artwork/${encodeURIComponent(parts[parts.length - 1] || '')}`;
  const token = localStorage.getItem('sonora_token');
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function fmtDuration(sec: number): string {
  if (!sec || !isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}