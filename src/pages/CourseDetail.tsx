import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseDetail } from '@/hooks/useCourseDetail';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Lock, CheckCircle, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v');
    } else if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  } catch {
    return url;
  }
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courseQuery, quizQuery } = useCourseDetail(id ?? '');

  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [timer, setTimer] = useState(10);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<{ score: number; total: number } | null>(null);

  // Timer to unlock quiz after 10s
  useEffect(() => {
    if (quizUnlocked) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quizUnlocked]);

  const handleSubmitQuiz = useCallback(async () => {
    if (!user || !id || !quizQuery.data) return;
    setSubmitting(true);

    try {
      const questions = quizQuery.data;
      let correct = 0;
      questions.forEach((q) => {
        const selectedOptionId = answers[q.id];
        const correctOption = q.options.find((o) => o.is_correct);
        if (correctOption && selectedOptionId === correctOption.id) {
          correct++;
        }
      });

      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const passed = score >= 70;

      // Step 1: Find enrollment_id
      const { data: enrollment, error: findError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', id)
        .maybeSingle();

      if (findError) throw findError;
      if (!enrollment) throw new Error('Enrollment tidak ditemukan');

      // Step 2: Save quiz attempt
      const { error: attemptError } = await supabase.from('quiz_attempts').insert({
        enrollment_id: enrollment.id,
        score,
        passed,
      });
      if (attemptError) throw attemptError;

      // Step 3: Update enrollment status
      const { error: enrollError } = await supabase
        .from('enrollments')
        .update({
          status: 'completed',
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);
      if (enrollError) throw enrollError;

      // Step 4: UI feedback
      setResultModal({ score, total: questions.length });
    } catch (err) {
      console.error('Quiz submission error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [user, id, quizQuery.data, answers]);

  const course = courseQuery.data;
  const questions = quizQuery.data ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  if (courseQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-muted-foreground">Kursus tidak ditemukan.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  const isArticle = course.content_type === 'article';
  const embedUrl = !isArticle && course.video_url ? getYouTubeEmbedUrl(course.video_url) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {course.title}
        </h1>
      </div>

      {/* Video Player (only for video type) */}
      {embedUrl && (
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              title={course.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Article Content (only for article type) */}
      {isArticle && course.article_content && (
        <div className="rounded-xl border border-border/40 bg-card p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Materi Bacaan
          </div>
          <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-card-foreground prose-a:text-primary prose-img:rounded-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {course.article_content}
            </ReactMarkdown>
          </article>
        </div>
      )}

      {/* Description */}
      {course.description && (
        <div className="rounded-xl border border-border/40 bg-card p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Deskripsi
          </h2>
          <p className="text-sm leading-relaxed text-card-foreground">{course.description}</p>
        </div>
      )}

      {/* Quiz Section */}
      <Card className="relative overflow-hidden border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {quizUnlocked ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
            Post-Test Quiz
          </CardTitle>
        </CardHeader>

        <CardContent>


          {/* Unlock button area */}
          {!quizUnlocked && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isArticle
                  ? 'Baca materi di atas terlebih dahulu sebelum mengerjakan quiz.'
                  : 'Tonton video terlebih dahulu sebelum mengerjakan quiz.'}
              </p>
              <Button
                onClick={() => setQuizUnlocked(true)}
                disabled={timer > 0}
                className="w-full sm:w-auto"
              >
                {timer > 0
                  ? `${isArticle ? 'Minimum reading time' : 'Tunggu'} ${timer} detik...`
                  : "I'm done, Start Quiz"}
              </Button>
            </div>
          )}

          {/* Quiz questions */}
          {quizUnlocked && (
            <div className={cn('space-y-6', quizQuery.isLoading && 'animate-pulse')}>
              {quizQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              ) : questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada soal quiz untuk kursus ini.</p>
              ) : (
                <>
                  {questions.map((q, idx) => (
                    <div key={q.id} className="space-y-3 rounded-lg border border-border/40 bg-secondary/30 p-4">
                      <p className="text-sm font-medium text-card-foreground">
                        {idx + 1}. {q.question_text}
                      </p>
                      <RadioGroup
                        value={answers[q.id] ?? ''}
                        onValueChange={(val) =>
                          setAnswers((prev) => ({ ...prev, [q.id]: val }))
                        }
                      >
                        {q.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <RadioGroupItem value={opt.id} id={opt.id} />
                            <Label htmlFor={opt.id} className="cursor-pointer text-sm text-card-foreground">
                              {opt.option_text}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}

                  <Button
                    onClick={handleSubmitQuiz}
                    disabled={!allAnswered || submitting}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      'Submit Quiz'
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Modal */}
      <Dialog open={!!resultModal} onOpenChange={() => {
        setResultModal(null);
        navigate('/');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 Selamat!</DialogTitle>
            <DialogDescription>
              Anda telah menyelesaikan quiz dengan skor <strong>{resultModal?.score}%</strong> ({resultModal?.score && resultModal?.total ? Math.round((resultModal.score / 100) * resultModal.total) : 0}/{resultModal?.total} benar).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => { setResultModal(null); navigate('/'); }}>
              Kembali ke Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
