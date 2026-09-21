import { toast } from '../../stores/toastStore';
﻿import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { AttemptStart, AttemptStatus, BaseQuestion } from '../../types';
import { getQuestionRenderer } from '../../features/question/question-registry';
import {
  Clock,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  Menu,
  X,
  AlertTriangle,
  Send,
  BookOpen,
} from 'lucide-react';

export const QuizPlayerPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<AttemptStart | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [markedReview, setMarkedReview] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const debounceTimers = useRef<Record<string, any>>({});
  const pendingSaves = useRef<Record<string, any>>({});
  const activeSecondsRef = useRef<number>(0);

  // 1. Khởi tạo / khôi phục attempt
  useEffect(() => {
    startOrResumeAttempt();
  }, [quizId]);

  const startOrResumeAttempt = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post(`/attempts/quiz/${quizId}`);
      const data: AttemptStart = res.data;
      setAttempt(data);

      // Load existing answers if resuming
      const statusRes = await apiClient.get(`/attempts/${data.id}`);
      const existingAnswersMap: Record<string, any> = {};
      statusRes.data.answers?.forEach((a: any) => {
        if (a.answer !== null && a.answer !== undefined) {
          existingAnswersMap[a.question_id] = a.answer;
        }
      });
      setAnswers(existingAnswersMap);

      // Restore saved local state (currentIndex and markedReview)
      try {
        const savedMeta = localStorage.getItem(`quiz_meta_${data.id}`);
        if (savedMeta) {
          const parsed = JSON.parse(savedMeta);
          if (typeof parsed.currentIndex === 'number' && parsed.currentIndex < data.questions.length) {
            setCurrentIndex(parsed.currentIndex);
          }
          if (parsed.markedReview) {
            setMarkedReview(parsed.markedReview);
          }
        }
      } catch (e) {
        console.warn('Could not restore local quiz meta', e);
      }

      // Setup active duration and timer
      const elapsed = statusRes.data.duration_seconds || 0;
      activeSecondsRef.current = elapsed;

      if (data.duration_minutes > 0) {
        const totalSec = data.duration_minutes * 60;
        setTimeLeft(Math.max(0, totalSec - elapsed));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể bắt đầu bài làm');
      navigate('/practice');
    } finally {
      setLoading(false);
    }
  };

  // 2. Persist local state whenever currentIndex or markedReview changes
  useEffect(() => {
    if (attempt) {
      localStorage.setItem(
        `quiz_meta_${attempt.id}`,
        JSON.stringify({ currentIndex, markedReview })
      );
    }
  }, [currentIndex, markedReview, attempt]);

  // 3. Track active seconds and auto-save duration periodically
  useEffect(() => {
    if (!attempt) return;
    const interval = setInterval(() => {
      activeSecondsRef.current += 1;
      // Sync progress to server every 20 seconds
      if (activeSecondsRef.current % 20 === 0) {
        apiClient.patch(`/attempts/${attempt.id}/progress`, {
          duration_seconds: activeSecondsRef.current,
        }).catch(() => {});
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  // 4. Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(); // Auto-submit when time up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // 5. Intercept browser back button & page unload
  useEffect(() => {
    window.history.pushState({ inQuiz: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState({ inQuiz: true }, '');
      setShowExitModal(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 6. Answer change with debounce autosave
  const handleAnswerChange = (questionId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
    pendingSaves.current[questionId] = val;

    if (debounceTimers.current[questionId]) {
      clearTimeout(debounceTimers.current[questionId]);
    }

    if (!attempt) return;
    debounceTimers.current[questionId] = setTimeout(async () => {
      try {
        await apiClient.patch(`/attempts/${attempt.id}/answers/${questionId}`, {
          answer: val,
        });
        delete pendingSaves.current[questionId];
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    }, 400);
  };

  const toggleReview = (qId: string) => {
    setMarkedReview((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // 7. Flush pending saves and exit cleanly
  const handleConfirmExit = async () => {
    if (attempt) {
      // Flush any pending unsaved answers
      const saves: Promise<any>[] = Object.entries(pendingSaves.current).map(([qId, val]) =>
        apiClient.patch(`/attempts/${attempt.id}/answers/${qId}`, { answer: val }).catch(() => {})
      );
      saves.push(
        apiClient.patch(`/attempts/${attempt.id}/progress`, {
          duration_seconds: activeSecondsRef.current,
        }).catch(() => {})
      );
      await Promise.all(saves);
    }
    setShowExitModal(false);
    navigate('/practice');
  };

  // 8. Submit
  const handleSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      // Flush any pending saves
      const saves: Promise<any>[] = Object.entries(pendingSaves.current).map(([qId, val]) =>
        apiClient.patch(`/attempts/${attempt.id}/answers/${qId}`, { answer: val }).catch(() => {})
      );
      await Promise.all(saves);

      await apiClient.post(`/attempts/${attempt.id}/submit`);
      navigate(`/results/${attempt.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Có lỗi khi nộp bài');
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-600">Đang tải đề thi và tiến độ làm bài...</p>
        </div>
      </div>
    );
  }

  const questions = attempt.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== null && answers[k] !== '' && answers[k]?.length !== 0
  ).length;
  const unansweredCount = totalQuestions - answeredCount;

  const Renderer = currentQuestion ? getQuestionRenderer(currentQuestion.type) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Bar for Quiz Player (Sticky below Navbar at top-16) */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Quay lại danh sách bài thi"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Rời bài thi</span>
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight line-clamp-1">Bài làm trắc nghiệm</h1>
              <span className="text-xs text-slate-500">Đã trả lời {answeredCount} / {totalQuestions} câu</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {attempt.duration_minutes > 0 && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm font-bold border ${
                  timeLeft < 300
                    ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Nộp bài</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Question Area */}
        <div className="md:col-span-8 flex flex-col">
          {currentQuestion && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex-1 flex flex-col">
              {/* Question Meta Bar */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm">
                    Câu {currentIndex + 1} / {totalQuestions}
                  </span>
                  <span className="text-xs text-slate-500 font-medium capitalize">
                    {currentQuestion.points} điểm
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleReview(currentQuestion.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    markedReview[currentQuestion.id]
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${markedReview[currentQuestion.id] ? 'fill-amber-600' : ''}`} />
                  {markedReview[currentQuestion.id] ? 'Đã ghim xem lại' : 'Ghim xem lại'}
                </button>
              </div>

              {/* Question Content */}
              <div className="text-slate-900 text-lg font-medium leading-relaxed mb-8">
                {currentQuestion.content}
              </div>

              {/* Question Interactive Component */}
              <div className="flex-1 mb-8">
                {Renderer && (
                  <Renderer
                    question={currentQuestion}
                    value={answers[currentQuestion.id]}
                    onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                  />
                )}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition flex items-center gap-2 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Câu trước
                </button>

                <button
                  type="button"
                  disabled={currentIndex === totalQuestions - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-2 disabled:opacity-30 cursor-pointer"
                >
                  Câu tiếp theo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Question Navigator Palette (Desktop) */}
        <div className="hidden md:block md:col-span-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs sticky top-36">
            <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center justify-between">
              <span>Bảng danh sách câu hỏi</span>
              <span className="text-xs font-normal text-slate-500">{totalQuestions} câu</span>
            </h3>

            {/* Grid of numbers */}
            <div className="grid grid-cols-5 gap-2 mb-6 max-h-[360px] overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isAnswered =
                  answers[q.id] !== undefined &&
                  answers[q.id] !== null &&
                  answers[q.id] !== '' &&
                  answers[q.id]?.length !== 0;
                const isCurrent = idx === currentIndex;
                const isMarked = markedReview[q.id];

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-blue-600 ring-offset-2 bg-blue-600 text-white shadow-xs'
                        : isAnswered
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                    {isMarked && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t border-slate-100 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-blue-600"></span>
                <span>Đang làm hiện tại</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-blue-50 border border-blue-200"></span>
                <span>Đã trả lời ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-50 border border-slate-200"></span>
                <span>Chưa làm ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500"></span>
                <span>Đánh dấu xem lại</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Nộp bài thi
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)}></div>
          <div className="relative ml-auto w-80 max-w-full bg-white h-full p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900">Danh sách câu hỏi</h3>
              <button type="button" onClick={() => setMobileDrawerOpen(false)} className="p-1.5 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 overflow-y-auto flex-1 p-1">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '';
                const isCurrent = idx === currentIndex;
                const isMarked = markedReview[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setMobileDrawerOpen(false);
                    }}
                    className={`relative py-3 rounded-xl text-xs font-bold ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isAnswered
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {idx + 1}
                    {isMarked && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileDrawerOpen(false);
                setShowConfirmModal(true);
              }}
              className="w-full mt-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl"
            >
              Nộp bài thi
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Tạm dừng làm bài thi?</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Hệ thống đã tự động lưu lại toàn bộ tiến trình làm bài của bạn (
                <strong className="text-blue-600 font-semibold">{answeredCount} / {totalQuestions} câu</strong>).
                Bạn có thể quay lại danh sách và tiếp tục làm bài bất kỳ lúc nào mà không bị mất kết quả.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Ở lại làm tiếp
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-xs cursor-pointer"
              >
                Tạm dừng & Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài?</h3>
              {unansweredCount > 0 ? (
                <p className="text-sm text-slate-600 mt-2">
                  Bạn còn <strong className="text-amber-600">{unansweredCount} câu hỏi</strong> chưa hoàn thành câu trả lời. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
                </p>
              ) : (
                <p className="text-sm text-slate-600 mt-2">
                  Bạn đã trả lời đầy đủ <strong className="text-emerald-600">{totalQuestions} câu hỏi</strong>. Bạn có chắc chắn muốn nộp bài?
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
