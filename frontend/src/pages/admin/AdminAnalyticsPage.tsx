import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, RefreshCw, Search, ShieldAlert, ShieldCheck, Users, UserRoundCheck, UserRoundX } from 'lucide-react';
import { apiClient } from '../../api/client';
import { toast } from '../../stores/toastStore';
import type { UserRole } from '../../types';

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login_at?: string | null;
};

type LoginDay = { date: string; success: number; failed: number; blocked: number };
type LoginEvent = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  action: 'login_success' | 'login_failed' | 'login_blocked';
  occurred_at: string;
};

type Overview = {
  period_days: number;
  users: {
    total: number;
    active: number;
    inactive: number;
    new_in_period: number;
    by_role: { students: number; teachers: number; admins: number };
  };
  security: { failed_logins_in_period: number; blocked_logins_in_period: number; controls: string[] };
  login_chart: LoginDay[];
  recent_logins: LoginEvent[];
};

const roleLabels: Record<UserRole, string> = { ADMIN: 'Quản trị viên', TEACHER: 'Giáo viên', STUDENT: 'Sinh viên' };
const roleStyles: Record<UserRole, string> = {
  ADMIN: 'bg-violet-50 text-violet-700 ring-violet-200',
  TEACHER: 'bg-blue-50 text-blue-700 ring-blue-200',
  STUDENT: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const formatDate = (value?: string | null, withTime = true) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString('vi-VN', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { day: '2-digit', month: '2-digit' });
};

const eventMeta: Record<LoginEvent['action'], { label: string; className: string }> = {
  login_success: { label: 'Đăng nhập thành công', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  login_failed: { label: 'Sai thông tin đăng nhập', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  login_blocked: { label: 'Tài khoản đang bị khóa', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: number; note: string; tone?: 'blue' | 'green' | 'rose' | 'amber' }> = ({ icon, label, value, note, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700',
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-900">{value}</p></div>
      <span className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</span>
    </div>
    <p className="mt-3 text-xs font-medium text-slate-500">{note}</p>
  </section>;
};

export const AdminAnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewResult, usersResult] = await Promise.all([
        apiClient.get<Overview>('/stats/admin/overview', { params: { days: 14 } }),
        apiClient.get<AdminUser[]>('/users/admin', { params: { limit: 200 } }),
      ]);
      setOverview(overviewResult.data);
      setUsers(usersResult.data);
    } catch {
      toast.error('Không tải được số liệu quản trị. Hãy thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateUser = async (user: AdminUser, changes: Partial<Pick<AdminUser, 'role' | 'is_active'>>) => {
    setSavingUserId(user.id);
    try {
      const response = await apiClient.patch<AdminUser>(`/users/admin/${user.id}`, changes);
      setUsers((previous) => previous.map((item) => item.id === user.id ? response.data : item));
      toast.success('Đã cập nhật tài khoản');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể cập nhật tài khoản');
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    return users.filter((user) => {
      const matchesSearch = !query || `${user.full_name} ${user.email}`.toLocaleLowerCase('vi-VN').includes(query);
      return matchesSearch && (roleFilter === 'ALL' || user.role === roleFilter);
    });
  }, [users, search, roleFilter]);

  const highest = Math.max(1, ...(overview?.login_chart.flatMap((day) => [day.success, day.failed, day.blocked]) ?? [1]));

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-14 text-center text-sm font-medium text-slate-500"><RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />Đang tải bảng điều hành...</div>;

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-sm font-semibold text-blue-700">QUẢN TRỊ HỆ THỐNG</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Người dùng, hoạt động và bảo mật</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Theo dõi tài khoản, xu hướng đăng nhập và các tín hiệu cần chú ý trong 14 ngày gần đây.</p></div>
      <button type="button" onClick={loadData} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Làm mới</button>
    </header>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={<Users className="h-5 w-5" />} label="Tổng tài khoản" value={overview?.users.total ?? 0} note={`${overview?.users.new_in_period ?? 0} tài khoản mới trong kỳ`} />
      <MetricCard icon={<UserRoundCheck className="h-5 w-5" />} label="Đang hoạt động" value={overview?.users.active ?? 0} note={`${overview?.users.by_role.students ?? 0} sinh viên · ${overview?.users.by_role.teachers ?? 0} giáo viên`} tone="green" />
      <MetricCard icon={<ShieldAlert className="h-5 w-5" />} label="Đăng nhập thất bại" value={overview?.security.failed_logins_in_period ?? 0} note="Trong 14 ngày gần nhất" tone="rose" />
      <MetricCard icon={<UserRoundX className="h-5 w-5" />} label="Tài khoản bị khóa" value={overview?.users.inactive ?? 0} note={`${overview?.security.blocked_logins_in_period ?? 0} lượt bị chặn trong kỳ`} tone="amber" />
    </div>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Biểu đồ đăng nhập</h2><p className="mt-1 text-sm text-slate-500">Thành công, sai thông tin và tài khoản bị khóa theo ngày.</p></div><BarChart3 className="h-5 w-5 text-blue-600" /></div>
        <div className="mt-6 flex h-52 items-end gap-1.5 border-b border-slate-200 pb-1 sm:gap-2">
          {overview?.login_chart.map((day) => <div key={day.date} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-px" title={`${day.date}: ${day.success} thành công, ${day.failed} thất bại, ${day.blocked} bị chặn`}>
            <span className="w-1/3 rounded-t bg-emerald-500/90" style={{ height: `${Math.max(day.success ? 6 : 0, day.success / highest * 100)}%` }} />
            <span className="w-1/3 rounded-t bg-rose-500/90" style={{ height: `${Math.max(day.failed ? 6 : 0, day.failed / highest * 100)}%` }} />
            <span className="w-1/3 rounded-t bg-amber-400" style={{ height: `${Math.max(day.blocked ? 6 : 0, day.blocked / highest * 100)}%` }} />
          </div>)}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400"><span>{overview?.login_chart[0] ? formatDate(overview.login_chart[0].date, false) : '—'}</span><div className="flex gap-3"><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Thành công</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-500" />Thất bại</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" />Bị chặn</span></div><span>{overview?.login_chart.at(-1) ? formatDate(overview.login_chart.at(-1)?.date, false) : '—'}</span></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-xs sm:p-6"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" /><h2 className="font-bold">Trạng thái bảo mật</h2></div><p className="mt-2 text-sm leading-6 text-slate-300">Các kiểm soát đang được áp dụng cho luồng đăng nhập và phiên làm việc.</p><ul className="mt-5 space-y-3">{overview?.security.controls.map((control) => <li key={control} className="flex gap-2 text-sm text-slate-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{control}</li>)}</ul><p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">Nhật ký quản trị không ghi mật khẩu, access token, refresh token hoặc địa chỉ IP.</p></section>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-900">Quản lý người dùng</h2><p className="mt-1 text-sm text-slate-500">Tìm kiếm, đổi vai trò hoặc tạm khóa tài khoản.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc email" className="w-full outline-none sm:w-44" /></label><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'ALL' | UserRole)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><option value="ALL">Mọi vai trò</option><option value="ADMIN">Quản trị viên</option><option value="TEACHER">Giáo viên</option><option value="STUDENT">Sinh viên</option></select></div></div>
      <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tài khoản</th><th className="px-5 py-3">Vai trò</th><th className="px-5 py-3">Hoạt động gần nhất</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredUsers.map((user) => { const saving = savingUserId === user.id; return <tr key={user.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-bold text-slate-900">{user.full_name}</p><p className="mt-0.5 text-xs text-slate-500">{user.email} · tạo {formatDate(user.created_at, false)}</p></td><td className="px-5 py-4"><select disabled={saving} value={user.role} onChange={(event) => updateUser(user, { role: event.target.value as UserRole })} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 outline-none disabled:opacity-50 ${roleStyles[user.role]}`}>{(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></td><td className="px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-slate-400" />{formatDate(user.last_login_at)}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.is_active ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td className="px-5 py-4 text-right"><button type="button" disabled={saving} onClick={() => updateUser(user, { is_active: !user.is_active })} className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${user.is_active ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{saving ? 'Đang lưu...' : user.is_active ? 'Khóa' : 'Mở khóa'}</button></td></tr>; })}{filteredUsers.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Không có tài khoản phù hợp.</td></tr>}</tbody></table></div></section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-900">Nhật ký đăng nhập</h2><p className="mt-1 text-sm text-slate-500">30 sự kiện gần nhất, hiển thị theo thời điểm mới nhất.</p></div><div className="divide-y divide-slate-100">{overview?.recent_logins.map((event) => { const meta = eventMeta[event.action]; return <div key={event.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{event.full_name || event.email || 'Tài khoản không xác định'}</p><p className="text-xs text-slate-500">{event.email || 'Không lưu tài khoản'}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${meta.className}`}>{meta.label}</span><time className="min-w-32 text-right text-xs text-slate-500">{formatDate(event.occurred_at)}</time></div></div>; })}{overview?.recent_logins.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Chưa có sự kiện đăng nhập kể từ khi nhật ký được bật.</p>}</div></section>
  </div>;
};
