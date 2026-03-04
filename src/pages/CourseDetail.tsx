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
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Lock, CheckCircle, Loader2, BookOpen, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from '@/hooks/use-toast';

const PdfPreview = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const title = typeof children === 'string' ? children : 'PDF Document';
  return (
    <div className="my-4 rounded-lg border border-border/40 bg-secondary/20 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40">
        <span className="text-sm font-bold text-foreground truncate">{title}</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 shrink-0 no-underline"
        >
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </a>
      </div>
      <iframe
        src={href}
        title={title}
        className="w-full min-h-[600px] border-0"
      />
    </div>
  );
};

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    if (href && href.toLowerCase().endsWith('.pdf')) {
      return <PdfPreview href={href}>{children}</PdfPreview>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
  },
};

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
  const { courseQuery, quizQuery, enrollmentQuery } = useCourseDetail(id ?? '', user?.id);

  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [timer, setTimer] = useState(10);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [resultModal, setResultModal] = useState<{ score: number; total: number } | null>(null);

  const enrollment = enrollmentQuery.data;
  const progressPercent = enrollment?.progress_percent ?? 0;
  const isCompleted = progressPercent >= 100;
  const isMaterialDone = progressPercent >= 50;

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

  const handleMarkMaterialDone = useCallback(async () => {
    if (!user || !id) return;
    setMarkingDone(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'in_progress', progress_percent: 50 })
        .eq('user_id', user.id)
        .eq('course_id', id);
      if (error) throw error;
      enrollmentQuery.refetch();
      toast({ title: 'Materi ditandai selesai', description: 'Progress diperbarui menjadi 50%.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Gagal', description: 'Tidak bisa memperbarui progress.', variant: 'destructive' });
    } finally {
      setMarkingDone(false);
    }
  }, [user, id, enrollmentQuery]);

  const handleSubmitQuiz = useCallback(async () => {
    if (!user || !id || !quizQuery.data || !enrollment) return;
    setSubmitting(true);

    try {
      const questions = quizQuery.data;
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach((q) => {
        q.options.forEach((o: any) => {
          if (o.is_correct) totalPoints += (o.points ?? 10);
        });
        const selectedOptionId = answers[q.id];
        const selectedOption = q.options.find((o) => o.id === selectedOptionId);
        if (selectedOption && (selectedOption as any).is_correct) {
          earnedPoints += ((selectedOption as any).points ?? 10);
        }
      });

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = score >= 70;

      // Save quiz attempt and update enrollment in parallel
      const [attemptResult, enrollResult] = await Promise.all([
        supabase.from('quiz_attempts').insert({
          enrollment_id: enrollment.id,
          score,
          passed,
        }),
        supabase.from('enrollments').update({
          status: 'completed',
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        }).eq('id', enrollment.id),
      ]);

      if (attemptResult.error) throw attemptResult.error;
      if (enrollResult.error) throw enrollResult.error;

      setResultModal({ score, total: questions.length });
      enrollmentQuery.refetch();
    } catch (err) {
      console.error('Quiz submission error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [user, id, quizQuery.data, answers, enrollment, enrollmentQuery]);

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
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {course.title}
          </h1>
        </div>
      </div>

      {/* Progress Bar */}
      {enrollment && (
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground">{progressPercent}%</span>
        </div>
      )}

      {/* Video Player */}
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

      {/* Article Content */}
      {isArticle && course.article_content && (
        <div className="rounded-xl border border-border/40 bg-card p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Materi Bacaan
          </div>
          <article className="prose prose-sm max-w-none prose-invert prose-headings:text-foreground prose-p:text-card-foreground prose-strong:text-foreground prose-a:text-primary prose-img:rounded-lg prose-li:text-card-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {course.article_content.replace(/\\n/g, '\n')}
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">{course.description}</p>
        </div>
      )}

      {/* Mark Material Done Button */}
      {enrollment && !isCompleted && (
        <div className="rounded-xl border border-border/40 bg-card p-6">
          <Button
            onClick={handleMarkMaterialDone}
            disabled={isMaterialDone || markingDone}
            className="w-full sm:w-auto"
          >
            {markingDone ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</>
            ) : isMaterialDone ? (
              <><CheckCircle className="mr-2 h-4 w-4" />Materi Selesai</>
            ) : (
              'Tandai Selesai'
            )}
          </Button>
          {!isMaterialDone && (
            <p className="mt-2 text-xs text-muted-foreground">
              {isArticle ? 'Baca materi di atas lalu klik tombol ini.' : 'Tonton video di atas lalu klik tombol ini.'}
            </p>
          )}
        </div>
      )}

      {/* Quiz Section */}
      {isCompleted ? (
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Kursus Selesai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Anda sudah menyelesaikan kursus ini. Kembali ke dashboard untuk melanjutkan kursus lainnya.
            </p>
          </CardContent>
        </Card>
      ) : (
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
                  {!isMaterialDone
                    ? 'Tandai materi sebagai selesai terlebih dahulu sebelum mengerjakan quiz.'
                    : isArticle
                    ? 'Baca materi di atas terlebih dahulu sebelum mengerjakan quiz.'
                    : 'Tonton video terlebih dahulu sebelum mengerjakan quiz.'}
                </p>
                <Button
                  onClick={() => setQuizUnlocked(true)}
                  disabled={timer > 0 || !isMaterialDone}
                  className="w-full sm:w-auto"
                >
                  {!isMaterialDone
                    ? 'Selesaikan materi dahulu'
                    : timer > 0
                    ? `Tunggu ${timer} detik...`
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
      )}

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
