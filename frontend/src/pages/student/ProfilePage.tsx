import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import { ActivityHeatmap, ActivityDay } from '../../components/ActivityHeatmap';
import {
  User as UserIcon,
  Mail,
  Shield,
  Camera,
  CheckCircle2,
  Lock,
  Save,
  RotateCcw,
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  Sparkles,
  Smile,
  PlusCircle,
  Layers,
  X,
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=student1&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=hnue_robot&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/bottts/svg?seed=super_quiz&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/bottts/svg?seed=scholar&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/bottts/svg?seed=coder_cat&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffdfbf',
];

export const ProfilePage: React.FC = () => {
  const { user, setAuth, token, refreshToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab: 'profile' (Hồ sơ & Avatar) | 'stats' (Tiến độ & Thống kê + Heatmap)
  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>('profile');

  // Profile edit states
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Stats and Heatmap states
  const [stats, setStats] = useState<any>(null);
  const [heatmapActivities, setHeatmapActivities] = useState<ActivityDay[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  useEffect(() => {
    fetchStatsAndHeatmap();
  }, []);

  const fetchStatsAndHeatmap = async () => {
    setLoadingStats(true);
    try {
      const [statsRes, heatmapRes] = await Promise.all([
        apiClient.get('/stats/student/dashboard').catch(() => ({ data: null })),
        apiClient.get('/users/activity-heatmap').catch(() => ({ data: { activities: [], total_activities: 0 } })),
      ]);
      setStats(statsRes.data);
      setHeatmapActivities(heatmapRes.data?.activities || []);
      setTotalActivities(heatmapRes.data?.total_activities || 0);
    } catch (err) {
      console.error('Error fetching profile stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Update profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Họ và tên không được để trống');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await apiClient.patch('/users/profile', {
        full_name: fullName.trim(),
        avatar_url: avatarUrl || null,
      });

      if (user && token && refreshToken) {
        setAuth(res.data, token, refreshToken);
      }
      toast.success('Cập nhật thông tin và avatar thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể lưu thay đổi');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải từ 6 ký tự trở lên');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.post('/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.error?.message || 'Không thể đổi mật khẩu');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle local image file upload (convert to Base64)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarUrl(base64);
      toast.info('Đã chọn ảnh đại diện mới. Bấm "Lưu thay đổi" để áp dụng!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Profile Hero Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left z-10">
          {/* Avatar Preview */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white/30 shadow-xl overflow-hidden bg-white flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white text-blue-600 shadow-md hover:bg-blue-50 transition cursor-pointer"
              title="Tải ảnh mới từ thiết bị"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wide">
                {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Sinh viên'}
              </span>
              <span className="text-xs text-blue-200/80">Khoa CNTT - ĐHSPHN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {user?.full_name || 'Người dùng'}
            </h1>
            <p className="text-sm text-blue-100 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email}</span>
            </p>
          </div>
        </div>

        {/* Action Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 z-10 shrink-0">
          <Link
            to="/courses"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white/90 hover:text-white hover:bg-white/15 transition flex items-center gap-1.5 border border-white/20 bg-white/5"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-300" />
            <span>Khóa học</span>
          </Link>
          <Link
            to="/practice"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white/90 hover:text-white hover:bg-white/15 transition flex items-center gap-1.5 border border-white/20 bg-white/5 mr-1"
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Luyện tập</span>
          </Link>
          {user && (user.role === 'ADMIN' || (user.role as any) === 'TEACHER') && (
            <>
              <Link
                to="/teacher"
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-amber-200 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5 border border-amber-300/30 bg-amber-500/10"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>Quản trị đề thi</span>
              </Link>
              <Link
                to="/teacher/subjects"
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-amber-200 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5 border border-amber-300/30 bg-amber-500/10 mr-1"
              >
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                <span>Môn học & Khóa học</span>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-blue-700 shadow-md'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Thông tin & Avatar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-white text-blue-700 shadow-md'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            Tiến độ & Hoạt động
          </button>
        </div>
      </div>

      {/* TAB 1: THÔNG TIN CÁ NHÂN & CHỌN AVATAR */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Avatar Selector Box */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Smile className="w-5 h-5 text-blue-600" />
                Bộ sưu tập Avatar mẫu
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Chọn một avatar phong cách sinh viên hoặc robot AI dưới đây:
              </p>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {PRESET_AVATARS.map((url, idx) => {
                const isSelected = avatarUrl === url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/20 scale-105 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover rounded-xl" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 fill-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Avatar URL or Device Upload */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">
                Hoặc tải ảnh từ thiết bị / Link ảnh online:
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Tải ảnh lên từ máy tính / điện thoại</span>
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Dán URL hình ảnh..."
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarInput.trim()) {
                      setAvatarUrl(customAvatarInput.trim());
                      setCustomAvatarInput('');
                      toast.info('Đã cập nhật link ảnh. Bấm "Lưu thay đổi" để áp dụng!');
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition"
                >
                  Dùng
                </button>
              </div>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer pt-1"
                >
                  <X className="w-3.5 h-3.5" /> Xóa avatar, dùng chữ cái đầu
                </button>
              )}
            </div>
          </div>

          {/* Form Thông tin cá nhân & Đổi mật khẩu */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form Hồ sơ */}
            <form
              onSubmit={handleSaveProfile}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Thông tin tài khoản</h3>
                </div>
                <span className="text-xs text-slate-400">ID: {user?.id.slice(0, 8)}...</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Họ và tên hiển thị</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email đăng nhập</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}</span>
                </button>
              </div>
            </form>

            {/* Form Đổi mật khẩu */}
            <form
              onSubmit={handleChangePassword}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Lock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Bảo mật & Đổi mật khẩu</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    placeholder="Ít nhất 6 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  <span>{savingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: TIẾN ĐỘ & BẢNG HOẠT ĐỘNG (GITHUB HEATMAP STYLE) */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          {/* BẢNG HOẠT ĐỘNG KIỂU GITHUB (ACTIVITY HEATMAP) */}
          <ActivityHeatmap
            activities={heatmapActivities}
            totalActivities={totalActivities}
          />

          {/* 4 Thẻ thống kê tổng quan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Lượt thi đã làm</span>
                <RotateCcw className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{stats?.total_attempts ?? 0}</div>
              <span className="text-xs text-slate-400 mt-1 block">Tổng số lần nộp bài</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Đề thi đã học</span>
                <BookOpen className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{stats?.unique_quizzes_completed ?? 0}</div>
              <span className="text-xs text-slate-400 mt-1 block">Chủ đề / đề khác nhau</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Điểm trung bình</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{stats?.average_percentage ?? 0}%</div>
              <span className="text-xs text-slate-400 mt-1 block">Tỷ lệ trả lời chính xác</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Thời gian học</span>
                <Clock className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {Math.round((stats?.total_study_time_seconds ?? 0) / 60)}{' '}
                <span className="text-lg font-bold text-slate-500">phút</span>
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Tích lũy thời gian làm bài</span>
            </div>
          </div>

          {/* Lịch sử các lần làm bài gần đây */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
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
                          <a
                            href={`/results/${item.attempt_id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                          >
                            Xem bài &rarr;
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
