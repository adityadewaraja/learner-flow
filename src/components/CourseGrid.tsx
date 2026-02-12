import { useEnrollments } from '@/hooks/useEnrollments';
import { CourseCard } from '@/components/CourseCard';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseGridProps {
  statusFilter?: string;
}

export function CourseGrid({ statusFilter }: CourseGridProps) {
  const { data: enrollments, isLoading, error } = useEnrollments(statusFilter);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">Gagal memuat data</p>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  if (!enrollments?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-muted-foreground">Belum ada kursus</p>
        <p className="text-sm text-muted-foreground">Kursus yang Anda ikuti akan muncul di sini.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {enrollments.map((enrollment) => (
        <CourseCard key={enrollment.id} enrollment={enrollment} />
      ))}
    </div>
  );
}
