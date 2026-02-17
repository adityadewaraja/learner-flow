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
      const { data, error } = await supabase
        .from('quiz_questions')
        .select(`
          id,
          course_id,
          question_text,
          order_index,
          options:quiz_options (
            id,
            question_id,
            option_text,
            is_correct
          )
        `)
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data as unknown as QuizQuestion[]) ?? [];
    },
    enabled: !!courseId,
  });

  return { courseQuery, quizQuery };
}
