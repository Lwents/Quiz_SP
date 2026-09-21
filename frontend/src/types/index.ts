export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

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
