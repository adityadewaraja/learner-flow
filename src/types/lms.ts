export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_percent: number;
  status: 'in_progress' | 'completed' | 'overdue';
  assigned_at: string;
  course: Course;
}
