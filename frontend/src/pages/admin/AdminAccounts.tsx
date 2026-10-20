import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { toast } from "../../stores/toastStore";
import { dateTime, exportCsv } from "./adminTypes";
import type { Account } from "./adminTypes";
import { AdminDialog } from '../../components/AdminDialog';
import { useAuthStore } from '../../stores/authStore';
import { ShieldCheck } from 'lucide-react';

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const button =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";
const roleName = (role: string) =>
  role === "ADMIN"
    ? "Quản trị viên"
    : role === "STUDENT"
      ? "Sinh viên"
      : "Quyền cũ";
const empty = { full_name: "", email: "", password: "", role: "STUDENT" };
export function AdminAccounts() {
  const actor = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [resetUser, setResetUser] = useState<Account | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmationError, setConfirmationError] = useState('');
  const [pendingChange, setPendingChange] = useState<{ user: Account; changes: { role?: string; is_active?: boolean }; title: string; description: string } | null>(null);
  const closeConfirmation = () => { setPendingChange(null); setResetUser(null); setAdminPassword(''); setConfirmationError(''); setPassword(''); setConfirmation(''); };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(
        (
          await apiClient.get<Account[]>("/users/admin", {
            params: {
              search,
              role: role || undefined,
              limit: 50,
              offset: page * 50,
            },
          })
        ).data,
      );
    } catch {
      toast.error("Không tải được tài khoản");
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  async function mutate(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      toast.success("Đã cập nhật tài khoản");
      await load();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })
        .response?.data?.detail;
      if (pendingChange || resetUser) {
        setConfirmationError(typeof detail === 'string' ? detail : 'Không thể thực hiện. Vui lòng thử lại.');
        setAdminPassword('');
      }
      toast.error(
        typeof detail === "string"
          ? detail
          : "Không thể cập nhật, kiểm tra dữ liệu đã nhập",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Quản lý tài khoản</h2>
        <button className={button} onClick={() => setCreating(!creating)}>
          {creating ? "Đóng form" : "+ Tạo tài khoản"}
        </button>
      </header>
      {creating && (
        <form
          className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(async () => {
              await apiClient.post("/admin/users", { ...form, ...(form.role === 'ADMIN' ? { admin_password: adminPassword } : {}) });
              setForm(empty);
              setAdminPassword('');
              setCreating(false);
            });
          }}
        >
          <p className="text-sm text-slate-500 sm:col-span-2">Tài khoản mới phải xác minh bằng link gửi về email trước khi đăng nhập. Hãy cấu hình SMTP trước khi tạo.</p>
          <input
            aria-label="Họ tên"
            className={input}
            required
            maxLength={255}
            placeholder="Họ tên"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <input
            aria-label="Email"
            type="email"
            className={input}
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            aria-label="Mật khẩu tài khoản mới"
            type="password"
            autoComplete="new-password"
            className={input}
            required
            minLength={8}
            maxLength={72}
            placeholder="Mật khẩu (ít nhất 8 ký tự)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            aria-label="Vai trò tài khoản mới"
            className={input}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="STUDENT">Sinh viên</option>
            <option value="ADMIN">Quản trị viên</option>
          </select>
          {form.role === 'ADMIN' && <label className="text-sm font-semibold sm:col-span-2">Xác minh mật khẩu admin đang đăng nhập ({actor?.email})
            <input required type="password" autoComplete="current-password" maxLength={72} className={`${input} mt-2`} value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
          </label>}
          <button disabled={busy} className={button}>
            Tạo tài khoản
          </button>
        </form>
      )}
      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            className={input}
            aria-label="Tìm tài khoản"
            placeholder="Tìm tên hoặc email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="Lọc vai trò"
            className={`${input} sm:max-w-44`}
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Mọi vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="STUDENT">Sinh viên</option>
          </select>
          <button
            className={`${button} shrink-0`}
            onClick={() =>
              exportCsv("tai-khoan.csv", [
                ["Họ tên", "Email", "Vai trò", "Trạng thái"],
                ...users.map((u) => [
                  u.full_name,
                  u.email,
                  roleName(u.role),
                  u.is_active ? "Mở" : "Khóa",
                ]),
              ])
            }
          >
            Xuất trang CSV
          </button>
        </div>
        {loading && <p className="py-2 text-sm text-slate-500">Đang tải…</p>}
        <div className="space-y-3">
          {users.map((u) => (
            <article
              key={u.id}
              className="flex flex-col justify-between gap-3 rounded-xl border p-4 xl:flex-row"
            >
              <div className="min-w-0">
                <h3 className="font-bold">{u.full_name}</h3>
                <p className="break-all text-sm text-slate-500">{u.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {u.is_active ? "Được phép truy cập" : "Đã khóa"} ·{" "}
                  {roleName(u.role)}
                  <br />
                  Tạo: {dateTime(u.created_at)} · Đăng nhập:{" "}
                  {dateTime(u.last_login_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <select
                  aria-label={`Vai trò của ${u.email}`}
                  disabled={busy}
                  className={`${button} max-w-40`}
                  value={u.role}
                  onChange={(e) => {
                    const next = e.target.value;
                    setAdminPassword(''); setConfirmationError('');
                    setPendingChange({ user: u, changes: { role: next }, title: 'Xác nhận đổi quyền tài khoản', description: `Đổi ${u.email} từ ${roleName(u.role)} thành ${roleName(next)}.${next === 'ADMIN' ? ' Tài khoản sẽ có toàn quyền quản trị hệ thống.' : ''}` });
                  }}
                >
                  {u.role === "TEACHER" && (
                    <option disabled value="TEACHER">
                      Quyền cũ
                    </option>
                  )}
                  <option value="STUDENT">Sinh viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
                <button
                  disabled={busy}
                  className={button}
                  onClick={() => {
                    setAdminPassword(''); setConfirmationError('');
                    setPendingChange({ user: u, changes: { is_active: !u.is_active }, title: `Xác nhận ${u.is_active ? 'khóa' : 'mở khóa'} tài khoản`, description: `${u.is_active ? 'Khóa' : 'Mở khóa'} tài khoản ${u.email}.${u.is_active ? ' Các phiên đăng nhập của tài khoản sẽ bị thu hồi.' : ''}` });
                  }}
                >
                  {u.is_active ? "Khóa" : "Mở khóa"}
                </button>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => {
                    setResetUser(u);
                    setPassword("");
                    setConfirmation("");
                    setAdminPassword(''); setConfirmationError('');
                  }}
                >
                  Đặt lại mật khẩu
                </button>
              </div>
            </article>
          ))}
        </div>
        {!loading && !users.length && (
          <p className="py-8 text-center text-sm text-slate-500">
            Không tìm thấy tài khoản.
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            className={button}
            disabled={!page || loading}
            onClick={() => setPage(page - 1)}
          >
            Trước
          </button>
          <span className="text-sm text-slate-500">Trang {page + 1}</span>
          <button
            className={button}
            disabled={users.length < 50 || loading}
            onClick={() => setPage(page + 1)}
          >
            Tiếp
          </button>
        </div>
      </section>
      {pendingChange && <AdminDialog title={pendingChange.title} busy={busy} onClose={closeConfirmation}>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault(); setConfirmationError('');
          void mutate(async () => {
            await apiClient.patch(`/users/admin/${pendingChange.user.id}`, { ...pendingChange.changes, admin_password: adminPassword });
            closeConfirmation();
          });
        }}>
          <ShieldCheck className="h-10 w-10 rounded-xl bg-blue-50 p-2 text-blue-600" />
          <h3 className="text-lg font-bold">{pendingChange.title}</h3>
          <p className="break-words text-sm text-slate-600">{pendingChange.description}</p>
          <p className="break-all text-xs text-slate-500">Xác minh quản trị viên: {actor?.email}</p>
          <label className="block text-sm font-semibold">Mật khẩu admin đang đăng nhập
            <input autoFocus type="password" autoComplete="current-password" required maxLength={72} className={`${input} mt-2`} value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
          </label>
          {confirmationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{confirmationError}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={button} onClick={closeConfirmation}>Hủy</button><button disabled={busy} className={`${button} bg-blue-600! text-white`}>{busy ? 'Đang xác minh…' : 'Xác minh & xác nhận'}</button></div>
        </form>
      </AdminDialog>}
      {resetUser && (
        <AdminDialog title="Đặt lại mật khẩu" busy={busy} onClose={closeConfirmation}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (password !== confirmation) {
                toast.error("Hai mật khẩu chưa khớp");
                return;
              }
              void mutate(async () => {
                await apiClient.post(`/admin/users/${resetUser.id}/password`, {
                  password,
                  admin_password: adminPassword,
                });
                setResetUser(null);
                setPassword("");
                setConfirmation("");
                setAdminPassword(''); setConfirmationError('');
              });
            }}
          >
            <h3 className="font-bold">Đặt lại mật khẩu</h3>
            <p className="text-sm text-slate-500">
              {resetUser.email}. Tất cả phiên cũ sẽ bị vô hiệu hóa.
            </p>
            <input
              aria-label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              className={input}
              placeholder="Mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              aria-label="Nhập lại mật khẩu"
              type="password"
              autoComplete="new-password"
              required
              className={input}
              placeholder="Nhập lại mật khẩu"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
            <label className="block text-sm font-semibold">Mật khẩu admin đang đăng nhập
              <span className="block break-all text-xs font-normal text-slate-500">{actor?.email}</span>
              <input type="password" autoComplete="current-password" required maxLength={72} className={`${input} mt-2`} value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
            </label>
            {confirmationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{confirmationError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={closeConfirmation}
              >
                Hủy
              </button>
              <button className={button} disabled={busy}>
                Đặt lại
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
