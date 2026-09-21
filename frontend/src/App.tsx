import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './layouts/Navbar';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { QuizListPage } from './pages/student/QuizListPage';
import { QuizPlayerPage } from './pages/student/QuizPlayerPage';
import { ResultPage } from './pages/student/ResultPage';
import { DashboardPage } from './pages/student/DashboardPage';
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage';
import { QuizEditorPage } from './pages/teacher/QuizEditorPage';
import { useAuthStore } from './stores/authStore';

export const App: React.FC = () => {
  const { user, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 antialiased font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/practice" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/practice" element={<QuizListPage />} />
            <Route path="/practice/:quizId" element={<QuizPlayerPage />} />
            <Route path="/results/:attemptId" element={<ResultPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/teacher" element={<TeacherDashboardPage />} />
            <Route path="/teacher/quizzes/:id/edit" element={<QuizEditorPage />} />
            <Route path="*" element={<Navigate to="/practice" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
