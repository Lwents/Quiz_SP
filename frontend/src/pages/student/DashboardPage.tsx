import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { Award, CheckCircle2, Clock, BookOpen, RotateCcw, ArrowRight, TrendingUp } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/stats/student/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium text-slate-500">Đang tải số liệu học tập...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Bảng điều khiển học tập</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Xin chào, {user?.full_name}!</h1>
          <p className="text-sm text-blue-100 mt-2 max-w-lg">
            Theo dõi tiến độ, tỷ lệ hoàn thành và lịch sử luyện tập trắc nghiệm của bạn qua các môn học.
          </p>
        </div>
        <Link
          to="/practice"
          className="px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm rounded-xl transition shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <BookOpen className="w-4 h-4" /> Bắt đầu luyện tập
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lượt thi đã làm</span>
            <RotateCcw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats?.total_attempts ?? 0}</div>
          <span className="text-xs text-slate-400 mt-1 block">Tổng số lần nộp bài</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Đề thi đã học</span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats?.unique_quizzes_completed ?? 0}</div>
          <span className="text-xs text-slate-400 mt-1 block">Chủ đề / đề khác nhau</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Điểm trung bình</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats?.average_percentage ?? 0}%</div>
          <span className="text-xs text-slate-400 mt-1 block">Tỷ lệ trả lời chính xác</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Thời gian học</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {Math.round((stats?.total_study_time_seconds ?? 0) / 60)} <span className="text-lg font-bold text-slate-500">phút</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Tích lũy thời gian làm bài</span>
        </div>
      </div>

      {/* Recent History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Lịch sử các lần làm bài gần đây
        </h2>

        {stats?.recent_history?.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Bạn chưa làm bài trắc nghiệm nào. Hãy bắt đầu ngay!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Tên bài kiểm tra</th>
                  <th className="py-3 px-4">Điểm số</th>
                  <th className="py-3 px-4">Tỷ lệ</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recent_history?.map((item: any) => (
                  <tr key={item.attempt_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{item.quiz_title}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.score} / {item.max_score}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.percentage >= 70
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.percentage >= 50
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {item.percentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                      {item.duration_seconds}s
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/results/${item.attempt_id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                      >
                        Xem bài <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
