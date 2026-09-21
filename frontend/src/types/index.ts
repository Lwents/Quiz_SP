export type UserRole = 'STUDENT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'multiple_blank'
  | 'matching'
  | 'drag_drop'
  | 'ordering'
  | 'dropdown'
  | 'short_answer'
  | 'essay'
  | 'numeric'
  | 'image'
  | 'code';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  subject_id: string;
  order?: number;
  created_at: string;
}

export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  title?: string;
  content: string;
  points: number;
  difficulty: DifficultyLevel;
  config: Record<string, any>;
  explanation?: string;
  order?: number;
}

export interface Quiz {
  id: string;
  title: string;
  slug: string;
  description?: string;
  subject_id?: string;
  topic_id?: string;
  difficulty: DifficultyLevel;
  duration_minutes: number;
  pass_score: number;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_answer_after_submit: boolean;
  status: QuizStatus;
  created_by?: string;
  created_at: string;
  question_count?: number;
  total_points?: number;
  subject?: Subject;
  topic?: Topic;
  questions?: BaseQuestion[];
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';

export interface AttemptAnswer {
  id: string;
  question_id: string;
  answer: any;
  is_correct?: string;
  score: number;
  max_score: number;
  feedback?: string;
}

export interface AttemptStart {
  id: string;
  quiz_id: string;
  started_at: string;
  status: AttemptStatus;
  duration_minutes: number;
  questions: BaseQuestion[];
}

export interface QuestionReview {
  question: BaseQuestion;
  user_answer: any;
  is_correct: string;
  score: number;
  max_score: number;
}

export interface AttemptResult {
  id: string;
  quiz_id: string;
  quiz_title: string;
  started_at: string;
  submitted_at?: string;
  duration_seconds: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  questions_review?: QuestionReview[];
}

export interface LessonSimple {
  id: string;
  topic_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  order: number;
  video_url?: string;
  slide_url?: string;
  quiz_id?: string;
  is_completed?: boolean;
}

export interface LessonNavInfo {
  id: string;
  title: string;
  topic_name?: string;
}

export interface LessonDetail {
  id: string;
  topic_id: string;
  topic_name: string;
  subject_id: string;
  subject_name: string;
  title: string;
  description?: string;
  content: string;
  video_url?: string;
  slide_url?: string;
  duration_minutes: number;
  order: number;
  quiz_id?: string;
  quiz_info?: {
    id: string;
    title: string;
    duration_minutes: number;
    difficulty: DifficultyLevel;
    pass_score: number;
  };
  is_completed: boolean;
  prev_lesson?: LessonNavInfo;
  next_lesson?: LessonNavInfo;
}

export interface CourseTopic {
  id: string;
  subject_id: string;
  name: string;
  description?: string;
  slide_url?: string;
  order: number;
  lessons: LessonSimple[];
  quizzes: {
    id: string;
    title: string;
    difficulty: DifficultyLevel;
    duration_minutes: number;
    pass_score: number;
    topic_id: string;
  }[];
}

export interface CourseCurriculum {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_description?: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  total_quizzes: number;
  topics: CourseTopic[];
}
