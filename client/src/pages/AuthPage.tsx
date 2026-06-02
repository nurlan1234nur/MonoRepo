import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-xl p-8">
        <h1 className="text-3xl font-serif italic text-rose text-center mb-1">nous</h1>
        <p className="text-center text-muted mb-6 text-sm">хосуудын ертөнц</p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <input
              className="w-full rounded-xl border border-blush/60 px-4 py-3 outline-none focus:border-rose"
              placeholder="Нэр"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            className="w-full rounded-xl border border-blush/60 px-4 py-3 outline-none focus:border-rose"
            placeholder="И-мэйл"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-xl border border-blush/60 px-4 py-3 outline-none focus:border-rose"
            placeholder="Нууц үг"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-rose text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-rose text-white rounded-xl py-3 font-medium disabled:opacity-60"
          >
            {busy ? '...' : mode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
          </button>
        </form>

        <button
          className="w-full text-center text-muted text-sm mt-4"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Шинэ бол бүртгүүлэх' : 'Бүртгэлтэй бол нэвтрэх'}
        </button>
      </div>
    </div>
  );
}
