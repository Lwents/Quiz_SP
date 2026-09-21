import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { CourseCurriculum, CourseTopic, LessonSimple } from '../../types';
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
  FileText,
  Download,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [curriculum, setCurriculum] = useState<CourseCurriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (subjectId) {
      fetchCurriculum();
    }
  }, [subjectId]);

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/lessons/subject/${subjectId}`);
      setCurriculum(res.data);

      // Expand all topics by default
      const exp: Record<string, boolean> = {};
      res.data.topics.forEach((t: CourseTopic) => {
        exp[t.id] = true;
      });
      setExpandedTopics(exp);
    } catch (err) {
      console.error('Error fetching curriculum:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  // Find the first uncompleted lesson, or the first lesson
  const findNextLesson = (): LessonSimple | null => {
    if (!curriculum) return null;
    let firstLesson: LessonSimple | null = null;
    for (const t of curriculum.topics) {
      for (const l of t.lessons) {
        if (!firstLesson) firstLesson = l;
        if (!l.is_completed) return l;
      }
    }
    return firstLesson;
  };

  const nextLesson = findNextLesson();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-600">Đang tải giáo trình khóa học...</p>
        </div>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy khóa học</h2>
        <p className="text-sm text-slate-500">Môn học không tồn tại hoặc đã bị gỡ khỏi hệ thống.</p>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách khóa học
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* ADMIN CONTROL BAR (Nếu là Admin/Giảng viên xem trang) */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3 border-b border-indigo-500/30 sticky top-16 z-30 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-indigo-200">
                Chế độ xem trước của Quản trị viên:
              </span>
              <span className="text-slate-300 hidden md:inline">
                Bạn đang trải nghiệm khóa học dưới giao diện người học.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/teacher/subjects`}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Quản trị bài học & Môn học này
              </Link>
              <Link
                to="/teacher"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                Quản lý đề thi
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* HERO BANNER KHÓA HỌC */}
      <div className="bg-gradient-to-b from-blue-900 via-slate-900 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800 shadow-inner">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
            <Link to="/courses" className="hover:text-white transition flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Danh mục Khóa học
            </Link>
            <span>/</span>
            <span className="text-slate-300">{curriculum.subject_code}</span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-mono font-bold">
                {curriculum.subject_code}
              </span>
              <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold">
                Chuẩn Sư phạm HNUE PRO
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {curriculum.subject_name}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {curriculum.subject_description ||
                'Khóa học cung cấp kiến thức nền tảng vững chắc, kết hợp bài giảng lý thuyết trực quan, ví dụ sinh động và bài tập trắc nghiệm củng cố năng lực.'}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400">Số chương học</span>
              <p className="text-lg font-bold text-white mt-0.5">{curriculum.topics.length} chương</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400">Tổng bài học</span>
              <p className="text-lg font-bold text-white mt-0.5">{curriculum.total_lessons} bài giảng</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400">Bài thi củng cố</span>
              <p className="text-lg font-bold text-white mt-0.5">{curriculum.total_quizzes} đề trắc nghiệm</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-xs text-slate-400">Tiến độ của bạn</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {curriculum.completed_lessons}/{curriculum.total_lessons} ({curriculum.progress_percent}%)
              </p>
            </div>
          </div>

          {/* Progress Bar & Actions */}
          <div className="space-y-3 pt-2">
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${curriculum.progress_percent}%` }}
              ></div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {nextLesson ? (
                <Link
                  to={`/courses/${curriculum.subject_id}/lessons/${nextLesson.id}`}
                  className="py-3 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <PlayCircle className="w-5 h-5 fill-white/20" />
                  <span>
                    {curriculum.completed_lessons === 0
                      ? 'Bắt đầu học ngay'
                      : `Học tiếp: ${nextLesson.title}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  disabled
                  className="py-3 px-6 bg-slate-800 text-slate-400 font-bold text-sm rounded-xl"
                >
                  Khóa học chưa có bài giảng
                </button>
              )}

              <Link
                to={`/practice?subject=${curriculum.subject_id}`}
                className="py-3 px-5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-sm rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 text-blue-400" />
                <span>Luyện đề trắc nghiệm</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* LỘ TRÌNH NỘI DUNG KHÓA HỌC */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Lộ trình Chương & Bài học
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {curriculum.topics.length} chương • {curriculum.total_lessons} bài giảng
            </span>
          </div>

          {curriculum.topics.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>Chưa có chương học nào được tạo cho môn này.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {curriculum.topics.map((topic, tIdx) => {
                const isExpanded = expandedTopics[topic.id];
                const topicLessons = topic.lessons || [];
                const topicQuizzes = topic.quizzes || [];
                const completedInTopic = topicLessons.filter((l) => l.is_completed).length;

                return (
                  <div
                    key={topic.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 bg-white shadow-2xs hover:border-blue-200"
                  >
                    {/* Topic Header Accordion */}
                    <div
                      onClick={() => toggleTopic(topic.id)}
                      className="p-5 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-4 cursor-pointer select-none transition"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
                          {tIdx + 1}
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            {topic.name}
                          </h3>
                          {topic.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {topic.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {topic.slide_url && (
                          <a
                            href={topic.slide_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition"
                            title="Xem & Tải slide bài giảng PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Slide PDF</span>
                          </a>
                        )}
                        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
                          <span>{completedInTopic}/{topicLessons.length} bài</span>
                          {topicQuizzes.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                              {topicQuizzes.length} đề thi
                            </span>
                          )}
                        </div>
                        <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 bg-white border border-slate-200 shadow-2xs">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Topic Content Body */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-slate-100 space-y-3 bg-white">
                        {topic.slide_url && (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/70 border border-blue-200/80 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">Tài liệu Slide Bài giảng chính thức (HNUE)</h4>
                                <p className="text-[11px] text-slate-500">Bản gốc PDF trình chiếu bài giảng theo chương</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={topic.slide_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Mở Slide PDF</span>
                              </a>
                            </div>
                          </div>
                        )}
                        {topicLessons.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 pl-2">
                            Chương này đang được bổ sung bài giảng.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {topicLessons.map((les, lIdx) => (
                              <Link
                                key={les.id}
                                to={`/courses/${curriculum.subject_id}/lessons/${les.id}`}
                                className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border transition-all duration-150 group cursor-pointer ${
                                  les.is_completed
                                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/80 hover:border-emerald-300'
                                    : 'bg-white border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {les.is_completed ? (
                                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                      {lIdx + 1}
                                    </div>
                                  )}

                                  <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                      {les.title}
                                    </h4>
                                    {les.description && (
                                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                        {les.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {les.video_url && (
                                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                      <Video className="w-3 h-3" /> Video
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    <Clock className="w-3 h-3" /> {les.duration_minutes}p
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Quizzes inside this topic */}
                        {topicQuizzes.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              Đề thi trắc nghiệm củng cố chương
                            </div>
                            {topicQuizzes.map((qz) => (
                              <div
                                key={qz.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50/70 to-blue-50/60 border border-indigo-100 hover:border-indigo-200 transition"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                    <FileCheck2 className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                                      {qz.title}
                                    </h5>
                                    <span className="text-[11px] text-indigo-600 font-medium">
                                      Thời gian: {qz.duration_minutes} phút • Điểm đạt: {qz.pass_score}
                                    </span>
                                  </div>
                                </div>

                                <Link
                                  to={`/practice/${qz.id}`}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                                >
                                  <span>Làm bài thi</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
