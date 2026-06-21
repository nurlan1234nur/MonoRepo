import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Heart, UserRound, UsersRound } from 'lucide-react';
import Sheet from './Sheet';
import Avatar from './Avatar';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { GameRound, GameStats } from '../types';

type Choice = 'self' | 'partner' | 'both';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CoupleGameSheet({ open, onClose }: Props) {
  const { user } = useAuth();
  const { me, partner } = useCouple();
  const toast = useToast();
  const [round, setRound] = useState<GameRound | null>(null);
  const [stats, setStats] = useState<GameStats>({ matches: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const countedRounds = useRef(new Set<string>());

  const recordReveal = useCallback((revealed: GameRound) => {
    if (countedRounds.current.has(revealed.id)) return;
    countedRounds.current.add(revealed.id);
    setStats((current) => ({
      matches: current.matches + (revealed.matched ? 1 : 0),
      total: current.total + 1,
    }));
  }, []);

  const loadGame = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ round: GameRound; stats: GameStats }>('/games');
      setRound(result.round);
      setStats(result.stats);
      countedRounds.current.clear();
      if (result.round.revealed) countedRounds.current.add(result.round.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тоглоомыг уншихад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void loadGame(), 0);
    return () => window.clearTimeout(timer);
  }, [loadGame, open]);

  useEffect(() => {
    const socket = getSocket();
    const progress = ({ roundId, answerCount }: { roundId: string; answerCount: number }) => {
      setRound((current) =>
        current?.id === roundId ? { ...current, answerCount } : current,
      );
    };
    const reveal = (revealed: GameRound) => {
      setRound((current) => ({ ...revealed, myChoice: current?.myChoice ?? revealed.myChoice }));
      recordReveal(revealed);
    };
    const newRound = (next: GameRound) => setRound(next);
    socket.on('game:progress', progress);
    socket.on('game:reveal', reveal);
    socket.on('game:new-round', newRound);
    return () => {
      socket.off('game:progress', progress);
      socket.off('game:reveal', reveal);
      socket.off('game:new-round', newRound);
    };
  }, [recordReveal]);

  async function answer(choice: Choice) {
    setBusy(true);
    try {
      const result = await api<{ round: GameRound }>('/games/answer', {
        method: 'POST',
        body: JSON.stringify({ choice }),
      });
      setRound(result.round);
      if (result.round.revealed) {
        recordReveal(result.round);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Хариулт хадгалахад алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function nextRound() {
    setBusy(true);
    try {
      const result = await api<{ round: GameRound }>('/games/next', { method: 'POST' });
      setRound(result.round);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Дараагийн асуулт нээхэд алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  function memberName(id: string): string {
    if (id === user?.id) return me?.name ?? 'Би';
    return partner?.name ?? 'Partner';
  }

  function selectionLabel(selectedIds: string[]): string {
    if (selectedIds.length > 1) return 'Хоёулаа';
    return memberName(selectedIds[0]);
  }

  const choices: Array<{ id: Choice; label: string; icon: typeof UserRound }> = [
    { id: 'self', label: me?.name ?? 'Би', icon: UserRound },
    { id: 'partner', label: partner?.name ?? 'Partner', icon: Heart },
    { id: 'both', label: 'Хоёулаа', icon: UsersRound },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Хэн нь илүү?">
      <div className="max-h-[70vh] overflow-y-auto pb-1">
        {loading || !round ? (
          <p className="py-12 text-center text-sm text-muted">Уншиж байна…</p>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between text-xs text-muted">
              <span>Асуулт #{round.roundNumber + 1}</span>
              <span>Таарсан: {stats.matches}/{stats.total}</span>
            </div>

            <div className="mb-5 rounded-2xl bg-deep px-5 py-6 text-center text-lg font-semibold leading-relaxed text-white shadow-lg">
              {round.question}
            </div>

            {!round.revealed && (
              <div className="grid grid-cols-3 gap-2.5">
                {choices.map((choice) => {
                  const Icon = choice.icon;
                  const selected = round.myChoice === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => void answer(choice.id)}
                      disabled={busy}
                      className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                        selected
                          ? 'border-rose bg-rose text-white shadow-md'
                          : 'border-blush/60 bg-white text-deep'
                      }`}
                    >
                      <Icon size={23} aria-hidden="true" />
                      <span className="w-full break-words">{choice.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {!round.revealed && round.myChoice && (
              <p className="mt-4 text-center text-sm text-muted">
                {round.answerCount}/2 · Partner-ийн хариултыг хүлээж байна…
              </p>
            )}

            {round.revealed && (
              <div>
                <div
                  className={`mb-4 rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                    round.matched ? 'bg-green-100 text-green-700' : 'bg-warm text-deep'
                  }`}
                >
                  {round.matched ? 'Та хоёрын бодол таарлаа!' : 'Энэ удаа өөрөөр боджээ'}
                </div>
                <div className="divide-y divide-blush/60">
                  {round.answers.map((gameAnswer) => (
                    <div key={gameAnswer.userId} className="flex items-center gap-3 py-3">
                      <Avatar
                        value={gameAnswer.userId === user?.id ? me?.avatar : partner?.avatar}
                        className="h-9 w-9"
                        emojiClassName="text-lg"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted">{memberName(gameAnswer.userId)}</div>
                        <div className="truncate text-sm font-semibold text-deep">
                          {selectionLabel(gameAnswer.selectedUserIds)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void nextRound()}
                  disabled={busy}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose py-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Дараагийн асуулт <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
