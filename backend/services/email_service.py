"""
EmailService - supports SendGrid, SMTP (aiosmtplib), and a safe DB/log fallback.
Usage:
- Configure SENDGRID_API_KEY for SendGrid
- Or configure SMTP_HOST/SMTP_PORT/SMTP_USERNAME/SMTP_PASSWORD for SMTP
- If neither is present the service logs emails and stores them in db.email_outbox (if db provided)
"""
import os
import logging
import asyncio
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@lvl-up-agency.example")

class EmailService:
    def __init__(self, db=None, loop: Optional[asyncio.AbstractEventLoop] = None):
        self.db = db
        self.loop = loop or asyncio.get_event_loop()
        self.provider = self._detect_provider()

    def _detect_provider(self) -> str:
        if SENDGRID_API_KEY:
            return "sendgrid"
        if SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD:
            return "smtp"
        return "fallback"

    async def send_email(self, to_email: str, subject: str, plain_text: str, html: Optional[str] = None) -> Dict[str, Any]:
        """
        Send an email. Returns a dict with success bool and provider-specific metadata.
        Non-blocking as implemented: blocking SDK calls are run in executor.
        """
        if self.provider == "sendgrid":
            return await self._send_via_sendgrid(to_email, subject, plain_text, html)
        elif self.provider == "smtp":
            return await self._send_via_smtp(to_email, subject, plain_text, html)
        else:
            return await self._send_via_fallback(to_email, subject, plain_text, html)

    async def _send_via_sendgrid(self, to_email, subject, plain_text, html):
        try:
            # Import lazily so package is optional
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
        except Exception as e:
            logger.exception("SendGrid client import failed")
            return {"success": False, "provider": "sendgrid", "error": "sendgrid_client_missing", "exception": str(e)}

        message = Mail(
            from_email=EMAIL_FROM,
            to_emails=to_email,
            subject=subject,
            plain_text_content=plain_text,
            html_content=html or plain_text
        )

        try:
            # SendGrid client is synchronous; run in executor to avoid blocking event loop
            def send_sync():
                sg = SendGridAPIClient(SENDGRID_API_KEY)
                resp = sg.send(message)
                return {"status_code": resp.status_code, "body": getattr(resp, "body", None)}

            result = await self.loop.run_in_executor(None, send_sync)
            ok = 200 <= result.get("status_code", 0) < 300
            return {"success": ok, "provider": "sendgrid", "status_code": result.get("status_code"), "meta": result.get("body")}
        except Exception as e:
            logger.exception("SendGrid send failed")
            return {"success": False, "provider": "sendgrid", "error": str(e)}

    async def _send_via_smtp(self, to_email, subject, plain_text, html):
        try:
            import aiosmtplib
            from email.message import EmailMessage
        except Exception as e:
            logger.exception("aiosmtplib or email.message import failed")
            return {"success": False, "provider": "smtp", "error": "aiosmtplib_missing", "exception": str(e)}

        msg = EmailMessage()
        msg["From"] = EMAIL_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(plain_text)
        if html:
            msg.add_alternative(html, subtype="html")

        try:
            await aiosmtplib.send(
                msg,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USERNAME,
                password=SMTP_PASSWORD,
                start_tls=True,
            )
            return {"success": True, "provider": "smtp"}
        except Exception as e:
            logger.exception("SMTP send failed")
            return {"success": False, "provider": "smtp", "error": str(e)}

    async def _send_via_fallback(self, to_email, subject, plain_text, html):
        # Fallback: log email and optionally save to DB (if db provided)
        logger.info("EmailService fallback: would send email to %s subject=%s", to_email, subject)
        logger.debug("Email content (plain): %s", plain_text)
        outbox_id = None
        if self.db:
            try:
                doc = {
                    "to": to_email,
                    "subject": subject,
                    "plain_text": plain_text,
                    "html": html,
                    "sent": False,
                    "created_at": __import__("datetime").datetime.utcnow()
                }
                res = await self.db.email_outbox.insert_one(doc)
                outbox_id = str(res.inserted_id)
            except Exception:
                logger.exception("Failed to save fallback email to DB")
        return {"success": False, "provider": "fallback", "message": "logged_or_saved", "outbox_id": outbox_id}
