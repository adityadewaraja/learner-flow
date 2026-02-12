import { CourseGrid } from '@/components/CourseGrid';

const Index = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Learning</h1>
        <p className="text-sm text-muted-foreground">Lanjutkan kursus yang sedang Anda pelajari.</p>
      </div>
      <CourseGrid />
    </div>
  );
};

export default Index;
