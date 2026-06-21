import { useCallback, useEffect, useState } from 'react';
import { Check, Crosshair, Grid3X3, RefreshCw, Shuffle, Trophy } from 'lucide-react';
import Sheet from './Sheet';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { BattleshipGame, BattleshipShot } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Cell = { x: number; y: number };

function key(cell: Cell): string {
  return `${cell.x}:${cell.y}`;
}

interface BoardProps {
  ships?: BattleshipGame['me']['ships'];
  shots: BattleshipShot[];
  selected?: Cell | null;
  interactive?: boolean;
  onSelect?: (cell: Cell) => void;
}

function BattleBoard({ ships = [], shots, selected, interactive, onSelect }: BoardProps) {
  const shipCells = new Set(ships.flatMap((ship) => ship.cells.map(key)));
  const shotMap = new Map(shots.map((shot) => [key(shot), shot]));
  const cells = Array.from({ length: 100 }, (_, index) => ({
    x: (index % 10) + 1,
    y: Math.floor(index / 10) + 1,
  }));

  return (
    <div className="grid w-full grid-cols-[18px_repeat(10,minmax(0,1fr))] gap-px rounded-xl bg-blush/70 p-1 shadow-inner">
      <div />
      {Array.from({ length: 10 }, (_, index) => (
        <div key={`col-${index}`} className="flex aspect-square items-center justify-center text-[8px] font-semibold text-muted">
          {index + 1}
        </div>
      ))}
      {cells.map((cell) => {
        const shot = shotMap.get(key(cell));
        const chosen = selected?.x === cell.x && selected?.y === cell.y;
        return (
          <div key={`cell-wrap-${key(cell)}`} className="contents">
            {cell.x === 1 && (
              <div className="flex aspect-square items-center justify-center text-[8px] font-semibold text-muted">
                {cell.y}
              </div>
            )}
            <button
              type="button"
              onClick={() => onSelect?.(cell)}
              disabled={!interactive || Boolean(shot)}
              aria-label={`${cell.y}-ийн ${cell.x}`}
              className={`relative aspect-square min-w-0 rounded-[2px] transition-colors ${
                chosen
                  ? 'bg-rose ring-2 ring-deep'
                  : shot?.result === 'miss'
                    ? 'bg-sky-100'
                    : shot
                      ? 'bg-red-500'
                      : shipCells.has(key(cell))
                        ? 'bg-deep'
                        : 'bg-white/90'
              }`}
            >
              {shot?.result === 'miss' && (
                <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500" />
              )}
              {shot && shot.result !== 'miss' && (
                <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function BattleshipSheet({ open, onClose }: Props) {
  const { user } = useAuth();
  const { partner } = useCouple();
  const toast = useToast();
  const [game, setGame] = useState<BattleshipGame | null>(null);
  const [view, setView] = useState<'target' | 'mine'>('target');
  const [selected, setSelected] = useState<Cell | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadGame = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ game: BattleshipGame }>('/battleship');
      setGame(result.game);
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
    const changed = () => void loadGame();
    socket.on('battleship:changed', changed);
    return () => {
      socket.off('battleship:changed', changed);
    };
  }, [loadGame]);

  async function action(path: string) {
    setBusy(true);
    try {
      const result = await api<{ game: BattleshipGame }>(`/battleship${path}`, { method: 'POST' });
      setGame(result.game);
      setSelected(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тоглоомын үйлдэл амжилтгүй боллоо');
    } finally {
      setBusy(false);
    }
  }

  async function fire() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await api<{ game: BattleshipGame }>('/battleship/fire', {
        method: 'POST',
        body: JSON.stringify(selected),
      });
      const shot = result.game.opponent.shots.find(
        (item) => item.x === selected.x && item.y === selected.y,
      );
      setGame(result.game);
      setSelected(null);
      toast(shot?.result === 'miss' ? 'Оносонгүй' : shot?.result === 'sunk' ? 'Онгоц живлээ!' : 'Оносон!');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Буудахад алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  const myTurn = game?.status === 'playing' && game.turnUserId === user?.id;

  return (
    <Sheet open={open} onClose={onClose} title="Онгоц буудах">
      <div className="max-h-[76vh] overflow-y-auto pb-1">
        {loading || !game ? (
          <p className="py-12 text-center text-sm text-muted">Уншиж байна…</p>
        ) : game.status === 'placement' ? (
          <div>
            <p className="mb-3 text-center text-sm text-muted">
              10×10 талбай · Онгоц: 5, 4, 3, 3, 2
            </p>
            {game.me.ships.length > 0 ? (
              <BattleBoard ships={game.me.ships} shots={game.me.incomingShots} />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl bg-warm text-center text-sm text-muted">
                Онгоцуудаа байрлуулна уу
              </div>
            )}
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => void action('/randomize')}
                disabled={busy || game.me.ready}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blush py-3 text-sm font-medium text-deep disabled:opacity-50"
              >
                <Shuffle size={17} /> Дахин холих
              </button>
              <button
                type="button"
                onClick={() => void action('/ready')}
                disabled={busy || game.me.ready || game.me.ships.length !== 5}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                <Check size={17} /> {game.me.ready ? 'Бэлэн' : 'Бэлэн болох'}
              </button>
            </div>
            {game.me.ready && (
              <p className="mt-3 text-center text-sm text-muted">
                {game.opponent.ready ? 'Тоглоом эхэлж байна…' : `${partner?.name ?? 'Partner'}-ийг хүлээж байна…`}
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-3 grid grid-cols-2 rounded-xl bg-warm p-1">
              <button
                type="button"
                onClick={() => setView('target')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
                  view === 'target' ? 'bg-white text-deep shadow-sm' : 'text-muted'
                }`}
              >
                <Crosshair size={15} /> Буудах талбай
              </button>
              <button
                type="button"
                onClick={() => setView('mine')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
                  view === 'mine' ? 'bg-white text-deep shadow-sm' : 'text-muted'
                }`}
              >
                <Grid3X3 size={15} /> Миний талбай
              </button>
            </div>

            <div className="mb-3 text-center text-sm font-medium text-deep">
              {game.status === 'finished'
                ? game.winnerUserId === user?.id
                  ? 'Та яллаа!'
                  : `${partner?.name ?? 'Partner'} яллаа`
                : myTurn
                  ? 'Таны ээлж — координат сонгоно уу'
                  : `${partner?.name ?? 'Partner'}-ийн ээлж`}
            </div>

            {view === 'target' ? (
              <BattleBoard
                shots={game.opponent.shots}
                selected={selected}
                interactive={myTurn && !busy}
                onSelect={setSelected}
              />
            ) : (
              <BattleBoard ships={game.me.ships} shots={game.me.incomingShots} />
            )}

            {game.status === 'playing' && view === 'target' && selected && (
              <button
                type="button"
                onClick={() => void fire()}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                <Crosshair size={17} /> {selected.y}-ийн {selected.x}-ыг буудах
              </button>
            )}

            {game.status === 'finished' && (
              <button
                type="button"
                onClick={() => void action('/reset')}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                <RefreshCw size={17} /> Дахин тоглох
              </button>
            )}
            {game.status === 'finished' && game.winnerUserId === user?.id && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-rose">
                <Trophy size={18} /> Бүх онгоцыг живүүллээ
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
