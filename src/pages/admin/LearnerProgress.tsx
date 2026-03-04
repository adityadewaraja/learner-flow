import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';

interface EnrollmentRow {
  id: string;
  status: string | null;
  progress_percent: number | null;
  profile: { full_name: string | null; department: string | null } | null;
  course: { title: string } | null;
  latest_score: number | null;
}

export default function LearnerProgress() {
  const [search, setSearch] = useState('');

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-learner-progress'],
    queryFn: async () => {
      // Step 1: fetch enrollments with profile and course
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id, status, progress_percent,
          user_id,
          course:courses ( title ),
          profile:profiles!enrollments_user_id_fkey ( full_name, department )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Step 2: fetch all quiz_attempts for these enrollments
      const enrollmentIds = (enrollments ?? []).map((e: any) => e.id);
      let attemptsMap: Record<string, number> = {};
      if (enrollmentIds.length > 0) {
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('enrollment_id, score, attempted_at')
          .in('enrollment_id', enrollmentIds)
          .order('attempted_at', { ascending: false });

        // Keep latest attempt per enrollment
        (attempts ?? []).forEach((a: any) => {
          if (!(a.enrollment_id in attemptsMap)) {
            attemptsMap[a.enrollment_id] = a.score;
          }
        });
      }

      return (enrollments ?? []).map((e: any): EnrollmentRow => ({
        id: e.id,
        status: e.status,
        progress_percent: e.progress_percent,
        profile: e.profile,
        course: e.course,
        latest_score: attemptsMap[e.id] ?? null,
      }));
    },
  });

  const filtered = (rows ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.profile?.full_name ?? '').toLowerCase().includes(q) ||
      (r.course?.title ?? '').toLowerCase().includes(q)
    );
  });

  const statusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/20">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Assigned</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Learner Progress</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama learner atau judul course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Learner</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="w-[180px]">Progress</TableHead>
              <TableHead className="text-center">Nilai Kuis</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Tidak ada data ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.profile?.full_name ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{row.profile?.department ?? '-'}</TableCell>
                  <TableCell>{row.course?.title ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={row.progress_percent ?? 0} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 text-right">{row.progress_percent ?? 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {row.latest_score !== null ? row.latest_score : '-'}
                  </TableCell>
                  <TableCell className="text-center">{statusBadge(row.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
