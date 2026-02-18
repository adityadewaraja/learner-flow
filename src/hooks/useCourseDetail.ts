import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Course, QuizQuestion } from '@/types/lms';

export function useCourseDetail(courseId: string) {
  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, video_url, created_at')
        .eq('id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as Course | null;
    },
    enabled: !!courseId,
  });

  const quizQuery = useQuery({
    queryKey: ['quiz_questions', courseId],
    queryFn: async () => {
      // Step 1: Fetch questions
      const { data: questions, error: qError } = await supabase
        .from('quiz_questions')
        .select('id, course_id, question_text, created_at')
        .eq('course_id', courseId);

      if (qError) throw qError;
      if (!questions || questions.length === 0) return [];

      // Step 2: Fetch options for all questions
      const questionIds = questions.map((q) => q.id);
      const { data: options, error: oError } = await supabase
        .from('quiz_options')
        .select('id, question_id, option_text, is_correct')
        .in('question_id', questionIds);

      if (oError) throw oError;

      // Step 3: Merge client-side
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

  return { courseQuery, quizQuery };
}
