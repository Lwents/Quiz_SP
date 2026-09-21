import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Subject, CourseCurriculum } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  Settings,
  Sparkles,
  Layers,
  FileCheck2,
} from 'lucide-react';

export const CourseListPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [curriculums, setCurriculums] = useState<Record<string, CourseCurriculum>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoursesData();
  }, []);

  const fetchCoursesData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/subjects');
      setSubjects(res.data);

      // Fetch curriculum stats for each subject
      const currMap: Record<string, CourseCurriculum> = {};
      await Promise.all(
        res.data.map(async (sub: Subject) => {
          try {
            const cRes = await apiClient.get(`/lessons/subject/${sub.id}`);
            currMap[sub.id] = cRes.data;
          } catch (err) {
            console.error(`Error loading curriculum for ${sub.id}:`, err);
          }
        })
      );
      setCurriculums(currMap);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const subjectThemes = [
    {
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      gradient: 'from-blue-600 to-indigo-600',
      border: 'hover:border-blue-400',
      bar: 'bg-blue-600',
    },
    {
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      gradient: 'from-indigo-600 to-purple-600',
      border: 'hover:border-indigo-400',
      bar: 'bg-indigo-600',
    },
    {
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      gradient: 'from-purple-600 to-pink-600',
      border: 'hover:border-purple-400',
      bar: 'bg-purple-600',
    },
    {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      gradient: 'from-emerald-600 to-teal-600',
      border: 'hover:border-emerald-400',
      bar: 'bg-emerald-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            Không gian Học tập & Khóa học Sư phạm
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Khóa học Môn học
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Lộ trình học tập bài bản: Lý thuyết cô đọng, ví dụ trực quan dễ hiểu và bài kiểm tra củng cố kiến thức theo chuẩn sư phạm HNUE PRO.
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto border border-slate-200">
          <Link
            to="/courses"
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-white text-blue-700 shadow-xs flex items-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            Khóa học lý thuyết
          </Link>
          <Link
            to="/practice"
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 flex items-center gap-2 transition"
          >
            <FileCheck2 className="w-4 h-4 text-slate-500" />
            Luyện đề trắc nghiệm
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách khóa học...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Chưa có khóa học nào</h3>
          <p className="text-sm text-slate-500 mt-1">Hệ thống đang chuẩn bị nội dung khóa học mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub, idx) => {
            const theme = subjectThemes[idx % subjectThemes.length];
            const curr = curriculums[sub.id];
            const totalLessons = curr?.total_lessons || 0;
            const completedLessons = curr?.completed_lessons || 0;
            const progressPct = curr?.progress_percent || 0;
            const topicsCount = curr?.topics?.length || 0;
            const totalQuizzes = curr?.total_quizzes || 0;

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md ${theme.border} transition-all duration-200 flex flex-col justify-between overflow-hidden group`}
              >
                {/* Card Top Banner */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border ${theme.badge}`}>
                      {sub.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                      {topicsCount} chương
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3 mt-2 leading-relaxed">
                      {sub.description || 'Học phần nền tảng được biên soạn theo chương trình chuẩn Sư phạm HNUE.'}
                    </p>
                  </div>

                  {/* Course Details Pills */}
                  <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>{totalLessons} bài học</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{totalQuizzes} đề kiểm tra</span>
                    </div>
                  </div>

                  {/* Progress Bar (if logged in) */}
                  {user && totalLessons > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Tiến độ học tập</span>
                        <span className="font-bold text-slate-700">
                          {completedLessons}/{totalLessons} bài ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${theme.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/courses/${sub.id}`}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Vào học khóa học</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to={`/practice?subject=${sub.id}`}
                    className="p-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition border border-slate-200/80 bg-white"
                    title="Luyện đề trắc nghiệm môn này"
                  >
                    <FileCheck2 className="w-4 h-4" />
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/teacher/subjects"
                      className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition border border-slate-200 bg-white"
                      title="Quản lý môn học (Admin)"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
