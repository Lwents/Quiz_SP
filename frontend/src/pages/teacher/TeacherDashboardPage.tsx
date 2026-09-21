import { toast } from '../../stores/toastStore';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Quiz } from '../../types';
import { Plus, BookOpen, Users, CheckCircle, Clock, Edit, Trash2, Eye, Layers } from 'lucide-react';

export const TeacherDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const [statsRes, quizzesRes] = await Promise.all([
        apiClient.get('/stats/teacher/overview'),
        apiClient.get('/quizzes'),
      ]);
      setOverview(statsRes.data);
      setQuizzes(quizzesRes.data);
    } catch (err) {
      console.error('Error fetching teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài kiểm tra này?')) return;
    try {
      await apiClient.delete(`/quizzes/${quizId}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      toast.error('Không thể xóa bài kiểm tra');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500 font-medium">Đang tải dữ liệu giảng dạy...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản trị & Soạn đề thi (Admin Portal)</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý môn học, ngân hàng câu hỏi, soạn đề thi và theo dõi kết quả học sinh</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/teacher/subjects"
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Layers className="w-4 h-4 text-blue-600" /> Quản lý môn học & chủ đề
          </Link>
          <Link
            to="/teacher/quizzes/new"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tạo bài kiểm tra mới
          </Link>
        </div>
      </div>

      {/* Navigation tabs for Teacher */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-sm font-semibold">
        <Link
          to="/teacher"
          className="px-4 py-2.5 text-blue-600 border-b-2 border-blue-600 font-bold transition flex items-center gap-2"
        >
          <BookOpen className="w-4 h-4" /> Quản lý Đề thi (Quizzes)
        </Link>
        <Link
          to="/teacher/subjects"
          className="px-4 py-2.5 text-slate-500 hover:text-slate-800 transition flex items-center gap-2"
        >
          <Layers className="w-4 h-4" /> Quản lý Môn học & Chủ đề (Subjects)
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tổng số đề thi</div>
          <div className="text-3xl font-black text-slate-900">{overview?.total_quizzes ?? 0}</div>
          <span className="text-xs text-emerald-600 mt-1 block">Đã publish: {overview?.published_quizzes ?? 0}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ngân hàng câu hỏi</div>
          <div className="text-3xl font-black text-slate-900">{overview?.total_questions ?? 0}</div>
          <span className="text-xs text-slate-400 mt-1 block">Tất cả các dạng</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Học sinh tham gia</div>
          <div className="text-3xl font-black text-slate-900">{overview?.total_students ?? 0}</div>
          <span className="text-xs text-slate-400 mt-1 block">Tài khoản người học</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Lượt nộp bài</div>
          <div className="text-3xl font-black text-slate-900">{overview?.total_attempts ?? 0}</div>
          <span className="text-xs text-blue-600 mt-1 block">Đã hoàn thành chấm điểm</span>
        </div>
      </div>

      {/* Quiz Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Danh sách các bài thi</h2>
          <Link
            to="/teacher/quizzes/new"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm đề thi mới
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Tiêu đề bài thi</th>
                <th className="py-3.5 px-6">Môn học / Chủ đề</th>
                <th className="py-3.5 px-6">Số câu</th>
                <th className="py-3.5 px-6">Thời lượng</th>
                <th className="py-3.5 px-6">Trạng thái</th>
                <th className="py-3.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Chưa có bài thi nào. Hãy nhấn{' '}
                    <Link to="/teacher/quizzes/new" className="text-blue-600 font-semibold underline">
                      Tạo bài kiểm tra mới
                    </Link>{' '}
                    hoặc vào{' '}
                    <Link to="/teacher/subjects" className="text-blue-600 font-semibold underline">
                      Quản lý môn học
                    </Link>{' '}
                    để bắt đầu.
                  </td>
                </tr>
              ) : (
                quizzes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">{q.title}</td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{q.subject?.name || 'Chưa phân môn'}</span>
                        {q.topic?.name && (
                          <span className="text-xs text-slate-400 font-medium">Chủ đề: {q.topic.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-700">{q.question_count ?? 0} câu</td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">{q.duration_minutes} phút</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          q.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : q.status === 'DRAFT'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/practice/${q.id}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                          title="Làm thử bài thi"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/teacher/quizzes/${q.id}/edit`}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                          title="Chỉnh sửa bài thi & câu hỏi"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuiz(q.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="Xóa bài thi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};