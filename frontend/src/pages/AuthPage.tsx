import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioLines, Loader2 } from 'lucide-react';
import { authApi, setSession } from '../api';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await authApi.login(email, password)
          : await authApi.register(name, email, password);
      setSession(res.token, res.user);
      navigate(res.user.role === 'ADMIN' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm animate-card">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-bg">
            <AudioLines className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">SONORA</h1>
          <p className="text-sm text-muted">Your music, self-hosted.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-edge bg-surface p-6">
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="rounded-xl border border-edge bg-bg px-4 py-3 text-sm outline-none focus:border-accent"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            className="rounded-xl border border-edge bg-bg px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            type="password"
            required
            minLength={6}
            className="rounded-xl border border-edge bg-bg px-4 py-3 text-sm outline-none focus:border-accent"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Log in' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-xs text-muted hover:text-txt"
          >
            {mode === 'login' ? "No account yet? Register" : 'Have an account? Log in'}
          </button>
          <p className="text-[10px] leading-relaxed text-muted/50">
            The first account on this server becomes the admin.
          </p>
        </form>
      </div>
    </div>
  );
}