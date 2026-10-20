import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { toast } from "../../stores/toastStore";
import { ChartCard, TimelineChart, BarChart } from "./AdminCharts";
import { exportCsv } from "./adminTypes";
type Report = {
  submissions: number;
  learners: number;
  average_percentage: number | null;
  study_seconds: number;
  daily: { date: string; count: number }[];
  scores: { label: string; count: number }[];
};
export function AdminReports() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Report | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    apiClient
      .get<Report>("/admin/reports", { params: { days } })
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch(() => {
        if (active) toast.error("Không tải được báo cáo");
      });
    return () => {
      active = false;
    };
  }, [days]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Báo cáo luyện tập</h2>
        <div className="flex gap-2">
          <select
            aria-label="Kỳ báo cáo"
            className="rounded-lg border bg-white p-2 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((n) => (
              <option key={n} value={n}>
                {n} ngày
              </option>
            ))}
          </select>
          <button
            disabled={!data}
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            onClick={() =>
              data &&
              exportCsv("bao-cao-luyen-tap.csv", [
                ["Ngày", "Lượt nộp"],
                ...data.daily.map((d) => [d.date, d.count]),
              ])
            }
          >
            Xuất CSV
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Chỉ tính bài đã nộp của sinh viên trong kỳ; bỏ các lượt xem thử của
        Admin.
      </p>
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              ["Lượt nộp bài", data.submissions],
              ["Sinh viên tham gia", data.learners],
              [
                "Điểm trung bình",
                data.average_percentage === null
                  ? "Chưa có"
                  : `${data.average_percentage}%`,
              ],
              [
                "Thời gian làm bài",
                `${Math.round(data.study_seconds / 60)} phút`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-white p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <ChartCard title="Lượt nộp theo ngày">
            <TimelineChart
              label="Lượt nộp bài theo ngày"
              data={data.daily.map((d) => ({ date: d.date, value: d.count }))}
            />
          </ChartCard>
          <ChartCard title="Phân bố điểm" note="Bài có điểm tối đa lớn hơn 0.">
            <BarChart
              color="bg-violet-500"
              values={data.scores.map((d) => ({
                label: d.label,
                value: d.count,
              }))}
            />
          </ChartCard>
        </>
      ) : (
        <p className="text-sm text-slate-500">Đang tải báo cáo…</p>
      )}
    </div>
  );
}
