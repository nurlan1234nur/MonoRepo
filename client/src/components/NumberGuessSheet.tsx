import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import Sheet from './Sheet';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { NumberGuessAttempt, NumberGuessGame } from '../types';

interface Props { open: boolean; onClose: () => void }

function cleanCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export default function NumberGuessSheet({ open, onClose }: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const { partner } = useCouple();
  const [game, setGame] = useState<NumberGuessGame | null>(null);
  const [secret, setSecret] = useState('');
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadGame = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ game: NumberGuessGame }>('/number-guess');
      setGame(result.game);
      setSecret(result.game.me.secret);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тоо олох тоглоом уншихад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    void loadGame();
  }, [loadGame, open]);

  useEffect(() => {
    const socket = getSocket();
    const changed = () => void loadGame();
    socket.on('number-guess:changed', changed);
    return () => {
      socket.off('number-guess:changed', changed);
    };
  }, [loadGame]);

  async function saveSecret() {
    if (secret.length !== 4) return toast('4 оронтой тоо оруулна уу');
    setBusy(true);
    try {
      const result = await api<{ game: NumberGuessGame }>('/number-guess/secret', {
        method: 'POST',
        body: JSON.stringify({ code: secret }),
      });
      setGame(result.game);
      setSecret(result.game.me.secret);
      toast('Нууц тоо хадгалагдлаа');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Нууц тоо хадгалж чадсангүй');
    } finally {
      setBusy(false);
    }
  }

  async function submitGuess() {
    if (guess.length !== 4) return toast('4 оронтой таамаг оруулна уу');
    setBusy(true);
    try {
      const result = await api<{ game: NumberGuessGame }>('/number-guess/guess', {
        method: 'POST',
        body: JSON.stringify({ code: guess }),
      });
      setGame(result.game);
      setGuess('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Таамаг илгээж чадсангүй');
    } finally {
      setBusy(false);
    }
  }

  async function resetGame() {
    setBusy(true);
    try {
      const result = await api<{ game: NumberGuessGame }>('/number-guess/reset', { method: 'POST' });
      setGame(result.game);
      setSecret('');
      setGuess('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тоглоом дахин эхлүүлж чадсангүй');
    } finally {
      setBusy(false);
    }
  }

  const myTurn = game?.turnUserId === user?.id;
  const winnerName = game?.winnerUserId === user?.id ? 'Та' : partner?.name ?? 'Partner';
  const myAttempts = useMemo(
    () => game?.attempts.filter((attempt) => attempt.userId === user?.id) ?? [],
    [game?.attempts, user?.id],
  );
  const partnerAttempts = useMemo(
    () => game?.attempts.filter((attempt) => attempt.userId !== user?.id) ?? [],
    [game?.attempts, user?.id],
  );

  return (
    <Sheet open={open} onClose={onClose} title="Тоо олох">
      <div className="max-h-[74vh] overflow-y-auto pb-1">
        <div className="mb-4 rounded-2xl bg-warm px-4 py-3 text-sm leading-relaxed text-deep">
          Хоёулаа 4 оронтой нууц тоо оруулна. Зөв цифр + зөв байрлал бол <b>alpha</b>, зөв цифр + буруу байрлал бол <b>betta</b>. 4 alpha түрүүлж олсон нь хожно.
        </div>

        {loading || !game ? (
          <p className="py-12 text-center text-sm text-muted">Уншиж байна…</p>
        ) : game.status === 'setup' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blush/70 bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-deep">Таны нууц тоо</div>
              <input
                inputMode="numeric"
                maxLength={4}
                value={secret}
                onChange={(event) => setSecret(cleanCode(event.target.value))}
                placeholder="1234"
                className="w-full rounded-xl border border-blush bg-warm/40 px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.35em] text-deep outline-none focus:border-rose"
              />
              <button type="button" onClick={() => void saveSecret()} disabled={busy || secret.length !== 4} className="mt-3 w-full rounded-xl bg-rose py-3 text-sm font-semibold text-white disabled:opacity-50">
                {game.me.ready ? 'Нууц тоо шинэчлэх' : 'Бэлэн болох'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl bg-card px-3 py-3 text-muted">
                Та: <span className="font-bold text-deep">{game.me.ready ? 'Бэлэн' : 'Хүлээгдэж байна'}</span>
              </div>
              <div className="rounded-xl bg-card px-3 py-3 text-muted">
                {partner?.name ?? 'Partner'}: <span className="font-bold text-deep">{game.opponent.ready ? 'Бэлэн' : 'Хүлээгдэж байна'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {game.status === 'finished' ? (
              <div className="rounded-2xl bg-deep px-5 py-5 text-center text-white">
                <CheckCircle2 className="mx-auto" size={34} />
                <div className="mt-2 text-xl font-bold">{winnerName} хожлоо</div>
                <div className="mt-1 text-xs opacity-75">Partner-ийн нууц тоо: {game.opponent.secret}</div>
              </div>
            ) : (
              <div className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold ${myTurn ? 'bg-rose text-white' : 'bg-warm text-deep'}`}>
                {myTurn ? 'Таны ээлж' : `${partner?.name ?? 'Partner'} тааж байна`}
              </div>
            )}

            {game.status === 'playing' && (
              <div className="rounded-2xl border border-blush/70 bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-deep">Таамаг</div>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={guess}
                  onChange={(event) => setGuess(cleanCode(event.target.value))}
                  placeholder="0000"
                  className="w-full rounded-xl border border-blush bg-warm/40 px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.35em] text-deep outline-none focus:border-rose"
                />
                <button type="button" onClick={() => void submitGuess()} disabled={busy || !myTurn || guess.length !== 4} className="mt-3 w-full rounded-xl bg-rose py-3 text-sm font-semibold text-white disabled:opacity-50">
                  Таах
                </button>
              </div>
            )}

            <AttemptList title="Миний таамгууд" attempts={myAttempts} empty="Та одоогоор таагаагүй байна" />
            <AttemptList title={`${partner?.name ?? 'Partner'}-ийн таамгууд`} attempts={partnerAttempts} empty="Partner одоогоор таагаагүй байна" />

            {game.status === 'finished' && (
              <button type="button" onClick={() => void resetGame()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose/40 py-3 text-sm font-semibold text-rose disabled:opacity-50">
                <RotateCcw size={16} /> Дахин тоглох
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function AttemptList({ title, attempts, empty }: { title: string; attempts: NumberGuessAttempt[]; empty: string }) {
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</div>
      {attempts.length === 0 ? (
        <div className="rounded-xl bg-card px-4 py-3 text-center text-xs text-muted">{empty}</div>
      ) : (
        <div className="space-y-2">
          {attempts.slice().reverse().map((attempt) => (
            <div key={attempt.id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3">
              <span className="font-mono text-lg font-bold tracking-[0.2em] text-deep">{attempt.guess}</span>
              <span className="text-sm font-semibold text-muted">
                {attempt.alpha} alpha · {attempt.betta} betta
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
