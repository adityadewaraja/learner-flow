import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionForm {
  question_text: string;
  options: { option_text: string; is_correct: boolean }[];
}

const emptyQuestion: QuestionForm = {
  question_text: '',
  options: [
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ],
};

export function QuizManager({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuestionForm>({ ...emptyQuestion, options: emptyQuestion.options.map(o => ({ ...o })) });
  const [saving, setSaving] = useState(false);

  // Fetch questions + options (two-step)
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
        .select('id, question_id, option_text, is_correct, order_index')
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
    if (!newQuestion.question_text.trim()) {
      toast.error('Teks pertanyaan wajib diisi');
      return;
    }
    if (newQuestion.options.some(o => !o.option_text.trim())) {
      toast.error('Semua opsi jawaban harus diisi');
      return;
    }

    setSaving(true);
    try {
      const nextIndex = (questionsQuery.data?.length ?? 0) + 1;

      // Insert question
      const { data: qData, error: qErr } = await supabase
        .from('quiz_questions')
        .insert({ course_id: courseId, question_text: newQuestion.question_text, order_index: nextIndex })
        .select('id')
        .single();
      if (qErr) throw qErr;

      // Insert options
      const optionsPayload = newQuestion.options.map((o, idx) => ({
        question_id: qData.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: idx,
      }));
      const { error: oErr } = await supabase.from('quiz_options').insert(optionsPayload);
      if (oErr) throw oErr;

      toast.success('Pertanyaan berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] });
      setNewQuestion({ ...emptyQuestion, options: emptyQuestion.options.map(o => ({ ...o })) });
      setShowAddForm(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Hapus pertanyaan ini?')) return;
    try {
      await supabase.from('quiz_options').delete().eq('question_id', questionId);
      await supabase.from('quiz_questions').delete().eq('id', questionId);
      queryClient.invalidateQueries({ queryKey: ['admin-quiz', courseId] });
      toast.success('Pertanyaan dihapus');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const questions = questionsQuery.data ?? [];

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Quiz Questions ({questions.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
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
          <Card key={q.id} className="border-border/40">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-card-foreground">
                  {idx + 1}. {q.question_text}
                </p>
                <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDeleteQuestion(q.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <ul className="mt-2 space-y-1">
                {q.options.map((o: any) => (
                  <li key={o.id} className={`text-xs px-2 py-1 rounded ${o.is_correct ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>
                    {o.option_text} {o.is_correct && '✓'}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Question Form */}
      {showAddForm && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Teks Pertanyaan</Label>
              <Input
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                placeholder="Tuliskan pertanyaan..."
              />
            </div>

            <div className="space-y-2">
              <Label>Pilihan Jawaban (pilih yang benar)</Label>
              <RadioGroup
                value={String(newQuestion.options.findIndex(o => o.is_correct))}
                onValueChange={(val) => {
                  const idx = parseInt(val);
                  setNewQuestion(prev => ({
                    ...prev,
                    options: prev.options.map((o, i) => ({ ...o, is_correct: i === idx })),
                  }));
                }}
              >
                {newQuestion.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <RadioGroupItem value={String(idx)} id={`opt-${idx}`} />
                    <Input
                      value={opt.option_text}
                      onChange={(e) => {
                        setNewQuestion(prev => ({
                          ...prev,
                          options: prev.options.map((o, i) => i === idx ? { ...o, option_text: e.target.value } : o),
                        }));
                      }}
                      placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </RadioGroup>
            </div>

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
