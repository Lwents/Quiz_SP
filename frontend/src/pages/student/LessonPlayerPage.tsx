import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { apiClient } from '../../api/client';
import { LessonDetail, CourseCurriculum, CourseTopic } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Settings,
  Sparkles,
  Layers,
  FileCheck2,
  PlayCircle,
  Video,
  ChevronDown,
  ChevronUp,
  Award,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

// Helper to render KaTeX formula safely
const renderKatexSafe = (formula: string, displayMode: boolean = false): string => {
  let cleaned = formula.trim();
  // Auto-heal any broken eg( or eg p
  if (cleaned.includes('eg(') || cleaned.includes('eg p') || cleaned.includes('eg q')) {
    cleaned = cleaned
      .replace(/eg\(/g, '\\neg(')
      .replace(/eg p/g, '\\neg p')
      .replace(/eg q/g, '\\neg q');
  }
  try {
    return katex.renderToString(cleaned, { displayMode, throwOnError: false });
  } catch (e) {
    return cleaned;
  }
};

// Clean up topic title so it doesn't repeat "Chương"
const getDisplayTopicName = (name: string, index: number): string => {
  const trimmed = name.trim();
  if (/^chương\s+\d+/i.test(trimmed)) {
    return trimmed;
  }
  return `Chương ${index + 1}: ${trimmed}`;
};

export const LessonPlayerPage: React.FC = () => {
  const { subjectId, lessonId } = useParams<{ subjectId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [curriculum, setCurriculum] = useState<CourseCurriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (lessonId) {
      fetchLessonAndCurriculum(lessonId);
    }
  }, [lessonId]);

  const fetchLessonAndCurriculum = async (lid: string) => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([
        apiClient.get(`/lessons/${lid}`),
        apiClient.get(`/lessons/subject/${subjectId}`),
      ]);
      setLesson(lRes.data);
      setCurriculum(cRes.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error fetching lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!lesson) return;
    if (!user) {
      toast.warning('Vui lòng đăng nhập để lưu tiến độ học tập của bạn!', 'Yêu cầu đăng nhập');
      return;
    }

    setCompleting(true);
    try {
      const res = await apiClient.post(`/lessons/${lesson.id}/toggle-complete`);
      setLesson((prev) => (prev ? { ...prev, is_completed: res.data.completed } : null));

      // Refresh curriculum to update overall progress
      if (subjectId) {
        const cRes = await apiClient.get(`/lessons/subject/${subjectId}`);
        setCurriculum(cRes.data);
      }
    } catch (err) {
      toast.error('Không thể cập nhật tiến độ học tập', 'Lỗi lưu tiến độ');
    } finally {
      setCompleting(false);
    }
  };

  // Convert YouTube watch URL to embed URL
  const getEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const vidId = url.split('v=')[1]?.split('&')[0];
      return vidId ? `https://www.youtube.com/embed/${vidId}` : null;
    }
    if (url.includes('youtu.be/')) {
      const vidId = url.split('youtu.be/')[1]?.split('?')[0];
      return vidId ? `https://www.youtube.com/embed/${vidId}` : null;
    }
    return url;
  };

  // Professional Markdown Parser with KaTeX math, tables, alerts & lists
  const renderLessonMarkdown = (content: string) => {
    // 1. Extract block math $$...$$ first so multiline math is preserved
    const blockMathList: string[] = [];
    const processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const idx = blockMathList.length;
      blockMathList.push(math.trim());
      return `__BLOCK_MATH_${idx}__`;
    });

    const lines = processed.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: { text: string; num?: string }[] = [];
    let tableRows: string[][] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        const currentList = [...listItems];
        listItems = [];
        const isOrdered = Boolean(currentList[0].num);
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-2 my-3 pl-1">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 leading-relaxed">
                {item.num ? (
                  <span className="font-bold text-blue-600 shrink-0 text-sm mt-0.5">{item.num}.</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0"></span>
                )}
                <div className="flex-1">{renderInline(item.text)}</div>
              </li>
            ))}
          </ul>
        );
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const rows = [...tableRows];
        tableRows = [];
        const headers = rows[0];
        const body = rows.slice(1);
        elements.push(
          <div key={`tbl-${elements.length}`} className="overflow-x-auto my-4 border border-slate-200 rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-4 font-bold text-slate-700 text-xs sm:text-sm">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {body.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 transition">
                    {r.map((c, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-4 text-slate-800">
                        {renderInline(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    };

    const renderInline = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*|\$.*?\$|`.*?`)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const rawMath = part.slice(1, -1);
          const html = renderKatexSafe(rawMath, false);
          return (
            <span
              key={index}
              className="inline-block px-1 mx-0.5 text-slate-900 font-medium align-baseline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={index} className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check for markdown table row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        // check if separator row | :-: | :-: |
        if (/^\|([\s\-:]+\|)+$/.test(trimmed)) {
          return;
        }
        const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
        tableRows.push(cells);
        return;
      }
      flushTable();

      // Check for numbered list e.g. "1. Item" or bullet "- Item"
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        listItems.push({ num: numMatch[1], text: numMatch[2] });
        return;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        listItems.push({ text: trimmed.slice(2) });
        return;
      }

      flushList();

      if (!trimmed) {
        elements.push(<div key={`sp-${idx}`} className="h-2" />);
        return;
      }

      // Check for block math token
      const matchBlock = trimmed.match(/^__BLOCK_MATH_(\d+)__$/);
      if (matchBlock) {
        const blockIdx = parseInt(matchBlock[1], 10);
        const math = blockMathList[blockIdx] || '';
        const html = renderKatexSafe(math, true);
        elements.push(
          <div
            key={`bm-${idx}`}
            className="my-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center overflow-x-auto shadow-2xs"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        return;
      }

      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${idx}`} className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-6 mb-3 tracking-tight border-b border-slate-100 pb-2">
            {trimmed.slice(2)}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${idx}`} className="text-lg sm:text-xl font-bold text-slate-900 mt-5 mb-2.5 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
            {trimmed.slice(3)}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${idx}`} className="text-sm sm:text-base font-bold text-slate-800 mt-4 mb-2">
            {trimmed.slice(4)}
          </h3>
        );
      } else if (trimmed.startsWith('> [!NOTE]') || trimmed.startsWith('> [!IMPORTANT]')) {
        const isNote = trimmed.startsWith('> [!NOTE]');
        elements.push(
          <div key={`alert-${idx}`} className={`p-4 rounded-xl my-3 border ${isNote ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'}`}>
            <span className="text-xs font-bold uppercase tracking-wider block mb-1">
              {isNote ? '💡 Ghi chú cốt lõi' : '⚠️ Chú ý quan trọng'}
            </span>
          </div>
        );
      } else if (trimmed.startsWith('> ')) {
        elements.push(
          <div key={`quote-${idx}`} className="p-3.5 my-2.5 rounded-xl bg-slate-50 border-l-4 border-blue-500 text-slate-700 text-sm italic">
            {renderInline(trimmed.slice(2))}
          </div>
        );
      } else if (trimmed === '---') {
        elements.push(<hr key={`hr-${idx}`} className="my-5 border-slate-200" />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="text-sm sm:text-base text-slate-700 leading-relaxed my-1.5">
            {renderInline(trimmed)}
          </p>
        );
      }
    });

    flushList();
    flushTable();
    return elements;
  };

  if (loading || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-600">Đang tải nội dung bài giảng...</p>
        </div>
      </div>
    );
  }

  const embedVideoUrl = getEmbedUrl(lesson.video_url);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ADMIN CONTROL BAR */}
      {isAdmin && (
        <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-indigo-500/30 sticky top-16 z-35 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-semibold text-indigo-200">Chế độ xem trước của Quản trị viên:</span>
              <span className="text-slate-300 hidden sm:inline">Bạn đang xem bài học này dưới góc nhìn học viên.</span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/teacher/subjects`}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-bold transition flex items-center gap-1.5"
              >
                <Settings className="w-3 h-3" />
                Quản trị môn học & Sửa bài
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TOP LESSON BAR (STICKY Z-30, CANNOT BE OVERLAPPED) */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-16 sm:top-[65px] z-30 flex items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden cursor-pointer"
            title="Mở danh sách bài học"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            to={`/courses/${subjectId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Lộ trình khóa học</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0"></div>

          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide truncate block">
              {lesson.topic_name}
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {lesson.title}
            </h1>
          </div>
        </div>

        {/* Complete Toggle Button */}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={completing}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-2xs cursor-pointer ${
            lesson.is_completed
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {lesson.is_completed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Đã hoàn thành</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Đánh dấu hoàn thành</span>
            </>
          )}
        </button>
      </div>

      {/* MAIN LEARNING CONTAINER */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full relative">
        {/* DESKTOP SIDEBAR (STICKY TOP-[125px], NEVER OVERLAPS NAVBAR) */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 bg-white border-r border-slate-200 sticky top-[125px] h-[calc(100vh-125px)] z-20 overflow-hidden shadow-2xs">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <span className="text-xs font-mono font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50">
                {curriculum?.subject_code}
              </span>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                {curriculum?.subject_name}
              </h2>
            </div>
          </div>

          {/* Progress Bar in Sidebar */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Tiến độ của bạn</span>
              <span className="font-bold text-emerald-600">
                {curriculum?.completed_lessons}/{curriculum?.total_lessons} ({curriculum?.progress_percent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${curriculum?.progress_percent || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Topic & Lesson Tree */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {curriculum?.topics.map((top, tIdx) => (
              <div key={top.id} className="space-y-1">
                <div className="px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {getDisplayTopicName(top.name, tIdx)}
                </div>

                <div className="space-y-1">
                  {top.lessons.map((les, lIdx) => {
                    const isActive = les.id === lesson.id;
                    return (
                      <Link
                        key={les.id}
                        to={`/courses/${subjectId}/lessons/${les.id}`}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-2xs font-bold'
                            : les.is_completed
                            ? 'text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-900'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {les.is_completed ? (
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-white' : 'text-emerald-500'
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full border text-[10px] flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'border-white text-white'
                                : 'border-slate-300 text-slate-500'
                            }`}
                          >
                            {lIdx + 1}
                          </div>
                        )}
                        <span className="truncate flex-1">{les.title}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Quizzes inside topic */}
                {top.quizzes.map((qz) => (
                  <Link
                    key={qz.id}
                    to={`/practice/${qz.id}`}
                    className="flex items-center gap-2 p-2 rounded-xl text-xs text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/70 transition font-semibold"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate flex-1">Đề thi: {qz.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* MOBILE DRAWER (Only rendered when sidebarOpen is true) */}
        {sidebarOpen && (
          <>
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 lg:hidden"
            ></div>
            <aside className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col lg:hidden animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50">
                    {curriculum?.subject_code}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1">
                    {curriculum?.subject_name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Tiến độ của bạn</span>
                  <span className="font-bold text-emerald-600">
                    {curriculum?.completed_lessons}/{curriculum?.total_lessons} ({curriculum?.progress_percent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${curriculum?.progress_percent || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {curriculum?.topics.map((top, tIdx) => (
                  <div key={top.id} className="space-y-1">
                    <div className="px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {getDisplayTopicName(top.name, tIdx)}
                    </div>
                    <div className="space-y-1">
                      {top.lessons.map((les, lIdx) => {
                        const isActive = les.id === lesson.id;
                        return (
                          <Link
                            key={les.id}
                            to={`/courses/${subjectId}/lessons/${les.id}`}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                                : les.is_completed
                                ? 'text-slate-700 hover:bg-emerald-50/60 hover:text-emerald-900'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {les.is_completed ? (
                              <CheckCircle2 className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                            ) : (
                              <div className={`w-4 h-4 rounded-full border text-[10px] flex items-center justify-center shrink-0 ${isActive ? 'border-white text-white' : 'border-slate-300 text-slate-500'}`}>
                                {lIdx + 1}
                              </div>
                            )}
                            <span className="truncate flex-1">{les.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}

        {/* MAIN LESSON CONTENT AREA (SCROLLS NATURALLY) */}
        <main className="flex-1 min-w-0 max-w-4xl p-4 sm:p-8 space-y-6 mx-auto">
          {/* Video Player (nếu có video_url) */}
          {embedVideoUrl && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-black aspect-video">
              <iframe
                src={embedVideoUrl}
                title={lesson.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}

          {/* Lesson Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
            {/* Header info */}
            <div className="space-y-3 pb-6 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                  {lesson.topic_name}
                </span>
                <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5" /> Thời lượng: {lesson.duration_minutes} phút
                </span>
                {lesson.is_completed && (
                  <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {lesson.title}
              </h1>

              {lesson.description && (
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {lesson.description}
                </p>
              )}
            </div>

            {/* Lecture Theory Content */}
            <article className="prose prose-slate max-w-none text-slate-800">
              {renderLessonMarkdown(lesson.content)}
            </article>

            {/* Củng cố kiến thức: Bài thi trắc nghiệm (nếu có) */}
            {lesson.quiz_info && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Bài kiểm tra củng cố kiến thức cho bài học này
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{lesson.quiz_info.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thời gian: {lesson.quiz_info.duration_minutes} phút • Điểm đạt: {lesson.quiz_info.pass_score}
                    </p>
                  </div>
                  <Link
                    to={`/practice/${lesson.quiz_info.id}`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Làm bài kiểm tra ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Bottom Actions & Prev/Next Navigation */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleToggleComplete}
                disabled={completing}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                  lesson.is_completed
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                }`}
              >
                {lesson.is_completed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã học xong bài này</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đánh dấu hoàn thành bài học</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {lesson.prev_lesson ? (
                  <Link
                    to={`/courses/${subjectId}/lessons/${lesson.prev_lesson.id}`}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Bài trước</span>
                  </Link>
                ) : (
                  <div></div>
                )}

                {lesson.next_lesson ? (
                  <Link
                    to={`/courses/${subjectId}/lessons/${lesson.next_lesson.id}`}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Bài tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    to={`/courses/${subjectId}`}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Hoàn thành môn học</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
