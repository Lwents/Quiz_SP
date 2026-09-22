import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Navbar } from './layouts/Navbar';
import { ToastContainer } from './components/Toast';
import { toast } from './stores/toastStore';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { QuizListPage } from './pages/student/QuizListPage';
import { QuizPlayerPage } from './pages/student/QuizPlayerPage';
import { ResultPage } from './pages/student/ResultPage';
import { DashboardPage } from './pages/student/DashboardPage';
import { ProfilePage } from './pages/student/ProfilePage';
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage';
import { SubjectManagementPage } from './pages/teacher/SubjectManagementPage';
import { QuizEditorPage } from './pages/teacher/QuizEditorPage';
import { CourseListPage } from './pages/student/CourseListPage';
import { CourseDetailPage } from './pages/student/CourseDetailPage';
import { LessonPlayerPage } from './pages/student/LessonPlayerPage';
import { BackupSettingsPage } from './pages/admin/BackupSettingsPage';
import { useAuthStore } from './stores/authStore';
import type { UserRole } from './types';

const PageTitleHandler: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/login')) {
      document.title = 'Đăng nhập | HNUE PRO';
    } else if (path.startsWith('/register')) {
      document.title = 'Đăng ký | HNUE PRO';
    } else if (path.startsWith('/courses/') && path.includes('/lessons/')) {
      document.title = 'Bài giảng | HNUE PRO';
    } else if (path.startsWith('/courses/')) {
      document.title = 'Chi tiết khóa học | HNUE PRO';
    } else if (path.startsWith('/courses')) {
      document.title = 'Khóa học môn học | HNUE PRO';
    } else if (path.startsWith('/practice/')) {
      document.title = 'Làm bài thi | HNUE PRO';
    } else if (path.startsWith('/practice')) {
      document.title = 'Luyện tập & Đề thi | HNUE PRO';
    } else if (path.startsWith('/teacher/subjects')) {
      document.title = 'Quản lý môn học | HNUE PRO';
    } else if (path.startsWith('/teacher')) {
      document.title = 'Quản trị đề thi | HNUE PRO';
    } else if (path.startsWith('/settings/backup')) {
      document.title = 'Sao lưu dữ liệu | HNUE PRO';
    } else if (path.startsWith('/dashboard') || path.startsWith('/profile')) {
      document.title = 'Tiến độ & Thống kê | HNUE PRO';
    } else if (path.startsWith('/results')) {
      document.title = 'Kết quả thi | HNUE PRO';
    } else {
      document.title = 'HNUE PRO';
    }
  }, [location]);

  return null;
};

const RoleRoute: React.FC<{ allowedRoles: UserRole[]; roleLabel: string }> = ({ allowedRoles, roleLabel }) => {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return <div className="py-12 text-center text-slate-500">Đang kiểm tra quyền truy cập...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Bạn không có quyền truy cập trang quản trị</h1>
        <p className="text-slate-600">Trang này chỉ dành cho {roleLabel}.</p>
        <Link to="/courses" className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Về trang khóa học
        </Link>
      </div>
    );
  }

  return <Outlet />;
};

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();

    // Override native browser alert to seamlessly use our beautiful Toast system
    window.alert = (message: any) => {
      const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
      if (msgStr.toLowerCase().includes('lỗi') || msgStr.toLowerCase().includes('không thể') || msgStr.toLowerCase().includes('thất bại')) {
        toast.error(msgStr);
      } else if (msgStr.toLowerCase().includes('thành công') || msgStr.toLowerCase().includes('hoàn tất')) {
        toast.success(msgStr);
      } else if (msgStr.toLowerCase().includes('vui lòng') || msgStr.toLowerCase().includes('cảnh báo')) {
        toast.warning(msgStr);
      } else {
        toast.info(msgStr);
      }
    };
  }, [initAuth]);

  return (
    <BrowserRouter>
      <PageTitleHandler />
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 antialiased font-sans">
        <ToastContainer />
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/courses" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/courses" element={<CourseListPage />} />
            <Route path="/courses/:subjectId" element={<CourseDetailPage />} />
            <Route path="/courses/:subjectId/lessons/:lessonId" element={<LessonPlayerPage />} />
            <Route path="/practice" element={<QuizListPage />} />
            <Route path="/practice/:quizId" element={<QuizPlayerPage />} />
            <Route path="/results/:attemptId" element={<ResultPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route element={<RoleRoute allowedRoles={['TEACHER', 'ADMIN']} roleLabel="giáo viên và quản trị viên" />}>
              <Route path="/teacher" element={<TeacherDashboardPage />} />
              <Route path="/teacher/subjects" element={<SubjectManagementPage />} />
              <Route path="/teacher/quizzes/new" element={<QuizEditorPage />} />
              <Route path="/teacher/quizzes/:id/edit" element={<QuizEditorPage />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={['ADMIN']} roleLabel="quản trị viên" />}>
              <Route path="/settings/backup" element={<BackupSettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/practice" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
