import { AIPracticeQuestion, AIPracticeData } from '../../components/AIPracticeQuestion';
import { toast } from '../../stores/toastStore';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { apiClient } from '../../api/client';
import { AttemptResult } from '../../types';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  Award,
  RotateCcw,
  ArrowLeft,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Helper to render KaTeX formula safely
const renderKatexSafe = (formula: string, displayMode: boolean = false): string => {
  try {
    return katex.renderToString(formula.trim(), { displayMode, throwOnError: false });
  } catch (e) {
    return formula;
  }
};

// Replace math blocks, inline math, and bare LaTeX commands into encoded HTML tokens
const preprocessAllMath = (text: string): string => {
  // Normalize escaped backslashes from AI responses if any (e.g. \\rightarrow -> \rightarrow)
  let normalized = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Convert bare arrows and common math symbols to standard LaTeX inline math if outside
  normalized = normalized.replace(/\\rightarrow/g, '$ \\rightarrow $');
  normalized = normalized.replace(/\\leftarrow/g, '$ \\leftarrow $');
  normalized = normalized.replace(/\\leftrightarrow/g, '$ \\leftrightarrow $');

  // 1. Block math $$...$$
  let out = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const rendered = renderKatexSafe(math, true);
    return `###MATH_BLOCK###${encodeURIComponent(rendered)}###END###`;
  });

  // 2. Inline math $...$
  out = out.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    const rendered = renderKatexSafe(math, false);
    return `###MATH_INLINE###${encodeURIComponent(rendered)}###END###`;
  });

  // 3. Bare LaTeX commands without $...$, e.g. \forall, \exists, \mathbb{Z}, etc.
  out = out.replace(/(\\[a-zA-Z]+(?:\{[^{}]*\})?)/g, (match) => {
    try {
      const rendered = katex.renderToString(match, { throwOnError: true });
      return `###MATH_INLINE###${encodeURIComponent(rendered)}###END###`;
    } catch {
      return match;
    }
  });

  return out;
};

// Render string containing markdown bold and math tokens into ReactNode
const renderProcessedInline = (text: string): React.ReactNode => {
  // First, if there is encoded KaTeX accidentally placed inside backticks `...`, unwrap them
  const cleanedText = text.replace(/`([^`]*?###MATH_[A-Z]+###.*?###END###[^`]*?)`/g, '$1');

  const parts = cleanedText.split(/(###MATH_BLOCK###.*?###END###|###MATH_INLINE###.*?###END###|\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('###MATH_BLOCK###') && part.endsWith('###END###')) {
      const encodedHtml = part.replace('###MATH_BLOCK###', '').replace('###END###', '');
      const html = decodeURIComponent(encodedHtml);
      return (
        <div
          key={`mb-${index}`}
          className="my-2 p-2 rounded-lg bg-indigo-50/50 text-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    if (part.startsWith('###MATH_INLINE###') && part.endsWith('###END###')) {
      const encodedHtml = part.replace('###MATH_INLINE###', '').replace('###END###', '');
      const html = decodeURIComponent(encodedHtml);
      return (
        <span
          key={`mi-${index}`}
          className="inline-block px-0.5 mx-0.5 text-indigo-950 font-medium align-baseline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`b-${index}`} className="font-bold text-slate-900">
          {renderProcessedInline(part.slice(2, -2))}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      // In case inner has math token
      if (inner.includes('###MATH_INLINE###') || inner.includes('###MATH_BLOCK###')) {
        return <span key={`cd-${index}`}>{renderProcessedInline(inner)}</span>;
      }
      return (
        <code key={`cd-${index}`} className="font-mono text-xs bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200/60">
          {inner}
        </code>
      );
    }

    return part;
  });
};


function safeParseQuizJson(str: string): AIPracticeData | null {
  try {
    // Fix unescaped backslashes in math formulas before parsing
    const fixed = str.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
    return JSON.parse(fixed);
  } catch (e) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }
}

// Full AI Explanation Markdown Renderer
const renderFormattedAI = (content: string) => {
  // Check if there is a quiz block
  let textToRender = content;
  let quizData: AIPracticeData | null = null;

  const quizMatch = content.match(/```quiz\s*([\s\S]*?)\s*```/);
  if (quizMatch) {
    quizData = safeParseQuizJson(quizMatch[1]);
    textToRender = content.replace(quizMatch[0], '').trim();
  }

  // Preprocess all math
  const preprocessed = preprocessAllMath(textToRender);
  const lines = preprocessed.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      const currentList = [...listItems];
      listItems = [];
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2 pl-1">
          {currentList.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0"></span>
              <div className="flex-1">{renderProcessedInline(item)}</div>
            </li>
          ))}
        </ul>
      );
    }
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
          {renderProcessedInline(title)}
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
          {renderProcessedInline(trimmed.slice(2))}
        </div>
      );
      return;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      flushList();
      elements.push(
        <div key={`nl-${idx}`} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed my-1.5">
          <span className="font-bold text-indigo-600 mt-0.5">{numMatch[1]}.</span>
          <div className="flex-1">{renderProcessedInline(numMatch[2])}</div>
        </div>
      );
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs sm:text-sm text-slate-700 leading-relaxed my-1.5">
        {renderProcessedInline(trimmed)}
      </p>
    );
  });

  flushList();
  if (quizData && quizData.question && Array.isArray(quizData.options)) {
    elements.push(
      <AIPracticeQuestion key="ai-interactive-practice" data={quizData} />
    );
  }
  return elements;
};


interface AnswerReviewSummaryProps {
  rev: any;
  isCorrect: boolean;
}

const AnswerReviewSummary: React.FC<AnswerReviewSummaryProps> = ({ rev, isCorrect }) => {
  const qType = rev.question?.type;
  const config = rev.question?.config || {};

  // 1. Dạng câu hỏi GHÉP NỐI (matching / drag_drop hoặc có config.pairs)
  const isMatching =
    qType === 'matching' ||
    qType === 'drag_drop' ||
    (Array.isArray(config.pairs) && config.pairs.length > 0);

  if (isMatching && Array.isArray(config.pairs) && config.pairs.length > 0) {
    let userMap: Record<string, string> = {};
    if (rev.user_answer && typeof rev.user_answer === 'object' && !Array.isArray(rev.user_answer)) {
      userMap = rev.user_answer;
    } else if (typeof rev.user_answer === 'string') {
      try {
        const parsed = JSON.parse(rev.user_answer);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          userMap = parsed;
        }
      } catch {
        userMap = {};
      }
    }

    return (
      <div className="space-y-2.5 text-sm bg-slate-50/90 p-4 rounded-xl mb-4 border border-slate-200">
        <div className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
          Chi tiết kết quả ghép nối:
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
          {config.pairs.map((pair: any, pIdx: number) => {
            const userMatch = userMap[pair.left] || userMap[pair.left?.trim?.()];
            const isMatchCorrect = Boolean(
              userMatch && userMatch.trim().toLowerCase() === String(pair.right).trim().toLowerCase()
            );

            return (
              <div
                key={pIdx}
                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm ${
                  isMatchCorrect
                    ? 'bg-emerald-50/25'
                    : userMatch
                    ? 'bg-rose-50/25'
                    : 'bg-slate-50/40'
                }`}
              >
                {/* Vế trái (câu hỏi) */}
                <div className="flex items-center gap-2.5 min-w-0 sm:w-5/12">
                  <span className="w-5 h-5 rounded-none bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                    {pIdx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 break-words leading-relaxed">
                    {pair.left}
                  </span>
                </div>

                {/* Trạng thái Đúng / Sai */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isMatchCorrect ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Chính xác
                    </span>
                  ) : userMatch ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Chưa đúng
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Chưa nối
                    </span>
                  )}
                </div>

                {/* Kết quả ghép của bạn & Đáp án đúng */}
                <div className="flex-1 min-w-0 sm:text-right space-y-0.5">
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <span className="text-xs text-slate-500">Bạn ghép:</span>
                    <span
                      className={`font-semibold ${
                        isMatchCorrect
                          ? 'text-emerald-800'
                          : userMatch
                          ? 'text-rose-700 line-through'
                          : 'text-slate-400 italic'
                      }`}
                    >
                      {userMatch || '(Bỏ trống)'}
                    </span>
                  </div>
                  {!isMatchCorrect && (
                    <div className="flex items-center sm:justify-end gap-1.5 text-xs">
                      <span className="text-slate-500">Đáp án chuẩn:</span>
                      <span className="font-bold text-emerald-700">
                        {pair.right}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Dạng câu hỏi SẮP XẾP THỨ TỰ (ordering)
  const isOrdering =
    qType === 'ordering' ||
    (Array.isArray(config.correct_order) && config.correct_order.length > 0);

  if (isOrdering && Array.isArray(config.correct_order)) {
    let userOrderList: string[] = [];
    if (Array.isArray(rev.user_answer)) {
      userOrderList = rev.user_answer;
    } else if (typeof rev.user_answer === 'string') {
      try {
        const parsed = JSON.parse(rev.user_answer);
        if (Array.isArray(parsed)) userOrderList = parsed;
        else userOrderList = [rev.user_answer];
      } catch {
        userOrderList = [rev.user_answer];
      }
    }

    return (
      <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
        <div>
          <span className="font-semibold text-slate-700">Thứ tự bạn chọn: </span>
          <span className={`font-medium ${!isCorrect ? 'text-rose-700 font-bold' : 'text-slate-900'}`}>
            {userOrderList.length > 0
              ? userOrderList.map((item, idx) => `${idx + 1}. ${item}`).join(' ➔ ')
              : '(Bỏ trống)'}
          </span>
        </div>
        <div>
          <span className="font-semibold text-emerald-700">Thứ tự chuẩn: </span>
          <span className="text-emerald-900 font-bold">
            {config.correct_order.map((item: string, idx: number) => `${idx + 1}. ${item}`).join(' ➔ ')}
          </span>
        </div>
      </div>
    );
  }

  // 3. Dạng câu hỏi thông thường khác
  return (
    <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
      <div>
        <span className="font-semibold text-slate-700">Câu trả lời của bạn: </span>
        <span className={`font-mono ${!isCorrect ? 'text-rose-700 font-bold' : 'text-slate-900'}`}>
          {rev.user_answer === null || rev.user_answer === undefined || rev.user_answer === ''
            ? '(Bỏ trống)'
            : typeof rev.user_answer === 'object'
            ? Array.isArray(rev.user_answer)
              ? rev.user_answer.join(', ')
              : JSON.stringify(rev.user_answer)
            : String(rev.user_answer)}
        </span>
      </div>

      {(config.correct || config.accepted_answers) && (
        <div>
          <span className="font-semibold text-emerald-700">Đáp án chuẩn: </span>
          <span className="text-emerald-900 font-bold font-mono">
            {Array.isArray(config.correct)
              ? config.correct.join(', ')
              : Array.isArray(config.accepted_answers)
              ? config.accepted_answers.join(' / ')
              : String(config.correct || config.accepted_answers)}
          </span>
        </div>
      )}
    </div>
  );
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

  // Ref to trigger auto AI exactly once
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/attempts/${attemptId}/result`);
      const data: AttemptResult = res.data;
      setResult(data);

      // TỰ ĐỘNG GỌI GIA SƯ AI CHO TẤT CẢ CÁC CÂU LÀM SAI HOẶC BỎ TRỐNG NGAY KHI VÀO TRANG KẾT QUẢ
      if (!autoTriggeredRef.current && data.questions_review) {
        autoTriggeredRef.current = true;
        const wrongItems = data.questions_review.filter(
          (item) => item.is_correct !== 'true'
        );
        wrongItems.forEach((rev) => {
          triggerAiForQuestion(rev.question.id, rev);
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể tải kết quả bài làm');
      navigate('/practice');
    } finally {
      setLoading(false);
    }
  };

  const triggerAiForQuestion = async (questionId: string, rev: any) => {
    if (loadingAi[questionId] || aiExplanations[questionId]) return;

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
      console.warn(`Lỗi gọi AI cho câu hỏi ${questionId}:`, err);
    } finally {
      setLoadingAi((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleAskAI = (questionId: string, rev: any) => {
    triggerAiForQuestion(questionId, rev);
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
              <span>{formatSeconds(result.duration_seconds)}</span>
            </div>
            <span className="text-xs text-blue-800 font-medium">Thời gian thi</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            to={`/practice/${result.quiz_id}`}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
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
                Xem lại các câu trả lời và Gia sư AI tự động phân tích chi tiết các câu chưa làm đúng
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
                  <AnswerReviewSummary rev={rev} isCorrect={isCorrect} />

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
                            <span>Gia sư AI đang tự động phân tích lỗi sai & tạo ví dụ...</span>
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
                      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/90 to-white shadow-xs overflow-hidden">
                        <div
                          onClick={() => setExpandedAi((prev) => ({ ...prev, [qId]: !isAiExpanded }))}
                          className="px-5 py-3.5 bg-gradient-to-r from-indigo-100/80 via-blue-50 to-indigo-100/80 border-b border-indigo-200/60 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2 text-indigo-950 font-extrabold text-xs sm:text-sm">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>Gia sư AI Sư phạm (Phân tích lỗi sai & Ví dụ thực tế)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold">
                            <span>{isAiExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
                            {isAiExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {isAiExpanded && (
                          <div className="p-5 space-y-3 animate-in fade-in duration-200">
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
