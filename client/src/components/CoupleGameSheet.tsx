import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import Sheet from './Sheet';
import { useToast } from './Toast';
import { useCouple } from '../context/CoupleContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { WhoIsMoreQuiz, WhoIsMoreQuizSummary } from '../types';

interface Props { open: boolean; onClose: () => void }
type DraftQuestion = { text: string; options: string[]; correctIndex: number };
const emptyQuestion = (): DraftQuestion => ({ text: '', options: ['', ''], correctIndex: 0 });

export default function CoupleGameSheet({ open, onClose }: Props) {
  const { partner } = useCouple();
  const toast = useToast();
  const [quizzes, setQuizzes] = useState<WhoIsMoreQuizSummary[]>([]);
  const [quiz, setQuiz] = useState<WhoIsMoreQuiz | null>(null);
  const [mode, setMode] = useState<'list' | 'editor' | 'detail'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('Бид хоёрын тест');
  const [drafts, setDrafts] = useState<DraftQuestion[]>([emptyQuestion(), emptyQuestion()]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ quizzes: WhoIsMoreQuizSummary[] }>('/games');
      setQuizzes(result.quizzes);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тестүүдийг уншихад алдаа гарлаа');
    } finally { setLoading(false); }
  }, [toast]);

  const loadQuiz = useCallback(async (id: string) => {
    try {
      const result = await api<{ quiz: WhoIsMoreQuiz }>(`/games/quiz/${id}`);
      setQuiz(result.quiz);
      return result.quiz;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тестийг нээж чадсангүй');
      return null;
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setMode('list');
      setQuiz(null);
      void loadList();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadList, open]);

  useEffect(() => {
    const changed = () => {
      void loadList();
      if (quiz) void loadQuiz(quiz.id);
    };
    const socket = getSocket();
    socket.on('game:changed', changed);
    return () => { socket.off('game:changed', changed); };
  }, [loadList, loadQuiz, quiz]);

  function newQuiz() {
    setEditingId(null);
    setTitle('Бид хоёрын тест');
    setDrafts([emptyQuestion(), emptyQuestion()]);
    setMode('editor');
  }

  async function editQuiz(id: string) {
    const selected = await loadQuiz(id);
    if (!selected || !selected.canEdit) return;
    setEditingId(id);
    setTitle(selected.title);
    setDrafts(selected.questions.map((question) => ({
      text: question.text,
      options: question.options.map((option) => option.text),
      correctIndex: Math.max(0, question.options.findIndex((option) => option.id === question.correctOptionId)),
    })));
    setMode('editor');
  }

  async function openQuiz(id: string) {
    const selected = await loadQuiz(id);
    if (selected) setMode('detail');
  }

  function updateDraft(index: number, patch: Partial<DraftQuestion>) {
    setDrafts((current) => current.map((draft, itemIndex) => itemIndex === index ? { ...draft, ...patch } : draft));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    const options = [...drafts[questionIndex].options];
    options[optionIndex] = value;
    updateDraft(questionIndex, { options });
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const draft = drafts[questionIndex];
    const options = draft.options.filter((_, index) => index !== optionIndex);
    const correctIndex = draft.correctIndex === optionIndex ? 0 : draft.correctIndex > optionIndex ? draft.correctIndex - 1 : draft.correctIndex;
    updateDraft(questionIndex, { options, correctIndex });
  }

  async function saveQuiz() {
    if (!title.trim() || drafts.some((draft) => !draft.text.trim() || draft.options.some((option) => !option.trim()))) {
      toast('Тестийн нэр, асуулт болон бүх хариултыг бөглөнө үү');
      return;
    }
    setBusy(true);
    try {
      const path = editingId ? `/games/quiz/${editingId}` : '/games/quiz';
      const result = await api<{ quiz: WhoIsMoreQuiz }>(path, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({ title, questions: drafts }),
      });
      setQuiz(result.quiz);
      setMode('detail');
      await loadList();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тестийг хадгалж чадсангүй');
    } finally { setBusy(false); }
  }

  async function answer(questionId: string, optionId: string) {
    if (!quiz) return;
    setBusy(true);
    try {
      const result = await api<{ quiz: WhoIsMoreQuiz }>(`/games/quiz/${quiz.id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ questionId, optionId }),
      });
      setQuiz(result.quiz);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Хариулт хадгалахад алдаа гарлаа');
    } finally { setBusy(false); }
  }

  async function deleteQuiz() {
    if (!quiz) return;
    setBusy(true);
    try {
      await api(`/games/quiz/${quiz.id}`, { method: 'DELETE' });
      setQuiz(null);
      setMode('list');
      await loadList();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Тестийг устгаж чадсангүй');
    } finally { setBusy(false); }
  }

  const activeQuestion = quiz?.questions[quiz.answeredCount];
  const optionText = (question: WhoIsMoreQuiz['questions'][number], id: string | null) => question.options.find((option) => option.id === id)?.text ?? '—';

  return (
    <Sheet open={open} onClose={onClose} title="Хэн нь илүү?">
      <div className="max-h-[74vh] overflow-y-auto pb-1">
        {mode === 'list' ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div><div className="text-base font-semibold text-deep">Тестүүд</div><div className="text-xs text-muted">Нийт {quizzes.length} тест</div></div>
              <button type="button" onClick={newQuiz} className="flex items-center gap-1.5 rounded-xl bg-rose px-3 py-2 text-xs font-semibold text-white"><Plus size={15} /> Шинэ тест</button>
            </div>
            {loading ? <p className="py-12 text-center text-sm text-muted">Уншиж байна…</p> : quizzes.length === 0 ? (
              <div className="rounded-2xl bg-warm px-5 py-10 text-center"><div className="text-3xl">📝</div><p className="mt-3 text-sm text-muted">Одоогоор тест алга</p></div>
            ) : (
              <div className="space-y-2.5">
                {quizzes.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-blush/70 bg-white p-3.5">
                    <button type="button" onClick={() => void openQuiz(item.id)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-semibold text-deep">{item.title}</div>
                      <div className="mt-1 text-xs text-muted">{item.questionCount} асуулт · {item.role === 'creator' ? 'Миний үүсгэсэн' : `${partner?.name ?? 'Partner'} үүсгэсэн`} · {item.status === 'completed' ? `${item.score}/${item.questionCount} оноо` : item.status === 'playing' ? `${item.answeredCount}/${item.questionCount} бөглөсөн` : 'Хүлээгдэж байна'}</div>
                    </button>
                    {item.canEdit && <button type="button" onClick={() => void editQuiz(item.id)} className="rounded-lg bg-warm p-2 text-deep" aria-label="Тест засах"><Pencil size={16} /></button>}
                    <ChevronRight size={18} className="text-muted" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : mode === 'editor' ? (
          <div>
            <button type="button" onClick={() => setMode('list')} className="mb-3 flex items-center gap-1 text-xs font-medium text-muted"><ArrowLeft size={15} /> Жагсаалт руу</button>
            <div className="mb-4 rounded-xl bg-warm px-4 py-3 text-sm text-deep">Асуулт бүрт 2–5 хариулт оруулаад зөв хариултыг тэмдэглэнэ.</div>
            <label className="mb-4 block"><span className="mb-1.5 block text-xs font-semibold text-muted">Тестийн нэр</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} className="w-full rounded-xl border border-blush bg-white px-3.5 py-3 text-sm text-deep outline-none focus:border-rose" /></label>
            <div className="space-y-4">
              {drafts.map((draft, questionIndex) => (
                <div key={questionIndex} className="rounded-2xl border border-blush/70 bg-white p-3.5">
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-muted">Асуулт {questionIndex + 1}</span>{drafts.length > 2 && <button type="button" onClick={() => setDrafts((current) => current.filter((_, index) => index !== questionIndex))} className="p-1 text-muted"><Trash2 size={16} /></button>}</div>
                  <textarea value={draft.text} onChange={(event) => updateDraft(questionIndex, { text: event.target.value })} maxLength={160} rows={2} placeholder="Асуултаа бичнэ үү" className="w-full resize-none rounded-xl border border-blush bg-warm/40 px-3 py-2.5 text-sm text-deep outline-none focus:border-rose" />
                  <div className="mt-3 space-y-2">
                    {draft.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <button type="button" onClick={() => updateDraft(questionIndex, { correctIndex: optionIndex })} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${draft.correctIndex === optionIndex ? 'border-rose bg-rose text-white' : 'border-blush text-muted'}`}>{draft.correctIndex === optionIndex ? '✓' : optionIndex + 1}</button>
                        <input value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} maxLength={80} placeholder={`Хариулт ${optionIndex + 1}`} className="min-w-0 flex-1 rounded-lg border border-blush px-3 py-2 text-sm text-deep outline-none focus:border-rose" />
                        {draft.options.length > 2 && <button type="button" onClick={() => removeOption(questionIndex, optionIndex)} className="p-1 text-muted"><Trash2 size={15} /></button>}
                      </div>
                    ))}
                  </div>
                  {draft.options.length < 5 && <button type="button" onClick={() => updateDraft(questionIndex, { options: [...draft.options, ''] })} className="mt-2 flex items-center gap-1 text-xs font-medium text-rose"><Plus size={14} /> Хариулт нэмэх</button>}
                </div>
              ))}
            </div>
            {drafts.length < 10 && <button type="button" onClick={() => setDrafts((current) => [...current, emptyQuestion()])} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rose py-3 text-sm font-medium text-rose"><Plus size={17} /> Асуулт нэмэх</button>}
            <button type="button" onClick={() => void saveQuiz()} disabled={busy} className="mt-4 w-full rounded-xl bg-rose py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Хадгалж байна…' : editingId ? 'Өөрчлөлт хадгалах' : 'Тест үүсгэх'}</button>
          </div>
        ) : !quiz ? null : quiz.status !== 'completed' && quiz.role === 'creator' ? (
          <div>
            <button type="button" onClick={() => setMode('list')} className="mb-4 flex items-center gap-1 text-xs font-medium text-muted"><ArrowLeft size={15} /> Тестүүд</button>
            <div className="py-7 text-center"><div className="text-4xl">📝</div><h3 className="mt-3 text-lg font-semibold text-deep">{quiz.title}</h3><p className="mt-2 text-sm text-muted">{partner?.name ?? 'Partner'} хариулахыг хүлээж байна</p><div className="mx-auto mt-5 h-2 max-w-56 overflow-hidden rounded-full bg-warm"><div className="h-full rounded-full bg-rose" style={{ width: `${(quiz.answeredCount / quiz.questionCount) * 100}%` }} /></div><p className="mt-2 text-xs text-muted">{quiz.answeredCount}/{quiz.questionCount} асуулт</p></div>
            {quiz.canEdit && <div className="flex gap-2"><button type="button" onClick={() => void editQuiz(quiz.id)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-warm py-3 text-sm font-medium text-deep"><Pencil size={16} /> Засах</button><button type="button" onClick={() => void deleteQuiz()} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blush py-3 text-sm font-medium text-muted"><Trash2 size={16} /> Устгах</button></div>}
          </div>
        ) : quiz.status !== 'completed' && activeQuestion ? (
          <div>
            <button type="button" onClick={() => setMode('list')} className="mb-3 flex items-center gap-1 text-xs font-medium text-muted"><ArrowLeft size={15} /> Тестүүд</button>
            <div className="mb-3 flex items-center justify-between text-xs text-muted"><span>{quiz.title}</span><span>{quiz.answeredCount + 1}/{quiz.questionCount}</span></div>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-warm"><div className="h-full rounded-full bg-rose" style={{ width: `${(quiz.answeredCount / quiz.questionCount) * 100}%` }} /></div>
            <div className="mb-5 rounded-2xl bg-deep px-5 py-7 text-center text-lg font-semibold leading-relaxed text-white">{activeQuestion.text}</div>
            <div className="space-y-2.5">{activeQuestion.options.map((option, index) => <button key={option.id} type="button" onClick={() => void answer(activeQuestion.id, option.id)} disabled={busy} className="flex w-full items-center gap-3 rounded-xl border border-blush bg-white px-4 py-3.5 text-left text-sm font-semibold text-deep active:scale-[.98] disabled:opacity-60"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-warm text-xs text-rose">{index + 1}</span><span className="flex-1">{option.text}</span><ChevronRight size={17} className="text-muted" /></button>)}</div>
          </div>
        ) : (
          <div>
            <button type="button" onClick={() => setMode('list')} className="mb-3 flex items-center gap-1 text-xs font-medium text-muted"><ArrowLeft size={15} /> Тестүүд</button>
            <div className="mb-5 rounded-2xl bg-deep px-5 py-5 text-center text-white"><div className="text-sm opacity-75">{quiz.title}</div><div className="mt-1 text-3xl font-bold">{quiz.score}/{quiz.questionCount}</div><div className="mt-1 text-sm">зөв хариулт</div></div>
            <div className="space-y-2.5">{quiz.questions.map((question) => <div key={question.id} className="rounded-xl border border-blush/70 bg-white p-3.5"><div className="flex gap-2">{question.correct ? <CheckCircle2 size={18} className="shrink-0 text-green-600" /> : <XCircle size={18} className="shrink-0 text-rose" />}<div className="min-w-0 flex-1"><div className="text-sm font-semibold text-deep">{question.text}</div><div className="mt-2 text-xs text-muted">Хариулсан: <span className="font-semibold text-deep">{optionText(question, question.selectedOptionId)}</span></div>{!question.correct && <div className="mt-1 text-xs text-green-700">Зөв: {optionText(question, question.correctOptionId)}</div>}</div></div></div>)}</div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
