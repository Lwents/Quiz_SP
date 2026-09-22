import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Logo } from '../components/Logo';
import { BookOpen, LayoutDashboard, LogOut, PlusCircle, Layers, AlertCircle, GraduationCap, Settings, Plus } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Guard navigation when user is taking a quiz
  const isInQuiz = location.pathname.startsWith('/practice/') && location.pathname !== '/practice';
  const [showQuizLeaveModal, setShowQuizLeaveModal] = useState(false);
  const [pendingNav, setPendingNav] = useState<string>('');

  const handleGuardedNav = (e: React.MouseEvent, targetPath: string) => {
    if (isInQuiz) {
      e.preventDefault();
      setPendingNav(targetPath);
      setShowQuizLeaveModal(true);
    }
  };

  const handleConfirmLeave = () => {
    setShowQuizLeaveModal(false);
    if (pendingNav) {
      navigate(pendingNav);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              onClick={(e) => handleGuardedNav(e, '/')}
              className="hover:opacity-90 transition-opacity"
            >
              <Logo size="md" showSubtitle={true} />
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                to="/courses"
                onClick={(e) => handleGuardedNav(e, '/courses')}
                className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  location.pathname.startsWith('/courses')
                    ? 'text-blue-600 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Khóa học
              </Link>

              <Link
                to="/practice"
                onClick={(e) => handleGuardedNav(e, '/practice')}
                className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  location.pathname.startsWith('/practice')
                    ? 'text-blue-600 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Luyện tập
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === 'ADMIN' && (
                  <Link
                    to="/settings/backup"
                    onClick={(e) => handleGuardedNav(e, '/settings/backup')}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Cài đặt sao lưu dữ liệu"
                    aria-label="Cài đặt sao lưu dữ liệu"
                  >
                    <Settings className="w-5 h-5" />
                  </Link>
                )}
                <Link
                  to="/profile"
                  onClick={(e) => handleGuardedNav(e, '/profile')}
                  className="flex items-center gap-2.5 p-1 -m-1 rounded-xl hover:bg-slate-100 transition group cursor-pointer"
                  title="Xem hồ sơ & Cài đặt cá nhân"
                >
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {user.full_name}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'TEACHER' ? 'Giáo viên' : 'Sinh viên'}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 shadow-2xs bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 group-hover:ring-2 group-hover:ring-blue-500/30 transition">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Leaving Quiz Confirmation Modal */}
      {showQuizLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Rời khỏi phòng thi?</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Bạn đang trong thời gian làm bài thi. Toàn bộ câu trả lời đã được hệ thống lưu lại an toàn.
                <br />
                <strong className="text-amber-600">Lưu ý quan trọng:</strong> Thời gian làm bài vẫn <span className="font-semibold text-rose-600 underline">tiếp tục đếm ngược và KHÔNG tạm dừng</span>. Bạn cần quay lại làm tiếp trước khi hết giờ!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuizLeaveModal(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Ở lại làm tiếp
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition shadow-xs cursor-pointer"
              >
                Rời phòng thi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Xác nhận đăng xuất</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {isInQuiz ? (
                  <>
                    Bạn đang làm bài thi. Bài làm của bạn đã được lưu tạm. Bạn có chắc chắn muốn đăng xuất tài khoản{' '}
                    <strong className="text-slate-800">{user?.full_name}</strong> không?
                  </>
                ) : (
                  <>
                    Bạn có chắc chắn muốn đăng xuất khỏi tài khoản{' '}
                    <strong className="text-slate-800">{user?.full_name}</strong> không?
                  </>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition shadow-xs cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
