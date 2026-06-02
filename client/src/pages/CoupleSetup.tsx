import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Couple } from '../types';

export default function CoupleSetup() {
  const { refresh, logout } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [created, setCreated] = useState<Couple | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    setError('');
    setBusy(true);
    try {
      const { couple } = await api<{ couple: Couple }>('/couples/create', { method: 'POST' });
      setCreated(couple);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа');
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setError('');
    setBusy(true);
    try {
      await api('/couples/join', { method: 'POST', body: JSON.stringify({ inviteCode }) });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-serif italic text-rose mb-1">Хосоо холбоё ♥</h1>
          <p className="text-muted text-sm">Шинэ хос үүсгэх эсвэл урилгын кодоор нэгдэх</p>
        </div>

        {created ? (
          <div className="text-center space-y-2">
            <p className="text-deep">Урилгын код:</p>
            <p className="text-3xl font-mono font-bold text-rose tracking-widest">{created.inviteCode}</p>
            <p className="text-muted text-sm">Энэ кодыг хайртдаа илгээ. Тэр нэгдмэгц чат нээгдэнэ.</p>
          </div>
        ) : (
          <>
            <button
              onClick={create}
              disabled={busy}
              className="w-full bg-rose text-white rounded-xl py-3 font-medium disabled:opacity-60"
            >
              Шинэ хос үүсгэх
            </button>

            <div className="flex items-center gap-3 text-muted text-xs">
              <div className="flex-1 h-px bg-blush/60" /> эсвэл <div className="flex-1 h-px bg-blush/60" />
            </div>

            <div className="space-y-2">
              <input
                className="w-full rounded-xl border border-blush/60 px-4 py-3 outline-none focus:border-rose uppercase"
                placeholder="Урилгын код"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
              <button
                onClick={join}
                disabled={busy || !inviteCode}
                className="w-full border border-rose text-rose rounded-xl py-3 font-medium disabled:opacity-50"
              >
                Кодоор нэгдэх
              </button>
            </div>
          </>
        )}

        {error && <p className="text-rose text-sm text-center">{error}</p>}

        <button onClick={logout} className="w-full text-center text-muted text-xs">
          Гарах
        </button>
      </div>
    </div>
  );
}
