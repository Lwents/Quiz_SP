import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { toast } from "../../stores/toastStore";
type AIForm = {
  base_url: string;
  model: string;
  api_key: string;
  key_configured: boolean;
};
type MailForm = {
  host: string;
  port: number;
  tls_mode: "ssl" | "starttls";
  username: string;
  from_email: string;
  from_name: string;
  password: string;
  password_configured: boolean;
};
const input =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button =
  "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";
function message(error: unknown) {
  const value = (error as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;
  return typeof value === "string"
    ? value
    : "Không thể thực hiện. Kiểm tra thông tin đã nhập.";
}
export function AdminIntegrationsPage({ kind }: { kind: "ai" | "email" }) {
  const [ai, setAI] = useState<AIForm | null>(null);
  const [mail, setMail] = useState<MailForm | null>(null);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState("");
  useEffect(() => {
    let active = true;
    apiClient
      .get(`/admin/integrations/${kind}`)
      .then((r) => {
        if (active) {
          if (kind === "ai") setAI({ ...r.data, api_key: "" });
          else setMail({ ...r.data, password: "" });
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [kind]);
  async function save() {
    const body =
      kind === "ai" && ai
        ? {
            base_url: ai.base_url,
            model: ai.model,
            ...(ai.api_key ? { api_key: ai.api_key } : {}),
          }
        : mail
          ? {
              host: mail.host,
              port: mail.port,
              tls_mode: mail.tls_mode,
              username: mail.username,
              from_email: mail.from_email,
              from_name: mail.from_name,
              ...(mail.password ? { password: mail.password } : {}),
            }
          : null;
    if (!body) return;
    setBusy(true);
    setResult("");
    try {
      await apiClient.put(`/admin/integrations/${kind}`, body);
      if (ai)
        setAI({
          ...ai,
          api_key: "",
          key_configured: ai.key_configured || !!ai.api_key,
        });
      if (mail)
        setMail({
          ...mail,
          password: "",
          password_configured: mail.password_configured || !!mail.password,
        });
      toast.success("Đã lưu cấu hình");
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setResult("");
    try {
      const r = await apiClient.post(
        `/admin/integrations/${kind}/test`,
        kind === "email" ? { recipient } : undefined,
      );
      setResult(r.data.message);
    } catch (e) {
      setResult(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">
        {kind === "ai" ? "Cấu hình AI" : "Cấu hình email SMTP"}
      </h2>
      <p className="text-sm text-slate-500">
        {kind === "ai"
          ? "Áp dụng cho giải thích bài làm và gia sư thực hành mạng. Hỗ trợ API tương thích OpenAI."
          : "Thiết lập máy chủ gửi email và gửi thư kiểm tra đến hộp thư của bạn."}
      </p>
      {failed && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          Không tải được cấu hình. Tải lại trang để thử lại.
        </p>
      )}
      {!ai && !mail && !failed && (
        <p className="text-sm text-slate-500">Đang tải cấu hình…</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
      >
        {kind === "ai" && ai && (
          <>
            <label className="block text-sm font-semibold text-slate-700">
              Địa chỉ API (Base URL)
              <input
                type="url"
                required
                className={input}
                value={ai.base_url}
                maxLength={1000}
                onChange={(e) => setAI({ ...ai, base_url: e.target.value })}
                placeholder="https://api.example.com/v1"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Model
              <input
                required
                className={input}
                value={ai.model}
                maxLength={200}
                onChange={(e) => setAI({ ...ai, model: e.target.value })}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              API key
              <input
                type="password"
                autoComplete="new-password"
                className={input}
                value={ai.api_key}
                maxLength={4096}
                onChange={(e) => setAI({ ...ai, api_key: e.target.value })}
                placeholder={
                  ai.key_configured
                    ? "Đã có khóa · để trống để giữ nguyên"
                    : "Nhập API key"
                }
              />
            </label>
            <p className="text-xs text-slate-500">
              Trạng thái khóa:{" "}
              {ai.key_configured ? "Đã cấu hình" : "Chưa cấu hình"}. Khóa đã lưu
              được mã hóa và không hiển thị lại.
            </p>
          </>
        )}
        {kind === "email" && mail && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Máy chủ SMTP
                <input
                  className={input}
                  required
                  value={mail.host}
                  placeholder="mail.tenmien.com"
                  maxLength={255}
                  onChange={(e) => setMail({ ...mail, host: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Cổng
                <input
                  className={input}
                  required
                  type="number"
                  min={1}
                  max={65535}
                  value={mail.port}
                  onChange={(e) =>
                    setMail({ ...mail, port: Number(e.target.value) })
                  }
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Bảo mật kết nối
                <select
                  className={input}
                  value={mail.tls_mode}
                  onChange={(e) =>
                    setMail({
                      ...mail,
                      tls_mode: e.target.value as "ssl" | "starttls",
                      port: e.target.value === "ssl" ? 465 : 587,
                    })
                  }
                >
                  <option value="ssl">SSL/TLS · thường cổng 465</option>
                  <option value="starttls">STARTTLS · thường cổng 587</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Tài khoản SMTP
                <input
                  className={input}
                  value={mail.username}
                  maxLength={255}
                  onChange={(e) =>
                    setMail({ ...mail, username: e.target.value })
                  }
                  placeholder="no-reply@tenmien.com"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Email người gửi
                <input
                  type="email"
                  className={input}
                  required
                  value={mail.from_email}
                  maxLength={255}
                  onChange={(e) =>
                    setMail({ ...mail, from_email: e.target.value })
                  }
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Tên người gửi
                <input
                  className={input}
                  required
                  value={mail.from_name}
                  maxLength={120}
                  onChange={(e) =>
                    setMail({ ...mail, from_name: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Mật khẩu SMTP
              <input
                type="password"
                autoComplete="new-password"
                className={input}
                value={mail.password}
                maxLength={4096}
                onChange={(e) => setMail({ ...mail, password: e.target.value })}
                placeholder={
                  mail.password_configured
                    ? "Đã có mật khẩu · để trống để giữ nguyên"
                    : "Nhập mật khẩu hộp thư"
                }
              />
            </label>
            <p className="text-xs text-slate-500">
              Mật khẩu đã lưu được mã hóa và không hiển thị lại. Dùng thông tin
              hộp thư email, không dùng mật khẩu tài khoản quản trị web.
            </p>
          </>
        )}
        {(ai || mail) && (
          <button disabled={busy} className={`${button} text-blue-700`}>
            {busy ? "Đang xử lý…" : "Lưu cấu hình"}
          </button>
        )}
      </form>
      {(ai || mail) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void test();
          }}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h3 className="font-bold">
            {kind === "ai" ? "Kiểm tra model" : "Gửi email kiểm tra"}
          </h3>
          <p className="text-sm text-slate-500">
            Lưu cấu hình trước khi kiểm tra.
            {kind === "ai" ? " Phép thử sẽ gọi model một lần." : ""}
          </p>
          {kind === "email" && (
            <label className="block text-sm font-semibold text-slate-700">
              Email nhận thư thử
              <input
                type="email"
                required
                className={input}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </label>
          )}
          <button disabled={busy} className={button}>
            {busy
              ? "Đang kiểm tra…"
              : kind === "ai"
                ? "Gọi thử AI"
                : "Gửi email thử"}
          </button>
          {result && (
            <p
              role="status"
              className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"
            >
              {result}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
