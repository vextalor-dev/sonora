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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px] animate-glow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/4 h-[380px] w-[520px] rounded-full bg-indigo-500/10 blur-[130px]"
        aria-hidden
      />

      <div className="relative w-full max-w-sm animate-card">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent2 text-[#0b0b10] shadow-[0_0_40px_rgba(139,92,246,0.45)]">
            <AudioLines className="h-8 w-8" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient">SONORA</h1>
          <p className="text-sm text-muted">Your music, self-hosted.</p>
        </div>

        <form
          onSubmit={submit}
          className="glass flex flex-col gap-3 rounded-3xl p-7 shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
        >
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="rounded-xl border border-edge bg-black/40 px-4 py-3 text-sm text-txt outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            className="rounded-xl border border-edge bg-black/40 px-4 py-3 text-sm text-txt outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            type="password"
            required
            minLength={6}
            className="rounded-xl border border-edge bg-black/40 px-4 py-3 text-sm text-txt outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 py-3 text-sm font-semibold text-[#0b0b10] shadow-[0_8px_28px_rgba(139,92,246,0.35)] transition-all hover:shadow-[0_8px_36px_rgba(139,92,246,0.55)] hover:brightness-110 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Log in' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-xs text-muted transition-colors hover:text-txt"
          >
            {mode === 'login' ? "No account yet? Register" : 'Have an account? Log in'}
          </button>
          <p className="text-center text-[10px] leading-relaxed text-muted/50">
            The first account on this server becomes the admin.
          </p>
        </form>
      </div>
    </div>
  );
}