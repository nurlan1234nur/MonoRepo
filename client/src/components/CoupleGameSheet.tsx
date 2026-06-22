import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Heart, Plus, Trash2, UserRound, UsersRound, XCircle } from 'lucide-react';
import Sheet from './Sheet';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { useCouple } from '../context/CoupleContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { WhoIsMoreQuiz } from '../types';

type Choice = 'self' | 'partner' | 'both';
type DraftQuestion = { text: string; choice: Choice };
interface Props { open: boolean; onClose: () => void }

const emptyQuestion = (): DraftQuestion => ({ text: '', choice: 'partner' });

export default function CoupleGameSheet({ open, onClose }: Props) {
  const { user } = useAuth();
  const { me, partner } = useCouple();
  const toast = useToast();
  const [quiz, setQuiz] = useState<WhoIsMoreQuiz | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('Бид хоёрын тест');
  const [drafts, setDrafts] = useState<DraftQuestion[]>([emptyQuestion(), emptyQuestion()]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ quiz: WhoIsMoreQuiz | null }>('/games');
      setQuiz(result.quiz);
      if (!result.quiz) setCreating(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тестийг уншихад алдаа гарлаа');
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void loadQuiz(), 0);
    return () => window.clearTimeout(timer);
  }, [loadQuiz, open]);

  useEffect(() => {
    const changed = () => void loadQuiz();
    const socket = getSocket();
    socket.on('game:changed', changed);
    return () => { socket.off('game:changed', changed); };
  }, [loadQuiz]);

  const creatorChoices = [
    { id: 'self' as const, label: me?.name ?? 'Би', icon: UserRound },
    { id: 'partner' as const, label: partner?.name ?? 'Partner', icon: Heart },
    { id: 'both' as const, label: 'Хоёулаа', icon: UsersRound },
  ];

  function updateDraft(index: number, patch: Partial<DraftQuestion>) {
    setDrafts((current) => current.map((draft, itemIndex) => itemIndex === index ? { ...draft, ...patch } : draft));
  }

  async function createQuiz() {
    if (!title.trim() || drafts.some((draft) => !draft.text.trim())) {
      toast('Тестийн нэр болон бүх асуултыг бөглөнө үү');
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ quiz: WhoIsMoreQuiz }>('/games/quiz', {
        method: 'POST',
        body: JSON.stringify({ title, questions: drafts }),
      });
      setQuiz(result.quiz);
      setCreating(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тест үүсгэж чадсангүй');
    } finally { setBusy(false); }
  }

  async function answer(questionId: string, choice: Choice) {
    if (!quiz) return;
    setBusy(true);
    try {
      const result = await api<{ quiz: WhoIsMoreQuiz }>(`/games/quiz/${quiz.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ questionId, choice }),
      });
      setQuiz(result.quiz);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Хариулт хадгалахад алдаа гарлаа');
    } finally { setBusy(false); }
  }

  async function cancelQuiz() {
    if (!quiz) return;
    setBusy(true);
    try {
      await api(`/games/quiz/${quiz.id}`, { method: 'DELETE' });
      setQuiz(null);
      setCreating(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тестийг цуцалж чадсангүй');
    } finally { setBusy(false); }
  }

  function beginNewQuiz() {
    setTitle('Бид хоёрын тест');
    setDrafts([emptyQuestion(), emptyQuestion()]);
    setCreating(true);
  }

  function nameForId(id: string): string {
    if (id === user?.id) return me?.name ?? 'Би';
    return partner?.name ?? 'Partner';
  }

  function idsLabel(ids: string[] | null): string {
    if (!ids) return '—';
    if (ids.length > 1) return 'Хоёулаа';
    return nameForId(ids[0]);
  }

  const activeQuestion = quiz?.questions[quiz.answeredCount];

  return (
    <Sheet open={open} onClose={onClose} title="Хэн нь илүү?">
      <div className="max-h-[74vh] overflow-y-auto pb-1">
        {loading ? <p className="py-12 text-center text-sm text-muted">Уншиж байна…</p> : creating ? (
          <div>
            <div className="mb-4 rounded-xl bg-warm px-4 py-3 text-sm text-deep">
              Асуулт бүрийн зөв хариуг сонго. {partner?.name ?? 'Partner'} тестийг бөглөж дуусаад оноогоо харна.
            </div>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Тестийн нэр</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className="w-full rounded-xl border border-blush bg-white px-3.5 py-3 text-sm text-deep outline-none focus:border-rose" />
            </label>
            <div className="space-y-4">
              {drafts.map((draft, index) => (
                <div key={index} className="rounded-2xl border border-blush/70 bg-white p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted">Асуулт {index + 1}</span>
                    {drafts.length > 2 && <button type="button" onClick={() => setDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="p-1 text-muted"><Trash2 size={16} /></button>}
                  </div>
                  <textarea value={draft.text} onChange={(event) => updateDraft(index, { text: event.target.value })} maxLength={160} rows={2} placeholder="Жишээ: Хэн нь илүү романтик вэ?" className="w-full resize-none rounded-xl border border-blush bg-warm/40 px-3 py-2.5 text-sm text-deep outline-none focus:border-rose" />
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {creatorChoices.map((choice) => (
                      <button key={choice.id} type="button" onClick={() => updateDraft(index, { choice: choice.id })} className={`rounded-lg px-1 py-2 text-[11px] font-semibold ${draft.choice === choice.id ? 'bg-rose text-white' : 'bg-warm text-deep'}`}>{choice.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {drafts.length < 10 && <button type="button" onClick={() => setDrafts((current) => [...current, emptyQuestion()])} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rose py-3 text-sm font-medium text-rose"><Plus size={17} /> Асуулт нэмэх</button>}
            <div className="mt-4 flex gap-2">
              {quiz && <button type="button" onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-blush py-3 text-sm font-medium text-deep">Буцах</button>}
              <button type="button" onClick={() => void createQuiz()} disabled={busy} className="flex-[2] rounded-xl bg-rose py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Үүсгэж байна…' : 'Тест илгээх'}</button>
            </div>
          </div>
        ) : !quiz ? null : quiz.status !== 'completed' && quiz.role === 'creator' ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warm text-3xl">📝</div>
            <h3 className="text-lg font-semibold text-deep">{quiz.title}</h3>
            <p className="mt-2 text-sm text-muted">{partner?.name ?? 'Partner'} хариулж байна</p>
            <div className="mx-auto mt-5 h-2 max-w-56 overflow-hidden rounded-full bg-warm"><div className="h-full rounded-full bg-rose transition-all" style={{ width: `${(quiz.answeredCount / quiz.questions.length) * 100}%` }} /></div>
            <p className="mt-2 text-xs text-muted">{quiz.answeredCount}/{quiz.questions.length} асуулт</p>
            {quiz.answeredCount === 0 && <button type="button" onClick={() => void cancelQuiz()} disabled={busy} className="mt-6 text-sm text-muted underline">Тестийг цуцлах</button>}
          </div>
        ) : quiz.status !== 'completed' && activeQuestion ? (
          <div>
            <div className="mb-3 flex items-center justify-between text-xs text-muted"><span>{quiz.title}</span><span>{quiz.answeredCount + 1}/{quiz.questions.length}</span></div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-warm"><div className="h-full rounded-full bg-rose" style={{ width: `${(quiz.answeredCount / quiz.questions.length) * 100}%` }} /></div>
            <div className="mb-5 rounded-2xl bg-deep px-5 py-7 text-center text-lg font-semibold leading-relaxed text-white">{activeQuestion.text}</div>
            <div className="space-y-2.5">
              {creatorChoices.map((choice) => {
                const Icon = choice.icon;
                return <button key={choice.id} type="button" onClick={() => void answer(activeQuestion.id, choice.id)} disabled={busy} className="flex w-full items-center gap-3 rounded-xl border border-blush bg-white px-4 py-3.5 text-left text-sm font-semibold text-deep transition active:scale-[.98] disabled:opacity-60"><Icon size={20} className="text-rose" /> <span className="flex-1">{choice.label}</span><ChevronRight size={17} className="text-muted" /></button>;
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-5 rounded-2xl bg-deep px-5 py-5 text-center text-white">
              <div className="text-sm opacity-75">{quiz.title}</div>
              <div className="mt-1 text-3xl font-bold">{quiz.score}/{quiz.questions.length}</div>
              <div className="mt-1 text-sm">зөв хариулт</div>
            </div>
            <div className="space-y-2.5">
              {quiz.questions.map((question) => (
                <div key={question.id} className="rounded-xl border border-blush/70 bg-white p-3.5">
                  <div className="flex gap-2">
                    {question.correct ? <CheckCircle2 size={18} className="shrink-0 text-green-600" /> : <XCircle size={18} className="shrink-0 text-rose" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-deep">{question.text}</div>
                      <div className="mt-2 text-xs text-muted">Хариулсан: <span className="font-semibold text-deep">{idsLabel(question.selectedUserIds)}</span></div>
                      {!question.correct && <div className="mt-1 text-xs text-green-700">Зөв: {idsLabel(question.correctUserIds)}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={beginNewQuiz} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose py-3 text-sm font-semibold text-white"><Plus size={17} /> Шинэ тест үүсгэх</button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
