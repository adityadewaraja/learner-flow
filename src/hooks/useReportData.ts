import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface EnrollmentRow {
  id: string;
  user_id: string;
  course_id: string;
  status: string | null;
  progress_percent: number | null;
  completed_at: string | null;
  profile: { department: string | null } | null;
}

export function useReportData() {
  const enrollmentsQuery = useQuery({
    queryKey: ['report-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, user_id, course_id, status, progress_percent, completed_at, profile:profiles!enrollments_user_id_fkey(department)');
      if (error) throw error;
      return (data ?? []) as unknown as EnrollmentRow[];
    },
  });

  const quizQuery = useQuery({
    queryKey: ['report-quiz-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('score');
      if (error) throw error;
      return data ?? [];
    },
  });

  const enrollments = enrollmentsQuery.data ?? [];
  const quizScores = quizQuery.data ?? [];

  // KPIs
  const totalEnrollments = enrollments.length;
  const activeLearnerIds = new Set(
    enrollments
      .filter((e) => e.status === 'in_progress' || e.status === 'completed')
      .map((e) => e.user_id)
  );
  const totalActiveLearners = activeLearnerIds.size;

  const avgProgress =
    totalEnrollments > 0
      ? Math.round(enrollments.reduce((s, e) => s + (e.progress_percent ?? 0), 0) / totalEnrollments)
      : 0;

  const avgQuizScore =
    quizScores.length > 0
      ? Math.round(quizScores.reduce((s, q) => s + q.score, 0) / quizScores.length)
      : 0;

  // Status distribution
  const statusCounts = enrollments.reduce<Record<string, number>>((acc, e) => {
    const s = e.status ?? 'assigned';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Completion by team
  const teamMap: Record<string, number> = {};
  enrollments
    .filter((e) => e.status === 'completed')
    .forEach((e) => {
      const dept = (e.profile as any)?.department ?? 'Unassigned';
      teamMap[dept] = (teamMap[dept] || 0) + 1;
    });
  const completionByTeam = Object.entries(teamMap).map(([team, count]) => ({ team, count }));

  // Completion trend (by week)
  const trendMap: Record<string, number> = {};
  enrollments
    .filter((e) => e.completed_at)
    .forEach((e) => {
      const d = new Date(e.completed_at!);
      // week key: start of week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const key = monday.toISOString().slice(0, 10);
      trendMap[key] = (trendMap[key] || 0) + 1;
    });
  const completionTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    isLoading: enrollmentsQuery.isLoading || quizQuery.isLoading,
    totalEnrollments,
    totalActiveLearners,
    avgProgress,
    avgQuizScore,
    statusDistribution,
    completionByTeam,
    completionTrend,
  };
}
