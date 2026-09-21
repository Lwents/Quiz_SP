import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './layouts/Navbar';
import { ToastContainer } from './components/Toast';
import { toast } from './stores/toastStore';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { QuizListPage } from './pages/student/QuizListPage';
import { QuizPlayerPage } from './pages/student/QuizPlayerPage';
import { ResultPage } from './pages/student/ResultPage';
import { DashboardPage } from './pages/student/DashboardPage';
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage';
import { SubjectManagementPage } from './pages/teacher/SubjectManagementPage';
import { QuizEditorPage } from './pages/teacher/QuizEditorPage';
import { CourseListPage } from './pages/student/CourseListPage';
import { CourseDetailPage } from './pages/student/CourseDetailPage';
import { LessonPlayerPage } from './pages/student/LessonPlayerPage';
import { useAuthStore } from './stores/authStore';

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
    } else if (path.startsWith('/dashboard')) {
      document.title = 'Tiến độ & Thống kê | HNUE PRO';
    } else if (path.startsWith('/results')) {
      document.title = 'Kết quả thi | HNUE PRO';
    } else {
      document.title = 'HNUE PRO';
    }
  }, [location]);

  return null;
};

export const App: React.FC = () => {
  const { user, initAuth } = useAuthStore();

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
            <Route path="/teacher" element={<TeacherDashboardPage />} />
            <Route path="/teacher/subjects" element={<SubjectManagementPage />} />
            <Route path="/teacher/quizzes/new" element={<QuizEditorPage />} />
            <Route path="/teacher/quizzes/:id/edit" element={<QuizEditorPage />} />
            <Route path="*" element={<Navigate to="/practice" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
