"""Responsive, dependency-free HTML email templates for Lwent Pro."""
from html import escape


BRAND_NAME = "Lwent Pro"


def _layout(*, preheader: str, title: str, intro: str, content: str, footer: str) -> str:
    """Build a table-based email layout with inline styles for mail clients."""
    return f"""<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>{escape(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#172554;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{escape(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;width:100%;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #eaf0f8;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" valign="middle" width="42" height="42" style="width:42px;height:42px;background:#245bff;border-radius:12px;color:#ffffff;font-size:22px;font-weight:700;">L</td>
                    <td style="padding-left:12px;color:#0f172a;font-size:20px;font-weight:700;">{BRAND_NAME}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 28px;">
                <h1 style="margin:0 0 14px;color:#0f172a;font-size:24px;line-height:1.3;">{escape(title)}</h1>
                <p style="margin:0;color:#475569;font-size:16px;line-height:1.7;">{escape(intro)}</p>
                {content}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #eaf0f8;color:#64748b;font-size:12px;line-height:1.6;">
                {escape(footer)}<br>
                <strong style="color:#334155;">{BRAND_NAME}</strong> · Nền tảng ôn luyện và kiểm tra trực tuyến
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;text-align:center;">Thư được gửi tự động, vui lòng không trả lời trực tiếp.</p>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def verification_email(link: str) -> tuple[str, str, str]:
    safe_link = escape(link, quote=True)
    subject = f"Xác minh tài khoản {BRAND_NAME}"
    text = (
        "Chào bạn,\n\n"
        f"Cảm ơn bạn đã đăng ký {BRAND_NAME}. Hãy mở liên kết sau để xác minh email và kích hoạt tài khoản:\n\n"
        f"{link}\n\n"
        "Liên kết có hiệu lực trong 24 giờ và chỉ dùng được một lần. "
        "Nếu bạn không tạo tài khoản, hãy bỏ qua thư này."
    )
    content = f"""
                <p style="margin:22px 0 18px;text-align:center;">
                  <a href="{safe_link}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#245bff;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Xác minh email</a>
                </p>
                <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6;">Nếu nút không hoạt động, hãy sao chép liên kết này vào trình duyệt:</p>
                <p style="margin:0;overflow-wrap:anywhere;color:#245bff;font-size:13px;line-height:1.6;"><a href="{safe_link}" style="color:#245bff;">{escape(link)}</a></p>
                <p style="margin:20px 0 0;padding:14px 16px;border-radius:10px;background:#eff6ff;color:#334155;font-size:13px;line-height:1.6;">Liên kết có hiệu lực <strong>24 giờ</strong> và chỉ dùng được một lần. Nếu bạn không tạo tài khoản, hãy bỏ qua thư này.</p>"""
    html_body = _layout(
        preheader=f"Xác minh email để kích hoạt tài khoản {BRAND_NAME}.",
        title="Xác minh email của bạn",
        intro=f"Cảm ơn bạn đã đăng ký {BRAND_NAME}. Xác minh địa chỉ email để kích hoạt tài khoản.",
        content=content,
        footer=f"Yêu cầu này được thực hiện từ trang đăng ký {BRAND_NAME}.",
    )
    return subject, text, html_body


def smtp_test_email() -> tuple[str, str, str]:
    subject = f"Email kiểm tra {BRAND_NAME}"
    text = (
        f"Đây là email kiểm tra từ {BRAND_NAME}. Nếu bạn nhận được thư này, "
        "cấu hình SMTP đã gửi thư đến hộp thư của bạn."
    )
    content = f"""
                <p style="margin:20px 0 0;padding:16px;border-radius:10px;background:#ecfdf5;color:#166534;font-size:15px;line-height:1.7;">Email thử đã được gửi từ <strong>{BRAND_NAME}</strong>. Nếu bạn nhận được thư này, cấu hình SMTP đang hoạt động.</p>
                <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.6;">Bạn có thể đóng email này. Không cần trả lời.</p>"""
    html_body = _layout(
        preheader=f"Email thử từ {BRAND_NAME}.",
        title="Kiểm tra gửi email thành công",
        intro=f"Đây là thư kiểm tra cấu hình email của {BRAND_NAME}.",
        content=content,
        footer="Bạn nhận được email này do quản trị viên yêu cầu gửi thử.",
    )
    return subject, text, html_body
