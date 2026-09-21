import { toast } from '../../stores/toastStore';
﻿import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { AttemptResult } from '../../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  RotateCcw,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Lightweight parser to render AI markdown with rich visual sections
const renderFormattedAI = (content: string) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      const currentList = [...listItems];
      listItems = [];
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2 pl-1">
          {currentList.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
              <div>{renderInlineMarkdown(item)}</div>
            </li>
          ))}
        </ul>
      );
    }
  };

  const renderInlineMarkdown = (text: string) => {
    // Replace inline code or math $...$ with highlighted span
    const parts = text.split(/(\*\*.*?\*\*|\$.*?\$|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('`') && part.endsWith('`'))) {
        return (
          <span key={index} className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded text-[12px]">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      const title = trimmed.replace('### ', '');
      let headerTheme = 'text-indigo-900 border-indigo-200 bg-indigo-100/50';
      if (title.includes('💡')) headerTheme = 'text-amber-900 border-amber-200 bg-amber-100/50';
      if (title.includes('🎯')) headerTheme = 'text-blue-900 border-blue-200 bg-blue-100/50';
      if (title.includes('🌟')) headerTheme = 'text-purple-900 border-purple-200 bg-purple-100/50';
      if (title.includes('✅')) headerTheme = 'text-emerald-900 border-emerald-200 bg-emerald-100/50';

      elements.push(
        <div
          key={`h-${idx}`}
          className={`font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg border my-2.5 ${headerTheme}`}
        >
          {renderInlineMarkdown(title)}
        </div>
      );
      return;
    }

    if (trimmed.startsWith('---')) {
      flushList();
      elements.push(<hr key={`hr-${idx}`} className="my-3 border-indigo-100/80" />);
      return;
    }

    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <div key={`q-${idx}`} className="p-3 bg-white/90 rounded-xl border border-indigo-100 text-xs sm:text-sm text-indigo-950 font-medium italic my-2 shadow-2xs">
          {renderInlineMarkdown(trimmed.slice(2))}
        </div>
      );
      return;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs sm:text-sm text-slate-700 leading-relaxed my-1.5">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
};

export const ResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'wrong' | 'correct'>('all');

  // AI Tutor states
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
  const [expandedAi, setExpandedAi] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/attempts/${attemptId}/result`);
      setResult(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể tải kết quả bài làm');
      navigate('/practice');
    } finally {
      setLoading(false);
    }
  };

  const handleAskAI = async (questionId: string, rev: any) => {
    if (loadingAi[questionId]) return;

    setLoadingAi((prev) => ({ ...prev, [questionId]: true }));
    setExpandedAi((prev) => ({ ...prev, [questionId]: true }));

    try {
      const payload = {
        question_id: questionId,
        question_content: rev.question.content,
        question_type: rev.question.type,
        options: rev.question.config?.options || [],
        user_answer: rev.user_answer,
        correct_answer: rev.question.config?.correct,
        raw_explanation: rev.question.explanation || '',
      };

      const res = await apiClient.post('/ai/explain', payload);
      setAiExplanations((prev) => ({ ...prev, [questionId]: res.data.explanation }));
    } catch (err: any) {
      toast.error('Không thể kết nối với Gia sư AI. Vui lòng thử lại sau giây lát.', 'Lỗi dịch vụ AI');
    } finally {
      setLoadingAi((prev) => ({ ...prev, [questionId]: false }));
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
            <div>
              <h2 className="text-xl font-bold text-slate-900">Chi tiết đáp án & lời giải</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem lại các câu trả lời và sử dụng Gia sư AI để hiểu thấu đáo các câu chưa làm đúng
              </p>
            </div>

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

          <div className="space-y-5">
            {filteredReviews.map((rev, idx) => {
              const isCorrect = rev.is_correct === 'true';
              const isPartial = rev.is_correct === 'partial';
              const qId = rev.question.id;
              const hasAiResult = Boolean(aiExplanations[qId]);
              const isAiLoading = Boolean(loadingAi[qId]);
              const isAiExpanded = expandedAi[qId] !== false;

              return (
                <div
                  key={qId}
                  className={`bg-white rounded-2xl border p-6 transition-all shadow-xs ${
                    isCorrect
                      ? 'border-emerald-200/80 bg-emerald-50/15'
                      : isPartial
                      ? 'border-amber-200 bg-amber-50/20'
                      : 'border-rose-200/80 bg-rose-50/15'
                  }`}
                >
                  {/* Question Header Status */}
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

                  {/* Question Content */}
                  <div className="text-base font-medium text-slate-900 mb-4">{rev.question.content}</div>

                  {/* User Answer vs Correct Answer Summary */}
                  <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-700">Câu trả lời của bạn: </span>
                      <span className={`font-mono ${!isCorrect ? 'text-rose-700 font-bold' : 'text-slate-900'}`}>
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
                        <span className="text-emerald-900 font-bold font-mono">
                          {Array.isArray(rev.question.config.correct)
                            ? rev.question.config.correct.join(', ')
                            : String(rev.question.config.correct)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Original Static Explanation */}
                  {rev.question.explanation && (
                    <div className="p-3.5 bg-blue-50/70 border border-blue-100/90 rounded-xl text-xs text-blue-900 mb-4">
                      <strong className="block mb-1 text-blue-700 font-bold">Giải thích chi tiết:</strong>
                      {rev.question.explanation}
                    </div>
                  )}

                  {/* AI TUTOR SECTION RIGHT AT THE QUESTION */}
                  <div className="pt-2">
                    {!hasAiResult ? (
                      <button
                        type="button"
                        disabled={isAiLoading}
                        onClick={() => handleAskAI(qId, rev)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                          !isCorrect
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-md active:scale-[0.99]'
                            : 'bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200'
                        } disabled:opacity-60`}
                      >
                        {isAiLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Gia sư AI đang phân tích lỗi sai và tạo ví dụ...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>
                              {!isCorrect
                                ? '✨ Nhờ Gia sư AI giải thích dễ hiểu & cho 1 ví dụ tương tự'
                                : '✨ Xem phân tích mở rộng từ Gia sư AI'}
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      /* AI Explanation Card */
                      <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-blue-50/70 border border-indigo-200 rounded-2xl p-5 shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-indigo-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                              <Sparkles className="w-4 h-4 text-amber-300" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                                  Gia sư AI HNUE PRO
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-700">
                                  Gemini 3.8 Flash
                                </span>
                              </div>
                              <p className="text-[11px] text-indigo-600/90 font-medium">
                                Phân tích lỗi sai • Giải thích trực quan • Ví dụ minh họa chọn đáp án
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAskAI(qId, rev)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-100/50 cursor-pointer"
                              title="Tạo lại lời giải thích"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAi((prev) => ({
                                  ...prev,
                                  [qId]: !isAiExpanded,
                                }))
                              }
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition cursor-pointer"
                            >
                              {isAiExpanded ? (
                                <>
                                  Thu gọn <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  Mở rộng <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {isAiExpanded && (
                          <div className="pt-1">
                            {renderFormattedAI(aiExplanations[qId])}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
