import { toast } from '../../stores/toastStore';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { LessonDetail, CourseCurriculum, CourseTopic } from '../../types';
import { useAuthStore } from '../../stores/authStore';
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
  FileText,
} from 'lucide-react';

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

  // Simple Markdown Parser with Math, Tables, Notes & Lists
  const renderLessonMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        const currentList = [...listItems];
        listItems = [];
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-2 my-3 pl-1">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                <div>{renderInline(item)}</div>
              </li>
            ))}
          </ul>
        );
      }
    };

    const renderInline = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*|\$\$.*?\$\$|\$.*?\$|`.*?`)/g);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <div key={index} className="my-2 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-center font-mono font-bold text-indigo-900 text-sm overflow-x-auto">
              {part.slice(2, -2)}
            </div>
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return (
            <span key={index} className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded text-[13px] border border-indigo-100/50">
              {part.slice(1, -1)}
            </span>
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

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        listItems.push(trimmed.slice(2));
        return;
      }

      flushList();

      if (!trimmed) {
        elements.push(<div key={`sp-${idx}`} className="h-2" />);
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
      } else if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        elements.push(
          <div key={`tbl-${idx}`} className="overflow-x-auto my-3">
            <div className="text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-800">
              {trimmed}
            </div>
          </div>
        );
      } else if (trimmed === '---') {
        elements.push(<hr key={`hr-${idx}`} className="my-5 border-slate-200" />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="text-sm text-slate-700 leading-relaxed my-1.5">
            {renderInline(trimmed)}
          </p>
        );
      }
    });

    flushList();
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
        <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-indigo-500/30 sticky top-16 z-40 shadow-xs">
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

      {/* TOP LESSON BAR */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-16 sm:top-[65px] z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
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
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* SIDEBAR LỘ TRÌNH KHÓA HỌC */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-0 max-lg:-translate-x-full'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
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
              className="p-1 text-slate-400 hover:text-slate-700 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar in Sidebar */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
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
                  Chương {tIdx + 1}: {top.name}
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

        {/* BACKDROP FOR MOBILE SIDEBAR */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          ></div>
        )}

        {/* MAIN LESSON CONTENT AREA */}
        <main className="flex-1 max-w-4xl p-4 sm:p-8 space-y-6 mx-auto">
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

              {/* Slide bài giảng đính kèm */}
              {lesson.slide_url && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">Slide bài giảng PDF chính thức</h4>
                      <p className="text-[11px] text-slate-500">Tài liệu trình chiếu giảng dạy Khoa CNTT - ĐHSPHN</p>
                    </div>
                  </div>
                  <a
                    href={lesson.slide_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Xem toàn màn hình</span>
                  </a>
                </div>
              )}
            </div>

            {/* Embed PDF viewer if slide_url exists */}
            {lesson.slide_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
                <div className="bg-slate-800 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    Trình xem Slide PDF trực tiếp
                  </span>
                  <span className="text-slate-400 text-[11px]">Có thể cuộn xem các trang bên dưới</span>
                </div>
                <iframe
                  src={`${lesson.slide_url}#toolbar=1&navpanes=0`}
                  title="Slide bài giảng"
                  className="w-full h-[520px] sm:h-[650px] border-0"
                ></iframe>
              </div>
            )}

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
