import { CourseGrid } from '@/components/CourseGrid';

export default function Completed() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Completed</h1>
        <p className="text-sm text-muted-foreground">Kursus yang telah Anda selesaikan.</p>
      </div>
      <CourseGrid statusFilter="completed" />
    </div>
  );
}
