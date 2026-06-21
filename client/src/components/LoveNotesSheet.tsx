import { useCallback, useEffect, useState } from 'react';
import { LockKeyhole, MailOpen, Plus, Send, Trash2 } from 'lucide-react';
import Sheet from './Sheet';
import Avatar from './Avatar';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/date';
import { getSocket } from '../lib/socket';
import type { LoveNote } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export default function LoveNotesSheet({ open, onClose, onUnreadChange }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [view, setView] = useState<'received' | 'sent'>('received');
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateNotes = useCallback(
    (next: LoveNote[]) => {
      const sorted = [...next].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setNotes(sorted);
      onUnreadChange?.(
        sorted.filter((note) => note.recipient._id === user?.id && !note.openedAt).length,
      );
    },
    [onUnreadChange, user?.id],
  );

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ notes: LoveNote[] }>('/love-notes');
      updateNotes(result.notes);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Love Notes уншихад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [toast, updateNotes]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void loadNotes(), 0);
    return () => window.clearTimeout(timer);
  }, [loadNotes, open]);

  useEffect(() => {
    const socket = getSocket();
    const addNote = (note: LoveNote) => {
      if (note.author._id === user?.id) return;
      setNotes((current) => {
        const next = current.some((item) => item._id === note._id) ? current : [note, ...current];
        onUnreadChange?.(next.filter((item) => item.recipient._id === user?.id && !item.openedAt).length);
        return next;
      });
    };
    const openNote = (note: LoveNote) => {
      setNotes((current) => {
        const next = current.map((item) => (item._id === note._id ? note : item));
        onUnreadChange?.(next.filter((item) => item.recipient._id === user?.id && !item.openedAt).length);
        return next;
      });
    };
    const deleteNote = ({ id }: { id: string }) => {
      setNotes((current) => {
        const next = current.filter((item) => item._id !== id);
        onUnreadChange?.(next.filter((item) => item.recipient._id === user?.id && !item.openedAt).length);
        return next;
      });
    };
    socket.on('love-note:new', addNote);
    socket.on('love-note:opened', openNote);
    socket.on('love-note:deleted', deleteNote);
    return () => {
      socket.off('love-note:new', addNote);
      socket.off('love-note:opened', openNote);
      socket.off('love-note:deleted', deleteNote);
    };
  }, [onUnreadChange, user?.id]);

  async function sendNote(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setSaving(true);
    try {
      const result = await api<{ note: LoveNote }>('/love-notes', {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      });
      updateNotes([result.note, ...notes.filter((note) => note._id !== result.note._id)]);
      setText('');
      setComposing(false);
      setView('sent');
      toast('Love Note илгээгдлээ');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Love Note илгээхэд алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function openNote(id: string) {
    try {
      const result = await api<{ note: LoveNote }>(`/love-notes/${id}/open`, { method: 'PATCH' });
      updateNotes(notes.map((note) => (note._id === id ? result.note : note)));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Love Note нээхэд алдаа гарлаа');
    }
  }

  async function deleteNote(id: string) {
    try {
      await api(`/love-notes/${id}`, { method: 'DELETE' });
      updateNotes(notes.filter((note) => note._id !== id));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Love Note устгахад алдаа гарлаа');
    }
  }

  const shown = notes.filter((note) =>
    view === 'received' ? note.recipient._id === user?.id : note.author._id === user?.id,
  );

  return (
    <Sheet open={open} onClose={onClose} title="Love Notes">
      <div className="max-h-[70vh] overflow-y-auto pb-1">
        {composing ? (
          <form onSubmit={sendNote} className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={3000}
              rows={7}
              placeholder="Хайртдаа нууц зурвас үлдээх…"
              required
              className="w-full resize-none rounded-xl border border-blush/60 bg-white px-4 py-3 text-sm text-deep outline-none focus:border-rose"
            />
            <div className="text-right text-[10px] text-muted">{text.length}/3000</div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setComposing(false)}
                className="flex-1 rounded-xl border border-blush py-3 text-sm font-medium text-muted"
              >
                Болих
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                <Send size={17} aria-hidden="true" />
                {saving ? 'Илгээж байна…' : 'Илгээх'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-rose py-3 text-sm font-medium text-white"
            >
              <Plus size={18} aria-hidden="true" /> Шинэ Love Note
            </button>
            <div className="mb-4 grid grid-cols-2 rounded-xl bg-warm p-1">
              {(['received', 'sent'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setView(tab)}
                  className={`rounded-lg py-2 text-xs font-semibold ${
                    view === tab ? 'bg-white text-deep shadow-sm' : 'text-muted'
                  }`}
                >
                  {tab === 'received' ? 'Ирсэн' : 'Илгээсэн'}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="py-10 text-center text-sm text-muted">Уншиж байна…</p>
            ) : shown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Одоогоор note алга</p>
            ) : (
              <div className="divide-y divide-blush/60">
                {shown.map((note) => {
                  const received = note.recipient._id === user?.id;
                  const locked = received && !note.openedAt;
                  return (
                    <article key={note._id} className="py-4 first:pt-0">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          value={received ? note.author.avatar : note.recipient.avatar}
                          className="h-9 w-9"
                          emojiClassName="text-lg"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-deep">
                            {received ? note.author.name : note.recipient.name}
                          </div>
                          <div className="text-[11px] text-muted">{formatDateTime(note.createdAt)}</div>
                        </div>
                        {!received && !note.openedAt && (
                          <button
                            type="button"
                            onClick={() => void deleteNote(note._id)}
                            aria-label="Love Note устгах"
                            title="Love Note устгах"
                            className="flex h-8 w-8 items-center justify-center text-muted hover:text-rose"
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {locked ? (
                        <button
                          type="button"
                          onClick={() => void openNote(note._id)}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-warm py-3 text-sm font-medium text-rose"
                        >
                          <LockKeyhole size={17} aria-hidden="true" /> Нээх
                        </button>
                      ) : (
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-deep">
                          {note.text}
                        </p>
                      )}
                      {!received && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted">
                          {note.openedAt ? <MailOpen size={13} /> : <LockKeyhole size={13} />}
                          {note.openedAt ? 'Нээсэн' : 'Нээхийг хүлээж байна'}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
