export type Account = {
  id: string;
  full_name: string;
  email: string;
  role: "ADMIN" | "STUDENT" | "TEACHER";
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};
export type Session = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
};
export type Event = {
  id: string;
  email: string | null;
  action: string;
  occurred_at: string;
};
export type Notice = {
  id: string;
  title: string;
  message: string;
  audience: string;
  created_at: string;
};
export type Policy = {
  registration_enabled: boolean;
  session_hours: number;
  idle_minutes: number;
  failed_attempts: number;
  failure_window_minutes: number;
  lockout_minutes: number;
};
export const eventNames: Record<string, string> = {
  ai_config_updated: "Cập nhật cấu hình AI",
  smtp_config_updated: "Cập nhật cấu hình email",
  smtp_test_sent: "Gửi email kiểm tra",
  login_success: "Đăng nhập thành công",
  login_failed: "Đăng nhập thất bại",
  login_blocked: "Tài khoản bị khóa",
  login_locked: "Tạm khóa do nhập sai",
  account_created: "Tạo tài khoản",
  account_updated: "Cập nhật tài khoản",
  password_reset: "Đặt lại mật khẩu",
  session_revoked: "Thu hồi phiên",
  policy_updated: "Thay đổi chính sách",
  notification_published: "Đăng thông báo",
  notification_removed: "Gỡ thông báo",
  logout: "Đăng xuất",
};
export const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa có";
export function exportCsv(filename: string, rows: (string | number)[][]) {
  // Neutralise spreadsheet formulas before exporting identifiers or user text.
  const escape = (v: string | number) =>
    `"${String(v)
      .replace(/^(?:\s*[=+@\-]|[\t\r\n])/, "'$&")
      .replaceAll('"', '""')}"`;
  const blob = new Blob(
    ["\uFEFF", rows.map((row) => row.map(escape).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
