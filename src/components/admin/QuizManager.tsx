import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface OptionForm {
  id?: string;
  option_text: string;
  is_correct: boolean;
  points: number;
}

interface QuestionForm {
  question_text: string;
  options: OptionForm[];
}

const emptyQuestion: QuestionForm = {
  question_text: '',
  options: [
    { option_text: '', is_correct: true, points: 10 },
    { option_text: '', is_correct: false, points: 0 },
    { option_text: '', is_correct: false, points: 0 },
    { option_text: '', is_correct: false, points: 0 },
  ],
};

function QuestionFormFields({
  form,
  setForm,
  idPrefix,
}: {
  form: QuestionForm;
  setForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
  idPrefix: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Teks Pertanyaan</Label>
        <Input
          value={form.question_text}
          onChange={(e) => setForm(prev => ({ ...prev, question_text: e.target.value }))}
          placeholder="Tuliskan pertanyaan..."
        />
      </div>
      <div className="space-y-2">
        <Label>Pilihan Jawaban (pilih yang benar)</Label>
        <RadioGroup
          value={String(form.options.findIndex(o => o.is_correct))}
          onValueChange={(val) => {
            const idx = parseInt(val);
            setForm(prev => ({
              ...prev,
              options: prev.options.map((o, i) => ({ ...o, is_correct: i === idx })),
            }));
          }}
        >
          {form.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <RadioGroupItem value={String(idx)} id={`${idPrefix}-opt-${idx}`} />
              <Input
                value={opt.option_text}
                onChange={(e) => {
                  setForm(prev => ({
                    ...prev,
                    options: prev.options.map((o, i) => i === idx ? { ...o, option_text: e.target.value } : o),
                  }));
                }}
                placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                className="flex-1"
              />
              <Input
                type="number"
                value={opt.points}
                onChange={(e) => {
                  const points = parseInt(e.target.value) || 0;
                  setForm(prev => ({
                    ...prev,
                    options: prev.options.map((o, i) => i === idx ? { ...o, points } : o),
                  }));
                }}
                placeholder="Poin"
                className="w-20"
                min={0}
              />
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

export function QuizManager({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuestionForm>({ ...emptyQuestion, options: emptyQuestion.options.map(o => ({ ...o })) });
  const [saving, setSaving] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<QuestionForm>({ ...emptyQuestion, options: emptyQuestion.options.map(o => ({ ...o })) });

  const questionsQuery = useQuery({
    queryKey: ['admin-quiz', courseId],
    queryFn: async () => {
      const { data: questions, error: qErr } = await supabase
        .from('quiz_questions')
        .select('id, question_text, order_index')
        .eq('course_id', courseId)
        .order('order_index');
      if (qErr) throw qErr;
      if (!questions || questions.length === 0) return [];

      const qIds = questions.map(q => q.id);
      const { data: options, error: oErr } = await supabase
        .from('quiz_options')
        .select('id, question_id, option_text, is_correct, order_index, points')
        .in('question_id', qIds)
        .order('order_index');
      if (oErr) throw oErr;

      return questions.map(q => ({
        ...q,
        options: (options ?? []).filter(o => o.question_id === q.id),
      }));
    },
  });

  const handleAddQuestion = async () => {
    if (!newQuestion.question_text.trim()) { toast.error('Teks pertanyaan wajib diisi'); return; }
    if (newQuestion.options.some(o => !o.option_text.trim())) { toast.error('Semua opsi jawaban harus diisi'); return; }

    setSaving(true);
    try {
      const nextIndex = (questionsQuery.data?.length ?? 0) + 1;
      const { data: qData, error: qErr } = await supabase
        .from('quiz_questions')
        .insert({ course_id: courseId, question_text: newQuestion.question_text, order_index: nextIndex })
        .select('id')
        .single();
      if (qErr) throw qErr;

      const optionsPayload = newQuestion.options.map((o, idx) => ({
        question_id: qData.id, option_text: o.option_text, is_correct: o.is_correct, order_index: idx, points: o.points,
      }));
      const { error: oErr } = await supabase.from('quiz_options').insert(optionsPayload);
      if (oErr) throw oErr;

      toast.success('Pertanyaan berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] });
      setNewQuestion({ ...emptyQuestion, options: emptyQuestion.options.map(o => ({ ...o })) });
      setShowAddForm(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Hapus pertanyaan ini?')) return;
    try {
      await supabase.from('quiz_options').delete().eq('question_id', questionId);
      await supabase.from('quiz_questions').delete().eq('id', questionId);
      queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] });
      toast.success('Pertanyaan dihapus');
    } catch (err: any) { toast.error(err.message); }
  };

  const startEdit = (q: any) => {
    setEditingQuestionId(q.id);
    setEditForm({
      question_text: q.question_text,
      options: q.options.map((o: any) => ({
        id: o.id,
        option_text: o.option_text,
        is_correct: !!o.is_correct,
        points: o.points ?? 0,
      })),
    });
    setShowAddForm(false);
  };

  const handleUpdateQuestion = async (questionId: string) => {
    if (!editForm.question_text.trim()) { toast.error('Teks pertanyaan wajib diisi'); return; }
    if (editForm.options.some(o => !o.option_text.trim())) { toast.error('Semua opsi jawaban harus diisi'); return; }

    setSaving(true);
    try {
      const { error: qErr } = await supabase
        .from('quiz_questions')
        .update({ question_text: editForm.question_text })
        .eq('id', questionId);
      if (qErr) throw qErr;

      // Update each option individually
      for (const opt of editForm.options) {
        if (!opt.id) continue;
        const { error } = await supabase
          .from('quiz_options')
          .update({ option_text: opt.option_text, is_correct: opt.is_correct, points: opt.points })
          .eq('id', opt.id);
        if (error) throw error;
      }

      toast.success('Pertanyaan berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] });
      setEditingQuestionId(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const questions = questionsQuery.data ?? [];

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Quiz Questions ({questions.length})</h3>
        <Button size="sm" variant="outline" onClick={() => { setShowAddForm(!showAddForm); setEditingQuestionId(null); }}>
          <Plus className="mr-1 h-3 w-3" /> Add Question
        </Button>
      </div>

      {questionsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : questions.length === 0 && !showAddForm ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Belum ada soal quiz.</p>
      ) : (
        questions.map((q, idx) => (
          <Card key={q.id} className={`border-border/40 ${editingQuestionId === q.id ? 'border-primary/30' : ''}`}>
            <CardContent className="p-4">
              {editingQuestionId === q.id ? (
                <div className="space-y-4">
                  <QuestionFormFields form={editForm} setForm={setEditForm} idPrefix="edit" />
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateQuestion(q.id)} disabled={saving} className="flex-1">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingQuestionId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-card-foreground">
                      {idx + 1}. {q.question_text}
                    </p>
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => startEdit(q)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {q.options.map((o: any) => (
                      <li key={o.id} className={`text-xs px-2 py-1 rounded flex items-center justify-between ${o.is_correct ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>
                        <span>{o.option_text} {o.is_correct && '✓'}</span>
                        <span className="text-[10px] ml-2">{o.points ?? 0} pts</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {showAddForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <QuestionFormFields form={newQuestion} setForm={setNewQuestion} idPrefix="add" />
            <div className="flex gap-2">
              <Button onClick={handleAddQuestion} disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Question
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
