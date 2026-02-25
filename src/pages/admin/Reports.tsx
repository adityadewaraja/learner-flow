import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard & Reports</h1>
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader className="items-center text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-2" />
          <CardTitle>Analytics & Reports Dashboard</CardTitle>
          <CardDescription>Coming Soon</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Halaman ini akan menampilkan statistik kursus, enrollment, dan progress learner.
        </CardContent>
      </Card>
    </div>
  );
}
