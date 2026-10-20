import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { toast } from "../../stores/toastStore";
import { dateTime, exportCsv } from "./adminTypes";
import type { Account } from "./adminTypes";

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
              await apiClient.post("/admin/users", form);
              setForm(empty);
              setCreating(false);
            });
          }}
        >
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
                    if (
                      window.confirm(
                        `Đổi ${u.email} thành ${roleName(next)}?${next === "ADMIN" ? " Tài khoản sẽ có toàn quyền quản trị." : ""}`,
                      )
                    )
                      void mutate(() =>
                        apiClient.patch(`/users/admin/${u.id}`, { role: next }),
                      );
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
                    if (
                      window.confirm(
                        `${u.is_active ? "Khóa" : "Mở khóa"} ${u.email}?`,
                      )
                    )
                      void mutate(() =>
                        apiClient.patch(`/users/admin/${u.id}`, {
                          is_active: !u.is_active,
                        }),
                      );
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
      {resetUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Đặt lại mật khẩu"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <form
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (password !== confirmation) {
                toast.error("Hai mật khẩu chưa khớp");
                return;
              }
              void mutate(async () => {
                await apiClient.post(`/admin/users/${resetUser.id}/password`, {
                  password,
                });
                setResetUser(null);
                setPassword("");
                setConfirmation("");
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
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => {
                  setResetUser(null);
                  setPassword("");
                  setConfirmation("");
                }}
              >
                Hủy
              </button>
              <button className={button} disabled={busy}>
                Đặt lại
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
