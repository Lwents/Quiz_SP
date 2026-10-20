import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { apiClient } from "../api/client";
type Message = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
};
export function NotificationInbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => {
      if (document.hidden) return;
      apiClient
        .get<Message[]>("/notifications")
        .then((r) => {
          if (active) {
            setMessages(r.data);
            setFailed(false);
          }
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const unread = messages.filter((m) => !m.read).length;
  return (
    <>
      <button
        type="button"
        aria-label={`Thông báo, ${unread} chưa đọc`}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
        onClick={() => setOpen(true)}
      >
        <Bell size={20} />
        {!!unread && (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Thông báo"
            className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4 flex justify-between">
              <h2 className="text-xl font-bold">Thông báo</h2>
              <button
                aria-label="Đóng thông báo"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </header>
            {failed && (
              <p className="text-sm text-rose-600">Chưa tải được thông báo.</p>
            )}
            {!messages.length && !failed && (
              <p className="text-sm text-slate-500">Chưa có thông báo.</p>
            )}
            {messages.map((m) => (
              <article
                key={m.id}
                className={`mb-3 rounded-xl border p-4 ${m.read ? "bg-white" : "border-blue-200 bg-blue-50"}`}
              >
                <h3 className="font-bold">{m.title}</h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
                  {m.message}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(m.created_at).toLocaleString("vi-VN")}
                </p>
                {!m.read && (
                  <button
                    className="mt-2 text-xs font-bold text-blue-600"
                    onClick={async () => {
                      try {
                        await apiClient.post(`/notifications/${m.id}/read`);
                        setMessages((prev) =>
                          prev.map((n) =>
                            n.id === m.id ? { ...n, read: true } : n,
                          ),
                        );
                      } catch {
                        setFailed(true);
                      }
                    }}
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </article>
            ))}
          </section>
        </div>
      )}
    </>
  );
}
