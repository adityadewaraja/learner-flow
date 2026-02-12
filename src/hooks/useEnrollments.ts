import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Enrollment } from '@/types/lms';

export function useEnrollments(statusFilter?: string) {
  return useQuery({
    queryKey: ['enrollments', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('enrollments')
        .select(`
          id,
          user_id,
          course_id,
          progress_percent,
          status,
          enrolled_at,
          course:courses (
            id,
            title,
            description,
            thumbnail_url,
            created_at
          )
        `)
        .order('enrolled_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as unknown as Enrollment[]) ?? [];
    },
  });
}
