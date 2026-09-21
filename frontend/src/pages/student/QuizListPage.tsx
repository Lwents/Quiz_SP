import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Quiz, Subject, DifficultyLevel } from '../../types';
import { Search, BookOpen, Clock, Award, Filter, ArrowRight, CheckCircle2 } from 'lucide-react';

export const QuizListPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [selectedSubject, selectedDifficulty]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quizzesRes, subjectsRes] = await Promise.all([
        apiClient.get('/quizzes', {
          params: {
            subject_id: selectedSubject || undefined,
            difficulty: selectedDifficulty || undefined,
            search: search || undefined,
          },
        }),
        apiClient.get('/subjects'),
      ]);
      setQuizzes(quizzesRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const difficultyBadges: Record<DifficultyLevel, { text: string; bg: string; color: string }> = {
    EASY: { text: 'Dễ', bg: 'bg-emerald-50', color: 'text-emerald-700 border-emerald-200' },
    MEDIUM: { text: 'Trung bình', bg: 'bg-amber-50', color: 'text-amber-700 border-amber-200' },
    HARD: { text: 'Nâng cao', bg: 'bg-rose-50', color: 'text-rose-700 border-rose-200' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Danh sách bài luyện tập & kiểm tra</h1>
        <p className="text-slate-500 text-sm mt-1">Luyện tập trắc nghiệm đa dạng câu hỏi, chấm điểm tự động và theo dõi kết quả</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs mb-8">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
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
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả môn học</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
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
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition shadow-xs flex items-center justify-center cursor-pointer"
            >
              Lọc
            </button>
          </div>
        </form>
      </div>

      {/* Quiz Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs animate-pulse h-64">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-slate-100 rounded w-full mb-6"></div>
              <div className="h-10 bg-slate-100 rounded mt-auto"></div>
            </div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Không tìm thấy bài tập nào</h3>
          <p className="text-sm text-slate-500 mt-1">Hãy thử thay đổi điều kiện tìm kiếm hoặc môn học</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const badge = difficultyBadges[quiz.difficulty] || difficultyBadges.MEDIUM;
            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all flex flex-col p-6 group"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                    {quiz.subject?.name || 'Môn học'}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.color}`}>
                    {badge.text}
                  </span>
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

                <Link
                  to={`/practice/${quiz.id}`}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-xs group-hover:shadow cursor-pointer"
                >
                  <span>Bắt đầu làm bài</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
