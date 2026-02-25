import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { CourseFormDialog } from '@/components/admin/CourseFormDialog';
import { AssignCourseDialog } from '@/components/admin/AssignCourseDialog';

export default function ManageCourses() {
  const queryClient = useQueryClient();
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assignCourse, setAssignCourse] = useState<{ id: string; title: string } | null>(null);

  const coursesQuery = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, content_type, duration_minutes, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      // Delete quiz_options -> quiz_questions -> course
      const { data: questions } = await supabase.from('quiz_questions').select('id').eq('course_id', courseId);
      if (questions && questions.length > 0) {
        const qIds = questions.map(q => q.id);
        await supabase.from('quiz_options').delete().in('question_id', qIds);
        await supabase.from('quiz_questions').delete().eq('course_id', courseId);
      }
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course berhasil dihapus');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const courses = coursesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Manage Courses</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create New Course
        </Button>
      </div>

      {coursesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="rounded-lg border border-border/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Belum ada course.
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="capitalize">{c.content_type ?? 'video'}</TableCell>
                    <TableCell>{c.duration_minutes ? `${c.duration_minutes} min` : '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" title="Assign Users" onClick={() => setAssignCourse({ id: c.id, title: c.title })}>
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingCourseId(c.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Yakin ingin menghapus course ini?')) deleteMutation.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <CourseFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        courseId={null}
      />

      {/* Edit Dialog */}
      <CourseFormDialog
        open={!!editingCourseId}
        onClose={() => setEditingCourseId(null)}
        courseId={editingCourseId}
      />

      {/* Assign Dialog */}
      {assignCourse && (
        <AssignCourseDialog
          open={!!assignCourse}
          onClose={() => setAssignCourse(null)}
          courseId={assignCourse.id}
          courseTitle={assignCourse.title}
        />
      )}
    </div>
  );
}
