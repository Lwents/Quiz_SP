import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  Database,
  HeartPulse,
  History,
  Settings2,
  ShieldCheck,
  Users,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "../../api/client";
import { toast } from "../../stores/toastStore";
import { AdminAnalyticsPage } from "./AdminAnalyticsPage";
import { AdminAccounts } from "./AdminAccounts";
import { AdminReports } from "./AdminReports";
import { AdminOnlinePage } from "./AdminOnlinePage";
import { AdminIntegrationsPage } from "./AdminIntegrationsPage";
import { dateTime, eventNames, exportCsv } from "./adminTypes";
import type { Event, Session, Policy, Notice } from "./adminTypes";

const tabs = [
  { id: "overview", name: "Tổng quan & biểu đồ", icon: ChartNoAxesCombined },
  { id: "users", name: "Quản lý tài khoản", icon: Users },
  { id: "active", name: "Đang hoạt động", icon: Activity },
  { id: "sessions", name: "Phiên đăng nhập", icon: Monitor },
  { id: "activity", name: "Nhật ký hoạt động", icon: History },
  { id: "security", name: "Bảo mật & cấu hình", icon: ShieldCheck },
  { id: "health", name: "Sức khỏe hệ thống", icon: HeartPulse },
  { id: "reports", name: "Báo cáo luyện tập", icon: ChartNoAxesCombined },
  { id: "notices", name: "Thông báo", icon: Bell },
];
export const adminButton =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";
export const adminInput =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const panel = "rounded-2xl border border-slate-200 bg-white p-5";
function errorMessage(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;
  return typeof detail === "string"
    ? detail
    : "Không thể hoàn thành thao tác. Hãy thử lại.";
}

export function AdminCenterPage() {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const legacyConfiguration = requestedTab === "ai" || requestedTab === "email";
  const configurationSections = [
    { id: "policy", name: "Bảo mật" }, { id: "ai", name: "AI" }, { id: "email", name: "Email SMTP" },
  ];
  const configurationSection = legacyConfiguration ? requestedTab! : configurationSections.some((s) => s.id === params.get("section")) ? params.get("section")! : "policy";
  const tab = legacyConfiguration ? "security" : tabs.some((t) => t.id === requestedTab)
    ? requestedTab!
    : "overview";
  useEffect(() => {
    if (legacyConfiguration) setParams({ tab: "security", section: requestedTab! }, { replace: true });
  }, [legacyConfiguration, requestedTab, setParams]);
  return (
    <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-6">
      <header className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
          HNUE PRO · Admin
        </p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">
          Trung tâm quản trị
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Tài khoản, hoạt động và vận hành hệ thống.
        </p>
      </header>
      <div className="flex flex-col gap-5 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <nav
            aria-label="Công cụ quản trị"
            className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:sticky lg:top-20 lg:flex-col"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setParams({ tab: t.id })}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold ${tab === t.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <t.icon size={17} />
                {t.name}
              </button>
            ))}
            <Link
              className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              to="/settings/backup"
            >
              <Database size={17} />
              Sao lưu & khôi phục
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          {tab === "overview" ? (
            <AdminAnalyticsPage />
          ) : tab === "users" ? (
            <AdminAccounts />
          ) : tab === "reports" ? (
            <AdminReports />
          ) : tab === "active" ? (
            <AdminOnlinePage />
          ) : tab === "security" ? (
            <div className="space-y-5">
              <div role="tablist" aria-label="Các phần cấu hình" className="relative grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-100 p-1">
                <span aria-hidden="true" className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none" style={{ transform: `translateX(${configurationSections.findIndex((s) => s.id === configurationSection) * 100}%)` }} />
                {configurationSections.map((section) => <button key={section.id} id={`settings-tab-${section.id}`} role="tab" aria-selected={configurationSection === section.id} aria-controls={`settings-panel-${section.id}`}
                  onClick={() => setParams({ tab: "security", section: section.id })}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const index = configurationSections.findIndex((s) => s.id === section.id);
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                    setParams({ tab: 'security', section: configurationSections[next].id });
                    document.getElementById(`settings-tab-${configurationSections[next].id}`)?.focus();
                  }} tabIndex={configurationSection === section.id ? 0 : -1}
                  className={`relative min-w-0 rounded-lg px-2 py-3 text-sm font-semibold transition-colors ${configurationSection === section.id ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}>{section.name}</button>)}
              </div>
              {configurationSections.map((section) => <section key={section.id} id={`settings-panel-${section.id}`} role="tabpanel" aria-labelledby={`settings-tab-${section.id}`} hidden={configurationSection !== section.id} className={configurationSection === section.id ? 'settings-panel-enter' : ''}>
                {section.id === 'policy' ? <Operations tab="security" /> : <AdminIntegrationsPage kind={section.id as 'ai' | 'email'} />}
              </section>)}
            </div>
          ) : (
            <Operations key={tab} tab={tab} />
          )}
        </main>
      </div>
    </div>
  );
}

function Operations({ tab }: { tab: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<Event[]>([]);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [health, setHealth] = useState<Record<
    string,
    number | string | null
  > | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState({
    title: "",
    message: "",
    audience: "ALL",
  });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "sessions")
        setSessions(
          (
            await apiClient.get<Session[]>("/admin/sessions", {
              params: { active_only: false },
            })
          ).data,
        );
      if (tab === "activity")
        setLogs(
          (
            await apiClient.get<Event[]>("/admin/activity", {
              params: { action, offset },
            })
          ).data,
        );
      if (tab === "security")
        setPolicy((await apiClient.get<Policy>("/admin/policy")).data);
      if (tab === "health")
        setHealth((await apiClient.get("/admin/health")).data);
      if (tab === "notices")
        setNotices(
          (await apiClient.get<Notice[]>("/admin/announcements")).data,
        );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [tab, action, offset]);
  useEffect(() => {
    void load();
  }, [load, tab]);
  const mutate = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-900">
          {tab === "security" ? "Chính sách bảo mật" : tabs.find((t) => t.id === tab)?.name}
        </h2>
        <button className={adminButton} disabled={loading} onClick={load}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      {loading && <p className="text-sm text-slate-500">Đang tải dữ liệu…</p>}
      {tab === "sessions" && (
        <section className={panel}>
          <p className="mb-4 text-sm text-slate-500">
            Phiên được theo dõi từ khi bật chức năng này. Phiên cũ cần đăng nhập
            lại để xuất hiện; đặt lại mật khẩu sẽ thu hồi cả token cũ.
          </p>
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row"
              >
                <div>
                  <p className="font-bold">{s.full_name}</p>
                  <p className="text-sm text-slate-600">{s.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Bắt đầu: {dateTime(s.created_at)} · Gần nhất:{" "}
                    {dateTime(s.last_seen_at)} · Hết hạn:{" "}
                    {dateTime(s.expires_at)}
                  </p>
                </div>
                <button
                  disabled={busy}
                  className={`${adminButton} self-start text-rose-600`}
                  onClick={() => {
                    if (window.confirm(`Thu hồi phiên của ${s.email}?`))
                      void mutate(
                        () => apiClient.delete(`/admin/sessions/${s.id}`),
                        "Đã thu hồi phiên",
                      );
                  }}
                >
                  Thu hồi phiên
                </button>
              </div>
            ))}
            {!loading && !sessions.length && (
              <p className="text-sm text-slate-500">Không có phiên phù hợp.</p>
            )}
          </div>
        </section>
      )}
      {tab === "activity" && (
        <section className={panel}>
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              aria-label="Loại hoạt động"
              className={`${adminInput} max-w-xs`}
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setOffset(0);
              }}
            >
              <option value="">Tất cả hoạt động</option>
              {Object.entries(eventNames).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              className={adminButton}
              onClick={() =>
                exportCsv("nhat-ky.csv", [
                  ["Thời gian", "Tài khoản", "Hoạt động"],
                  ...logs.map((l) => [
                    dateTime(l.occurred_at),
                    l.email || "",
                    eventNames[l.action] || l.action,
                  ]),
                ])
              }
            >
              Xuất trang CSV
            </button>
          </div>
          <div className="divide-y">
            {logs.map((l) => (
              <div
                key={l.id}
                className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row"
              >
                <span>
                  <strong>{eventNames[l.action] || l.action}</strong>
                  <br />
                  <span className="text-slate-500">
                    {l.email || "Không xác định"}
                  </span>
                </span>
                <time className="text-xs text-slate-500">
                  {dateTime(l.occurred_at)}
                </time>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              disabled={!offset || loading}
              className={adminButton}
              onClick={() => setOffset(offset - 100)}
            >
              Trước
            </button>
            <button
              disabled={logs.length < 100 || loading}
              className={adminButton}
              onClick={() => setOffset(offset + 100)}
            >
              Tiếp
            </button>
          </div>
        </section>
      )}
      {tab === "security" && policy && (
        <form
          className={`${panel} space-y-5`}
          onSubmit={(e) => {
            e.preventDefault();
            if (window.confirm("Áp dụng chính sách bảo mật này cho hệ thống?"))
              void mutate(
                () => apiClient.put("/admin/policy", policy),
                "Đã lưu chính sách",
              );
          }}
        >
          <div className="flex items-center gap-2 font-bold">
            <Settings2 size={20} />
            Chính sách đang được thực thi trên backend
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={policy.registration_enabled}
              onChange={(e) =>
                setPolicy({ ...policy, registration_enabled: e.target.checked })
              }
            />
            Cho phép người dùng tự đăng ký
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["session_hours", "Thời lượng phiên mới (giờ)", 1, 168],
                [
                  "idle_minutes",
                  "Hết phiên khi không hoạt động (phút)",
                  5,
                  1440,
                ],
                [
                  "failed_attempts",
                  "Số lần nhập sai trước khi tạm khóa",
                  3,
                  30,
                ],
                ["failure_window_minutes", "Khoảng đếm nhập sai (phút)", 1, 60],
                ["lockout_minutes", "Thời gian tạm khóa (phút)", 1, 120],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key} className="text-sm font-medium text-slate-700">
                {label}
                <input
                  className={`${adminInput} mt-1`}
                  required
                  type="number"
                  min={min}
                  max={max}
                  value={policy[key]}
                  onChange={(e) =>
                    setPolicy({ ...policy, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Thời lượng phiên áp dụng cho lần đăng nhập mới; giới hạn không hoạt
            động được kiểm tra ở mỗi yêu cầu. Đổi mật khẩu vô hiệu hóa token cũ.
            Khóa tạm thời tự hết hạn theo cấu hình.
          </p>
          <button disabled={busy} className={`${adminButton} text-blue-700`}>
            {busy ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
        </form>
      )}
      {tab === "health" && health && (
        <section className={panel}>
          <p className="mb-5 text-sm text-slate-500">{health.scope}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Cơ sở dữ liệu", `${health.database_ms} ms`],
              [
                "Thời gian backend chạy",
                `${Math.floor(Number(health.uptime_seconds) / 60)} phút`,
              ],
              [
                "CPU load trung bình 1 phút",
                `${Number(health.cpu_load_1m).toFixed(2)} / ${health.cpu_count} CPU`,
              ],
              [
                "RAM khả dụng / tổng",
                `${health.memory_available ? (Number(health.memory_available) / 2 ** 30).toFixed(2) : "—"} / ${health.memory_total ? (Number(health.memory_total) / 2 ** 30).toFixed(2) : "—"} GB`,
              ],
              [
                "Ổ đĩa đã dùng / tổng",
                `${(Number(health.disk_used) / 2 ** 30).toFixed(1)} / ${(Number(health.disk_total) / 2 ** 30).toFixed(1)} GB`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "notices" && (
        <>
          <form
            className={`${panel} space-y-3`}
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(async () => {
                await apiClient.post("/admin/announcements", notice);
                setNotice({ title: "", message: "", audience: "ALL" });
              }, "Đã đăng thông báo");
            }}
          >
            <p className="text-sm text-slate-500">
              Thông báo xuất hiện ở hộp thư trong ứng dụng của đúng nhóm nhận.
            </p>
            <input
              aria-label="Tiêu đề thông báo"
              className={adminInput}
              required
              maxLength={160}
              placeholder="Tiêu đề"
              value={notice.title}
              onChange={(e) => setNotice({ ...notice, title: e.target.value })}
            />
            <textarea
              aria-label="Nội dung thông báo"
              className={adminInput}
              required
              maxLength={4000}
              rows={4}
              placeholder="Nội dung"
              value={notice.message}
              onChange={(e) =>
                setNotice({ ...notice, message: e.target.value })
              }
            />
            <select
              aria-label="Nhóm nhận"
              className={adminInput}
              value={notice.audience}
              onChange={(e) =>
                setNotice({ ...notice, audience: e.target.value })
              }
            >
              <option value="ALL">Tất cả người dùng</option>
              <option value="STUDENT">Sinh viên</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
            <button className={adminButton} disabled={busy}>
              Đăng thông báo
            </button>
          </form>
          <section className={`${panel} space-y-4`}>
            {notices.map((n) => (
              <article key={n.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{n.title}</h3>
                  <button
                    disabled={busy}
                    className="text-xs font-semibold text-rose-600"
                    onClick={() => {
                      if (window.confirm("Gỡ thông báo này?"))
                        void mutate(
                          () =>
                            apiClient.delete(`/admin/announcements/${n.id}`),
                          "Đã gỡ thông báo",
                        );
                    }}
                  >
                    Gỡ
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {n.message}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {n.audience === "ALL"
                    ? "Tất cả"
                    : n.audience === "ADMIN"
                      ? "Admin"
                      : "Sinh viên"}{" "}
                  · {dateTime(n.created_at)}
                </p>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
