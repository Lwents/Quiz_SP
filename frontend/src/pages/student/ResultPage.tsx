import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { AttemptResult } from '../../types';
import { CheckCircle2, XCircle, Clock, Award, RotateCcw, ArrowLeft, Check, HelpCircle } from 'lucide-react';

export const ResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'correct'>('all');

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/attempts/${attemptId}/result`);
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail?.error?.message || 'Không thể tải kết quả bài làm');
      navigate('/practice');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-600">Đang chấm điểm và tổng hợp kết quả...</p>
        </div>
      </div>
    );
  }

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} phút ${s} giây`;
  };

  const reviews = result.questions_review || [];
  const filteredReviews = reviews.filter((item) => {
    if (filterMode === 'correct') return item.is_correct === 'true';
    if (filterMode === 'wrong') return item.is_correct !== 'true';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/practice')}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách bài tập
      </button>

      {/* Summary Score Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs mb-8 text-center relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 right-0 h-3 ${
            result.passed ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        ></div>

        <div className="inline-flex p-4 rounded-full bg-slate-50 border border-slate-100 mb-4">
          <Award className={`w-10 h-10 ${result.passed ? 'text-emerald-600' : 'text-rose-600'}`} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{result.quiz_title}</h1>
        <p className="text-slate-500 text-sm mb-6">Kết quả làm bài kiểm tra trực tuyến</p>

        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
            {result.score}
          </span>
          <span className="text-2xl font-bold text-slate-400">/ {result.max_score}</span>
        </div>

        <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold bg-blue-50 text-blue-700 mb-8">
          Đạt {result.percentage}% • {result.passed ? 'ĐẠT (PASS)' : 'CHƯA ĐẠT'}
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-6 border-t border-slate-100">
          <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold text-lg">
              <CheckCircle2 className="w-5 h-5" />
              <span>{result.correct_count}</span>
            </div>
            <span className="text-xs text-emerald-800 font-medium">Số câu đúng</span>
          </div>

          <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-100">
            <div className="flex items-center justify-center gap-1 text-rose-700 font-bold text-lg">
              <XCircle className="w-5 h-5" />
              <span>{result.incorrect_count}</span>
            </div>
            <span className="text-xs text-rose-800 font-medium">Số câu sai</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <div className="flex items-center justify-center gap-1 text-slate-700 font-bold text-lg">
              <HelpCircle className="w-5 h-5" />
              <span>{result.unanswered_count}</span>
            </div>
            <span className="text-xs text-slate-600 font-medium">Chưa trả lời</span>
          </div>

          <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-center gap-1 text-blue-700 font-bold text-lg">
              <Clock className="w-5 h-5" />
              <span className="text-sm">{Math.round(result.duration_seconds / 60)}m</span>
            </div>
            <span className="text-xs text-blue-800 font-medium">{formatSeconds(result.duration_seconds)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            to={`/practice/${result.quiz_id}`}
            className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Làm lại bài này
          </Link>
        </div>
      </div>

      {/* Detailed Review Section */}
      {reviews.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold text-slate-900">Chi tiết đáp án & lời giải</h2>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tất cả ({reviews.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('wrong')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterMode === 'wrong' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Câu sai ({result.incorrect_count + result.unanswered_count})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('correct')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filterMode === 'correct' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Câu đúng ({result.correct_count})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredReviews.map((rev, idx) => {
              const isCorrect = rev.is_correct === 'true';
              const isPartial = rev.is_correct === 'partial';

              return (
                <div
                  key={rev.question.id}
                  className={`bg-white rounded-2xl border p-6 transition-all shadow-xs ${
                    isCorrect
                      ? 'border-emerald-200/80 bg-emerald-50/20'
                      : isPartial
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-rose-200/80 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <span className="font-bold text-sm text-slate-800">Câu {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isCorrect ? 'Chính xác' : isPartial ? 'Đúng một phần' : 'Chưa chính xác'} ({rev.score} / {rev.max_score} điểm)
                      </span>
                    </div>
                  </div>

                  <div className="text-base font-medium text-slate-900 mb-4">{rev.question.content}</div>

                  {/* User Answer vs Correct Answer Summary */}
                  <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-xl mb-4">
                    <div>
                      <span className="font-semibold text-slate-700">Câu trả lời của bạn: </span>
                      <span className="text-slate-900 font-mono">
                        {rev.user_answer === null || rev.user_answer === undefined || rev.user_answer === ''
                          ? '(Bỏ trống)'
                          : typeof rev.user_answer === 'object'
                          ? JSON.stringify(rev.user_answer)
                          : String(rev.user_answer)}
                      </span>
                    </div>

                    {rev.question.config?.correct && (
                      <div>
                        <span className="font-semibold text-emerald-700">Đáp án chuẩn: </span>
                        <span className="text-emerald-900 font-semibold font-mono">
                          {Array.isArray(rev.question.config.correct)
                            ? rev.question.config.correct.join(', ')
                            : String(rev.question.config.correct)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  {rev.question.explanation && (
                    <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-900">
                      <strong className="block mb-1 text-blue-700 font-bold">Giải thích chi tiết:</strong>
                      {rev.question.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
