"""SMTP delivery shared by administrator tests and account confirmation."""
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr


def send_mail(config, password, recipient, *, subject="Kiểm tra cấu hình email HNUE PRO", body="Email kiểm tra từ trang quản trị HNUE PRO. Cấu hình SMTP đang hoạt động."):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((config.from_name, config.from_email))
    message["To"] = recipient
    message.set_content(body)
    context = ssl.create_default_context()
    if config.tls_mode == "ssl":
        client = smtplib.SMTP_SSL(config.host, config.port, timeout=15, context=context)
    else:
        client = smtplib.SMTP(config.host, config.port, timeout=15)
    with client:
        if config.tls_mode == "starttls":
            client.starttls(context=context)
        if config.username:
            client.login(config.username, password)
        client.send_message(message)
