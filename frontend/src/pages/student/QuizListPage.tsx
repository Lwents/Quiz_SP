import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Quiz, Subject, DifficultyLevel } from '../../types';
import {
  Search,
  BookOpen,
  Clock,
  ArrowRight,
  ArrowLeft,
  Layers,
  GraduationCap,
  Play,
} from 'lucide-react';

export const QuizListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const subjectParam = searchParams.get('subject') || '';

  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeQuizIds, setActiveQuizIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectParam);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  // Sync state with URL params
  useEffect(() => {
    setSelectedSubject(subjectParam);
  }, [subjectParam]);

  // Initial fetch of all quizzes, subjects, and active in-progress attempts
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [quizzesRes, subjectsRes, activeRes] = await Promise.all([
        apiClient.get('/quizzes'),
        apiClient.get('/subjects'),
        apiClient.get('/attempts/my-active').catch(() => ({ data: [] })),
      ]);
      setAllQuizzes(quizzesRes.data);
      setQuizzes(quizzesRes.data);
      setSubjects(subjectsRes.data);
      setActiveQuizIds(activeRes.data || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch filtered quizzes when subject or difficulty changes
  useEffect(() => {
    if (selectedSubject) {
      fetchFilteredQuizzes();
    }
  }, [selectedSubject, selectedDifficulty]);

  const fetchFilteredQuizzes = async () => {
    if (!selectedSubject) return;
    try {
      const [res, activeRes] = await Promise.all([
        apiClient.get('/quizzes', {
          params: {
            subject_id: selectedSubject,
            difficulty: selectedDifficulty || undefined,
            search: search || undefined,
          },
        }),
        apiClient.get('/attempts/my-active').catch(() => ({ data: [] })),
      ]);
      setQuizzes(res.data);
      setActiveQuizIds(activeRes.data || []);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredQuizzes();
  };

  const handleSelectSubject = (subId: string) => {
    setSelectedSubject(subId);
    if (subId) {
      setSearchParams({ subject: subId });
    } else {
      setSearchParams({});
    }
  };

  const handleBackToSubjects = () => {
    setSelectedSubject('');
    setSearchParams({});
  };

  // Count quizzes per subject
  const quizCountBySubject: Record<string, number> = {};
  allQuizzes.forEach((q) => {
    if (q.subject_id) {
      quizCountBySubject[q.subject_id] = (quizCountBySubject[q.subject_id] || 0) + 1;
    }
  });

  const activeSubjectObj = subjects.find((s) => s.id === selectedSubject);
  const inProgressQuiz = allQuizzes.find((q) => activeQuizIds.includes(q.id));

  const difficultyBadges: Record<DifficultyLevel, { text: string; bg: string; color: string }> = {
    EASY: { text: 'Dễ', bg: 'bg-emerald-50', color: 'text-emerald-700 border-emerald-200' },
    MEDIUM: { text: 'Trung bình', bg: 'bg-amber-50', color: 'text-amber-700 border-amber-200' },
    HARD: { text: 'Nâng cao', bg: 'bg-rose-50', color: 'text-rose-700 border-rose-200' },
  };

  const subjectColorThemes = [
    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
    { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800' },
    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
    { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' },
    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Banner & Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Luyện tập & Thi trắc nghiệm</h1>
          <p className="text-slate-500 text-sm mt-1">
            {selectedSubject
              ? `Danh sách bài kiểm tra & đề thi trắc nghiệm môn ${activeSubjectObj?.name || 'đã chọn'}`
              : 'Chọn môn học bạn muốn ôn luyện để xem danh sách bài kiểm tra trắc nghiệm'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto border border-slate-200">
          <Link
            to="/courses"
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 flex items-center gap-2 transition"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            Khóa học lý thuyết
          </Link>
          <span className="px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-white text-blue-700 shadow-xs flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            Luyện đề trắc nghiệm
          </span>
        </div>
      </div>

      {/* Resume In-Progress Banner (nếu có bài đang làm dở) */}
      {inProgressQuiz && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Play className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 animate-pulse">
                  ĐANG LÀM BÀI
                </span>
                <span className="text-xs text-amber-800 font-medium">
                  Thời gian đang đếm ngược liên tục (không tạm dừng) • Tiến trình đã lưu an toàn
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{inProgressQuiz.title}</h3>
            </div>
          </div>

          <Link
            to={`/practice/${inProgressQuiz.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Tiếp tục làm tiếp</span>
          </Link>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Đang tải danh mục bài thi...</p>
        </div>
      ) : !selectedSubject ? (
        /* STEP 1: CHỌN MÔN HỌC */
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Danh mục Môn học</h2>
            <span className="text-xs text-slate-400 font-medium">({subjects.length} môn)</span>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Chưa có môn học nào</h3>
              <p className="text-sm text-slate-500 mt-1">Hệ thống đang chuẩn bị nội dung môn học</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((sub, idx) => {
                const theme = subjectColorThemes[idx % subjectColorThemes.length];
                const count = quizCountBySubject[sub.id] || 0;

                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSelectSubject(sub.id)}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group relative overflow-hidden cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg ${theme.badge}`}>
                          {sub.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {count} đề thi
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {sub.name}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {sub.description || 'Các bài kiểm tra ôn luyện kiến thức, rèn luyện kỹ năng và đánh giá năng lực theo chuẩn chương trình.'}
                      </p>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSubject(sub.id);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>Vào làm trắc nghiệm</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: ĐÃ CHỌN MÔN HỌC - HIỂN THỊ DANH SÁCH QUIZ CỦA MÔN ĐÓ */
        <div className="space-y-6">
          {/* Breadcrumb & Nút đổi môn học */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <button
              type="button"
              onClick={handleBackToSubjects}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Chọn môn học khác</span>
            </button>

            {/* Quick Switch Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSubject(s.id)}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    selectedSubject === s.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s.name} ({quizCountBySubject[s.id] || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Banner thông tin môn học đang chọn */}
          {activeSubjectObj && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-100 text-blue-800">
                    {activeSubjectObj.code}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{activeSubjectObj.name}</h2>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl">
                  {activeSubjectObj.description || 'Bộ ngân hàng đề thi trắc nghiệm theo chuẩn chương trình đào tạo.'}
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 self-start sm:self-auto">
                Số đề thi môn này: <span className="text-blue-600 font-bold">{quizzes.length} bài</span>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm bài tập theo tên..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Tất cả độ khó</option>
                  <option value="EASY">Dễ</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HARD">Khó</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center justify-center cursor-pointer"
                >
                  Lọc
                </button>
              </div>
            </form>
          </div>

          {/* Quiz Grid */}
          {quizzes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Không tìm thấy bài tập nào</h3>
              <p className="text-sm text-slate-500 mt-1">
                Môn học này hiện chưa có bài thi nào được xuất bản hoặc không khớp với bộ lọc.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => {
                const badge = difficultyBadges[quiz.difficulty] || difficultyBadges.MEDIUM;
                const isInProgress = activeQuizIds.includes(quiz.id);

                return (
                  <div
                    key={quiz.id}
                    className={`bg-white rounded-2xl border transition-all flex flex-col p-6 group ${
                      isInProgress
                        ? 'border-amber-300 shadow-xs hover:border-amber-400 hover:shadow-md'
                        : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                        {quiz.subject?.name || activeSubjectObj?.name || 'Môn học'}
                      </span>
                      <div className="flex items-center gap-2">
                        {isInProgress && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Đang làm dở
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                      {quiz.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-6 flex-1">
                      {quiz.description || 'Không có mô tả chi tiết'}
                    </p>

                    <div className="grid grid-cols-2 gap-3 py-3 px-3.5 bg-slate-50 rounded-xl mb-5 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <span>{quiz.question_count ?? 0} câu hỏi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{quiz.duration_minutes > 0 ? `${quiz.duration_minutes} phút` : 'Tự do'}</span>
                      </div>
                    </div>

                    {isInProgress ? (
                      <Link
                        to={`/practice/${quiz.id}`}
                        className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-xs group-hover:shadow cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Tiếp tục làm bài</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/practice/${quiz.id}`}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-xs group-hover:shadow cursor-pointer"
                      >
                        <span>Bắt đầu làm bài</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
