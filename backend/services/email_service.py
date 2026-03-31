"""
Email sending service using SMTP.

Configure via environment variables:
    SMTP_HOST      - SMTP server hostname (default: smtp.gmail.com)
    SMTP_PORT      - SMTP server port (default: 587)
    SMTP_USER      - SMTP username / sender email
    SMTP_PASSWORD  - SMTP password or app-specific password
    FRONTEND_URL   - Base URL for password reset links (default: http://localhost:5173)
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _send_email(to_email: str, subject: str, html_body: str) -> None:
    """Send an email via SMTP. Raises on failure."""
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL] SMTP not configured. Would send to {to_email}: {subject}")
        print(f"[EMAIL] Body preview: {html_body[:300]}")
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, to_email, msg.as_string())

    print(f"[EMAIL] Sent '{subject}' to {to_email}")


def send_password_reset_email(to_email: str, token: str) -> None:
    """Send a password reset email with a link containing the token."""
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    subject = "Password Reset - Fitness Tracker"
    html = f"""\
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #009EB1;">Password Reset</h2>
        <p>You requested a password reset for your Fitness Tracker account.</p>
        <p>Click the button below to set a new password. This link expires in 1 hour.</p>
        <p style="text-align: center; margin: 32px 0;">
            <a href="{reset_url}"
               style="background-color: #009EB1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Reset Password
            </a>
        </p>
        <p style="color: #6B7280; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:<br/>{reset_url}</p>
    </body>
    </html>
    """
    _send_email(to_email, subject, html)
