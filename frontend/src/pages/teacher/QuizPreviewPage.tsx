import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { BaseQuestion } from '../../types';
import { getQuestionRenderer } from '../../features/question/question-registry';
import { useAuthStore } from '../../stores/authStore';
import {
  ArrowLeft,
  ArrowRight,
  Menu,
  X,
  BookOpen,
  Eye,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  CheckCircle
} from 'lucide-react';

interface QuizPreviewData {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  duration_minutes: number;
  pass_score: number;
  status: string;
  question_count: number;
  total_points: number;
  questions: BaseQuestion[];
}

export const QuizPreviewPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [quiz, setQuiz] = useState<QuizPreviewData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    fetchQuizPreview();
  }, [quizId]);

  const fetchQuizPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/quizzes/${quizId}`);
      setQuiz(res.data);
    } catch (err: any) {
      console.error('Error fetching quiz preview:', err);
      setError(
        err.response?.data?.detail?.error?.message ||
        'Không thể tải nội dung đề thi xem trước.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (qId: string, val: any) => {
    setPreviewAnswers((prev) => ({
      ...prev,
      [qId]: val
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-700">Đang tải chế độ xem trước đề thi...</p>
          <p className="text-xs text-slate-400">Không tạo lượt thi • Không tính giờ • Không lưu kết quả</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Không thể xem trước đề thi</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{error || 'Đề thi không tồn tại.'}</p>
        <div className="pt-2">
          <Link
            to="/teacher"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            Quay lại quản lý đề thi
          </Link>
        </div>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const currentQ = questions[currentIndex];
  const Renderer = currentQ ? getQuestionRenderer(currentQ.type) : null;
  const currentVal = currentQ ? previewAnswers[currentQ.id] : undefined;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col">
      {/* Top Staff Preview Banner */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2.5 border-b border-amber-600/30 text-xs font-semibold shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Eye className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              <strong>CHẾ ĐỘ XEM TRƯỚC (PREVIEW):</strong> Bạn đang xem đề với quyền{' '}
              {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Giáo viên'}. Không tạo Attempt, không đếm giờ, không tính vào thống kê.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-600/30 text-slate-950 font-bold uppercase tracking-wider text-[10px]">
              Trạng thái: {quiz.status}
            </span>
            <Link
              to={`/teacher/quizzes/${quiz.id}/edit`}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg transition text-[11px] shadow-2xs"
            >
              Chỉnh sửa đề
            </Link>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/teacher')}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Thoát chế độ xem trước"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {quiz.title}
              </h1>
              <span className="text-xs text-slate-400">
                {questions.length} câu hỏi • Thời lượng: {quiz.duration_minutes} phút
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAnswer(!showAnswer)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                showAnswer
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{showAnswer ? 'Ẩn đáp án chuẩn' : 'Hiện đáp án chuẩn'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              title="Danh sách câu hỏi"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Question Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Question Area (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {currentQ ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                    Câu {currentIndex + 1} / {questions.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    ({currentQ.points ?? 1} điểm)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-100">
                    {currentQ.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Question Content */}
              <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                {currentQ.content}
              </div>

              {/* Interactive Renderer (Test interaction in sandbox) */}
              <div className="pt-2">
                {Renderer ? (
                  <Renderer
                    question={currentQ}
                    value={currentVal}
                    onChange={(val) => handleAnswerChange(currentQ.id, val)}
                    disabled={false}
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-slate-100 text-slate-500 text-sm">
                    Không tìm thấy trình hiển thị cho loại câu hỏi: {currentQ.type}
                  </div>
                )}
              </div>

              {/* Teacher Answer Inspector */}
              {showAnswer && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-950 space-y-2 animate-in fade-in duration-150">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800 uppercase tracking-wide text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Đáp án chuẩn & Lời giải (Chỉ Admin/Teacher thấy):
                  </div>
                  <div className="font-mono bg-white p-2.5 rounded-lg border border-emerald-200 text-slate-800 break-words">
                    {currentQ.config?.correct !== undefined && (
                      <div><strong>Đáp án (correct):</strong> {JSON.stringify(currentQ.config.correct)}</div>
                    )}
                    {currentQ.config?.accepted_answers && (
                      <div><strong>Đáp án chấp nhận:</strong> {JSON.stringify(currentQ.config.accepted_answers)}</div>
                    )}
                    {currentQ.config?.correct_order && (
                      <div><strong>Thứ tự chuẩn:</strong> {JSON.stringify(currentQ.config.correct_order)}</div>
                    )}
                    {currentQ.config?.pairs && (
                      <div><strong>Cặp ghép:</strong> {JSON.stringify(currentQ.config.pairs)}</div>
                    )}
                  </div>
                  {currentQ.explanation && (
                    <p className="text-slate-600 italic pt-1">
                      <strong>Giải thích:</strong> {currentQ.explanation}
                    </p>
                  )}
                </div>
              )}

              {/* Bottom Nav Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Câu trước
                </button>
                <button
                  type="button"
                  disabled={currentIndex >= questions.length - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
                >
                  Câu tiếp theo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
              Đề thi chưa có câu hỏi nào.
            </div>
          )}
        </div>

        {/* Sidebar Question Navigator (4 cols) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Danh sách câu hỏi
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                {questions.length} câu
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const hasPreviewAnswer = previewAnswers[q.id] !== undefined && previewAnswers[q.id] !== '';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-amber-500 bg-amber-500 text-slate-950 font-black'
                        : hasPreviewAnswer
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500 shrink-0"></span>
                <span>Câu đang xem</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 shrink-0"></span>
                <span>Đã tương tác thử</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex bg-slate-900/50 backdrop-blur-xs lg:hidden">
          <div className="bg-white w-72 max-w-[80vw] h-full p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Danh sách câu hỏi</h3>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 overflow-y-auto flex-1 p-1 py-4">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setMobileDrawerOpen(false);
                  }}
                  className={`py-3 rounded-xl text-xs font-bold ${
                    idx === currentIndex
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
