import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Course, QuizQuestion } from '@/types/lms';

export function useCourseDetail(courseId: string, userId?: string) {
  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, video_url, content_type, article_content, created_at')
        .eq('id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as Course | null;
    },
    enabled: !!courseId,
  });

  const enrollmentQuery = useQuery({
    queryKey: ['enrollment', courseId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, status, progress_percent, completed_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!userId,
  });

  const quizQuery = useQuery({
    queryKey: ['quiz_questions', courseId],
    queryFn: async () => {
      const { data: questions, error: qError } = await supabase
        .from('quiz_questions')
        .select('id, course_id, question_text, created_at')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (qError) throw qError;
      if (!questions || questions.length === 0) return [];

      const questionIds = questions.map((q) => q.id);
      const { data: options, error: oError } = await supabase
        .from('quiz_options')
        .select('id, question_id, option_text, is_correct, points')
        .in('question_id', questionIds);

      if (oError) throw oError;

      const merged: QuizQuestion[] = questions.map((q) => ({
        id: q.id,
        course_id: q.course_id,
        question_text: q.question_text,
        order_index: 0,
        options: (options ?? []).filter((o) => o.question_id === q.id),
      }));

      return merged;
    },
    enabled: !!courseId,
  });

  const quizAttemptQuery = useQuery({
    queryKey: ['quiz_attempt', courseId, userId],
    queryFn: async () => {
      if (!userId) return null;
      // First get the enrollment id
      const { data: enr } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      if (!enr) return null;

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id, score, passed, attempted_at')
        .eq('enrollment_id', enr.id)
        .order('attempted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!userId,
  });

  return { courseQuery, quizQuery, enrollmentQuery, quizAttemptQuery };
}
