import { useNavigate } from 'react-router-dom';
import { Enrollment } from '@/types/lms';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  enrollment: Enrollment;
}

export function CourseCard({ enrollment }: CourseCardProps) {
  const navigate = useNavigate();
  const { course, progress_percent, status } = enrollment;
  const isOverdue = status === 'overdue';

  return (
    <div
      onClick={() => navigate(`/course/${course.id}`)}
      className={cn(
        'cursor-pointer',
        'group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
        isOverdue
          ? 'border-destructive/60 shadow-[0_0_20px_-5px_hsl(var(--destructive)/0.3)]'
          : 'border-border/40 hover:border-border'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <span className="text-3xl font-bold text-muted-foreground/40">
              {course.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Status Badge */}
        {isOverdue && (
          <Badge variant="destructive" className="absolute right-2 top-2 text-xs font-semibold">
            Overdue
          </Badge>
        )}
        {status === 'completed' && (
          <Badge className="absolute right-2 top-2 bg-emerald-600 text-xs font-semibold hover:bg-emerald-700">
            Selesai
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
          {course.title}
        </h3>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium">{progress_percent}%</span>
          </div>
          <Progress
            value={progress_percent}
            className={cn('h-1.5', isOverdue && '[&>div]:bg-destructive')}
          />
        </div>
      </div>
    </div>
  );
}
