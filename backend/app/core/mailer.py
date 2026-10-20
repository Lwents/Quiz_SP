"""SMTP delivery shared by administrator tests and account confirmation."""
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from app.core.email_templates import smtp_test_email


def send_mail(config, password, recipient, *, subject=None, body=None, html_body=None):
    if subject is None and body is None and html_body is None:
        default_subject, default_body, default_html = smtp_test_email()
        subject, body, html_body = default_subject, default_body, default_html
    else:
        subject = subject or "Thông báo từ Lwent Pro"
        body = body or ""
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((config.from_name, config.from_email))
    message["To"] = recipient
    message.set_content(body)
    if html_body is not None:
        message.add_alternative(html_body, subtype="html")
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
