import type { ReactNode } from "react";

export function ChartCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {note && <p className="mt-1 text-sm text-slate-500">{note}</p>}
      {children}
    </section>
  );
}

export function BarChart({
  values,
  color = "bg-blue-500",
}: {
  values: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...values.map((v) => v.value));
  return (
    <div className="mt-5 space-y-3">
      {values.map((v) => (
        <div key={v.label}>
          <div className="mb-1 flex justify-between gap-3 text-xs text-slate-600">
            <span>{v.label}</span>
            <strong>{v.value.toLocaleString("vi-VN")}</strong>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div
              className={`h-3 rounded-full ${color}`}
              style={{ width: `${(v.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {values.every((v) => !v.value) && (
        <p className="text-sm text-slate-500">Chưa có dữ liệu trong kỳ.</p>
      )}
    </div>
  );
}

export function TimelineChart({
  data,
  label,
}: {
  data: { date: string; value: number }[];
  label: string;
}) {
  const actualMax = Math.max(0, ...data.map((d) => d.value));
  const max = Math.max(1, actualMax);
  const points = data
    .map(
      (d, i) =>
        `${20 + (i / Math.max(1, data.length - 1)) * 660},${160 - (d.value / max) * 130}`,
    )
    .join(" ");
  return (
    <div className="mt-4">
      <p className="text-xs text-slate-500">
        Cao nhất: <strong>{actualMax}</strong>
      </p>
      {!actualMax && (
        <p className="mt-3 text-sm text-slate-500">Chưa có dữ liệu trong kỳ.</p>
      )}
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 700 175"
        preserveAspectRatio="none"
        className="h-40 w-full sm:h-48"
      >
        <line x1="20" y1="160" x2="680" y2="160" stroke="#cbd5e1" />
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => (
          <circle
            key={d.date}
            cx={20 + (i / Math.max(1, data.length - 1)) * 660}
            cy={160 - (d.value / max) * 130}
            r="3"
            fill="#2563eb"
          >
            <title>
              {d.date}: {d.value}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{data[0]?.date}</span>
        <span>{data.at(-1)?.date}</span>
      </div>
      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer">Xem số liệu từng ngày</summary>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.map((d) => (
            <span key={d.date}>
              {d.date}: <strong>{d.value}</strong>
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
