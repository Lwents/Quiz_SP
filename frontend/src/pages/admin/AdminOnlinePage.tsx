import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { API_BASE_URL } from "../../api/urls";
import { dateTime } from "./adminTypes";
type Snapshot = {
  total: number;
  updated_at: string;
  users: {
    id: string;
    full_name: string;
    email: string;
    last_seen_at: string;
  }[];
};

export function AdminOnlinePage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let stopped = false;
    const controller = new AbortController();
    async function connect() {
      while (!stopped) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/admin/presence/stream`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              signal: controller.signal,
            },
          );
          if (response.status === 401) {
            await apiClient.get("/auth/me");
            throw new Error("retry");
          }
          if (!response.ok || !response.body) throw new Error("connection");
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          try {
            while (!stopped) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              let end;
              while ((end = buffer.indexOf("\n\n")) >= 0) {
                const block = buffer.slice(0, end);
                buffer = buffer.slice(end + 2);
                if (block.includes("event: expired")) {
                  await apiClient.get("/auth/me");
                  throw new Error("expired");
                }
                const data = block
                  .split("\n")
                  .find((line) => line.startsWith("data: "));
                if (data) {
                  setSnapshot(JSON.parse(data.slice(6)));
                  setConnected(true);
                }
              }
            }
          } finally {
            await reader.cancel().catch(() => {});
          }
        } catch {
          /* Reconnect with the current bearer token; never put tokens in URLs. */
        }
        if (!stopped) {
          setConnected(false);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }
    void connect();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, []);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Đang hoạt động</h2>
        <span
          role="status"
          className={`rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
        >
          {connected ? "● Trực tiếp" : "Đang kết nối lại…"}
        </span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-3xl font-black text-slate-900">
          {snapshot?.total ?? "—"}{" "}
          <span className="text-base font-medium">người đang online</span>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Người dùng đang mở web ở tab hiển thị. Cập nhật trực tiếp; kết nối mất
          đột ngột sẽ được loại sau tối đa 45 giây.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Cập nhật: {dateTime(snapshot?.updated_at)}
        </p>
        <div className="mt-5 space-y-3">
          {snapshot?.users.map((user) => (
            <article
              key={user.id}
              className="flex items-center gap-3 rounded-xl border p-4"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900">{user.full_name}</h3>
                <p className="break-all text-sm text-slate-500">{user.email}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Tín hiệu gần nhất: {dateTime(user.last_seen_at)}
                </p>
              </div>
            </article>
          ))}
          {connected && snapshot?.total === 0 && (
            <p className="text-sm text-slate-500">
              Hiện chưa có người dùng online.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
