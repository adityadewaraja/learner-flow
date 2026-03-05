import { Users, Target, GraduationCap, BookOpen, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { useReportData } from '@/hooks/useReportData';

const STATUS_COLORS = ['hsl(0 72% 51%)', 'hsl(45 93% 47%)', 'hsl(142 71% 45%)', 'hsl(0 0% 45%)'];

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

const pieConfig: ChartConfig = {
  assigned: { label: 'Assigned', color: STATUS_COLORS[0] },
  in_progress: { label: 'In Progress', color: STATUS_COLORS[1] },
  completed: { label: 'Completed', color: STATUS_COLORS[2] },
  overdue: { label: 'Overdue', color: STATUS_COLORS[3] },
};

const barConfig: ChartConfig = {
  count: { label: 'Completed', color: 'hsl(0 72% 51%)' },
};

const lineConfig: ChartConfig = {
  count: { label: 'Completions', color: 'hsl(0 72% 51%)' },
};

export default function Reports() {
  const {
    isLoading,
    totalEnrollments,
    totalActiveLearners,
    avgProgress,
    avgQuizScore,
    statusDistribution,
    completionByTeam,
    completionTrend,
  } = useReportData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = [
    { title: 'Active Learners', value: totalActiveLearners, icon: Users, accent: 'text-blue-400' },
    { title: 'Completion Rate', value: `${avgProgress}%`, icon: Target, accent: 'text-emerald-400' },
    { title: 'Avg Quiz Score', value: avgQuizScore, icon: GraduationCap, accent: 'text-amber-400' },
    { title: 'Total Enrollments', value: totalEnrollments, icon: BookOpen, accent: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard & Reports</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.title}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`rounded-lg bg-secondary p-3 ${k.accent}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{k.title}</p>
                <p className="text-2xl font-bold text-foreground">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Pie: Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enrollment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            ) : (
              <ChartContainer config={pieConfig} className="mx-auto aspect-square max-h-[280px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    label={({ name, value }) => `${STATUS_LABELS[name] ?? name}: ${value}`}
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar: Completion by Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion by Team</CardTitle>
          </CardHeader>
          <CardContent>
            {completionByTeam.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            ) : (
              <ChartContainer config={barConfig} className="aspect-video max-h-[280px]">
                <BarChart data={completionByTeam}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="team" tick={{ fill: 'hsl(0 0% 55%)' }} fontSize={12} />
                  <YAxis allowDecimals={false} tick={{ fill: 'hsl(0 0% 55%)' }} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Line: Completion Trend */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {completionTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            ) : (
              <ChartContainer config={lineConfig} className="aspect-[3/1] max-h-[260px]">
                <LineChart data={completionTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(0 0% 55%)' }} fontSize={12} />
                  <YAxis allowDecimals={false} tick={{ fill: 'hsl(0 0% 55%)' }} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(0 72% 51%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(0 72% 51%)', r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
