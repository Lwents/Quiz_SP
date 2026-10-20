import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiClient } from "../../api/client";
import { ChartCard, TimelineChart, BarChart } from "./AdminCharts";
import { exportCsv } from "./adminTypes";

type Overview = {
  users: {
    total: number;
    active: number;
    inactive: number;
    new_in_period: number;
    by_role: { students: number; admins: number; legacy_roles: number };
  };
  security: {
    failed_logins_in_period: number;
    blocked_logins_in_period: number;
    controls: string[];
  };
  user_chart: { date: string; new_users: number; total_users: number }[];
  login_chart: {
    date: string;
    success: number;
    failed: number;
    blocked: number;
  }[];
};
export function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setData(
        (
          await apiClient.get<Overview>("/stats/admin/overview", {
            params: { days },
          })
        ).data,
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [days]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Tổng quan hệ thống</h2>
        <div className="flex gap-2">
          <select
            aria-label="Khoảng thống kê"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          >
            {[7, 30, 90].map((n) => (
              <option key={n} value={n}>
                {n} ngày
              </option>
            ))}
          </select>
          <button
            disabled={loading}
            aria-label="Làm mới số liệu"
            onClick={load}
            className="rounded-lg border bg-white p-2"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            disabled={!data || loading}
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            onClick={() =>
              data &&
              exportCsv("thong-ke-nguoi-dung.csv", [
                ["Ngày (UTC)", "Tài khoản mới", "Tổng tài khoản"],
                ...data.user_chart.map((d) => [
                  d.date,
                  d.new_users,
                  d.total_users,
                ]),
              ])
            }
          >
            Xuất CSV
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Dữ liệu tài khoản thật trong hệ thống; ngày trên biểu đồ được tổng hợp
        theo UTC. Trạng thái được phép truy cập không có nghĩa người dùng đang
        online.
      </p>
      {failed && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          Không tải được số liệu. Bấm làm mới để thử lại.
        </p>
      )}
      {loading && (
        <p className="text-sm text-slate-500">Đang cập nhật số liệu…</p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              [
                "Tổng tài khoản",
                data.users.total,
                "Thêm " + data.users.new_in_period + " trong kỳ",
              ],
              [
                "Được phép truy cập",
                data.users.active,
                "Tài khoản chưa bị khóa",
              ],
              [
                "Tài khoản bị khóa",
                data.users.inactive,
                "Do quản trị viên khóa",
              ],
              [
                "Đăng nhập thất bại",
                data.security.failed_logins_in_period,
                "Trong " + days + " ngày",
              ],
            ].map(([label, value, note]) => (
              <section
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-black text-slate-900">
                  {value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{note}</p>
              </section>
            ))}
          </div>
          <ChartCard
            title="Tổng người dùng trên hệ thống"
            note="Tổng lũy kế của những tài khoản hiện còn trong cơ sở dữ liệu."
          >
            <TimelineChart
              label="Tổng tài khoản lũy kế theo ngày"
              data={data.user_chart.map((d) => ({
                date: d.date,
                value: d.total_users,
              }))}
            />
          </ChartCard>
          <ChartCard title="Đăng ký mới">
            <TimelineChart
              label="Tài khoản mới theo ngày"
              data={data.user_chart.map((d) => ({
                date: d.date,
                value: d.new_users,
              }))}
            />
          </ChartCard>
          <div className="grid gap-5 md:grid-cols-2">
            <ChartCard title="Phân bố vai trò">
              <BarChart
                values={[
                  { label: "Sinh viên", value: data.users.by_role.students },
                  { label: "Quản trị viên", value: data.users.by_role.admins },
                  ...(data.users.by_role.legacy_roles
                    ? [
                        {
                          label: "Quyền cũ chưa chuyển đổi",
                          value: data.users.by_role.legacy_roles,
                        },
                      ]
                    : []),
                ]}
              />
            </ChartCard>
            <ChartCard title="Trạng thái tài khoản">
              <BarChart
                color="bg-emerald-500"
                values={[
                  { label: "Được phép truy cập", value: data.users.active },
                  { label: "Bị khóa", value: data.users.inactive },
                ]}
              />
            </ChartCard>
          </div>
          <ChartCard title="Kết quả đăng nhập trong kỳ">
            <BarChart
              color="bg-violet-500"
              values={[
                {
                  label: "Thành công",
                  value: data.login_chart.reduce((n, d) => n + d.success, 0),
                },
                {
                  label: "Sai thông tin",
                  value: data.security.failed_logins_in_period,
                },
                {
                  label: "Tài khoản bị khóa",
                  value: data.security.blocked_logins_in_period,
                },
              ]}
            />
            <TimelineChart
              label="Đăng nhập thành công theo ngày"
              data={data.login_chart.map((d) => ({
                date: d.date,
                value: d.success,
              }))}
            />
          </ChartCard>
        </>
      )}
    </div>
  );
}
