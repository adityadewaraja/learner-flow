export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  content_type: string | null;
  article_content: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_percent: number;
  status: 'in_progress' | 'completed' | 'overdue';
  assigned_at: string;
  completed_at: string | null;
  course: Course;
}

export interface QuizQuestion {
  id: string;
  course_id: string;
  question_text: string;
  order_index: number;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  course_id: string;
  score: number;
  total_questions: number;
  submitted_at: string;
}
