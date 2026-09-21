import { toast } from '../../stores/toastStore';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { Logo } from '../../components/Logo';
import { Lock, Mail, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        role: 'STUDENT',
      });

      // Automatically log in after registration
      const loginRes = await apiClient.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = loginRes.data;
      setAuth(user, access_token, refresh_token);

      toast.success('Đăng ký tài khoản thành công!');
      navigate('/courses');
    } catch (err: any) {
      setError(err.response?.data?.detail?.error?.message || 'Đăng ký không thành công. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-7 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showSubtitle={true} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng ký tài khoản</h2>
          <p className="text-sm text-slate-500 mt-1">Bắt đầu trải nghiệm luyện tập và thi trắc nghiệm</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Họ và tên</label>
            <div className="relative">
              <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Nhập họ và tên..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Nhập email..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-sm text-center text-slate-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};
