import { api } from '../lib/api';
import { formatTime } from '../lib/date';
import Avatar from './Avatar';
import type { Moment } from '../types';

const REACTIONS = ['❤️', '😍', '🥺', '💕'];

interface Props {
  moment: Moment;
  myId: string | undefined;
  onUpdated: (moment: Moment) => void;
}

export default function MomentCard({ moment, myId, onUpdated }: Props) {
  async function react(emoji: string) {
    const { moment: updated } = await api<{ moment: Moment }>(`/moments/${moment._id}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
    onUpdated(updated);
  }

  function count(emoji: string): number {
    return moment.reactions.filter((r) => r.emoji === emoji).length;
  }
  function mine(emoji: string): boolean {
    return moment.reactions.some((r) => r.emoji === emoji && r.user === myId);
  }

  return (
    <div className="mb-3.5 overflow-hidden rounded-3xl bg-card shadow-[0_3px_22px_rgba(45,31,46,0.09)]">
      <div className="relative">
        <img src={moment.imageUrl} alt={moment.caption} className="h-56 w-full object-cover" />
        <div className="absolute left-3.5 top-3 flex items-center gap-1.5 rounded-xl bg-white/90 py-0.5 pl-1 pr-2.5 text-[11px] font-semibold text-deep backdrop-blur">
          <Avatar value={moment.author.avatar} className="h-5 w-5" emojiClassName="text-[11px]" />
          {moment.author.name}
        </div>
        <div className="absolute bottom-2.5 right-3.5 rounded-xl bg-deep/55 px-2.5 py-0.5 text-[11px] text-white backdrop-blur">
          {formatTime(moment.createdAt)}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex-1 text-sm text-deep">{moment.caption || '—'}</div>
        <div className="flex gap-2">
          {REACTIONS.map((emoji) => {
            const c = count(emoji);
            return (
              <button
                key={emoji}
                onClick={() => react(emoji)}
                className={`rounded-xl px-2.5 py-1.5 text-base transition-transform active:scale-125 ${
                  mine(emoji) ? 'bg-blush' : 'bg-warm'
                }`}
              >
                {emoji}
                {c > 0 && <span className="ml-0.5 text-[11px] text-muted">{c}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
